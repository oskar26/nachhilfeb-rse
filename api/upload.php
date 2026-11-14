<?php
// ==============================================================================
// FWG Nachhilfebörse - Sicherer Bild-Upload für Anzeigen
// ==============================================================================
// Nimmt ausschließlich multipart/form-data mit dem Feld `file` an, prüft den
// echten Bildtyp (nicht den vom Client behaupteten MIME-Type) und legt die
// Datei mit einem zufälligen Namen unter uploads/ads/ ab.
//
// Voraussetzung: Der PHP-Benutzer darf in uploads/ads/ schreiben. Fehlt das
// Recht, antwortet der Endpunkt bewusst mit einem klaren deutschen Fehler,
// damit die App auf die URL-Eingabe zurückfallen kann (keine Data-URLs).
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    json_error('Methode nicht erlaubt. Bitte nutze POST.', 405);
}

// Uploads sind Teil der Anzeigenerstellung und damit nur für verifizierte
// Konten erlaubt (dieselbe Stufe wie api/ads.php beim Anlegen).
$user = require_verified();

const FWG_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

if (!isset($_FILES['file'])) {
    json_error('Bitte wähle ein Bild aus.', 400, ['code' => 'no_file']);
}

$file = $_FILES['file'];
if (!is_array($file) || !isset($file['error'], $file['tmp_name'], $file['size'])) {
    json_error('Der Upload ist unvollständig. Bitte erneut versuchen.', 400);
}
// Mehrfach-Uploads über file[] würden Arrays liefern; dieser Endpunkt nimmt
// bewusst genau eine Datei pro Request an.
if (is_array($file['tmp_name']) || is_array($file['error']) || is_array($file['size'])) {
    json_error('Bitte lade genau ein Bild pro Anfrage hoch.', 400);
}

// PHP-Upload-Fehlercodes in verständliche deutsche Meldungen übersetzen.
switch ((int)$file['error']) {
    case UPLOAD_ERR_OK:
        break;
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
        json_error('Das Bild ist zu groß (max. 5 MB).', 413);
        break;
    case UPLOAD_ERR_NO_FILE:
        json_error('Bitte wähle ein Bild aus.', 400, ['code' => 'no_file']);
        break;
    case UPLOAD_ERR_PARTIAL:
        json_error('Der Upload wurde unterbrochen. Bitte erneut versuchen.', 400);
        break;
    default:
        error_log('Upload failed with PHP error code ' . (int)$file['error']);
        json_error('Das Bild konnte nicht hochgeladen werden. Bitte erneut versuchen.', 400);
}

$size = (int)$file['size'];
if ($size <= 0) {
    json_error('Die Datei ist leer. Bitte wähle ein anderes Bild.', 400);
}
if ($size > FWG_UPLOAD_MAX_BYTES) {
    json_error('Das Bild ist zu groß (max. 5 MB).', 413);
}

$tmpPath = (string)$file['tmp_name'];
if (!is_uploaded_file($tmpPath)) {
    json_error('Ungültiger Upload. Bitte erneut versuchen.', 400);
}

// Echten MIME-Type über fileinfo bestimmen – niemals $_FILES['type'] vertrauen.
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($tmpPath);
if (!is_string($mime)) {
    $mime = '';
}

// Zusätzlich die Bildstruktur prüfen. Das blockiert getarnte Skripte und
// beschädigte Dateien; SVG liefert hier bewusst keinen Treffer.
$imageInfo = @getimagesize($tmpPath);
if (!is_array($imageInfo) || empty($imageInfo[2])) {
    json_error('Die Datei ist kein gültiges Bild. Erlaubt sind JPEG, PNG und WebP.', 415);
}

$allowed = [
    IMAGETYPE_JPEG => ['mime' => 'image/jpeg', 'ext' => 'jpg'],
    IMAGETYPE_PNG  => ['mime' => 'image/png',  'ext' => 'png'],
    IMAGETYPE_WEBP => ['mime' => 'image/webp', 'ext' => 'webp'],
];

$imageType = (int)$imageInfo[2];
if (!isset($allowed[$imageType])) {
    json_error('Nur JPEG, PNG und WebP sind erlaubt.', 415);
}

$expectedMime = $allowed[$imageType]['mime'];
if ($mime !== $expectedMime) {
    json_error('Der Bildtyp konnte nicht bestätigt werden. Bitte nutze JPEG, PNG oder WebP.', 415);
}

$width = (int)($imageInfo[0] ?? 0);
$height = (int)($imageInfo[1] ?? 0);
if ($width < 1 || $height < 1) {
    json_error('Die Bildabmessungen sind ungültig.', 415);
}

// Zielverzeichnis: <projekt>/uploads/ads. Rechte werden nur dokumentiert,
// nicht stillschweigend erzwungen.
$uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'ads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

if (!is_dir($uploadDir) || !is_writable($uploadDir)) {
    error_log('Ad upload directory is not writable: ' . $uploadDir);
    json_error(
        'Bild-Upload ist auf diesem Server nicht verfügbar. Bitte nutze stattdessen eine Bild-URL.',
        500,
        ['code' => 'upload_unavailable']
    );
}

// Schutzdatei auch dann anlegen, wenn der Ordner erst zur Laufzeit entsteht
// (z. B. weil das Deploy-Artefakt uploads/ nicht mitkopiert hat). Eine bereits
// vorhandene .htaccess wird nie überschrieben.
$htaccessPath = $uploadDir . DIRECTORY_SEPARATOR . '.htaccess';
if (!is_file($htaccessPath)) {
    $protection = <<<'HTACCESS'
# Upload-Verzeichnis: ausschließlich statische Bilder ausliefern.
# Automatisch von api/upload.php angelegt.
<IfModule mod_autoindex.c>
    Options -Indexes
    IndexIgnore *
</IfModule>

<FilesMatch "\.(?i:php[0-9]?|phtml|phar|pht|pl|py|cgi|sh|asp|aspx|jsp|htm|html|htaccess)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>

<IfModule mod_php.c>
    php_flag engine off
</IfModule>
<IfModule mod_php7.c>
    php_flag engine off
</IfModule>
<IfModule mod_php8.c>
    php_flag engine off
</IfModule>

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set Content-Security-Policy "default-src 'none'; img-src 'self'; sandbox"
</IfModule>
HTACCESS;
    if (@file_put_contents($htaccessPath, $protection, LOCK_EX) === false) {
        error_log('Ad upload .htaccess could not be created: ' . $htaccessPath);
        json_error(
            'Bild-Upload ist auf diesem Server nicht verfügbar. Bitte nutze stattdessen eine Bild-URL.',
            500,
            ['code' => 'upload_unavailable']
        );
    }
    @chmod($htaccessPath, 0644);
}

$extension = $allowed[$imageType]['ext'];
try {
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
} catch (Exception $e) {
    error_log('Ad upload filename generation failed: ' . $e->getMessage());
    json_error('Das Bild konnte nicht gespeichert werden. Bitte erneut versuchen.', 500);
}

$targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($tmpPath, $targetPath)) {
    error_log('Ad upload move_uploaded_file failed for ' . $targetPath);
    json_error('Das Bild konnte nicht gespeichert werden. Bitte erneut versuchen oder nutze eine Bild-URL.', 500);
}

@chmod($targetPath, 0644);

// Anzeigen speichern nur absolute https-URLs (siehe api/ads.php). Deshalb ist
// die Antwort bewusst absolut und nicht relativ.
$publicBase = defined('APP_URL') ? rtrim((string)APP_URL, '/') : 'https://nachhilfe-sv.de';
json_response([
    'url' => $publicBase . '/uploads/ads/' . $filename,
]);
