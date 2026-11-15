<?php
// ==============================================================================
// FWG Nachhilfebörse - Messages / Chat API (with Smart Polling Support)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/ratelimit.php';


cors_headers();

// Zugriffsstufe (D5): Chat erst nach Verifizierung / Eltern-Verknüpfung.
$user = require_verified();
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// Auto-Migration: echte Lesebestätigung (mehrfach ausführbar, MariaDB)
try {
    $pdo->exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at DATETIME NULL AFTER is_read");
} catch (Exception $e) {}

// Auto-Migration: Nutzer-Blockierungen (wird auch von blocks.php/requests.php gepflegt).
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_blocks (
            blocker_id VARCHAR(36) NOT NULL,
            blocked_id VARCHAR(36) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (blocker_id, blocked_id),
            KEY idx_user_blocks_blocked (blocked_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Exception $e) {}

// ------------------------------------------------------------------------------
// 1. GET: NACHRICHTEN EINES CHATS ABRUFEN (inkl. Polling mit 'after')
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    // --------------------------------------------------------------------------
    // 1a. CHATÜBERSICHT: akzeptierte/abgeschlossene Unterhaltungen des Nutzers
    // --------------------------------------------------------------------------
    // Eigene Aktion, damit das bestehende ?request_id=-Verhalten unverändert
    // bleibt. Keine Schemaänderung: letzte Nachricht und Ungelesen-Zahl werden
    // aus messages abgeleitet. Es werden ausschließlich eigene Anfragen
    // zurückgegeben (kein Admin-Fremdzugriff über diese Liste).
    if (!empty($_GET['conversations'])) {
        $uid = $user['id'];
        $convStmt = $pdo->prepare('
            SELECT
                r.id AS request_id,
                r.status,
                r.created_at AS request_created_at,
                a.id AS ad_id,
                a.short_description AS ad_title,
                a.short_description AS ad_short_description,
                a.subjects AS ad_subjects,
                partner.id AS other_user_id,
                partner.display_name,
                partner.avatar_url,
                partner.avatar_type,
                partner.grade_level,
                lm.id AS last_message_id,
                SUBSTRING(lm.content, 1, 300) AS last_message,
                lm.created_at AS last_message_at,
                lm.sender_id AS last_message_sender_id,
                COALESCE(unread.unread_count, 0) AS unread_count
            FROM ad_requests r
            JOIN ads a ON a.id = r.ad_id
            JOIN profiles partner ON partner.id = CASE
                WHEN r.requester_id = ? THEN r.owner_id
                ELSE r.requester_id
            END
            LEFT JOIN messages lm ON lm.id = (
                SELECT m2.id
                FROM messages m2
                WHERE m2.request_id = r.id
                ORDER BY m2.created_at DESC, m2.id DESC
                LIMIT 1
            )
            LEFT JOIN (
                SELECT request_id, COUNT(*) AS unread_count
                FROM messages
                WHERE sender_id <> ? AND is_read = 0
                GROUP BY request_id
            ) unread ON unread.request_id = r.id
            WHERE (r.requester_id = ? OR r.owner_id = ?)
              AND r.status IN (\'accepted\', \'completed\')
            ORDER BY COALESCE(lm.created_at, r.created_at) DESC
            LIMIT 200
        ');
        $convStmt->execute([$uid, $uid, $uid, $uid]);
        $conversations = $convStmt->fetchAll();

        foreach ($conversations as &$conversation) {
            $conversation['unread_count'] = (int)$conversation['unread_count'];
            $conversation['ad_subjects'] = json_decode($conversation['ad_subjects'] ?? '[]', true) ?: [];
            $conversation['is_last_message_mine'] = ($conversation['last_message_sender_id'] === $uid);
        }
        unset($conversation);

        json_response($conversations);
    }

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
        json_error('Kein Zugriff auf diesen Chat.', 403, ['code' => 'forbidden']);
    }

    // Zuerst empfangene ungelesene Nachrichten des Chatpartners als gelesen
    // markieren. Erst danach selektieren, damit der aktuelle read_at-Wert
    // bereits in der Antwort enthalten ist.
    if ($isParticipant) {
        $markRead = $pdo->prepare('
            UPDATE messages
            SET is_read = 1, read_at = NOW()
            WHERE request_id = ? AND sender_id != ? AND is_read = 0
        ');
        $markRead->execute([$requestId, $user['id']]);
    }

    $sql = '
        SELECT m.id, m.request_id, m.sender_id, m.content, m.is_read, m.read_at, m.created_at,
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
        json_error('Kein Zugriff auf diesen Chat.', 403, ['code' => 'forbidden']);
    }

    // Blockierungen gelten in beide Richtungen. Das SV-Team darf weiter
    // moderieren, normale Teilnehmer können sich nicht anschreiben.
    if (!$isAdmin) {
        $otherId = ($req['requester_id'] === $user['id']) ? $req['owner_id'] : $req['requester_id'];
        $blockStmt = $pdo->prepare('
            SELECT 1 FROM user_blocks
            WHERE (blocker_id = ? AND blocked_id = ?)
               OR (blocker_id = ? AND blocked_id = ?)
            LIMIT 1
        ');
        $blockStmt->execute([$user['id'], $otherId, $otherId, $user['id']]);
        if ($blockStmt->fetchColumn()) {
            json_error('Du kannst diesem Nutzer keine Nachrichten senden.', 403, ['code' => 'blocked']);
        }
    }

    $msgId = generate_uuid();
    $insert = $pdo->prepare('
        INSERT INTO messages (id, request_id, sender_id, content, is_read)
        VALUES (?, ?, ?, ?, 0)
    ');
    $insert->execute([$msgId, $requestId, $user['id'], $content]);

    // Nachricht direkt zurückliefern
    $fetchMsg = $pdo->prepare('
        SELECT m.id, m.request_id, m.sender_id, m.content, m.is_read, m.read_at, m.created_at,
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

    // Mail-Flut-Schutz: höchstens 10 Chat-Mails pro Minute und Absender.
    // Die Nachricht selbst und die In-App-Benachrichtigung bleiben unberührt.
    if ($recip && !empty($recip['email']) && fwg_rate_limit('chat_mail_' . $user['id'], 10, 60)) {
        try {
            send_email_new_chat_message(
                $recip['email'],
                $recip['first_name'] ?: $recip['display_name'] ?: 'Schüler/in',
                $user['display_name'] ?: 'Mitschülerin oder Mitschüler',
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

    json_response($created, 201);
}

json_error('Methode nicht erlaubt.', 405);
