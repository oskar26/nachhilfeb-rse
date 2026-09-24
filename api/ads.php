<?php
// ==============================================================================
// FWG Nachhilfebörse - Ads API (List, Get, Create, Update, Delete, Boost)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

// Auto-Migration: Unterrichts-Format + Aufrufzähler (läuft vor jedem Request,
// damit ältere Datenbanken ohne manuellen Import weiter funktionieren)
try {
    $pdo->exec("ALTER TABLE ads ADD COLUMN IF NOT EXISTS session_format VARCHAR(16) NOT NULL DEFAULT 'any'");
} catch (Exception $e) {}
try {
    $pdo->exec("ALTER TABLE ads ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0");
} catch (Exception $e) {}

// ------------------------------------------------------------------------------
// B4: Matching-Helfer für gespeicherte Suchen (Benachrichtigung nach Publish)
// ------------------------------------------------------------------------------
function fwg_saved_hourly_rate(array $details): ?float {
    if (($details['mode'] ?? '') !== 'fixed' || !isset($details['value']) || !is_numeric($details['value'])) return null;
    $unit = strtolower((string)($details['unit'] ?? '45min'));
    if (preg_match('/^(\d+)/', $unit, $m)) {
        $mins = (int)$m[1];
    } elseif (strpos($unit, 'h') !== false || strpos($unit, 'std') !== false) {
        $mins = 60;
    } else {
        $mins = 45;
    }
    if ($mins <= 0) return null;
    return round(((float)$details['value'] / $mins) * 60, 1);
}

function fwg_saved_search_matches(array $q, string $type, array $subjects, array $gradeLevels, array $priceDetails): bool {
    // Fach (Pflichtkriterium, wenn in der Suche gesetzt)
    if (!empty($q['subject']) && !in_array($q['subject'], $subjects, true)) return false;

    // Anzeigentyp (offer/search; 'all' passt immer)
    if (($q['type'] ?? 'all') !== 'all' && ($q['type'] ?? 'all') !== $type) return false;

    // Klassenstufen (optional)
    $qGrades = is_array($q['grades'] ?? null) ? $q['grades'] : [];
    if (!empty($qGrades) && empty(array_intersect($qGrades, $gradeLevels))) return false;

    // Preis (optional; nur prüfbar, wenn ein Stundenpreis berechenbar ist)
    $min = (float)($q['minPrice'] ?? 0);
    $max = (float)($q['maxPrice'] ?? 0);
    $rate = is_array($priceDetails) ? fwg_saved_hourly_rate($priceDetails) : null;
    if ($rate !== null && $max > 0 && ($rate < $min || $rate > $max)) return false;

    return true;
}

// ------------------------------------------------------------------------------
// 1. GET: ANZEIGEN ABRUFEN (Liste oder Einzelanzeige)
// Zugriffsstufe (D5): erst nach Verifizierung / bei Eltern mit verknüpftem Kind.
// Ausnahme: eigene Anzeigen (user_id = eigener Account), damit Profile/Settings
// auch für unverifizierte Konten funktionieren.
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $viewer = require_auth();
    if ($id) {
        // Einzelne Anzeige mit Profil-Daten
        $stmt = $pdo->prepare('
            SELECT a.*, 
                   p.display_name, p.first_name, p.last_name, p.avatar_url, p.avatar_type,
                   p.banner_color, p.average_rating, p.is_verified, p.is_coach as user_is_coach,
                   p.grade_level as user_grade, p.class_letter as user_class, p.email as user_email, 
                   p.phone_number as user_phone, p.settings as user_settings, p.availability as user_availability
            FROM ads a
            JOIN profiles p ON p.id = a.user_id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $ad = $stmt->fetch();

        if (!$ad) {
            json_error('Anzeige nicht gefunden.', 404);
        }

        // Eigene Anzeige bleibt für unverifizierte Konten einsehbar (Profil/Settings),
        // fremde Anzeigen erfordern Verifizierung / Eltern-Verknüpfung.
        if ($ad['user_id'] !== $viewer['id']) {
            require_verified();
        }

        // JSON Felder dekodieren
        $ad['subjects'] = json_decode($ad['subjects'] ?? '[]', true);
        $ad['grade_levels'] = json_decode($ad['grade_levels'] ?? '[]', true);
        $ad['locations'] = json_decode($ad['locations'] ?? '[]', true);
        $ad['price_details'] = json_decode($ad['price_details'] ?? '{}', true);
        $ad['duration_minutes'] = json_decode($ad['duration_minutes'] ?? '[]', true);
        $ad['image_urls'] = json_decode($ad['image_urls'] ?? '[]', true);
        $userSettings = json_decode($ad['user_settings'] ?? '{}', true) ?: [];
        $ad['user_settings'] = $userSettings;

        // Boost-Status prüfen
        $isBoosted = !empty($ad['boosted']) && !empty($ad['boosted_until']) && strtotime($ad['boosted_until']) > time();
        $ad['is_boosted'] = $isBoosted;

        // Struktur formatieren wie vom Frontend erwartet (inkl. author/profiles object)
        $ad['profiles'] = [
            'id' => $ad['user_id'],
            'display_name' => $ad['display_name'],
            'first_name' => $ad['first_name'],
            'last_name' => $ad['last_name'],
            'avatar_url' => $ad['avatar_url'],
            'avatar_type' => $ad['avatar_type'],
            'banner_color' => $ad['banner_color'],
            'average_rating' => (float)$ad['average_rating'],
            'is_verified' => (bool)$ad['is_verified'],
            'is_coach' => !empty($ad['user_is_coach']) || !empty($userSettings['is_coach']),
            'availability' => !empty($ad['user_availability']) ? json_decode($ad['user_availability'], true) : (!empty($userSettings['availability']) ? $userSettings['availability'] : null),
            'grade_level' => $ad['user_grade'],
            'class_letter' => $ad['user_class'],
            'email' => $ad['user_email'],
            'phone_number' => $ad['user_phone'],
            'settings' => $userSettings
        ];

        // Datenschutz (A4): private Zusatzkontakte bei Fremd-Sicht nullen
        if ($ad['user_id'] !== $viewer['id'] && !empty($ad['profiles']['settings']['custom_contacts']) && is_array($ad['profiles']['settings']['custom_contacts'])) {
            foreach ($ad['profiles']['settings']['custom_contacts'] as $i => $contact) {
                if (empty($contact['is_public'])) {
                    $ad['profiles']['settings']['custom_contacts'][$i]['value'] = null;
                }
            }
        }

        json_response($ad);
    }

    // Liste abrufen
    $type = $_GET['type'] ?? null;
    $subject = $_GET['subject'] ?? null;
    $grade = $_GET['grade'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $search = mb_substr(trim($_GET['search'] ?? ''), 0, 100);
    $onlyActive = !isset($_GET['all']) || $_GET['all'] !== '1';

    // Eigene Anzeigen (user_id = eigener Account) bleiben für unverifizierte Konten
    // sichtbar (Profil/Settings); alles andere erfordert Verifizierung (D5).
    if (!(is_string($userId) && $userId === $viewer['id'])) {
        require_verified();
    }

    $where = [];
    $params = [];

    if ($onlyActive) {
        $where[] = 'a.is_active = 1 AND a.is_archived = 0';
    }

    if ($type && in_array($type, ['offer', 'search'])) {
        $where[] = 'a.type = ?';
        $params[] = $type;
    }

    if ($userId) {
        $where[] = 'a.user_id = ?';
        $params[] = $userId;
    }

    if ($search) {
        $where[] = '(a.short_description LIKE ? OR a.long_description LIKE ? OR p.display_name LIKE ?)';
        $searchWild = '%' . $search . '%';
        $params[] = $searchWild;
        $params[] = $searchWild;
        $params[] = $searchWild;
    }

    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    // Sortierung: Aktive Boosts zuerst, danach neueste
    $sql = "
        SELECT a.*,
                (SELECT COUNT(*) FROM favorites f WHERE f.ad_id = a.id) as favorite_count,
               p.display_name, p.first_name, p.last_name, p.avatar_url, p.avatar_type,
               p.banner_color, p.average_rating, p.is_verified, p.is_coach as user_is_coach,
               p.grade_level as user_grade, p.class_letter as user_class,
               p.settings as user_settings, p.availability as user_availability
        FROM ads a
        JOIN profiles p ON p.id = a.user_id
        $whereClause
        ORDER BY
            (CASE WHEN a.boosted = 1 AND a.boosted_until > NOW() THEN 1 ELSE 0 END) DESC,
            a.created_at DESC
        LIMIT 200
    ";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('ads list failed: ' . $e->getMessage());
        json_error('Anzeigen konnten nicht geladen werden.', 500, ['code' => 'ads_query_failed']);
    }

    $results = [];
    foreach ($rows as $row) {
        $subjects = json_decode($row['subjects'] ?? '[]', true) ?: [];
        $gradeLevels = json_decode($row['grade_levels'] ?? '[]', true) ?: [];

        // Clientseitiges Filtern von JSON-Arrays, falls Parameter gesetzt
        if ($subject && !in_array($subject, $subjects)) {
            continue;
        }
        if ($grade && !in_array($grade, $gradeLevels)) {
            continue;
        }

        $row['subjects'] = $subjects;
        $row['grade_levels'] = $gradeLevels;
        $row['locations'] = json_decode($row['locations'] ?? '[]', true) ?: [];
        $row['price_details'] = json_decode($row['price_details'] ?? '{}', true) ?: [];
        $row['duration_minutes'] = json_decode($row['duration_minutes'] ?? '[]', true) ?: [];
        $row['image_urls'] = json_decode($row['image_urls'] ?? '[]', true) ?: [];
        
        $row['is_boosted'] = !empty($row['boosted']) && !empty($row['boosted_until']) && strtotime($row['boosted_until']) > time();
        $row['favorite_count'] = isset($row['favorite_count']) ? (int)$row['favorite_count'] : 0;
        $userSettings = json_decode($row['user_settings'] ?? '{}', true) ?: [];
        $row['user_settings'] = $userSettings;

        $row['profiles'] = [
            'id' => $row['user_id'],
            'display_name' => $row['display_name'],
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'avatar_url' => $row['avatar_url'],
            'avatar_type' => $row['avatar_type'],
            'banner_color' => $row['banner_color'],
            'average_rating' => (float)$row['average_rating'],
            'is_verified' => (bool)$row['is_verified'],
            'is_coach' => !empty($row['user_is_coach']) || !empty($userSettings['is_coach']),
            'availability' => !empty($row['user_availability']) ? json_decode($row['user_availability'], true) : (!empty($userSettings['availability']) ? $userSettings['availability'] : null),
            'grade_level' => $row['user_grade'],
            'class_letter' => $row['user_class']
        ];

        $results[] = $row;
    }

    json_response($results);
}

// ------------------------------------------------------------------------------
// 1b. POST ?action=view: ANONYMER AUFRUFZÄHLER (kein Login nötig)
// ------------------------------------------------------------------------------
if ($action === 'view' && $method === 'POST') {
    $data = get_json_input();
    $viewId = $data['ad_id'] ?? $id;
    if (!empty($viewId)) {
        try {
            $pdo->prepare('UPDATE ads SET view_count = view_count + 1 WHERE id = ?')->execute([$viewId]);
        } catch (Exception $e) {}
    }
    json_response(['ok' => true]);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUE ANZEIGE ERSTELLEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $user = require_auth();
    $data = get_json_input();

    // Verifizierungs-Gate (Backend-Enforcement zum Frontend-Check in CreateAd):
    // Nur verifizierte Nutzer oder Eltern-Accounts dürfen Anzeigen erstellen.
    try {
        $vStmt = $pdo->prepare('SELECT role, is_verified FROM profiles WHERE id = ?');
        $vStmt->execute([$user['id']]);
        $vRow = $vStmt->fetch();
        $vRole = $vRow['role'] ?? '';
        $vVerified = !empty($vRow['is_verified']);
        if ($vRole !== 'parent' && !$vVerified) {
            json_error('Dein Account ist noch nicht verifiziert. Bitte lasse dich im SV-Raum verifizieren, um Anzeigen zu erstellen.', 403);
        }
    } catch (Exception $e) {
        error_log('Ads verification check error: ' . $e->getMessage());
        json_error('Verifizierung konnte nicht geprüft werden. Bitte später erneut versuchen.', 500);
    }

    // Eltern legen Anzeigen im Namen ihres Kindes an: user_id im Body erlaubt
    // die Attribution aufs Kind – aber nur bei aktiver Verknüpfung.
    $ownerId = $user['id'];
    $requestedOwner = trim((string)($data['user_id'] ?? ''));
    if ($requestedOwner !== '' && $requestedOwner !== $user['id']) {
        fwg_assert_parent_of($requestedOwner, 'can_view_ads');
        $ownerId = $requestedOwner;
    }

    $type = $data['type'] ?? 'offer';
    if (!in_array($type, ['offer', 'search'])) {
        json_error('Ungültiger Anzeigentyp.');
    }

    // Unterrichts-Format: 'single' (Einzel), 'group' (Kleingruppe), 'any' (Egal).
    $sessionFormat = $data['session_format'] ?? 'any';
    if (!in_array($sessionFormat, ['single', 'group', 'any'])) {
        $sessionFormat = 'any';
    }

    $subjects = is_array($data['subjects'] ?? null) ? array_slice($data['subjects'], 0, 10) : [];
    if (empty($subjects)) {
        json_error('Mindestens ein Fach muss angegeben werden.');
    }
    foreach ($subjects as $s) {
        if (!is_string($s) || mb_strlen($s) > 40) json_error('Ungültiges Fach.');
    }

    $gradeLevels = is_array($data['grade_levels'] ?? null) ? array_slice($data['grade_levels'], 0, 12) : [];
    $locations = is_array($data['locations'] ?? null) ? array_slice($data['locations'], 0, 10) : [];
    $customLocation = mb_substr(trim($data['custom_location'] ?? ''), 0, 120);
    $priceDetails = is_array($data['price_details'] ?? null) ? $data['price_details'] : [];
    $durationMinutes = is_array($data['duration_minutes'] ?? null) ? array_slice($data['duration_minutes'], 0, 6) : [45];
    $shortDesc = mb_substr(trim($data['short_description'] ?? ''), 0, 140);
    $longDesc = mb_substr(trim($data['long_description'] ?? ''), 0, 8000);
    $imageUrls = is_array($data['image_urls'] ?? null) ? array_slice($data['image_urls'], 0, 5) : [];
    foreach ($imageUrls as $u) {
        if (!is_string($u) || mb_strlen($u) > 2000 || !preg_match('#^https://#i', $u)) {
            json_error('Ungültige Bild-URL (nur https, max. 5 Bilder).');
        }
    }
    if ($shortDesc === '') {
        json_error('Kurzbeschreibung ist erforderlich.');
    }

    // Hinweis: Aktions-/Promo-Codes für Anzeigen wurden ersatzlos entfernt.
    // Neue Anzeigen starten immer ohne Hervorhebung (Boost nur noch über
    // Coach-Status oder SV-Admin). Mitgesendete Promo-Felder werden ignoriert.
    $isBoosted = 0;
    $boostedUntil = null;
    $usedPromoCode = null;

    // Spam-Schutz: max. 10 aktive Anzeigen pro Nutzer
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ads WHERE user_id = ? AND is_active = 1 AND is_archived = 0');
    $countStmt->execute([$ownerId]);
    if ((int)$countStmt->fetchColumn() >= 10) {
        json_error('Es sind bereits 10 aktive Anzeigen hinterlegt. Archiviere zuerst eine alte Anzeige.', 429);
    }

    $adId = generate_uuid();
    $stmt = $pdo->prepare('
        INSERT INTO ads (
            id, user_id, type, session_format, subjects, grade_levels, locations, custom_location,
            price_details, duration_minutes, short_description, long_description,
            image_urls, is_active, is_archived, boosted, boosted_until, promo_code_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
    ');

    $stmt->execute([
        $adId,
        $ownerId,
        $type,
        $sessionFormat,
        json_encode($subjects),
        json_encode($gradeLevels),
        json_encode($locations),
        $customLocation,
        json_encode($priceDetails),
        json_encode($durationMinutes),
        $shortDesc,
        $longDesc,
        json_encode($imageUrls),
        $isBoosted,
        $boostedUntil,
        $usedPromoCode
    ]);

    // B4: Gespeicherte Suchen auf die neue Anzeige prüfen und benachrichtigen
    // (max. 1 Benachrichtigung pro Suche/24 h über last_notified_at).
    try {
        $savedStmt = $pdo->prepare('
            SELECT id, user_id, query
            FROM saved_searches
            WHERE user_id <> ?
              AND (last_notified_at IS NULL OR last_notified_at < DATE_SUB(NOW(), INTERVAL 24 HOUR))
        ');
        $savedStmt->execute([$ownerId]);
        foreach ($savedStmt->fetchAll() as $saved) {
            $q = json_decode((string)$saved['query'], true);
            if (!is_array($q)) continue;
            if (!fwg_saved_search_matches($q, $type, $subjects, $gradeLevels, $priceDetails)) continue;

            $pdo->prepare('
                INSERT INTO notifications (id, user_id, type, title, message, data)
                VALUES (?, ?, "info", ?, ?, ?)
            ')->execute([
                generate_uuid(),
                $saved['user_id'],
                'Neue Anzeige zu deiner gemerkten Suche',
                '„' . mb_substr($shortDesc, 0, 120) . '“ passt zu deiner gemerkten Suche.',
                json_encode(['link' => '/#/'])
            ]);
            $pdo->prepare('UPDATE saved_searches SET last_notified_at = NOW() WHERE id = ?')->execute([$saved['id']]);
        }
    } catch (Throwable $e) {
        // Benachrichtigungen dürfen das Erstellen der Anzeige nie verhindern.
        error_log('saved search notify failed: ' . $e->getMessage());
    }

    // Eltern des Kindes informieren, dass eine neue Anzeige online ist.
    // (Der handelnde Elternteil selbst wird übersprungen.)
    fwg_notify_parents(
        $pdo,
        $ownerId,
        'parent_ad',
        'Neue Anzeige Ihres Kindes',
        'Für Ihr Kind wurde eine neue Anzeige veröffentlicht: „' . mb_substr($shortDesc, 0, 100) . '“.',
        ['ad_id' => $adId, 'link' => '/#/parent-dashboard'],
        $ownerId === $user['id'] ? '' : (string)$user['id']
    );

    json_response([
        'id' => $adId,
        'message' => 'Anzeige erfolgreich erstellt!',
        'boosted' => (bool)$isBoosted
    ], 201);
}

// ------------------------------------------------------------------------------
// 3. PUT / PATCH: ANZEIGE AKTUALISIEREN
// ------------------------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH') {
    $user = require_auth();
    if (!$id) {
        json_error('Anzeigen-ID erforderlich.');
    }

    // Prüfen, ob Anzeige existiert und dem User gehört (oder SV-Admin)
    $check = $pdo->prepare('SELECT user_id FROM ads WHERE id = ?');
    $check->execute([$id]);
    $ad = $check->fetch();

    if (!$ad) {
        json_error('Anzeige nicht gefunden.', 404);
    }
    if ($ad['user_id'] !== $user['id'] && $user['role'] !== 'sv_admin') {
        json_error('Keine Berechtigung zur Bearbeitung dieser Anzeige.', 403);
    }

    $data = get_json_input();
    $fields = [];
    $params = [];

    $updatable = [
        'type', 'session_format', 'custom_location', 'short_description', 'long_description',
        'is_active', 'is_archived'
    ];
    foreach ($updatable as $f) {
        if (isset($data[$f])) {
            if ($f === 'session_format' && !in_array($data[$f], ['single', 'group', 'any'])) {
                continue;
            }
            $fields[] = "`$f` = ?";
            $params[] = $data[$f];
        }
    }

    $jsonFields = ['subjects', 'grade_levels', 'locations', 'price_details', 'duration_minutes', 'image_urls'];
    foreach ($jsonFields as $jf) {
        if (isset($data[$jf])) {
            $fields[] = "`$jf` = ?";
            $params[] = json_encode($data[$jf]);
        }
    }

    if (empty($fields)) {
        json_error('Keine Änderungen übermittelt.');
    }

    $params[] = $id;
    $sql = 'UPDATE ads SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    json_response(['message' => 'Anzeige erfolgreich aktualisiert.']);
}

// ------------------------------------------------------------------------------
// 4. DELETE: ANZEIGE LÖSCHEN
// ------------------------------------------------------------------------------
if ($method === 'DELETE') {
    $user = require_auth();
    if (!$id) {
        json_error('Anzeigen-ID erforderlich.');
    }

    $check = $pdo->prepare('SELECT user_id FROM ads WHERE id = ?');
    $check->execute([$id]);
    $ad = $check->fetch();

    if (!$ad) {
        json_error('Anzeige nicht gefunden.', 404);
    }
    if ($ad['user_id'] !== $user['id'] && $user['role'] !== 'sv_admin') {
        json_error('Keine Berechtigung zum Löschen.', 403);
    }

    $del = $pdo->prepare('DELETE FROM ads WHERE id = ?');
    $del->execute([$id]);

    json_response(['message' => 'Anzeige erfolgreich gelöscht.']);
}

json_error('Methode nicht erlaubt.', 405);
