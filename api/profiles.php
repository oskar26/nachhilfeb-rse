<?php
// ==============================================================================
// FWG Nachhilfebörse - Profiles API (Get, Update, Public Profile)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;

// ------------------------------------------------------------------------------
// 1. GET: PROFIL ABRUFEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
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

    // Datenschutz: Kontaktdaten nur anzeigen, wenn sichtbar gestellt oder eigener Account / Admin
    $currentUser = get_auth_user();
    $isOwnerOrAdmin = $currentUser && ($currentUser['id'] === $id || $currentUser['role'] === 'sv_admin');

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

    if ($targetId !== $user['id'] && $user['role'] !== 'sv_admin') {
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

    foreach ($textFields as $tf) {
        if (array_key_exists($tf, $data)) {
            $fields[] = "`$tf` = ?";
            $params[] = $data[$tf];
        }
    }

    if (isset($data['subjects'])) {
        $fields[] = '`subjects` = ?';
        $params[] = json_encode($data['subjects']);
    }

    if (isset($data['settings'])) {
        $fields[] = '`settings` = ?';
        $params[] = json_encode($data['settings']);
    }

    if (isset($data['onboarding_complete'])) {
        $fields[] = '`onboarding_complete` = ?';
        $params[] = $data['onboarding_complete'] ? 1 : 0;
    }

    // Nur Admins dürfen Verifikation & Rolle direkt im Profil ändern
    if ($user['role'] === 'sv_admin') {
        if (isset($data['is_verified'])) {
            $fields[] = '`is_verified` = ?';
            $params[] = $data['is_verified'] ? 1 : 0;
        }
        if (isset($data['role']) && in_array($data['role'], ['student', 'sv_admin', 'parent'])) {
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
    }

    json_response([
        'message' => 'Profil erfolgreich gespeichert.',
        'profile' => $updated
    ]);
}

json_error('Methode nicht erlaubt.', 405);
