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

// ------------------------------------------------------------------------------
// 1. GET: ANZEIGEN ABRUFEN (Liste oder Einzelanzeige)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    if ($id) {
        // Einzelne Anzeige mit Profil-Daten
        $stmt = $pdo->prepare('
            SELECT a.*, 
                   p.display_name, p.first_name, p.last_name, p.avatar_url, p.avatar_type,
                   p.banner_color, p.average_rating, p.is_verified, p.grade_level as user_grade,
                   p.class_letter as user_class, p.email as user_email, p.phone_number as user_phone,
                   p.settings as user_settings
            FROM ads a
            JOIN profiles p ON p.id = a.user_id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $ad = $stmt->fetch();

        if (!$ad) {
            json_error('Anzeige nicht gefunden.', 404);
        }

        // JSON Felder dekodieren
        $ad['subjects'] = json_decode($ad['subjects'] ?? '[]', true);
        $ad['grade_levels'] = json_decode($ad['grade_levels'] ?? '[]', true);
        $ad['locations'] = json_decode($ad['locations'] ?? '[]', true);
        $ad['price_details'] = json_decode($ad['price_details'] ?? '{}', true);
        $ad['duration_minutes'] = json_decode($ad['duration_minutes'] ?? '[]', true);
        $ad['image_urls'] = json_decode($ad['image_urls'] ?? '[]', true);
        $ad['user_settings'] = json_decode($ad['user_settings'] ?? '{}', true);

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
            'grade_level' => $ad['user_grade'],
            'class_letter' => $ad['user_class'],
            'email' => $ad['user_email'],
            'phone_number' => $ad['user_phone'],
            'settings' => $ad['user_settings']
        ];

        json_response($ad);
    }

    // Liste abrufen
    $type = $_GET['type'] ?? null;
    $subject = $_GET['subject'] ?? null;
    $grade = $_GET['grade'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $search = trim($_GET['search'] ?? '');
    $onlyActive = !isset($_GET['all']) || $_GET['all'] !== '1';

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
               p.display_name, p.first_name, p.last_name, p.avatar_url, p.avatar_type,
               p.banner_color, p.average_rating, p.is_verified, p.grade_level as user_grade,
               p.class_letter as user_class
        FROM ads a
        JOIN profiles p ON p.id = a.user_id
        $whereClause
        ORDER BY 
            (CASE WHEN a.boosted = 1 AND a.boosted_until > NOW() THEN 1 ELSE 0 END) DESC,
            a.created_at DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

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
            'grade_level' => $row['user_grade'],
            'class_letter' => $row['user_class']
        ];

        $results[] = $row;
    }

    json_response($results);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUE ANZEIGE ERSTELLEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $user = require_auth();
    $data = get_json_input();

    $type = $data['type'] ?? 'offer';
    if (!in_array($type, ['offer', 'search'])) {
        json_error('Ungültiger Anzeigentyp.');
    }

    $subjects = is_array($data['subjects'] ?? null) ? $data['subjects'] : [];
    if (empty($subjects)) {
        json_error('Mindestens ein Fach muss angegeben werden.');
    }

    $gradeLevels = is_array($data['grade_levels'] ?? null) ? $data['grade_levels'] : [];
    $locations = is_array($data['locations'] ?? null) ? $data['locations'] : [];
    $customLocation = trim($data['custom_location'] ?? '');
    $priceDetails = is_array($data['price_details'] ?? null) ? $data['price_details'] : [];
    $durationMinutes = is_array($data['duration_minutes'] ?? null) ? $data['duration_minutes'] : [45];
    $shortDesc = trim($data['short_description'] ?? '');
    $longDesc = trim($data['long_description'] ?? '');
    $imageUrls = is_array($data['image_urls'] ?? null) ? $data['image_urls'] : [];

    // BANANE Easter Egg Promo Code prüfen
    $promoCode = trim($data['promo_code_used'] ?? $data['promo_code'] ?? '');
    $isBoosted = 0;
    $boostedUntil = null;
    if (strtoupper($promoCode) === 'BANANE') {
        $isBoosted = 1;
        $boostedUntil = date('Y-m-d H:i:s', strtotime('+14 days'));
    }

    $adId = generate_uuid();
    $stmt = $pdo->prepare('
        INSERT INTO ads (
            id, user_id, type, subjects, grade_levels, locations, custom_location,
            price_details, duration_minutes, short_description, long_description,
            image_urls, is_active, is_archived, boosted, boosted_until, promo_code_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
    ');

    $stmt->execute([
        $adId,
        $user['id'],
        $type,
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
        $isBoosted ? 'BANANE' : null
    ]);

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
        'type', 'custom_location', 'short_description', 'long_description',
        'is_active', 'is_archived'
    ];
    foreach ($updatable as $f) {
        if (isset($data[$f])) {
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
