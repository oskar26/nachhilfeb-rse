<?php
// ==============================================================================
// FWG Nachhilfebörse - Requests API (Ad Requests, Connections, Status)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$id = $_GET['id'] ?? null;

// ------------------------------------------------------------------------------
// 1. GET: ANFRAGEN DES NUTZERS ABRUFEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    if ($id) {
        $stmt = $pdo->prepare('
            SELECT r.*,
                   a.short_description as ad_title, a.subjects as ad_subjects, a.type as ad_type,
                   req.display_name as requester_name, req.avatar_url as requester_avatar, req.avatar_type as requester_avatar_type, req.grade_level as requester_grade,
                   own.display_name as owner_name, own.avatar_url as owner_avatar, own.avatar_type as owner_avatar_type, own.grade_level as owner_grade
            FROM ad_requests r
            JOIN ads a ON a.id = r.ad_id
            JOIN profiles req ON req.id = r.requester_id
            JOIN profiles own ON own.id = r.owner_id
            WHERE r.id = ? AND (r.requester_id = ? OR r.owner_id = ? OR ? = \'sv_admin\')
        ');
        $stmt->execute([$id, $user['id'], $user['id'], $user['role']]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error('Anfrage nicht gefunden.', 404);
        }
        $row['ad_subjects'] = json_decode($row['ad_subjects'] ?? '[]', true);
        json_response($row);
    }

    // Alle Anfragen des aktuellen Nutzers
    $stmt = $pdo->prepare('
        SELECT r.*,
               a.short_description as ad_title, a.subjects as ad_subjects, a.type as ad_type,
               req.display_name as requester_name, req.avatar_url as requester_avatar, req.avatar_type as requester_avatar_type, req.grade_level as requester_grade,
               own.display_name as owner_name, own.avatar_url as owner_avatar, own.avatar_type as owner_avatar_type, own.grade_level as owner_grade
        FROM ad_requests r
        JOIN ads a ON a.id = r.ad_id
        JOIN profiles req ON req.id = r.requester_id
        JOIN profiles own ON own.id = r.owner_id
        WHERE r.requester_id = ? OR r.owner_id = ?
        ORDER BY r.created_at DESC
    ');
    $stmt->execute([$user['id'], $user['id']]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['ad_subjects'] = json_decode($r['ad_subjects'] ?? '[]', true);
    }

    json_response($rows);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUE ANFRAGE SENDEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();
    $adId = $data['ad_id'] ?? null;
    $message = trim($data['message'] ?? '');
    $role = $data['role'] ?? 'student_to_tutor';

    if (!$adId) {
        json_error('Anzeigen-ID ist erforderlich.');
    }

    // Anzeige abrufen
    $adStmt = $pdo->prepare('SELECT id, user_id FROM ads WHERE id = ?');
    $adStmt->execute([$adId]);
    $ad = $adStmt->fetch();

    if (!$ad) {
        json_error('Anzeige nicht gefunden.', 404);
    }
    if ($ad['user_id'] === $user['id']) {
        json_error('Du kannst keine Anfrage an deine eigene Anzeige stellen.', 400);
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

    json_response([
        'id' => $requestId,
        'message' => 'Anfrage erfolgreich gesendet!'
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

    // Nur der Besitzer (oder SV-Admin) darf annehmen/ablehnen
    $isOwner = ($request['owner_id'] === $user['id']);
    $isRequester = ($request['requester_id'] === $user['id']);
    $isAdmin = ($user['role'] === 'sv_admin');

    if (!$isOwner && !$isRequester && !$isAdmin) {
        json_error('Keine Berechtigung.', 403);
    }

    $update = $pdo->prepare('UPDATE ad_requests SET status = ? WHERE id = ?');
    $update->execute([$status, $id]);

    json_response(['message' => 'Status erfolgreich aktualisiert.', 'status' => $status]);
}

json_error('Methode nicht erlaubt.', 405);
