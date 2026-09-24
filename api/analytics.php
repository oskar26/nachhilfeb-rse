<?php
// ==============================================================================
// FWG Nachhilfebörse - Page Analytics API (anonym, ohne IPs, immer aktiv)
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

// Auto-Migration: page_analytics Tabelle (fehlte in sql-updates 001-006)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS page_analytics (
            id VARCHAR(36) NOT NULL,
            path VARCHAR(255) NOT NULL,
            device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL DEFAULT 'desktop',
            browser VARCHAR(50) NOT NULL DEFAULT 'Other',
            user_id VARCHAR(36) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_analytics_path (path),
            KEY idx_analytics_created (created_at),
            CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {
    // Fallback ohne FK (falls Constraint-Name bereits belegt ist)
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS page_analytics (
                id VARCHAR(36) NOT NULL,
                path VARCHAR(255) NOT NULL,
                device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL DEFAULT 'desktop',
                browser VARCHAR(50) NOT NULL DEFAULT 'Other',
                user_id VARCHAR(36) DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_analytics_path (path),
                KEY idx_analytics_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $ex2) {}
}

// Auto-Migration: subject_clicks Tabelle (anonyme Fächer-Klicks, B2)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS subject_clicks (
            id BIGINT NOT NULL AUTO_INCREMENT,
            subject VARCHAR(50) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_subject_clicks_subject (subject),
            KEY idx_subject_clicks_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Throwable $ex) {
    error_log('subject_clicks migration failed: ' . $ex->getMessage());
}

// Serverseitige Whitelist der Feed-Fächer (B2)
const FWG_TRACKABLE_SUBJECTS = [
    'deutsch', 'englisch', 'franzoesisch', 'kunst', 'griechisch', 'latein', 'musik', 'literatur', 'kultur',
    'geschichte', 'paedagogik', 'erdkunde', 'philosophie', 'sowi', 'wirtschaft_gesell', 'wirtschaft_politik',
    'biologie', 'chemie', 'informatik', 'mathematik', 'physik', 'blauer_planet', 'prakt_philosophie',
    'religion', 'sport',
];

// ------------------------------------------------------------------------------
// 1. TRACK (öffentlich – anonyme Statistik, kein Consent nötig)
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

    try {
        $pdo->prepare('
            INSERT INTO page_analytics (id, path, device_type, browser, user_id)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([generate_uuid(), $path, $device, $browser, $userId]);
    } catch (Throwable $e) {
        // Anonyme Statistik darf nie Fehler in den Client tragen (fire-and-forget).
        error_log('analytics track failed: ' . $e->getMessage());
        json_response(['ok' => false]);
    }

    json_response(['ok' => true]);
}

// ------------------------------------------------------------------------------
// 1b. TRACK CATEGORY (öffentlich – anonyme Fächer-Klickzählung, B2)
// ------------------------------------------------------------------------------
if ($action === 'track_category' && $method === 'POST') {
    fwg_require_rate_limit('track_category', 200, 60);
    $data = get_json_input();
    $subject = mb_substr(trim($data['subject'] ?? ''), 0, 50);

    if (!in_array($subject, FWG_TRACKABLE_SUBJECTS, true)) {
        json_error('Unbekanntes Fach.');
    }

    try {
        $pdo->prepare('INSERT INTO subject_clicks (subject) VALUES (?)')->execute([$subject]);
    } catch (Throwable $e) {
        // Anonyme Statistik darf nie Fehler in den Client tragen (fire-and-forget).
        error_log('subject click track failed: ' . $e->getMessage());
        json_response(['ok' => false]);
    }

    json_response(['ok' => true]);
}

// ------------------------------------------------------------------------------
// 1c. POPULAR SUBJECTS (öffentlich – Top 8 der letzten 30 Tage, B2)
// ------------------------------------------------------------------------------
if ($action === 'popular_subjects' && $method === 'GET') {
    $subjects = [];
    try {
        $rows = $pdo->query("
            SELECT subject
            FROM subject_clicks
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY subject
            ORDER BY COUNT(*) DESC, subject ASC
            LIMIT 8
        ")->fetchAll(PDO::FETCH_COLUMN);
        $subjects = array_values(array_intersect($rows, FWG_TRACKABLE_SUBJECTS));
    } catch (Throwable $e) {
        error_log('popular subjects failed: ' . $e->getMessage());
    }
    json_response(['subjects' => $subjects]);
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

    try {
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

    } catch (Throwable $e) {
        error_log('analytics stats failed: ' . $e->getMessage());
        json_error('Statistik konnte nicht geladen werden.', 500);
    }

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
    // ads-Count fehlertolerant: is_archived kann in alten DBs fehlen (vor sql-updates/001)
    $ads = 0;
    try {
        $hasArchived = false;
        try {
            $pdo->query('SELECT is_archived FROM ads LIMIT 0');
            $hasArchived = true;
        } catch (Exception $e) {}
        $adsSql = $hasArchived
            ? 'SELECT COUNT(*) FROM ads WHERE is_active = 1 AND is_archived = 0'
            : 'SELECT COUNT(*) FROM ads WHERE is_active = 1';
        $ads = (int)$pdo->query($adsSql)->fetchColumn();
    } catch (Exception $e) {
        error_log('analytics summary ads count failed: ' . $e->getMessage());
    }
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
