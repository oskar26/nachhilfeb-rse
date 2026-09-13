<?php
// ==============================================================================
// FWG Nachhilfebörse - News API (SV-News & Announcements)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

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

    $title = trim($data['title'] ?? '');
    $content = trim($data['content'] ?? '');
    $isPinned = !empty($data['is_pinned']);

    if (empty($title) || empty($content)) {
        json_error('Titel und Inhalt sind erforderlich.');
    }

    $newsId = generate_uuid();
    $stmt = $pdo->prepare('
        INSERT INTO news (id, title, content, author_id, is_pinned)
        VALUES (?, ?, ?, ?, ?)
    ');
    $stmt->execute([$newsId, $title, $content, $admin['id'], $isPinned ? 1 : 0]);

    json_response(['id' => $newsId, 'message' => 'Ankündigung erfolgreich veröffentlicht.'], 201);
}

// ------------------------------------------------------------------------------
// 3. DELETE: NEWS LÖSCHEN (NUR ADMIN)
// ------------------------------------------------------------------------------
if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? null;
    if (!$id) {
        json_error('News-ID erforderlich.');
    }

    $pdo->prepare('DELETE FROM news WHERE id = ?')->execute([$id]);
    json_response(['message' => 'Ankündigung gelöscht.']);
}

json_error('Methode nicht erlaubt.', 405);
