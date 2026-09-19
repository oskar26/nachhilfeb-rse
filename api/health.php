<?php
// ==============================================================================
// FWG Nachhilfebörse - Health Page (Server-Selbsttest, ohne Secrets)
// Im Browser öffnen: https://nachhilfe-sv.de/api/health.php
//   -> zeigt eine lesbare Status-Seite (grün/rot), KEIN Fachwissen nötig.
// ?format=json -> Maschinen-Format für die App.
// ?action=testmail (POST, nur SV-Admin): Test-Mail an die eigene Adresse.
// ==============================================================================
ignore_user_abort(false);
set_time_limit(20);

$__health_sent = false;
register_shutdown_function(function () use (&$__health_sent) {
    $err = error_get_last();
    if (!$__health_sent && $err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header('Content-Type: text/html; charset=utf-8');
        }
        echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Server-Fehler</title></head>'
            . '<body style="font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px">'
            . '<h1>Server-Fehler (500)</h1>'
            . '<p>Die Status-Seite selbst ist abgestürzt, bevor sie etwas prüfen konnte. '
            . 'Das spricht für einen <strong>PHP-Fehler auf dem Server</strong> (z. B. Datei fehlt oder PHP-Version zu alt).</p>'
            . '<p>Bitte im KAS das <strong>PHP-Fehlerprotokoll</strong> des Abos prüfen '
            . '(KAS → Menü → Logs/Protokolle) und die Uhrzeit des Aufrufs suchen.</p>'
            . '</body></html>';
    }
});

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'status';
$wantJson = (($_GET['format'] ?? '') === 'json')
    || (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false);

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
            . 'kommen auch Verifizierungs- und Reset-Mails an.</p>'
        );
    } catch (Exception $e) {
        error_log('Health testmail failed: ' . $e->getMessage());
    }
    json_response(['mail_accepted' => (bool)$ok, 'to' => $to]);
}

// ------------------------------------------------------------------------------
// STATUS prüfen (öffentlich, keine Secrets)
// ------------------------------------------------------------------------------
$result = [
    'ok' => false,
    'db_ok' => false,
    'jwt_configured' => false,
    'deploy_time' => date('c'),
    'tables' => [],
    'missing_tables' => [],
];

$requiredTables = [
    'users', 'profiles', 'ads', 'invite_codes', 'promo_codes',
    'promo_redemptions', 'support_tickets', 'support_messages', 'reports',
    'admin_audit_log', 'page_analytics', 'filter_overrides', 'ad_views',
    'app_settings', 'news', 'notifications', 'email_verifications',
];

$dbError = '';
try {
    $pdo = DB::getConnection();
    $pdo->setAttribute(PDO::ATTR_TIMEOUT, 5);
    $pdo->query('SELECT 1');
    $result['db_ok'] = true;

    $result['jwt_configured'] = defined('JWT_SECRET') && is_string(JWT_SECRET) && strlen(JWT_SECRET) >= 32;

    foreach ($requiredTables as $t) {
        try {
            $exists = $pdo->query('SHOW TABLES LIKE ' . $pdo->quote($t))->fetchColumn();
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
    $dbError = 'Datenbank nicht erreichbar (' . get_class($e) . '). Details stehen im Server-Fehlerprotokoll.';
    error_log('Health check failed: ' . $e->getMessage());
}

$__health_sent = true;

if ($wantJson) {
    json_response($result);
}

// ------------------------------------------------------------------------------
// HTML-Ansicht für Menschen
// ------------------------------------------------------------------------------
header('Content-Type: text/html; charset=utf-8');

function h_badge($ok, $yes = 'OK', $no = 'FEHLT') {
    $bg = $ok ? '#dcfce7;color:#166534' : '#fee2e2;color:#991b1b';
    $txt = $ok ? $yes : $no;
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:12px;background:' . $bg . '">' . htmlspecialchars($txt) . '</span>';
}

echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">'
    . '<meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<title>Server-Status · FWG Nachhilfebörse</title></head>'
    . '<body style="font-family:sans-serif;max-width:680px;margin:32px auto;padding:0 16px;color:#111">';
echo '<h1>Server-Status der Nachhilfebörse</h1>';
echo '<p>Stand: ' . htmlspecialchars($result['deploy_time']) . '</p>';
echo '<p>Gesamt: ' . h_badge($result['ok'], 'ALLES OK', 'PROBLEM') . '</p>';

echo '<h2>Datenbank</h2><p>' . h_badge($result['db_ok'], 'VERBUNDEN', 'NICHT ERREICHBAR') . '</p>';
if ($dbError) {
    echo '<p>' . htmlspecialchars($dbError) . ' Prüfe im KAS die Datenbank-Zugangsdaten (DB_NAME, DB_USER, DB_PASS) bzw. die Datei <code>api/db_credentials.php</code> auf dem Server.</p>';
}

echo '<h2>Login-Schlüssel (JWT_SECRET)</h2><p>' . h_badge($result['jwt_configured'], 'GESETZT', 'FEHLT') . '</p>';
if (!$result['jwt_configured']) {
    echo '<p><strong>Ohne diesen Schlüssel geht keine Anmeldung.</strong> Im KAS unter PHP-Einstellungen des Abos die Umgebungsvariable '
        . '<code>JWT_SECRET</code> mit mindestens 32 zufälligen Zeichen anlegen (oder in <code>api/db_credentials.php</code> auf dem Server setzen).</p>';
}

echo '<h2>Tabellen (' . count($result['tables']) . ' geprüft)</h2>';
if (!empty($result['missing_tables'])) {
    echo '<p>Fehlend: ' . h_badge(false, '', htmlspecialchars(implode(', ', $result['missing_tables']))) . '</p>';
    echo '<p>Fehlende Tabellen per phpMyAdmin nachimportieren (Dateien <code>sql-updates/001</code> bis <code>007</code>, siehe Anleitung im Projekt).</p>';
} else {
    echo '<p>' . h_badge(true, 'ALLE VORHANDEN') . '</p>';
}
echo '<ul style="columns:2;font-size:13px">';
foreach ($result['tables'] as $t => $ok) {
    echo '<li><code>' . htmlspecialchars($t) . '</code> ' . h_badge($ok) . '</li>';
}
echo '</ul>';
echo '<hr><p style="font-size:12px;color:#666">Maschinen-Format: <a href="?format=json">?format=json</a> · Keine Passwörter oder Schlüssel werden hier je angezeigt.</p>';
echo '</body></html>';
