<?php
// ==============================================================================
// FWG Nachhilfebörse - Support API (Tickets, Support Chat, Bug Reports)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();
$action = $_GET['action'] ?? '';
$ticketId = $_GET['ticket_id'] ?? null;

// ------------------------------------------------------------------------------
// 1. GET: TICKETS ODER EINZELTICKET MIT NACHRICHTEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    if ($ticketId) {
        $stmt = $pdo->prepare('
            SELECT t.*, p.display_name as user_name, p.email as user_email
            FROM support_tickets t
            JOIN profiles p ON p.id = t.user_id
            WHERE t.id = ? AND (t.user_id = ? OR ? = \'sv_admin\')
        ');
        $stmt->execute([$ticketId, $user['id'], $user['role']]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            json_error('Support-Ticket nicht gefunden.', 404);
        }

        $ticket['device_info'] = json_decode($ticket['device_info'] ?? '{}', true);

        // Nachrichten des Tickets abrufen
        $msgStmt = $pdo->prepare('
            SELECT sm.*, p.display_name as sender_name, p.avatar_url, p.avatar_type
            FROM support_messages sm
            JOIN profiles p ON p.id = sm.sender_id
            WHERE sm.ticket_id = ?
            ORDER BY sm.created_at ASC
        ');
        $msgStmt->execute([$ticketId]);
        $ticket['messages'] = $msgStmt->fetchAll();

        json_response($ticket);
    }

    // Liste abrufen
    if ($user['role'] === 'sv_admin') {
        $stmt = $pdo->query('
            SELECT t.*, p.display_name as user_name
            FROM support_tickets t
            JOIN profiles p ON p.id = t.user_id
            ORDER BY 
                (CASE t.status WHEN \'open\' THEN 1 WHEN \'in_progress\' THEN 2 ELSE 3 END),
                t.created_at DESC
        ');
        $tickets = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare('
            SELECT t.*, p.display_name as user_name
            FROM support_tickets t
            JOIN profiles p ON p.id = t.user_id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        ');
        $stmt->execute([$user['id']]);
        $tickets = $stmt->fetchAll();
    }

    foreach ($tickets as &$t) {
        $t['device_info'] = json_decode($t['device_info'] ?? '{}', true);
    }

    json_response($tickets);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUES TICKET ERSTELLEN ODER NACHRICHT SENDEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();

    // Nachricht an ein bestehendes Ticket senden
    if ($action === 'message') {
        $tId = $data['ticket_id'] ?? $ticketId;
        $content = trim($data['content'] ?? '');

        if (!$tId || empty($content)) {
            json_error('ticket_id und content sind erforderlich.');
        }

        $check = $pdo->prepare('SELECT user_id, status FROM support_tickets WHERE id = ?');
        $check->execute([$tId]);
        $t = $check->fetch();

        if (!$t) {
            json_error('Ticket nicht gefunden.', 404);
        }
        if ($t['user_id'] !== $user['id'] && $user['role'] !== 'sv_admin') {
            json_error('Kein Zugriff auf dieses Ticket.', 403);
        }

        $isAdminReply = ($user['role'] === 'sv_admin');
        $msgId = generate_uuid();
        $insertMsg = $pdo->prepare('
            INSERT INTO support_messages (id, ticket_id, sender_id, content, is_admin_reply)
            VALUES (?, ?, ?, ?, ?)
        ');
        $insertMsg->execute([$msgId, $tId, $user['id'], $content, $isAdminReply ? 1 : 0]);

        // Ticket-Status aktualisieren
        if ($isAdminReply && $t['status'] === 'open') {
            $pdo->prepare('UPDATE support_tickets SET status = \'in_progress\' WHERE id = ?')->execute([$tId]);
        }

        json_response([
            'id' => $msgId,
            'message' => 'Nachricht gesendet!'
        ], 201);
    }

    // Neues Ticket erstellen
    $title = trim($data['title'] ?? '');
    $description = trim($data['description'] ?? '');
    $type = in_array($data['type'] ?? '', ['bug', 'feature', 'support']) ? $data['type'] : 'support';
    $priority = in_array($data['priority'] ?? '', ['low', 'normal', 'high', 'critical']) ? $data['priority'] : 'normal';
    $deviceInfo = $data['device_info'] ?? [];

    if (empty($title) || empty($description)) {
        json_error('Titel und Beschreibung sind erforderlich.');
    }

    $newTicketId = generate_uuid();
    $insert = $pdo->prepare('
        INSERT INTO support_tickets (id, user_id, type, title, description, status, priority, device_info)
        VALUES (?, ?, ?, ?, ?, \'open\', ?, ?)
    ');
    $insert->execute([$newTicketId, $user['id'], $type, $title, $description, $priority, json_encode($deviceInfo)]);

    // Erste Nachricht direkt erstellen
    $firstMsgId = generate_uuid();
    $pdo->prepare('
        INSERT INTO support_messages (id, ticket_id, sender_id, content, is_admin_reply)
        VALUES (?, ?, ?, ?, 0)
    ')->execute([$firstMsgId, $newTicketId, $user['id'], $description]);

    json_response([
        'id' => $newTicketId,
        'message' => 'Support-Ticket erfolgreich übermittelt!'
    ], 201);
}

// ------------------------------------------------------------------------------
// 3. PATCH: TICKET STATUS / NOTIZEN AKTUALISIEREN (ADMIN)
// ------------------------------------------------------------------------------
if ($method === 'PATCH' || $method === 'PUT') {
    require_admin();
    if (!$ticketId) {
        json_error('ticket_id erforderlich.');
    }

    $data = get_json_input();
    $fields = [];
    $params = [];

    if (isset($data['status']) && in_array($data['status'], ['open', 'in_progress', 'resolved', 'closed'])) {
        $fields[] = 'status = ?';
        $params[] = $data['status'];
    }
    if (isset($data['priority']) && in_array($data['priority'], ['low', 'normal', 'high', 'critical'])) {
        $fields[] = 'priority = ?';
        $params[] = $data['priority'];
    }
    if (isset($data['admin_notes'])) {
        $fields[] = 'admin_notes = ?';
        $params[] = $data['admin_notes'];
    }

    if (empty($fields)) {
        json_error('Keine Änderungen angegeben.');
    }

    $params[] = $ticketId;
    $pdo->prepare('UPDATE support_tickets SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

    json_response(['message' => 'Ticket erfolgreich aktualisiert.']);
}

json_error('Methode nicht erlaubt.', 405);
