<?php
// ==============================================================================
// FWG Nachhilfebörse - Reviews API (List, Create, Rating Recalculation)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. GET: BEWERTUNGEN ABRUFEN (öffentlich, aber datensparsam)
// ------------------------------------------------------------------------------
// Antwortformat:
// {
//   "average": 4.67,          // immer vorhanden
//   "count": 12,              // immer vorhanden
//   "target_user_id": "…" | null,
//   "ad_id": "…" | null,
//   "details": true | false,
//   "length": 12,             // Anzahl wie im data-Array (ältere UI las nur .length)
//   "data": [ … ]
// }
// `data` enthält bei berechtigten Betrachtern vollständige Bewertungen
// (rating, comment, author_name, author_avatar, created_at, …).
// Angemeldete fremde Betrachter erhalten pro Bewertung ausschließlich `rating`
// (ohne Kommentar, Autor, Avatar oder Datum); Gäste erhalten nur das Aggregat
// und ein leeres `data`-Array. So bleiben die Aggregate (z. B. für
// PublicProfile) öffentlich, personenbezogene Details aber privat.
if ($method === 'GET') {
    $targetUserId = isset($_GET['target_user_id']) && is_string($_GET['target_user_id'])
        ? trim($_GET['target_user_id'])
        : '';
    $adId = isset($_GET['ad_id']) && is_string($_GET['ad_id'])
        ? trim($_GET['ad_id'])
        : '';

    $viewer = get_auth_user();

    if ($targetUserId === '' && $adId === '') {
        if (!$viewer) {
            json_error('Bitte melde dich an oder gib target_user_id bzw. ad_id an.');
        }
        // Settings-Export ruft reviews.list({}) ohne Filter auf: eigene
        // Bewertungen (über die eigene Nutzer-ID) zurückgeben.
        $targetUserId = (string)$viewer['id'];
    }

    $where = [];
    $params = [];

    if ($targetUserId !== '') {
        $where[] = 'r.target_user_id = ?';
        $params[] = $targetUserId;
    }
    if ($adId !== '') {
        $where[] = 'r.ad_id = ?';
        $params[] = $adId;
    }

    $whereSql = implode(' AND ', $where);

    // Aggregat immer berechnen – unabhängig von der Detail-Berechtigung.
    $aggStmt = $pdo->prepare('
        SELECT COUNT(*) AS review_count, COALESCE(AVG(rating), 0) AS average_rating
        FROM reviews r
        WHERE ' . $whereSql . '
    ');
    $aggStmt->execute($params);
    $aggregate = $aggStmt->fetch() ?: ['review_count' => 0, 'average_rating' => 0];

    $isSvAdmin = $viewer && (($viewer['role'] ?? '') === 'sv_admin');
    $canSeeDetails = (bool)$isSvAdmin;

    // Zielnutzer sieht die Details der eigenen Bewertungen.
    if (!$canSeeDetails && $viewer && $targetUserId !== '' && (string)$viewer['id'] === $targetUserId) {
        $canSeeDetails = true;
    }

    // Beim Anzeigen-Filter dürfen der Anzeigen-Autor (Eigentümer) und das
    // Bewertungsziel die Details sehen; Gäste/Fremde nur das Aggregat.
    if (!$canSeeDetails && $viewer && $adId !== '') {
        try {
            $adStmt = $pdo->prepare('SELECT user_id FROM ads WHERE id = ? LIMIT 1');
            $adStmt->execute([$adId]);
            $adOwnerId = $adStmt->fetchColumn();
            if ($adOwnerId !== false && (string)$viewer['id'] === (string)$adOwnerId) {
                $canSeeDetails = true;
            }
        } catch (Exception $e) {
            error_log('Review ad owner lookup failed: ' . $e->getMessage());
        }
    }

    if ($canSeeDetails) {
        $sql = '
            SELECT r.*,
                   p.display_name as author_name, p.avatar_url as author_avatar, p.avatar_type as author_avatar_type
            FROM reviews r
            JOIN profiles p ON p.id = r.author_id
            WHERE ' . $whereSql . '
            ORDER BY r.created_at DESC
        ';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $reviews = $stmt->fetchAll();

        foreach ($reviews as &$review) {
            $review['rating'] = (float)$review['rating'];
        }
        unset($review);
    } else if (!$viewer) {
        // Ohne Login ausschließlich das Aggregat – keine Einzelbewertungen,
        // auch nicht als reine Rating-Liste.
        $reviews = [];
    } else {
        // Datensparsam: nur Sterne, keine Personenbezüge.
        $stmt = $pdo->prepare('
            SELECT r.rating
            FROM reviews r
            WHERE ' . $whereSql . '
            ORDER BY r.created_at DESC
        ');
        $stmt->execute($params);

        $reviews = [];
        foreach ($stmt->fetchAll() as $row) {
            $reviews[] = ['rating' => (float)$row['rating']];
        }
    }

    json_response([
        'average' => round((float)($aggregate['average_rating'] ?? 0), 2),
        'count' => (int)($aggregate['review_count'] ?? 0),
        'target_user_id' => $targetUserId !== '' ? $targetUserId : null,
        'ad_id' => $adId !== '' ? $adId : null,
        'details' => $canSeeDetails,
        'length' => count($reviews),
        'data' => $reviews,
    ]);
}

// ------------------------------------------------------------------------------
// 2. POST: BEWERTUNG ERSTELLEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $user = require_verified();
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

    // Bewertungen nur nach angenommener Anfrage und nur einmal pro Paar:
    // verhindert Fake-Bewertungen ohne echten Kontakt und aufgeblähte Durchschnitte.
    $pairStmt = $pdo->prepare("
        SELECT COUNT(*) FROM ad_requests
        WHERE ((requester_id = ? AND owner_id = ?) OR (requester_id = ? AND owner_id = ?))
          AND status IN ('accepted', 'completed')
    ");
    $pairStmt->execute([$user['id'], $targetUserId, $targetUserId, $user['id']]);
    if ((int)$pairStmt->fetchColumn() < 1) {
        json_error('Bewertungen sind nur nach einer angenommenen Anfrage möglich.', 403, ['code' => 'forbidden']);
    }

    $dupStmt = $pdo->prepare('SELECT COUNT(*) FROM reviews WHERE author_id = ? AND target_user_id = ?');
    $dupStmt->execute([$user['id'], $targetUserId]);
    if ((int)$dupStmt->fetchColumn() > 0) {
        json_error('Du hast diese Person bereits bewertet.', 400);
    }

    $pdo->beginTransaction();
    try {
        $reviewId = generate_uuid();
        $insert = $pdo->prepare('
            INSERT INTO reviews (id, ad_id, author_id, target_user_id, rating, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $insert->execute([$reviewId, $adId, $user['id'], $targetUserId, $rating, $comment]);

        // Kreis schließen: angenommene Anfragen des Paares gelten mit der Bewertung als erledigt.
        $completeStmt = $pdo->prepare("
            UPDATE ad_requests SET status = 'completed'
            WHERE status = 'accepted'
              AND ((requester_id = ? AND owner_id = ?) OR (requester_id = ? AND owner_id = ?))
        ");
        $completeStmt->execute([$user['id'], $targetUserId, $targetUserId, $user['id']]);

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

        // Benachrichtigung & E-Mail an den bewerteten Nutzer senden
        try {
            $targetStmt = $pdo->prepare('
                SELECT u.email, COALESCE(p.display_name, "Schüler/in") as display_name
                FROM users u
                JOIN profiles p ON p.id = u.id
                WHERE u.id = ?
            ');
            $targetStmt->execute([$targetUserId]);
            $targetUser = $targetStmt->fetch();

            $authorStmt = $pdo->prepare('SELECT COALESCE(display_name, "Ein Mitschüler") as name FROM profiles WHERE id = ?');
            $authorStmt->execute([$user['id']]);
            $authorName = $authorStmt->fetch()['name'] ?? 'Ein Mitschüler';

            if ($targetUser && !empty($targetUser['email'])) {
                send_email_new_review(
                    $targetUser['email'],
                    $targetUser['display_name'],
                    $authorName,
                    $rating,
                    $comment,
                    $newAvg
                );
            }

            // In-App Notification anlegen
            $notifId = generate_uuid();
            $stars = str_repeat('⭐', (int)round($rating));
            $pdo->prepare('
                INSERT INTO notifications (id, user_id, type, title, message, data)
                VALUES (?, ?, "review", ?, ?, ?)
            ')->execute([
                $notifId,
                $targetUserId,
                "$authorName hat dich mit $stars bewertet",
                $comment ?: "Du hast eine neue Bewertung erhalten.",
                json_encode(['review_id' => $reviewId, 'rating' => $rating, 'average' => $newAvg])
            ]);
        } catch (Exception $e) {
            error_log("Fehler beim Senden der Bewertungs-Benachrichtigung: " . $e->getMessage());
        }

        json_response([
            'id' => $reviewId,
            'message' => 'Bewertung gespeichert.',
            'new_average' => $newAvg
        ], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Fehler beim Speichern der Bewertung: ' . $e->getMessage());
        json_error('Bewertung konnte nicht gespeichert werden. Bitte später erneut versuchen.', 500);
    }
}

json_error('Methode nicht erlaubt.', 405);
