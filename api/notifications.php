<?php
// ==============================================================================
// FWG Nachhilfebörse - Notifications API (In-App & E-Mail Triggers)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. GET: BENACHRICHTIGUNGEN DES NUTZERS ABRUFEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 30)));

    $stmt = $pdo->prepare('
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ' . $limit . '
    ');
    $stmt->execute([$user['id']]);
    $items = $stmt->fetchAll();

    $formatted = [];
    foreach ($items as $item) {
        $extraData = [];
        if (!empty($item['data'])) {
            $extraData = is_string($item['data']) ? json_decode($item['data'], true) : $item['data'];
        }

        $formatted[] = [
            'id' => $item['id'],
            'user_id' => $item['user_id'],
            'type' => $item['type'],
            'title' => $item['title'],
            'body' => $item['message'] ?? '',
            'message' => $item['message'] ?? '',
            'read' => (bool)$item['is_read'],
            'is_read' => (int)$item['is_read'],
            'data' => $extraData,
            'link' => $extraData['link'] ?? null,
            'created_at' => $item['created_at']
        ];
    }

    json_response($formatted);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUE BENACHRICHTIGUNG ANLEGEN (UND E-MAIL SENDEN)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();

    $targetUserId = $data['user_id'] ?? $user['id'];
    $type = $data['type'] ?? 'alert';
    $title = trim($data['title'] ?? 'Neue Benachrichtigung');
    $message = trim($data['message'] ?? $data['body'] ?? '');
    $payloadData = $data['data'] ?? [];

    if (!empty($data['link']) && is_array($payloadData)) {
        $payloadData['link'] = $data['link'];
    }

    $notifId = generate_uuid();
    $stmt = $pdo->prepare('
        INSERT INTO notifications (id, user_id, type, title, message, data, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    ');
    $stmt->execute([
        $notifId,
        $targetUserId,
        $type,
        $title,
        $message,
        !empty($payloadData) ? json_encode($payloadData) : null
    ]);

    // E-Mail Benachrichtigung an den Empfänger senden
    try {
        $userStmt = $pdo->prepare('
            SELECT u.email, COALESCE(p.display_name, "Schüler/in") as display_name
            FROM users u
            JOIN profiles p ON p.id = u.id
            WHERE u.id = ? AND p.is_banned = 0
        ');
        $userStmt->execute([$targetUserId]);
        $target = $userStmt->fetch();

        if ($target && !empty($target['email'])) {
            $email = $target['email'];
            $name = $target['display_name'];

            switch ($type) {
                case 'match':
                    $subject = $payloadData['subject'] ?? 'Dein Wunschfach';
                    $score = (int)($payloadData['score'] ?? 85);
                    send_email_new_match($email, $name, $subject, $score);
                    break;

                case 'achievement':
                    $badgeTitle = $payloadData['badge_title'] ?? $title;
                    $badgeDesc = $payloadData['badge_description'] ?? $message;
                    send_email_achievement($email, $name, $badgeTitle, $badgeDesc);
                    break;

                case 'like':
                case 'favorite':
                    $adTitle = $payloadData['ad_title'] ?? 'Deine Anzeige';
                    send_email_ad_favorited($email, $name, $adTitle);
                    break;

                default:
                    // Push / Allgemeine Benachrichtigung
                    $ctaText = $payloadData['cta_text'] ?? 'Jetzt ansehen';
                    $ctaUrl = $payloadData['link'] ?? APP_URL;
                    send_email_generic_notification($email, $name, $title, $message, $ctaText, $ctaUrl);
                    break;
            }
        }
    } catch (Exception $e) {
        error_log("Fehler beim Senden der Benachrichtigungs-Mail: " . $e->getMessage());
    }

    json_response([
        'id' => $notifId,
        'message' => 'Benachrichtigung erstellt und per E-Mail zugestellt.'
    ], 201);
}

// ------------------------------------------------------------------------------
// 3. PUT / PATCH: ALS GELESEN MARKIEREN
// ------------------------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH') {
    $data = get_json_input();

    // Alle als gelesen markieren
    if (!empty($data['mark_all'])) {
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        json_response(['message' => 'Alle Benachrichtigungen als gelesen markiert.']);
    }

    // Mehrere IDs
    if (!empty($data['ids']) && is_array($data['ids'])) {
        $placeholders = implode(',', array_fill(0, count($data['ids']), '?'));
        $params = array_merge([$user['id']], $data['ids']);
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN ($placeholders)");
        $stmt->execute($params);
        json_response(['message' => count($data['ids']) . ' Benachrichtigung(en) als gelesen markiert.']);
    }

    // Einzelne ID
    $id = $data['id'] ?? $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?');
        $stmt->execute([$user['id'], $id]);
        json_response(['message' => 'Benachrichtigung als gelesen markiert.']);
    }

    json_error('Keine ID oder Aktion zum Aktualisieren angegeben.');
}

// ------------------------------------------------------------------------------
// 4. DELETE: LÖSCHEN
// ------------------------------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        json_error('ID ist erforderlich.');
    }

    $stmt = $pdo->prepare('DELETE FROM notifications WHERE user_id = ? AND id = ?');
    $stmt->execute([$user['id'], $id]);
    json_response(['message' => 'Benachrichtigung gelöscht.']);
}

json_error('Methode nicht erlaubt.', 405);
