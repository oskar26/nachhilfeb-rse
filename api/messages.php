<?php
// ==============================================================================
// FWG Nachhilfebörse - Messages / Chat API (with Smart Polling Support)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';


cors_headers();

// Zugriffsstufe (D5): Chat erst nach Verifizierung / Eltern-Verknüpfung.
$user = require_verified();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. GET: NACHRICHTEN EINES CHATS ABRUFEN (inkl. Polling mit 'after')
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $requestId = $_GET['request_id'] ?? null;
    $after = $_GET['after'] ?? null; // Timestamp ISO oder YYYY-MM-DD HH:MM:SS

    if (!$requestId) {
        json_error('Parameter request_id ist erforderlich.');
    }

    // Berechtigungsprüfung: Ist der Nutzer Teilnehmer der Anfrage?
    $reqStmt = $pdo->prepare('
        SELECT requester_id, owner_id 
        FROM ad_requests 
        WHERE id = ?
    ');
    $reqStmt->execute([$requestId]);
    $req = $reqStmt->fetch();

    if (!$req) {
        json_error('Chat / Anfrage nicht gefunden.', 404);
    }

    $isParticipant = ($req['requester_id'] === $user['id'] || $req['owner_id'] === $user['id']);
    $isAdmin = ($user['role'] === 'sv_admin');

    if (!$isParticipant && !$isAdmin) {
        json_error('Kein Zugriff auf diesen Chat.', 403);
    }

    $sql = '
        SELECT m.id, m.request_id, m.sender_id, m.content, m.is_read, m.created_at,
               p.display_name as sender_name, p.avatar_url as sender_avatar, p.avatar_type as sender_avatar_type
        FROM messages m
        JOIN profiles p ON p.id = m.sender_id
        WHERE m.request_id = ?
    ';
    $params = [$requestId];

    // Smart Polling: Nur Nachrichten nach einem bestimmten Zeitpunkt abrufen
    if ($after) {
        $sql .= ' AND m.created_at > ?';
        $params[] = $after;
    }

    $sql .= ' ORDER BY m.created_at ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $messages = $stmt->fetchAll();

    // Als gelesen markieren für empfangene Nachrichten
    if (!empty($messages)) {
        $markRead = $pdo->prepare('
            UPDATE messages 
            SET is_read = 1 
            WHERE request_id = ? AND sender_id != ? AND is_read = 0
        ');
        $markRead->execute([$requestId, $user['id']]);
    }

    json_response($messages);
}

// ------------------------------------------------------------------------------
// 2. POST: NACHRICHT SENDEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();
    $requestId = $data['request_id'] ?? null;
    $content = trim($data['content'] ?? '');

    if (!$requestId || empty($content)) {
        json_error('request_id und content sind erforderlich.');
    }

    // Berechtigungsprüfung
    $reqStmt = $pdo->prepare('
        SELECT requester_id, owner_id, status 
        FROM ad_requests 
        WHERE id = ?
    ');
    $reqStmt->execute([$requestId]);
    $req = $reqStmt->fetch();

    if (!$req) {
        json_error('Chat / Anfrage nicht gefunden.', 404);
    }

    $isParticipant = ($req['requester_id'] === $user['id'] || $req['owner_id'] === $user['id']);
    $isAdmin = ($user['role'] === 'sv_admin');

    if (!$isParticipant && !$isAdmin) {
        json_error('Kein Zugriff auf diesen Chat.', 403);
    }

    $msgId = generate_uuid();
    $insert = $pdo->prepare('
        INSERT INTO messages (id, request_id, sender_id, content, is_read)
        VALUES (?, ?, ?, ?, 0)
    ');
    $insert->execute([$msgId, $requestId, $user['id'], $content]);

    // Nachricht direkt zurückliefern
    $fetchMsg = $pdo->prepare('
        SELECT m.id, m.request_id, m.sender_id, m.content, m.is_read, m.created_at,
               p.display_name as sender_name, p.avatar_url as sender_avatar, p.avatar_type as sender_avatar_type
        FROM messages m
        JOIN profiles p ON p.id = m.sender_id
        WHERE m.id = ?
    ');
    $fetchMsg->execute([$msgId]);
    $created = $fetchMsg->fetch();

    // E-Mail-Benachrichtigung an den Empfänger senden
    $recipientId = ($req['requester_id'] === $user['id']) ? $req['owner_id'] : $req['requester_id'];
    $recipStmt = $pdo->prepare('SELECT p.display_name, p.first_name, u.email FROM profiles p JOIN users u ON u.id = p.id WHERE p.id = ?');
    $recipStmt->execute([$recipientId]);
    $recip = $recipStmt->fetch();

    if ($recip && !empty($recip['email'])) {
        try {
            send_email_new_chat_message(
                $recip['email'],
                $recip['first_name'] ?: $recip['display_name'] ?: 'Schüler/in',
                $user['display_name'] ?: 'Ein/e Mitschüler/in',
                $content,
                $requestId
            );
        } catch (Exception $e) {
            error_log('Fehler beim E-Mail Versand: ' . $e->getMessage());
        }
    }

    // In-App Benachrichtigung anlegen
    try {
        $notifId = generate_uuid();
        $senderName = $user['display_name'] ?: 'Jemand';
        $pdo->prepare('
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES (?, ?, "message", ?, ?, ?)
        ')->execute([
            $notifId,
            $recipientId,
            "Neue Nachricht von $senderName",
            mb_substr($content, 0, 150, 'UTF-8'),
            json_encode(['request_id' => $requestId, 'link' => "/#/chat/$requestId"])
        ]);
    } catch (Exception $e) {
        error_log('Fehler beim Anlegen der In-App Nachricht: ' . $e->getMessage());
    }

    // Eltern des Empfängers informieren – nur Metadaten, nie Chat-Inhalte.
    fwg_notify_parents(
        $pdo,
        (string)$recipientId,
        'parent_message',
        'Neue Nachricht für Ihr Kind',
        'Für Ihr Kind ist eine neue Nachricht eingegangen.',
        ['request_id' => $requestId, 'link' => '/#/parent-dashboard']
    );

    json_response($created, 201);
}

json_error('Methode nicht erlaubt.', 405);
