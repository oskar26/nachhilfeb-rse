<?php
// ==============================================================================
// FWG Nachhilfebörse - Health API (Server-Selbsttest, ohne Secrets)
// Öffentlich: sagt NUR, ob DB/JWT/Tabellen ok sind (keine Werte, keine Details).
// ?action=testmail (POST, nur SV-Admin): sendet eine Test-Mail an die eigene
// Adresse und meldet zurück, ob PHP mail() sie angenommen hat.
// ==============================================================================
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'status';

// ------------------------------------------------------------------------------
// TESTMAIL (nur SV-Admin, an die eigene Adresse)
// ------------------------------------------------------------------------------
if ($action === 'testmail' && $method === 'POST') {
    $admin = require_admin();
    $to = $admin['email'] ?? null;
    if (!$to) {
        json_error('Keine E-Mail-Adresse am Admin-Profil hinterlegt.');
    }
    $ok = false;
    try {
        $ok = send_html_email(
            $to,
            'Test-Mail FWG Nachhilfebörse',
            '<p>Der Mailversand dieses Servers funktioniert. Wenn du diese Mail liest, '
            . 'kommen auch Willkommens- und Reset-Mails an.</p>'
        );
    } catch (Exception $e) {
        error_log('Health testmail failed: ' . $e->getMessage());
    }
    json_response(['mail_accepted' => (bool)$ok, 'to' => $to]);
}

// ------------------------------------------------------------------------------
// STATUS (öffentlich, keine Secrets)
// ------------------------------------------------------------------------------
$result = [
    'ok' => false,
    'db_ok' => false,
    'jwt_configured' => false,
    'tables' => [],
    'missing_tables' => [],
];

$requiredTables = [
    'users', 'profiles', 'ads', 'invite_codes', 'promo_codes',
    'promo_redemptions', 'support_tickets', 'support_messages', 'reports',
    'admin_audit_log', 'page_analytics', 'filter_overrides', 'ad_views',
    'app_settings', 'news', 'notifications',
];

try {
    $pdo = DB::getConnection();
    $pdo->query('SELECT 1');
    $result['db_ok'] = true;

    $result['jwt_configured'] = defined('JWT_SECRET') && is_string(JWT_SECRET) && strlen(JWT_SECRET) >= 32;

    foreach ($requiredTables as $t) {
        try {
            $exists = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($t))->fetchColumn();
            $ok = !empty($exists);
        } catch (Exception $e) {
            $ok = false;
        }
        $result['tables'][$t] = $ok;
        if (!$ok) {
            $result['missing_tables'][] = $t;
        }
    }

    $result['ok'] = $result['db_ok'] && $result['jwt_configured'] && empty($result['missing_tables']);
} catch (Exception $e) {
    error_log('Health check failed: ' . $e->getMessage());
}

json_response($result);
