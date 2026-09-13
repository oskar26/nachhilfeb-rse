<?php
// ==============================================================================
// FWG Nachhilfebörse - Central API Dispatcher / Router
// ==============================================================================

require_once __DIR__ . '/response.php';

cors_headers();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Prefix entfernen (z.B. /api/ oder /nachhilfe-sv/api/)
$apiPos = strpos($uri, '/api');
if ($apiPos !== false) {
    $path = substr($uri, $apiPos + 4); // nach '/api'
} else {
    $path = $uri;
}

$path = trim($path, '/');
$segments = explode('/', $path);
$endpoint = strtolower($segments[0] ?? '');
$subAction = strtolower($segments[1] ?? '');

// Subaction als action in $_GET hinterlegen, falls gesetzt
if (!empty($subAction) && !isset($_GET['action'])) {
    $_GET['action'] = $subAction;
}

// Router Mapping
$routes = [
    'auth'      => __DIR__ . '/auth.php',
    'ads'       => __DIR__ . '/ads.php',
    'requests'  => __DIR__ . '/requests.php',
    'messages'  => __DIR__ . '/messages.php',
    'profiles'  => __DIR__ . '/profiles.php',
    'reviews'   => __DIR__ . '/reviews.php',
    'favorites' => __DIR__ . '/favorites.php',
    'codes'     => __DIR__ . '/codes.php',
    'support'   => __DIR__ . '/support.php',
    'reports'       => __DIR__ . '/reports.php',
    'admin'         => __DIR__ . '/admin.php',
    'news'          => __DIR__ . '/news.php',
    'notifications' => __DIR__ . '/notifications.php',
];

// .php Endung tolerieren (z.B. /api/ads.php)
$cleanEndpoint = preg_replace('/\.php$/', '', $endpoint);

if (empty($cleanEndpoint)) {
    json_response([
        'status' => 'online',
        'system' => 'FWG Nachhilfebörse API',
        'version' => '2.0.0-allinkl',
        'time' => date('c')
    ]);
}

if (isset($routes[$cleanEndpoint]) && file_exists($routes[$cleanEndpoint])) {
    require $routes[$cleanEndpoint];
    exit;
}

json_error("API-Endpunkt '/$endpoint' nicht gefunden.", 404);
