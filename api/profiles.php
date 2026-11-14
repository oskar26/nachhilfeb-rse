<?php
// ==============================================================================
// FWG Nachhilfebörse - Profiles API (Get, Update, Public Profile, Coach AG)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/ratelimit.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

// Auto-migration helper for is_coach and availability columns
try {
    $pdo->query("SELECT is_coach, availability FROM profiles LIMIT 0");
} catch (Exception $e) {
    try {
        $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_coach TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Exception $ex) {}
    try {
        $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSON DEFAULT NULL");
    } catch (Exception $ex) {}
}

// Auto-Migration: app_settings Tabelle
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(64) PRIMARY KEY,
            setting_value LONGTEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by VARCHAR(36) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {}

// Auto-Migration: avatar_url als MEDIUMTEXT, damit data:-URLs bis 500.000
// Zeichen gespeichert werden können (nur ändern, wenn noch nicht geschehen).
try {
    $avatarColumn = $pdo->query("SHOW COLUMNS FROM profiles LIKE 'avatar_url'")->fetch();
    if ($avatarColumn && stripos((string)($avatarColumn['Type'] ?? ''), 'mediumtext') === false) {
        $pdo->exec("ALTER TABLE profiles MODIFY avatar_url MEDIUMTEXT NULL");
    }
} catch (Exception $ex) {}

// Auto-Migration: Statistik-Widerspruch
try {
    $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_opt_out TINYINT(1) NOT NULL DEFAULT 0 AFTER settings");
} catch (Exception $ex) {}

// Datenschutz-Helfer: Kontaktdaten nur bei angenommener/abgeschlossener Anfrage
function fwg_profiles_has_accepted_relationship(PDO $pdo, string $viewerId, string $profileId): bool {
    if ($viewerId === '' || $profileId === '') return false;
    if ($viewerId === $profileId) return true;
    try {
        $stmt = $pdo->prepare("
            SELECT 1 FROM ad_requests
            WHERE ((requester_id = ? AND owner_id = ?) OR (requester_id = ? AND owner_id = ?))
              AND status IN ('accepted', 'completed')
            LIMIT 1
        ");
        $stmt->execute([$viewerId, $profileId, $profileId, $viewerId]);
        return (bool)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

function fwg_profiles_last_name_initial(?string $lastName): ?string {
    $lastName = trim((string)$lastName);
    if ($lastName === '') return null;
    return mb_strtoupper(mb_substr($lastName, 0, 1, 'UTF-8'), 'UTF-8') . '.';
}

function fwg_avatar_type_from_url(string $url): string {
    if (preg_match('#^data:image/svg\+xml;#i', $url)) return 'svg';
    if (stripos($url, 'data:image/') === 0) return 'upload';
    return 'url';
}

// Auto-Migration: parent_link_code Spalte (Eltern-Verknüpfungscode)
try {
    $pdo->query("SELECT parent_link_code FROM profiles LIMIT 0");
} catch (Exception $e) {
    try {
        $pdo->exec("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_link_code VARCHAR(10) NULL");
    } catch (Exception $ex) {
        try {
            $pdo->exec("ALTER TABLE profiles ADD COLUMN parent_link_code VARCHAR(10) NULL");
        } catch (Exception $ex2) {}
    }
    try {
        $pdo->exec("ALTER TABLE profiles ADD UNIQUE INDEX idx_profiles_parent_code (parent_link_code)");
    } catch (Exception $ex3) {}
}

// Auto-Migration: parent_links Tabelle (Eltern-Verknüpfung, fehlte in sql-updates 001-008)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parent_links (
            id VARCHAR(36) NOT NULL,
            parent_id VARCHAR(36) NOT NULL,
            child_id VARCHAR(36) NOT NULL,
            status ENUM('pending', 'active', 'revoked') NOT NULL DEFAULT 'pending',
            permissions JSON DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            linked_at DATETIME DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY idx_parent_child (parent_id, child_id),
            CONSTRAINT fk_pl_parent FOREIGN KEY (parent_id) REFERENCES profiles (id) ON DELETE CASCADE,
            CONSTRAINT fk_pl_child FOREIGN KEY (child_id) REFERENCES profiles (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {
    // Fallback ohne FK-Constraints (falls Constraint-Namen im Schema kollidieren)
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS parent_links (
                id VARCHAR(36) NOT NULL,
                parent_id VARCHAR(36) NOT NULL,
                child_id VARCHAR(36) NOT NULL,
                status ENUM('pending', 'active', 'revoked') NOT NULL DEFAULT 'pending',
                permissions JSON DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                linked_at DATETIME DEFAULT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY idx_parent_child (parent_id, child_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $ex2) {}
}

// ------------------------------------------------------------------------------
// 0b. (entfernt) Eltern-Verknüpfung: Code-Lookup, Direktsuche, Code-Erzeugung, Link-CRUD
// Das Eltern-Konto- und Verknüpfungssystem wurde am 11.10.2026 entfernt; die
// Schema-Migrationen oben bleiben bestehen, es werden keine Drops ausgeführt.
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// 1. GET: PROFIL ABRUFEN ODER COACH-SCHÜLERLISTE
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // 1a. Schülerliste für Coach-Admin (Frau Balistreri) & SV-Admin
    if ($action === 'coach_students') {
        $currentUser = require_coach_or_admin();
        $stmt = $pdo->query('
            SELECT p.id, p.first_name, p.last_name, p.display_name, p.grade_level, p.class_letter,
                   p.role, p.is_verified, p.is_coach, p.avatar_url, p.avatar_type, p.banner_color,
                   p.settings,
                   (SELECT COUNT(*) FROM ads a WHERE a.user_id = p.id AND a.is_active = 1 AND a.is_archived = 0) as active_ads_count
            FROM profiles p
            WHERE p.role != "parent"
            ORDER BY p.is_coach DESC, p.grade_level DESC, p.last_name ASC, p.first_name ASC
        ');
        $students = $stmt->fetchAll();
        foreach ($students as &$s) {
            $settings = json_decode($s['settings'] ?? '{}', true) ?: [];
            $s['is_coach'] = !empty($s['is_coach']) || !empty($settings['is_coach']);
            $s['is_verified'] = (bool)$s['is_verified'];
            unset($s['settings']);
        }
        json_response($students);
    }

    // 1b. Coach-Aktivitäten-Log für Frau Balistreri
    if ($action === 'coach_log') {
        $currentUser = require_coach_or_admin();
        $stmt = $pdo->query('
            SELECT l.*, a.display_name as admin_name
            FROM admin_audit_log l
            LEFT JOIN profiles a ON a.id = l.admin_id
            WHERE l.action LIKE "coach_%" OR l.action LIKE "verify_%"
            ORDER BY l.created_at DESC
            LIMIT 50
        ');
        $logs = $stmt->fetchAll();
        foreach ($logs as &$l) {
            $l['details'] = json_decode($l['details'] ?? '{}', true);
        }
        json_response($logs);
    }

    // 1c. Coaching-AG Startseiten-Informationen (öffentlich lesbar)
    if ($action === 'coach_info') {
        $defaultInfo = [
            'title' => 'Coaching-AG für Klasse 5 und 6',
            'description' => 'Wöchentlich einmal bieten wir für alle Schülerinnen und Schüler der Jahrgangsstufen 5 und 6 die Möglichkeit, Hilfen zu einzelnen Fächern oder zur Lern- und Arbeitsorganisation allgemein durch Schülerinnen und Schüler der 8. Klassen zu erhalten. Diese werden jeweils vor den Herbstferien für ihre Aufgabe geschult und stellen dann bis zum Ende des Schuljahres ehrenamtlich ihre Hilfe zur Verfügung. Dieses Angebot wird in der Regel sehr gerne angenommen, da die Coaches einen guten Blick auf die Probleme der jüngeren Schüler haben.',
            'time' => 'Dienstags, 13:45 - 14:30 Uhr',
            'room' => 'Raum H310',
            'is_visible' => true,
            'updated_at' => null,
            'updated_by_name' => null
        ];

        try {
            $stmt = $pdo->prepare('
                SELECT s.setting_value, s.updated_at, p.display_name as updated_by_name
                FROM app_settings s
                LEFT JOIN profiles p ON p.id = s.updated_by
                WHERE s.setting_key = "coach_info"
            ');
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && !empty($row['setting_value'])) {
                $val = json_decode($row['setting_value'], true);
                if (is_array($val)) {
                    $defaultInfo = array_merge($defaultInfo, $val);
                    $defaultInfo['updated_at'] = $row['updated_at'];
                    $defaultInfo['updated_by_name'] = $row['updated_by_name'];
                }
            }
        } catch (Exception $e) {}

        json_response($defaultInfo);
    }

    // 1d. Coaching-Seiten-Inhalte (öffentlich) – muss VOR dem Profil-Catch-All laufen
    if ($action === 'coaching_page') {
        $page = fwg_coaching_page_defaults();
        try {
            $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = "coaching_page"');
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && !empty($row['setting_value'])) {
                $val = json_decode($row['setting_value'], true);
                if (is_array($val)) {
                    foreach ($page as $k => $v) {
                        if (array_key_exists($k, $val) && is_string($val[$k])) {
                            $page[$k] = $val[$k];
                        }
                    }
                    if (isset($val['content_json']) && is_string($val['content_json']) && strlen($val['content_json']) <= 153600) {
                        $content = json_decode($val['content_json']);
                        if (is_object($content)) {
                            $page['content_json'] = $val['content_json'];
                        }
                    }
                }
            }
        } catch (Exception $e) {}
        json_response($page);
    }

    // 1e. Einzelnes Profil
    if (!$id) {
        $currentUser = require_auth();
        $id = $currentUser['id'];
    }

    $stmt = $pdo->prepare('
        SELECT p.*,
               (SELECT COUNT(*) FROM ads a WHERE a.user_id = p.id AND a.is_active = 1 AND a.is_archived = 0) as active_ads_count,
               (SELECT COUNT(*) FROM reviews r WHERE r.target_user_id = p.id) as reviews_count
        FROM profiles p
        WHERE p.id = ?
    ');
    $stmt->execute([$id]);
    $profile = $stmt->fetch();

    if (!$profile) {
        json_error('Profil nicht gefunden.', 404);
    }

    $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true) ?: [];
    $profile['settings'] = json_decode($profile['settings'] ?? '{}', true) ?: [];
    $profile['teaches_subjects'] = fwg_sanitize_feed_subjects($profile['settings']['teaches_subjects'] ?? []);
    $profile['average_rating'] = (float)$profile['average_rating'];
    $profile['is_verified'] = (bool)$profile['is_verified'];
    $profile['is_banned'] = (bool)$profile['is_banned'];
    $profile['is_coach'] = !empty($profile['is_coach']) || !empty($profile['settings']['is_coach']);

    // Verfügbarkeitszeiten dekodieren
    if (!empty($profile['availability'])) {
        $profile['availability'] = json_decode($profile['availability'], true);
    } else if (!empty($profile['settings']['availability'])) {
        $profile['availability'] = $profile['settings']['availability'];
    } else {
        $profile['availability'] = null;
    }

    // Datenschutz: Kontaktdaten nur anzeigen für Owner, SV-Admin oder wenn eine
    // angenommene/abgeschlossene Anfrage zwischen Betrachter und Profil besteht.
    // Zusätzlich müssen die Sichtbarkeits-Flags im Profil aktiv sein.
    $currentUser = get_auth_user();
    $viewerId = (string)($currentUser['id'] ?? '');
    $isOwner = $currentUser && ((string)$currentUser['id'] === (string)$id);
    $isStaff = $currentUser && in_array((string)$currentUser['role'], ['sv_admin', 'coach_admin'], true);
    $isSvAdmin = $currentUser && ((string)$currentUser['role'] === 'sv_admin');
    $hasRelationship = $currentUser && !$isOwner
        && fwg_profiles_has_accepted_relationship($pdo, $viewerId, (string)$id);

    if (!$isOwner) {
        // A4: private Zusatzkontakte auch serverseitig nullen
        if (!empty($profile['settings']['custom_contacts']) && is_array($profile['settings']['custom_contacts'])) {
            foreach ($profile['settings']['custom_contacts'] as $i => $contact) {
                if (empty($contact['is_public'])) {
                    $profile['settings']['custom_contacts'][$i]['value'] = null;
                }
            }
        }
    }

    $canSeeContact = $isOwner || $isSvAdmin || $hasRelationship;
    if (!$canSeeContact) {
        $profile['email'] = null;
        $profile['phone_number'] = null;
    } elseif (!$isOwner && !$isSvAdmin) {
        if (empty($profile['settings']['email_visible'])) {
            $profile['email'] = null;
        }
        if (empty($profile['settings']['phone_visible'])) {
            $profile['phone_number'] = null;
        }
    }

    // Nachnamen fremder Profile nur als Initial ausgeben (Owner und Staff sehen
    // den vollständigen Namen; angenommene Anfragen schalten ihn ebenfalls frei).
    if (!$isOwner && !$isStaff && !$hasRelationship) {
        $profile['last_name'] = fwg_profiles_last_name_initial($profile['last_name'] ?? null);
    }

    // Datenschutz: interne/sensible Felder nur für den Eigentümer oder das SV-Admin-Team ausliefern
    $isOwnerOrSvAdmin = $currentUser && ($currentUser['id'] === $id || $currentUser['role'] === 'sv_admin');
    if (!$isOwnerOrSvAdmin) {
        unset(
            $profile['birth_date'],
            $profile['ban_reason'],
            $profile['banned_until'],
            $profile['parental_consent_given'],
            $profile['parental_consent_date'],
            $profile['moodle_name'],
            $profile['contact_other'],
            $profile['parent_link_code']
        );
    }

    json_response($profile);
}

// ------------------------------------------------------------------------------
// 2. COACH-INFO AKTUALISIEREN (NUR COACH-ADMIN ODER SV-ADMIN)
// ------------------------------------------------------------------------------
if ($action === 'coach_info' && ($method === 'POST' || $method === 'PUT')) {
    $currentUser = require_coach_or_admin();
    $data = get_json_input();

    $info = [
        'title' => trim($data['title'] ?? 'Coaching-AG für Klasse 5 und 6'),
        'description' => trim($data['description'] ?? ''),
        'time' => trim($data['time'] ?? 'Dienstags, 13:45 - 14:30 Uhr'),
        'room' => trim($data['room'] ?? 'Raum H310'),
        'is_visible' => isset($data['is_visible']) ? (bool)$data['is_visible'] : true
    ];

    $jsonVal = json_encode($info, JSON_UNESCAPED_UNICODE);

    $stmt = $pdo->prepare('
        INSERT INTO app_settings (setting_key, setting_value, updated_at, updated_by)
        VALUES ("coach_info", ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
    ');
    $stmt->execute([$jsonVal, $currentUser['id']]);

    // In admin_audit_log schreiben
    try {
        $pdo->prepare('
            INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
            VALUES (?, ?, "coach_info_update", "setting", "coach_info", ?)
        ')->execute([
            generate_uuid(),
            $currentUser['id'],
            json_encode([
                'title' => $info['title'],
                'time' => $info['time'],
                'room' => $info['room'],
                'is_visible' => $info['is_visible'],
                'editor_name' => $currentUser['display_name'] ?: $currentUser['email'],
                'editor_role' => $currentUser['role']
            ], JSON_UNESCAPED_UNICODE)
        ]);
    } catch (Exception $e) {
        error_log('Audit log error on coach_info_update: ' . $e->getMessage());
    }

    json_response([
        'message' => 'Coaching-AG Startseiten-Infos aktualisiert.',
        'info' => $info
    ]);
}

// ------------------------------------------------------------------------------
// 2b. COACHING-SEITEN-TEXTE (öffentlich lesen, NUR COACH-ADMIN/SV-ADMIN schreiben)
// Alle Inhalte der /coaching-Seite, editierbar über das Coach-Panel (Tab Seite).
// ------------------------------------------------------------------------------
function fwg_coaching_page_defaults() {
    return [
        'hero_title' => 'Coaching-AG am FWG',
        'hero_subtitle' => "Ältere unterstützen Jüngere: Geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen die Klassen 5 und 6 beim Ankommen am Friedrich-Wilhelm-Gymnasium Köln. Ehrenamtlich, pädagogisch begleitet und für alle nach denselben fairen Regeln.",
        's_badge_title' => 'Was bedeutet das Coach-Abzeichen?',
        's_badge_body' => "Das Coach-Abzeichen auf Profilen und Anzeigen zeigt: Diese Person ist aktives Mitglied der Coaching-AG, wurde von der AG-Leitung geschult und vom SV-Team verifiziert.\n\nDas Abzeichen belegt Schulung und Verifizierung, nicht die Qualität der Nachhilfe. Preise und Absprachen bleiben Sache der Beteiligten (siehe Nutzungsbedingungen).",
        's_school_title' => 'Die Coaching-AG an unserer Schule',
        's_school_body' => "Die Coaching-AG ist ein schulisches Angebot des FWG: Jeden Dienstag von 13:45 bis 14:30 Uhr in Raum H310 helfen geschulte Schülerinnen und Schüler ab Klasse 8 den Klassen 5 und 6, bei einzelnen Fächern oder bei der Lern- und Arbeitsorganisation. Die Coaches werden jeweils vor den Herbstferien geschult und engagieren sich ehrenamtlich bis zum Ende des Schuljahres. Die Coaches kennen den Schulalltag der jüngeren Schülerinnen und Schüler.\n\nMehr dazu auf der Schul-Website: fwg-koeln.de/lebendige-schule/foerdern-und-fordern/coaching. Diese Nachhilfebörse der SV ergänzt das Angebot: Hier finden alle Jahrgangsstufen individuelle Nachhilfe. Die Coaches der AG sind besonders sichtbar, damit man sie leicht findet.",
        's_who_title' => 'Wer kann Coach werden?',
        's_who_body' => "• Schülerin oder Schüler des FWG ab Klasse 8\n• Teilnahme an der Coach-Schulung der AG-Leitung (findet jeweils vor den Herbstferien statt)\n• Zuverlässigkeit und respektvoller Umgang, auch auf der Plattform\n• Verifiziertes Konto auf der Nachhilfebörse\n\nInteressiert? Wende dich an Frau Balistreri oder sprich das SV-Team im SV-Raum an. Die Aufnahme erfolgt nach der Schulung über einen persönlichen Coaching-Code. Für alle gelten dieselben Kriterien.",
        's_boost_title' => 'Warum stehen manche Anzeigen oben?',
        's_boost_body' => "Anzeigen mit dem Hinweis „Hervorgehoben“ erhalten eine bessere Platzierung und eine gelbe Markierung. Das passiert ausschließlich in zwei Fällen:\n\n• Coach-Status: Nach Einlösen eines Coaching-Codes werden Anzeigen des Coaches für 30 Tage hervorgehoben.\n• SV-Aktionen: Zeitlich begrenzte Hinweise des SV-Teams (z. B. zum Schuljahresstart).\n\nEs gibt keine bezahlten Platzierungen und keine Werbung. Anzeigen von Coaches werden etwas höher einsortiert, solange der Coach-Status aktiv ist. Die Regeln für die Platzierung stehen auf dieser Seite.",
        's_fair_title' => 'Gleiche Chancen für alle',
        's_fair_body' => "• Das Erstellen einer Anzeige ist kostenlos, mit oder ohne Abzeichen. Die Nachhilfe wird privat bezahlt.\n• Der Filter „Nur Coaches“ hilft beim Finden geprüfter Coaches, blendet aber niemanden aus: Alle Anzeigen bleiben für alle sichtbar.\n• Codes sind personenbezogen und begrenzt (in der Regel einmalig einlösbar) und werden nur nach Schulung vergeben, nicht auf Zuruf oder gegen Gegenleistung.\n• Die Vergabe von Codes und Coach-Status wird protokolliert und kann vom SV-Team geprüft werden.\n• Anzeigen von Coaches werden etwas höher einsortiert, solange der Coach-Status aktiv ist.",
        's_conduct_title' => 'Verhalten als Coach',
        's_conduct_body' => "• Respektvoller, geduldiger Umgang, besonders mit jüngeren Schülerinnen und Schülern\n• Keine falschen Versprechen zu besseren Noten\n• Treffen möglichst in der Schule (z. B. Bibliothek, Mensa); private Treffen nur mit Wissen der Eltern\n• Bei Problemen: frühzeitig die AG-Leitung oder das SV-Team ansprechen",
        's_revoke_title' => 'Entzug des Status & Widerspruch',
        's_revoke_body' => "Bei Verstößen gegen diese Regeln oder die Nutzungsbedingungen (z. B. unzuverlässiges Verhalten, Missbrauch des Abzeichens, unangemessene Inhalte) kann die AG-Leitung oder das SV-Team den Coach-Status entziehen. Du bekommst eine kurze Begründung direkt in der App oder per E-Mail.\n\nDagegen kannst du Widerspruch einlegen: Schreibe an info@nachhilfe-sv.de oder komme im SV-Raum vorbei. Das SV-Team prüft jeden Fall erneut.",
        'contact_text' => 'AG-Leitung: Frau Balistreri · SV-Lehrer: Herr Schulz, Herr Steinberg',
    ];
}

if ($action === 'coaching_page' && ($method === 'POST' || $method === 'PUT')) {
    $currentUser = require_coach_or_admin();
    $data = get_json_input();
    $defaults = fwg_coaching_page_defaults();
    $page = [];
    foreach ($defaults as $k => $v) {
        if (!array_key_exists($k, $data)) {
            $raw = $v;
        } elseif (!is_string($data[$k])) {
            json_error('Ungültiger Textwert für ' . $k . '.', 400);
            $raw = '';
        } else {
            $raw = trim($data[$k]);
        }
        $isTitle = (bool)preg_match('/(_title|^hero_title|contact_text)$/', $k);
        $page[$k] = mb_substr($raw, 0, $isTitle ? 200 : 8000);
    }
    if (!array_key_exists('content_json', $data)) {
        try {
            $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = "coaching_page"');
            $stmt->execute();
            $row = $stmt->fetch();
            $stored = $row ? json_decode($row['setting_value'], true) : null;
            if (is_array($stored) && isset($stored['content_json']) && is_string($stored['content_json']) && strlen($stored['content_json']) <= 153600) {
                $content = json_decode($stored['content_json']);
                if (is_object($content)) {
                    $page['content_json'] = $stored['content_json'];
                }
            }
        } catch (Exception $e) {}
    }
    if (array_key_exists('content_json', $data)) {
        if (!is_string($data['content_json'])) {
            json_error('Coaching-Inhalte müssen als JSON-Objekt übermittelt werden.', 400);
        }
        $contentJson = trim($data['content_json']);
        if (strlen($contentJson) > 153600) {
            json_error('Die Coaching-Inhalte sind zu umfangreich.', 413);
        }
        $content = json_decode($contentJson);
        if (!is_object($content)) {
            json_error('Coaching-Inhalte müssen als gültiges JSON-Objekt übermittelt werden.', 400);
        }
        $page['content_json'] = $contentJson;
    }
    $jsonVal = json_encode($page, JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare('
        INSERT INTO app_settings (setting_key, setting_value, updated_at, updated_by)
        VALUES ("coaching_page", ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
    ');
    $stmt->execute([$jsonVal, $currentUser['id']]);
    try {
        $pdo->prepare('
            INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
            VALUES (?, ?, "coach_page_update", "setting", "coaching_page", ?)
        ')->execute([
            generate_uuid(),
            $currentUser['id'],
            json_encode([
                'editor_name' => $currentUser['display_name'] ?: $currentUser['email'],
                'editor_role' => $currentUser['role']
            ], JSON_UNESCAPED_UNICODE)
        ]);
    } catch (Exception $e) {
        error_log('Audit log error on coach_page_update: ' . $e->getMessage());
    }
    json_response(['message' => 'Coaching-Inhalte erfolgreich aktualisiert.', 'page' => $page]);
}

// ------------------------------------------------------------------------------
// 3. PUT / PATCH: PROFIL AKTUALISIEREN
// ------------------------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH') {
    $user = require_auth();
    $targetId = $id ?: $user['id'];

    $isSelf = $targetId === $user['id'];
    $isSvAdmin = $user['role'] === 'sv_admin';
    $isCoachAdmin = $user['role'] === 'coach_admin';

    if (!$isSelf && !$isSvAdmin && !$isCoachAdmin) {
        json_error('Keine Berechtigung zur Aktualisierung dieses Profils.', 403, ['code' => 'forbidden']);
    }

    $data = get_json_input();
    $fields = [];
    $params = [];

    $textFields = [
        'first_name', 'last_name', 'display_name', 'grade_level', 'class_letter',
        'bio', 'moodle_name', 'phone_number', 'contact_other', 'avatar_url',
        'banner_color', 'birth_date'
    ];

    $textLimits = [
        'first_name' => 80, 'last_name' => 80, 'display_name' => 80,
        'grade_level' => 10, 'class_letter' => 5, 'bio' => 5000,
        'moodle_name' => 120, 'phone_number' => 40, 'contact_other' => 300,
        'avatar_url' => 2000, 'avatar_type' => 20, 'banner_color' => 20,
        'birth_date' => 10,
    ];
    if ($isSelf || $isSvAdmin) {
        foreach ($textFields as $tf) {
            if (array_key_exists($tf, $data)) {
                $val = $data[$tf];
                if ($val !== null && !is_string($val)) {
                    json_error('Ungültiger Wert für ' . $tf . '.', 400);
                }
                if (is_string($val)) {
                    if ($tf === 'avatar_url') {
                        $val = trim($val);
                        if ($val !== '' && strncasecmp($val, 'data:image/', 11) === 0) {
                            // Sichere, Base64-kodierte Bild-Daten-URLs (max. 500.000 Zeichen).
                            if (strlen($val) > 500000) {
                                json_error('Avatar-Daten-URL darf maximal 500.000 Zeichen lang sein.', 400);
                            }
                            if (!preg_match('#^data:image/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$#i', $val)) {
                                json_error('Ungültige Avatar-Daten-URL. Erlaubt sind PNG, JPEG, WebP und SVG (Base64).', 400);
                            }
                        } elseif ($val !== '') {
                            if (!preg_match('#^https://#i', $val)) {
                                json_error('Avatar-URL muss mit https:// oder einem sicheren data:image-Format beginnen.', 400);
                            }
                            if (mb_strlen($val, 'UTF-8') > 2000) {
                                json_error('Avatar-URL darf maximal 2000 Zeichen lang sein.', 400);
                            }
                        }
                    } else {
                        $val = mb_substr(trim($val), 0, $textLimits[$tf] ?? 500);
                    }
                    if ($tf === 'birth_date' && $val !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                        json_error('Ungültiges Geburtsdatum.', 400);
                    }
                }
                $fields[] = "`$tf` = ?";
                $params[] = $val;
            }
        }

        // Avatar-Typ passend zur URL setzen (data:image/svg+xml -> svg,
        // andere data:-Bilder -> upload, https -> url). Explizit gesendete
        // Werte werden nur akzeptiert, wenn keine neue URL mitkommt.
        if (array_key_exists('avatar_url', $data) && is_string($data['avatar_url']) && trim($data['avatar_url']) !== '') {
            $fields[] = '`avatar_type` = ?';
            $params[] = fwg_avatar_type_from_url(trim($data['avatar_url']));
        } elseif (array_key_exists('avatar_type', $data)) {
            $avatarType = $data['avatar_type'];
            if ($avatarType !== null && (!is_string($avatarType) || !in_array($avatarType, ['image', 'upload', 'svg', 'url'], true))) {
                json_error('Ungültiger Avatar-Typ.', 400);
            }
            if (is_string($avatarType)) {
                $fields[] = '`avatar_type` = ?';
                $params[] = $avatarType;
            }
        }
    }

    if (($isSelf || $isSvAdmin) && isset($data['subjects'])) {
        $fields[] = '`subjects` = ?';
        $params[] = json_encode($data['subjects']);
    }

    // Verfügbarkeit (Availability) handling
    if (($isSelf || $isSvAdmin) && isset($data['availability'])) {
        $availJson = json_encode($data['availability']);
        try {
            $fields[] = '`availability` = ?';
            $params[] = $availJson;
        } catch (Exception $e) {}

        // Auch in settings speichern für maximale Ausfallsicherheit
        if (!isset($data['settings'])) {
            $data['settings'] = [];
        }
        $data['settings']['availability'] = $data['availability'];
    }

    if (($isSelf || $isSvAdmin) && isset($data['settings'])) {
        if (is_array($data['settings']) && isset($data['settings']['teaches_subjects'])) {
            $data['settings']['teaches_subjects'] = fwg_sanitize_feed_subjects($data['settings']['teaches_subjects']);
        }
        $fields[] = '`settings` = ?';
        $params[] = json_encode($data['settings']);
    }

    if (($isSelf || $isSvAdmin) && isset($data['onboarding_complete'])) {
        $fields[] = '`onboarding_complete` = ?';
        $params[] = $data['onboarding_complete'] ? 1 : 0;
    }

    // Schüler-Coach Status vergeben/entziehen (erlaubt für SV-Admin und Coach-Admin Frau Balistreri)
    if (($isSvAdmin || $isCoachAdmin) && isset($data['is_coach'])) {
        $isCoach = $data['is_coach'] ? 1 : 0;
        try {
            $fields[] = '`is_coach` = ?';
            $params[] = $isCoach;
        } catch (Exception $e) {}

        // Audit-Log schreiben
        try {
            $logId = generate_uuid();
            $actionName = $isCoach ? 'coach_assign' : 'coach_revoke';
            $pdo->prepare('
                INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
                VALUES (?, ?, ?, "profile", ?, ?)
            ')->execute([
                $logId,
                $user['id'],
                $actionName,
                $targetId,
                json_encode([
                    'assigned_by' => $user['display_name'] ?: $user['email'],
                    'role' => $user['role'],
                    'is_coach' => (bool)$isCoach
                ])
            ]);
        } catch (Exception $e) {
            error_log('Audit Log error: ' . $e->getMessage());
        }
    }

    // Nur SV-Admins dürfen Verifikation & Rolle direkt im Profil ändern
    if ($isSvAdmin) {
        if (isset($data['is_verified'])) {
            $fields[] = '`is_verified` = ?';
            $params[] = $data['is_verified'] ? 1 : 0;
        }
        if (isset($data['role']) && in_array($data['role'], ['student', 'sv_admin', 'coach_admin'])) {
            $fields[] = '`role` = ?';
            $params[] = $data['role'];
        }
    }

    if (empty($fields)) {
        json_error('Keine Änderungen übermittelt.');
    }

    $params[] = $targetId;
    $sql = 'UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Aktualisiertes Profil zurückgeben
    $fetchStmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $fetchStmt->execute([$targetId]);
    $updated = $fetchStmt->fetch();

    if ($updated) {
        $updated['subjects'] = json_decode($updated['subjects'] ?? '[]', true) ?: [];
        $updated['settings'] = json_decode($updated['settings'] ?? '{}', true) ?: [];
        $updated['teaches_subjects'] = fwg_sanitize_feed_subjects($updated['settings']['teaches_subjects'] ?? []);
        $updated['is_coach'] = !empty($updated['is_coach']) || !empty($updated['settings']['is_coach']);
        if (!empty($updated['availability'])) {
            $updated['availability'] = json_decode($updated['availability'], true);
        } else if (!empty($updated['settings']['availability'])) {
            $updated['availability'] = $updated['settings']['availability'];
        }

        // Datenschutz: Bei Fremd-Aktualisierungen (z. B. Coach-Admin setzt Coach-Status)
        // sensible Felder wie im GET-Pfad entfernen.
        if ($targetId !== $user['id'] && !$isSvAdmin) {
            unset(
                $updated['birth_date'],
                $updated['ban_reason'],
                $updated['banned_until'],
                $updated['parental_consent_given'],
                $updated['parental_consent_date'],
                $updated['moodle_name'],
                $updated['contact_other'],
                $updated['parent_link_code']
            );
        }
    }

    json_response([
        'message' => 'Profil erfolgreich aktualisiert.',
        'profile' => $updated
    ]);
}

json_error('Methode nicht erlaubt.', 405);
