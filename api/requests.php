<?php
// ==============================================================================
// FWG Nachhilfebörse - Requests API (Ad Requests, Connections, Status)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/ratelimit.php';


cors_headers();

// Zugriffsstufe (D5): Anfragen erst nach Verifizierung.
$user = require_verified();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;

// Auto-Migrationen: Anzeigentitel + Blockierungen (MariaDB, mehrfach ausführbar)
try {
    $pdo->exec("ALTER TABLE ads ADD COLUMN IF NOT EXISTS title VARCHAR(120) NULL AFTER user_id");
} catch (Exception $e) {}
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_blocks (
            blocker_id VARCHAR(36) NOT NULL,
            blocked_id VARCHAR(36) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (blocker_id, blocked_id),
            KEY idx_user_blocks_blocked (blocked_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Exception $e) {}

// Falls eine ältere/fehlerhafte user_blocks-Tabelle mit INT-Spalten existiert
// (die Anwendungs-IDs sind UUIDs), auf VARCHAR(36) umstellen.
try {
    $blockColumn = $pdo->query("SHOW COLUMNS FROM user_blocks LIKE 'blocker_id'")->fetch();
    if ($blockColumn && stripos((string)($blockColumn['Type'] ?? ''), 'char') === false) {
        $pdo->exec("ALTER TABLE user_blocks MODIFY blocker_id VARCHAR(36) NOT NULL, MODIFY blocked_id VARCHAR(36) NOT NULL");
    }
} catch (Exception $e) {}

// Blockierung in beide Richtungen prüfen.
function fwg_requests_users_blocked(PDO $pdo, string $viewerId, string $ownerId): bool {
    if ($viewerId === '' || $ownerId === '') return false;
    try {
        $stmt = $pdo->prepare('
            SELECT 1 FROM user_blocks
            WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
            LIMIT 1
        ');
        $stmt->execute([$viewerId, $ownerId, $ownerId, $viewerId]);
        return (bool)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

// Private Gesuche (type='search') dürfen nur passende Anbieter anfragen:
// eigenes Gesuch, SV-Admin oder mindestens ein Fach-Overlap mit den eigenen
// Unterrichtsfächern (settings.teaches_subjects bzw. aktive Angebots-Fächer).
function fwg_requests_can_contact_search_ad(PDO $pdo, array $user, string $ownerId, array $adSubjects): bool {
    $viewerId = (string)($user['id'] ?? '');
    if ($ownerId !== '' && $ownerId === $viewerId) return true;
    if (($user['role'] ?? '') === 'sv_admin') return true;
    if ($viewerId === '' || empty($adSubjects)) return false;

    $allowedSubjects = [];
    try {
        $stmt = $pdo->prepare('SELECT settings FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$viewerId]);
        $settings = json_decode((string)$stmt->fetchColumn(), true) ?: [];
        $allowedSubjects = fwg_sanitize_feed_subjects($settings['teaches_subjects'] ?? []);
    } catch (Throwable $e) {}

    // Zusätzlich die Fächer eigener aktiver Angebots-Anzeigen berücksichtigen.
    try {
        $stmt = $pdo->prepare("
            SELECT subjects FROM ads
            WHERE user_id = ? AND type = 'offer' AND is_active = 1 AND is_archived = 0
        ");
        $stmt->execute([$viewerId]);
        foreach ($stmt->fetchAll() as $offer) {
            foreach (json_decode($offer['subjects'] ?? '[]', true) ?: [] as $s) {
                if (is_string($s) && $s !== '' && !in_array($s, $allowedSubjects, true)) {
                    $allowedSubjects[] = $s;
                }
            }
        }
    } catch (Throwable $e) {}

    foreach ($adSubjects as $subject) {
        if (is_string($subject) && in_array($subject, $allowedSubjects, true)) {
            return true;
        }
    }
    return false;
}

// ------------------------------------------------------------------------------
// 1. GET: ANFRAGEN DES NUTZERS ABRUFEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $scopeId = $user['id'];

    if ($id) {
        $stmt = $pdo->prepare('
            SELECT r.*,
                   COALESCE(a.title, a.short_description) as ad_title, a.subjects as ad_subjects, a.type as ad_type,
                   req.display_name as requester_name, req.avatar_url as requester_avatar, req.avatar_type as requester_avatar_type, req.grade_level as requester_grade,
                   own.display_name as owner_name, own.avatar_url as owner_avatar, own.avatar_type as owner_avatar_type, own.grade_level as owner_grade
            FROM ad_requests r
            JOIN ads a ON a.id = r.ad_id
            JOIN profiles req ON req.id = r.requester_id
            JOIN profiles own ON own.id = r.owner_id
            WHERE r.id = ? AND (r.requester_id = ? OR r.owner_id = ? OR ? = \'sv_admin\')
        ');
        $stmt->execute([$id, $scopeId, $scopeId, $user['role']]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error('Anfrage nicht gefunden.', 404);
        }
        $row['ad_subjects'] = json_decode($row['ad_subjects'] ?? '[]', true);
        json_response($row);
    }

    // Alle Anfragen des aktuellen Nutzers (bzw. des verknüpften Kindes)
    $stmt = $pdo->prepare('
        SELECT r.*,
               COALESCE(a.title, a.short_description) as ad_title, a.subjects as ad_subjects, a.type as ad_type,
               req.display_name as requester_name, req.avatar_url as requester_avatar, req.avatar_type as requester_avatar_type, req.grade_level as requester_grade,
               req.phone_number as requester_phone, req.email as requester_email, req.settings as requester_settings,
               own.display_name as owner_name, own.avatar_url as owner_avatar, own.avatar_type as owner_avatar_type, own.grade_level as owner_grade,
               own.phone_number as owner_phone, own.email as owner_email, own.settings as owner_settings
        FROM ad_requests r
        JOIN ads a ON a.id = r.ad_id
        JOIN profiles req ON req.id = r.requester_id
        JOIN profiles own ON own.id = r.owner_id
        WHERE r.requester_id = ? OR r.owner_id = ?
        ORDER BY r.created_at DESC
    ');
    $stmt->execute([$scopeId, $scopeId]);
    $rows = $stmt->fetchAll();

    // Datenschutz (A4): private Zusatzkontakte bei Fremd-Sicht nullen
    $maskContacts = function (array $settings, string $profileId) use ($user): array {
        if ($profileId !== $user['id'] && !empty($settings['custom_contacts']) && is_array($settings['custom_contacts'])) {
            foreach ($settings['custom_contacts'] as $i => $contact) {
                if (empty($contact['is_public'])) {
                    $settings['custom_contacts'][$i]['value'] = null;
                }
            }
        }
        return $settings;
    };

    foreach ($rows as &$r) {
        $r['ad_subjects'] = json_decode($r['ad_subjects'] ?? '[]', true);
        $reqSettings = $maskContacts(json_decode($r['requester_settings'] ?? '{}', true) ?: [], (string)$r['requester_id']);
        $ownSettings = $maskContacts(json_decode($r['owner_settings'] ?? '{}', true) ?: [], (string)$r['owner_id']);

        $r['requester'] = [
            'id' => $r['requester_id'],
            'display_name' => $r['requester_name'],
            'avatar_url' => $r['requester_avatar'],
            'avatar_type' => $r['requester_avatar_type'],
            'grade_level' => $r['requester_grade'],
            'phone_number' => $r['requester_phone'],
            'email' => $r['requester_email'],
            'settings' => $reqSettings
        ];

        $r['owner'] = [
            'id' => $r['owner_id'],
            'display_name' => $r['owner_name'],
            'avatar_url' => $r['owner_avatar'],
            'avatar_type' => $r['owner_avatar_type'],
            'grade_level' => $r['owner_grade'],
            'phone_number' => $r['owner_phone'],
            'email' => $r['owner_email'],
            'settings' => $ownSettings
        ];

        $r['ads'] = [
            'id' => $r['ad_id'],
            'short_description' => $r['ad_title'],
            'title' => $r['ad_title'],
            'subjects' => $r['ad_subjects'],
            'type' => $r['ad_type']
        ];

        // Datenschutz: Kontaktdaten erst nach Annahme ausliefern und fremde
        // Angaben nur gemäß deren Sichtbarkeits-Einstellungen.
        $contactsUnlocked = in_array($r['status'], ['accepted', 'completed'], true);
        if (!$contactsUnlocked) {
            $r['requester']['phone_number'] = null;
            $r['requester']['email'] = null;
            $r['owner']['phone_number'] = null;
            $r['owner']['email'] = null;
        } else {
            if ($r['requester_id'] !== $user['id']) {
                if (empty($reqSettings['phone_visible'])) { $r['requester']['phone_number'] = null; }
                if (empty($reqSettings['email_visible'])) { $r['requester']['email'] = null; }
            }
            if ($r['owner_id'] !== $user['id']) {
                if (empty($ownSettings['phone_visible'])) { $r['owner']['phone_number'] = null; }
                if (empty($ownSettings['email_visible'])) { $r['owner']['email'] = null; }
            }
        }
    }

    json_response($rows);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUE ANFRAGE SENDEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    // Spam-Schutz: höchstens 10 neue Anfragen pro 5 Minuten und Nutzer
    fwg_require_rate_limit('ad_request_' . $user['id'], 10, 300);

    $data = get_json_input();
    $adId = $data['ad_id'] ?? null;
    $message = trim($data['message'] ?? '');
    $role = $data['role'] ?? 'student_to_tutor';

    if (!$adId) {
        json_error('Anzeigen-ID ist erforderlich.');
    }

    // Anzeige abrufen
    $adStmt = $pdo->prepare('SELECT id, user_id, is_active, is_archived, type, subjects, grade_levels FROM ads WHERE id = ?');
    $adStmt->execute([$adId]);
    $ad = $adStmt->fetch();

    if (!$ad) {
        json_error('Anzeige nicht gefunden.', 404);
    }
    if ($ad['user_id'] === $user['id']) {
        json_error('Du kannst keine Anfrage an deine eigene Anzeige stellen.', 400);
    }

    // Pausierte bzw. archivierte Anzeigen dürfen keine neuen Anfragen erhalten.
    if ((int)$ad['is_active'] === 0 || !empty($ad['is_archived'])) {
        json_error('Diese Anzeige ist nicht mehr aktiv. Eine Anfrage ist nicht möglich.', 403, ['code' => 'ad_inactive']);
    }

    // Blockierungen gelten in beide Richtungen.
    if (fwg_requests_users_blocked($pdo, (string)$user['id'], (string)$ad['user_id'])) {
        json_error('Zwischen dir und dem Anzeigenbesitzer besteht eine Blockierung. Deshalb kann keine Anfrage gesendet werden.', 403, ['code' => 'blocked']);
    }

    // Private Gesuche nur für berechtigte Anbieter (Fach-Overlap oder Staff).
    if ($ad['type'] === 'search') {
        $adSubjects = json_decode($ad['subjects'] ?? '[]', true) ?: [];
        if (!fwg_requests_can_contact_search_ad($pdo, $user, (string)$ad['user_id'], $adSubjects)) {
            json_error('Dieses Gesuch ist privat und nur für passende Anbieter sichtbar.', 403, ['code' => 'search_private']);
        }
    }

    // Prüfen, ob bereits eine offene Anfrage existiert
    $dupCheck = $pdo->prepare('
        SELECT id FROM ad_requests 
        WHERE ad_id = ? AND requester_id = ? AND status IN (\'pending\', \'accepted\')
    ');
    $dupCheck->execute([$adId, $user['id']]);
    if ($dupCheck->fetch()) {
        json_error('Du hast für diese Anzeige bereits eine offene oder aktive Anfrage.', 400);
    }

    $requestId = generate_uuid();
    $insert = $pdo->prepare('
        INSERT INTO ad_requests (id, ad_id, requester_id, owner_id, role, message, status)
        VALUES (?, ?, ?, ?, ?, ?, \'pending\')
    ');
    $insert->execute([$requestId, $adId, $user['id'], $ad['user_id'], $role, $message]);

    // Wenn eine Initial-Nachricht vorhanden ist, auch direkt in messages anlegen
    if (!empty($message)) {
        $msgId = generate_uuid();
        $msgInsert = $pdo->prepare('
            INSERT INTO messages (id, request_id, sender_id, content, is_read)
            VALUES (?, ?, ?, ?, 0)
        ');
        $msgInsert->execute([$msgId, $requestId, $user['id'], $message]);
    }

    // E-Mail-Benachrichtigung an den Anzeigen-Eigentümer
    $ownerStmt = $pdo->prepare('
        SELECT p.first_name, p.display_name, u.email, COALESCE(a.title, a.short_description) as ad_title
        FROM profiles p
        JOIN users u ON u.id = p.id
        JOIN ads a ON a.id = ?
        WHERE p.id = ?
    ');
    $ownerStmt->execute([$adId, $ad['user_id']]);
    $owner = $ownerStmt->fetch();

    if ($owner && !empty($owner['email'])) {
        try {
            send_email_new_ad_request(
                $owner['email'],
                $owner['first_name'] ?: $owner['display_name'] ?: 'Schüler/in',
                $user['display_name'] ?: 'Mitschülerin oder Mitschüler',
                $owner['ad_title'] ?: 'Deine Nachhilfe-Anzeige',
                $message,
                $requestId
            );
        } catch (Exception $e) {
            error_log('Fehler beim E-Mail Versand: ' . $e->getMessage());
        }
    }

    // In-App Benachrichtigung an den Eigentümer
    try {
        $notifId = generate_uuid();
        $senderName = $user['display_name'] ?: 'Mitschülerin oder Mitschüler';
        $adTitle = $owner['ad_title'] ?? 'deine Anzeige';
        $pdo->prepare('
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES (?, ?, "alert", ?, ?, ?)
        ')->execute([
            $notifId,
            $ad['user_id'],
            "Neue Anfrage von $senderName",
            "Jemand hat Interesse an deiner Anzeige „$adTitle“",
            json_encode(['request_id' => $requestId, 'link' => '/#/social?tab=requests'])
        ]);
    } catch (Exception $e) {
        error_log('Fehler beim Anlegen der In-App Benachrichtigung: ' . $e->getMessage());
    }

    json_response([
        'id' => $requestId,
        'message' => 'Anfrage gesendet.'
    ], 201);
}

// ------------------------------------------------------------------------------
// 3. PATCH: STATUS ÄNDERN (akzeptieren, ablehnen, abschließen)
// ------------------------------------------------------------------------------
if ($method === 'PATCH' || $method === 'PUT') {
    if (!$id) {
        json_error('Anfrage-ID erforderlich.');
    }

    $data = get_json_input();
    $status = $data['status'] ?? null;
    if (!in_array($status, ['pending', 'accepted', 'rejected', 'completed'])) {
        json_error('Ungültiger Status.');
    }

    $check = $pdo->prepare('SELECT * FROM ad_requests WHERE id = ?');
    $check->execute([$id]);
    $request = $check->fetch();

    if (!$request) {
        json_error('Anfrage nicht gefunden.', 404);
    }

    // Nur der Besitzer (oder SV-Admin) darf annehmen/ablehnen oder abschließen.
    // Anfragende haben keine Statusrechte (Zurückziehen gibt es in der UI nicht),
    // sonst könnten sie Anfragen selbst „annehmen“.
    $isOwner = ($request['owner_id'] === $user['id']);
    $isAdmin = ($user['role'] === 'sv_admin');

    if (!$isOwner && !$isAdmin) {
        json_error('Keine Berechtigung.', 403, ['code' => 'forbidden']);
    }

    $update = $pdo->prepare('UPDATE ad_requests SET status = ? WHERE id = ?');
    $update->execute([$status, $id]);

    // Bei Annahme/Ablehnung: E-Mail an den Anfragenden senden
    if (in_array($status, ['accepted', 'rejected'])) {
        $reqUserStmt = $pdo->prepare('
            SELECT p.first_name, p.display_name, u.email, COALESCE(a.title, a.short_description) as ad_title
            FROM profiles p
            JOIN users u ON u.id = p.id
            JOIN ads a ON a.id = ?
            WHERE p.id = ?
        ');
        $reqUserStmt->execute([$request['ad_id'], $request['requester_id']]);
        $targetRequester = $reqUserStmt->fetch();

        if ($targetRequester && !empty($targetRequester['email'])) {
            try {
                send_email_request_status_update(
                    $targetRequester['email'],
                    $targetRequester['first_name'] ?: $targetRequester['display_name'] ?: 'Schüler/in',
                    $user['display_name'] ?: 'Mitschülerin oder Mitschüler',
                    $status,
                    $targetRequester['ad_title'] ?: 'Nachhilfe-Anzeige',
                    $id
                );
            } catch (Exception $e) {
                error_log('Fehler beim E-Mail Versand: ' . $e->getMessage());
            }
        }

        // In-App Benachrichtigung an den Anfragenden
        try {
            $notifId = generate_uuid();
            $actorName = $user['display_name'] ?: 'Der Ersteller';
            $statusText = ($status === 'accepted') ? 'angenommen' : 'abgelehnt';
            $pdo->prepare('
                INSERT INTO notifications (id, user_id, type, title, message, data)
                VALUES (?, ?, "alert", ?, ?, ?)
            ')->execute([
                $notifId,
                $request['requester_id'],
                "Anfrage $statusText",
                "$actorName hat deine Nachhilfe-Anfrage $statusText.",
                json_encode(['request_id' => $id, 'link' => ($status === 'accepted' ? "/#/chat/$id" : '/#/social?tab=requests')])
            ]);
        } catch (Exception $e) {
            error_log('Fehler beim Anlegen der In-App Benachrichtigung: ' . $e->getMessage());
        }

    }

    json_response(['message' => 'Status erfolgreich aktualisiert.', 'status' => $status]);
}

json_error('Methode nicht erlaubt.', 405);
