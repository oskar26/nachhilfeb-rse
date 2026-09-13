<?php
// ==============================================================================
// FWG Nachhilfebörse - API-Konfiguration (ALL-INKL)
// ==============================================================================

// Fehleranzeige für Entwicklung (in Produktion ausschalten)
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Zeitzone
date_default_timezone_set('Europe/Berlin');

// Falls eine lokale db_credentials.php existiert, diese laden
if (file_exists(__DIR__ . '/db_credentials.php')) {
    require_once __DIR__ . '/db_credentials.php';
}

// Datenbank-Konfiguration (Defaults / Platzhalter)
// Trage deine ALL-INKL MySQL-Datenbankdaten hier ein (oder in db_credentials.php):
if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: 'd0483af1');
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: 'd0483af1');
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') ?: 'cwfW:QC-9zVf8gp55d+8');
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

// E-Mail & Branding Konfiguration
if (!defined('APP_URL')) define('APP_URL', 'https://nachhilfe-sv.de');
if (!defined('MAIL_FROM_EMAIL')) define('MAIL_FROM_EMAIL', 'anmeldung@nachhilfe-sv.de');
if (!defined('MAIL_FROM_NAME')) define('MAIL_FROM_NAME', 'FWG Nachhilfebörse');
if (!defined('MAIL_REPLY_TO')) define('MAIL_REPLY_TO', 'technik@nachhilfe-sv.de');


// JWT Secret Key (Für die Signierung der Login-Tokens)
// WICHTIG: Ersetze diesen String durch ein zufälliges 64-Zeichen Secret in Produktion!
if (!defined('JWT_SECRET')) define('JWT_SECRET', getenv('JWT_SECRET') ?: 'fwg-nachhilfe-2026-super-secure-token-key-allinkl-dresden-49f2b8');
if (!defined('JWT_EXPIRY')) define('JWT_EXPIRY', 86400 * 30); // 30 Tage gültig

// CORS erlaubte Origins
if (!defined('ALLOWED_ORIGINS')) {
    define('ALLOWED_ORIGINS', [
        'https://nachhilfe-sv.de',
        'https://www.nachhilfe-sv.de',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8000'
    ]);
}
