<?php
// ==============================================================================
// FWG Nachhilfebörse - Response & Helper Utilities
// ==============================================================================

require_once __DIR__ . '/config.php';

function cors_headers() {
    $origin = trim($_SERVER['HTTP_ORIGIN'] ?? '');
    // Normalisieren: kein Trailing Slash, exakter Vergleich gegen Allowlist
    $normalized = rtrim($origin, '/');

    $allowed = defined('ALLOWED_ORIGINS') ? ALLOWED_ORIGINS : [];
    $isAllowed = $normalized !== '' && in_array($normalized, $allowed, true);

    if ($isAllowed) {
        header("Access-Control-Allow-Origin: $normalized");
        header("Access-Control-Allow-Credentials: true");
        header("Vary: Origin");
    }
    // Nicht-erlaubte Origins bekommen bewusst KEIN ACAO-Header (Fail-Closed),
    // statt vorherigem wildcard-Fallback. Same-Origin ohne Origin-Header braucht kein CORS.

    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 600");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Permissions-Policy: camera=(), microphone=(), geolocation=()");

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
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
    // DoS-Schutz: max. 1 MB JSON-Body
    if (strlen($raw) > 1024 * 1024) {
        json_error('Request Body zu groß (max. 1 MB).', 413);
    }
    $decoded = json_decode($raw, true, 32);
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

// Eindeutiger Eltern-Verknüpfungscode für Schülerprofile (6 Zeichen, verwechslungssicher:
// kein I/O/1/0). Kollisionen werden per SELECT ausgeschlossen.
function fwg_generate_parent_code(PDO $pdo): string {
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $max = strlen($alphabet) - 1;
    for ($i = 0; $i < 20; $i++) {
        $code = '';
        for ($j = 0; $j < 6; $j++) {
            $code .= $alphabet[random_int(0, $max)];
        }
        $stmt = $pdo->prepare('SELECT id FROM profiles WHERE parent_link_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if (!$stmt->fetchColumn()) {
            return $code;
        }
    }
    json_error('Code konnte nicht erzeugt werden.', 500);
}

// Audit-Log für Admin-/Coach-Aktionen. Wirft nie (stille Drops vermeiden:
// Fehler werden geloggt, blockieren die Hauptaktion aber nicht).
function fwg_audit(PDO $pdo, string $adminId, string $action, string $targetType, ?string $targetId, array $details = []): void {
    try {
        $pdo->prepare('
            INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([
            generate_uuid(),
            $adminId,
            mb_substr($action, 0, 50),
            mb_substr($targetType, 0, 20),
            $targetId !== null ? mb_substr($targetId, 0, 64) : null,
            json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Exception $e) {
        error_log('fwg_audit failed (' . $action . '): ' . $e->getMessage());
    }
}
