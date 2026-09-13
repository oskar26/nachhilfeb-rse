<?php
// ==============================================================================
// FWG Nachhilfebörse - Profiles API (Get, Update, Public Profile, Coach AG)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

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

    // 1c. Einzelnes Profil
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

    // Datenschutz: Kontaktdaten nur anzeigen, wenn sichtbar gestellt oder eigener Account / Admin
    $currentUser = get_auth_user();
    $isOwnerOrAdmin = $currentUser && ($currentUser['id'] === $id || $currentUser['role'] === 'sv_admin' || $currentUser['role'] === 'coach_admin');

    if (!$isOwnerOrAdmin) {
        if (empty($profile['settings']['email_visible'])) {
            $profile['email'] = null;
        }
        if (empty($profile['settings']['phone_visible'])) {
            $profile['phone_number'] = null;
        }
    }

    json_response($profile);
}

// ------------------------------------------------------------------------------
// 2. PUT / PATCH: PROFIL AKTUALISIEREN
// ------------------------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH') {
    $user = require_auth();
    $targetId = $id ?: $user['id'];

    $isSelf = $targetId === $user['id'];
    $isSvAdmin = $user['role'] === 'sv_admin';
    $isCoachAdmin = $user['role'] === 'coach_admin';

    if (!$isSelf && !$isSvAdmin && !$isCoachAdmin) {
        json_error('Keine Berechtigung zur Aktualisierung dieses Profils.', 403);
    }

    $data = get_json_input();
    $fields = [];
    $params = [];

    $textFields = [
        'first_name', 'last_name', 'display_name', 'grade_level', 'class_letter',
        'bio', 'moodle_name', 'phone_number', 'contact_other', 'avatar_url',
        'avatar_type', 'banner_color', 'birth_date'
    ];

    if ($isSelf || $isSvAdmin) {
        foreach ($textFields as $tf) {
            if (array_key_exists($tf, $data)) {
                $fields[] = "`$tf` = ?";
                $params[] = $data[$tf];
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
        if (isset($data['role']) && in_array($data['role'], ['student', 'sv_admin', 'coach_admin', 'parent'])) {
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
        $updated['is_coach'] = !empty($updated['is_coach']) || !empty($updated['settings']['is_coach']);
        if (!empty($updated['availability'])) {
            $updated['availability'] = json_decode($updated['availability'], true);
        } else if (!empty($updated['settings']['availability'])) {
            $updated['availability'] = $updated['settings']['availability'];
        }
    }

    json_response([
        'message' => 'Profil erfolgreich aktualisiert.',
        'profile' => $updated
    ]);
}

json_error('Methode nicht erlaubt.', 405);
