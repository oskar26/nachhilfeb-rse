<?php
// ==============================================================================
// FWG Nachhilfebörse - Page Analytics API (Consent-gated, ohne IPs)
// POST ?action=track  – öffentlich, speichert einen Seitenaufruf
// GET  ?action=stats  – nur SV-Admin, aggregierte Auswertung (30 Tage)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/ratelimit.php';

cors_headers();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. TRACK (öffentlich – Consent wird frontendseitig geprüft)
// ------------------------------------------------------------------------------
if ($action === 'track' && $method === 'POST') {
    // Flood-Schutz: max. 200 Hits pro Minute und IP (generös, blockt nur Bots)
    fwg_require_rate_limit('track', 200, 60);
    $data = get_json_input();
    $path = mb_substr(trim($data['path'] ?? ''), 0, 255);
    $device = $data['device_type'] ?? 'desktop';
    $browser = mb_substr(trim($data['browser'] ?? 'Other'), 0, 50);

    if ($path === '' || $path[0] !== '/') {
        json_error('Gültiger path erforderlich.');
    }
    if (!in_array($device, ['mobile', 'tablet', 'desktop'], true)) {
        $device = 'desktop';
    }
    if (!in_array($browser, ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'], true)) {
        $browser = 'Other';
    }

    // user_id ausschließlich aus dem (optionalen) Auth-Token – nie vom Client
    $user = get_auth_user();
    $userId = $user['id'] ?? null;

    $pdo->prepare('
        INSERT INTO page_analytics (id, path, device_type, browser, user_id)
        VALUES (?, ?, ?, ?, ?)
    ')->execute([generate_uuid(), $path, $device, $browser, $userId]);

    json_response(['ok' => true]);
}

// ------------------------------------------------------------------------------
// 2. STATS (nur SV-Admin) – ?days=7|30|90 (Default 30)
// ------------------------------------------------------------------------------
if ($action === 'stats' && $method === 'GET') {
    require_admin();

    $days = (int)($_GET['days'] ?? 30);
    if (!in_array($days, [7, 30, 90], true)) {
        $days = 30;
    }

    $byPath = $pdo->query("
        SELECT path, COUNT(*) as views
        FROM page_analytics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
        GROUP BY path
        ORDER BY views DESC
        LIMIT 50
    ")->fetchAll();

    $byDevice = $pdo->query("
        SELECT device_type, COUNT(*) as views
        FROM page_analytics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
        GROUP BY device_type
    ")->fetchAll();

    $byBrowser = $pdo->query("
        SELECT browser, COUNT(*) as views
        FROM page_analytics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
        GROUP BY browser
    ")->fetchAll();

    $byDay = $pdo->query("
        SELECT DATE(created_at) as day, COUNT(*) as views
        FROM page_analytics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
    ")->fetchAll();

    $byHour = $pdo->query("
        SELECT HOUR(created_at) as hour, COUNT(*) as views
        FROM page_analytics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
        GROUP BY HOUR(created_at)
    ")->fetchAll();

    $total = $pdo->query('SELECT COUNT(*) FROM page_analytics')->fetchColumn();

    // Eindeutige eingeloggte Besucher im Zeitraum (anonyme Hits zählen als 1 Gruppe dazu)
    $uniques = $pdo->query("
        SELECT COUNT(DISTINCT user_id) as logged_in,
               SUM(user_id IS NULL) as anonymous_hits
        FROM page_analytics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)
    ")->fetch();

    json_response([
        'total_views' => (int)$total,
        'days' => $days,
        'unique_logged_in' => (int)($uniques['logged_in'] ?? 0),
        'anonymous_hits' => (int)($uniques['anonymous_hits'] ?? 0),
        'by_path' => $byPath,
        'by_device' => $byDevice,
        'by_browser' => $byBrowser,
        'by_day' => $byDay,
        'by_hour' => $byHour,
    ]);
}

// ------------------------------------------------------------------------------
// 3. SUMMARY (öffentlich – nur nicht-personenbezogene Kennzahlen für Startseite)
// ------------------------------------------------------------------------------
if ($action === 'summary' && $method === 'GET') {
    $ads = (int)$pdo->query('SELECT COUNT(*) FROM ads WHERE is_active = 1 AND is_archived = 0')->fetchColumn();
    $users = 0;
    try {
        $users = (int)$pdo->query('SELECT COUNT(*) FROM profiles')->fetchColumn();
    } catch (Exception $e) {}
    $views = 0;
    $views30 = 0;
    try {
        $views = (int)$pdo->query('SELECT COUNT(*) FROM page_analytics')->fetchColumn();
        $views30 = (int)$pdo->query('SELECT COUNT(*) FROM page_analytics WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)')->fetchColumn();
    } catch (Exception $e) {}

    json_response([
        'active_ads' => $ads,
        'users' => $users,
        'page_views' => $views,
        'page_views_30d' => $views30,
    ]);
}

json_error('Ungültige Analytics-Aktion.', 404);
