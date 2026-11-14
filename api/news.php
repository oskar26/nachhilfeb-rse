<?php
// ==============================================================================
// FWG Nachhilfebörse - News API (SV-News & Announcements)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. GET: NEWS ABRUFEN (Öffentlich)
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $pdo->query('
        SELECT n.*, p.display_name as author_name
        FROM news n
        LEFT JOIN profiles p ON p.id = n.author_id
        ORDER BY n.is_pinned DESC, n.created_at DESC
        LIMIT 20
    ');
    $news = $stmt->fetchAll();

    foreach ($news as &$item) {
        $item['is_pinned'] = (bool)$item['is_pinned'];
    }

    json_response($news);
}

// ------------------------------------------------------------------------------
// 2. POST: NEUE NEWS ERSTELLEN (NUR ADMIN)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $admin = require_admin();
    $data = get_json_input();

    $rawTitle = $data['title'] ?? '';
    $title = is_string($rawTitle) ? mb_substr(trim($rawTitle), 0, 200) : '';
    // Aktueller Vertrag ist `content`. `body` bleibt als Alias für ältere
    // Clients lesbar, damit kein Client mit dem alten Payload hart scheitert.
    $rawContent = $data['content'] ?? $data['body'] ?? '';
    $content = is_string($rawContent) ? mb_substr(trim($rawContent), 0, 15000) : '';
    $isPinned = !empty($data['is_pinned']);

    if (empty($title) || empty($content)) {
        json_error('Titel und Inhalt sind erforderlich.');
    }

    $newsId = generate_uuid();
    // Kein Icon-Feld: Die Tabelle `news` hat keine icon-Spalte. Eine Auswahl
    // im Admin-UI ist reine Vorschau, bis ein Schema-Update beschlossen wird.
    $stmt = $pdo->prepare('
        INSERT INTO news (id, title, content, author_id, is_pinned)
        VALUES (?, ?, ?, ?, ?)
    ');
    $stmt->execute([$newsId, $title, $content, $admin['id'], $isPinned ? 1 : 0]);

    fwg_audit($pdo, $admin['id'], 'news_create', 'news', $newsId, ['title' => $title]);

    // HTML-Inhalte werden in E-Mail und In-App-Text als Klartext ausgegeben.
    $plainContent = preg_match('/<[a-z][\s\S]*>/i', $content)
        ? trim(html_entity_decode(strip_tags($content), ENT_QUOTES | ENT_HTML5, 'UTF-8'))
        : $content;

    // An alle aktiven Nutzer per E-Mail & In-App Benachrichtigung versenden
    try {
        $usersStmt = $pdo->query('
            SELECT u.id, u.email, COALESCE(p.display_name, "Schüler/in") as display_name
            FROM users u
            JOIN profiles p ON p.id = u.id
            WHERE p.is_banned = 0
        ');
        $allUsers = $usersStmt->fetchAll();
        foreach ($allUsers as $u) {
            // E-Mail
            if (!empty($u['email'])) {
                send_email_announcement($u['email'], $u['display_name'], $title, $plainContent);
            }
            // In-App Benachrichtigung
            $notifId = generate_uuid();
            $pdo->prepare('
                INSERT INTO notifications (id, user_id, type, title, message, data)
                VALUES (?, ?, "alert", ?, ?, ?)
            ')->execute([$notifId, $u['id'], "📢 $title", mb_substr($plainContent, 0, 200, 'UTF-8'), json_encode(['news_id' => $newsId])]);
        }
    } catch (Exception $e) {
        error_log("Fehler beim Versenden der News-Mails: " . $e->getMessage());
    }

    json_response(['id' => $newsId, 'message' => 'Ankündigung erfolgreich veröffentlicht.'], 201);
}

// ------------------------------------------------------------------------------
// 3. DELETE: NEWS LÖSCHEN (NUR ADMIN)
// ------------------------------------------------------------------------------
if ($method === 'DELETE') {
    $admin = require_admin();
    $id = $_GET['id'] ?? null;
    if (!$id) {
        json_error('News-ID erforderlich.');
    }

    $pdo->prepare('DELETE FROM news WHERE id = ?')->execute([$id]);
    fwg_audit($pdo, $admin['id'], 'news_delete', 'news', mb_substr((string)$id, 0, 64));
    json_response(['message' => 'Ankündigung gelöscht.']);
}

json_error('Methode nicht erlaubt.', 405);
