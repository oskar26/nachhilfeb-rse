<?php
// ==============================================================================
// FWG Nachhilfebörse - Reviews API (List, Create, Rating Recalculation)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. GET: BEWERTUNGEN ABRUFEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $targetUserId = $_GET['target_user_id'] ?? null;
    $adId = $_GET['ad_id'] ?? null;

    if (!$targetUserId && !$adId) {
        json_error('target_user_id oder ad_id ist erforderlich.');
    }

    $where = [];
    $params = [];

    if ($targetUserId) {
        $where[] = 'r.target_user_id = ?';
        $params[] = $targetUserId;
    }
    if ($adId) {
        $where[] = 'r.ad_id = ?';
        $params[] = $adId;
    }

    $sql = '
        SELECT r.*,
               p.display_name as author_name, p.avatar_url as author_avatar, p.avatar_type as author_avatar_type
        FROM reviews r
        JOIN profiles p ON p.id = r.author_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY r.created_at DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $reviews = $stmt->fetchAll();

    json_response($reviews);
}

// ------------------------------------------------------------------------------
// 2. POST: BEWERTUNG ERSTELLEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $user = require_auth();
    $data = get_json_input();

    $targetUserId = $data['target_user_id'] ?? null;
    $adId = $data['ad_id'] ?? null;
    $rating = (float)($data['rating'] ?? 0);
    $comment = trim($data['comment'] ?? '');

    if (!$targetUserId || $rating < 1 || $rating > 5) {
        json_error('target_user_id und eine Bewertung zwischen 1 und 5 Sternen erforderlich.');
    }

    if ($targetUserId === $user['id']) {
        json_error('Du kannst dich nicht selbst bewerten.', 400);
    }

    $pdo->beginTransaction();
    try {
        $reviewId = generate_uuid();
        $insert = $pdo->prepare('
            INSERT INTO reviews (id, ad_id, author_id, target_user_id, rating, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $insert->execute([$reviewId, $adId, $user['id'], $targetUserId, $rating, $comment]);

        // Durchschnittliche Bewertung des Zielnutzers neu berechnen
        $avgStmt = $pdo->prepare('
            SELECT AVG(rating) as avg_score, COUNT(*) as count 
            FROM reviews 
            WHERE target_user_id = ?
        ');
        $avgStmt->execute([$targetUserId]);
        $avgResult = $avgStmt->fetch();
        $newAvg = round((float)($avgResult['avg_score'] ?? 0), 2);

        $updateProfile = $pdo->prepare('UPDATE profiles SET average_rating = ? WHERE id = ?');
        $updateProfile->execute([$newAvg, $targetUserId]);

        $pdo->commit();

        json_response([
            'id' => $reviewId,
            'message' => 'Bewertung erfolgreich abgegeben!',
            'new_average' => $newAvg
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_error('Fehler beim Speichern der Bewertung: ' . $e->getMessage(), 500);
    }
}

json_error('Methode nicht erlaubt.', 405);
