<?php
// ==============================================================================
// FWG Nachhilfebörse - Response & Helper Utilities
// ==============================================================================

require_once __DIR__ . '/config.php';

function cors_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // In der gleichen Domain oder in ALLOWED_ORIGINS erlauben
    if (in_array($origin, ALLOWED_ORIGINS) || empty($origin)) {
        if (!empty($origin)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
        } else {
            header("Access-Control-Allow-Origin: *");
        }
    } else {
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_response($data, int $status = 200) {
    cors_headers();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400, $extra = null) {
    $payload = ['error' => $message];
    if ($extra !== null) {
        $payload['details'] = $extra;
    }
    json_response($payload, $status);
}

function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_error('Ungültiges JSON-Format im Request Body', 400);
    }
    return $decoded;
}

function generate_uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // UUID Version 4
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // UUID Variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
