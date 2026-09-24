<?php
// ==============================================================================
// FWG Nachhilfebörse - Diagnose-Endpunkt
// Prüft nur, ob Tabellen/Spalten der letzten Updates vorhanden sind und ob der
// DB-Benutzer Tabellen anlegen darf. Gibt KEINE Inhalte und keine Credentials
// aus (Fehlermeldungen werden gekürzt und um den Datenbanknamen bereinigt).
// Aufruf im Browser: /api/diag.php  (kann nach der Fehlersuche gelöscht werden)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

cors_headers();

function fwg_diag_clean(?string $msg): ?string {
    if ($msg === null) {
        return null;
    }
    // Datenbanknamen (d00xxxxx, db123, usr_web...) aus Meldungen entfernen
    $msg = preg_replace('/(?:`|")?[a-z0-9_]*(?:db|usr_web)[a-z0-9_]*(?:`|")?\./i', '', $msg);
    return substr(trim($msg), 0, 200);
}

$out = [
    'ok' => true,
    'php' => PHP_VERSION,
];

try {
    $pdo = DB::getConnection();
    $out['db'] = true;
    $out['db_version'] = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
} catch (Throwable $e) {
    $out['ok'] = false;
    $out['db'] = false;
    $out['db_error'] = fwg_diag_clean($e->getMessage());
    json_response($out);
}

// Tabellen-Proben
$tables = ['parent_links', 'saved_searches', 'subject_clicks', 'page_analytics', 'notifications', 'app_settings', 'ads', 'profiles', 'ad_requests', 'reviews', 'favorites'];
$out['tables'] = [];
$out['table_errors'] = [];
foreach ($tables as $t) {
    try {
        $pdo->query("SELECT 1 FROM `$t` LIMIT 0");
        $out['tables'][$t] = true;
    } catch (Throwable $e) {
        $out['tables'][$t] = false;
        $out['ok'] = false;
        $out['table_errors'][$t] = fwg_diag_clean($e->getMessage());
    }
}

// Spalten-Proben
$columns = [
    'ads.is_archived', 'ads.is_active', 'ads.view_count', 'ads.session_format',
    'profiles.is_verified', 'profiles.parent_link_code', 'profiles.settings',
];
$out['columns'] = [];
$out['column_errors'] = [];
foreach ($columns as $col) {
    [$table, $column] = explode('.', $col, 2);
    try {
        $pdo->query("SELECT `$column` FROM `$table` LIMIT 0");
        $out['columns'][$col] = true;
    } catch (Throwable $e) {
        $out['columns'][$col] = false;
        $out['ok'] = false;
        $out['column_errors'][$col] = fwg_diag_clean($e->getMessage());
    }
}

// Darf der DB-Benutzer Tabellen anlegen? (Auto-Migrationen hängen davon ab)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS fwg_diag_probe (id INT PRIMARY KEY) ENGINE=InnoDB");
    $pdo->exec("DROP TABLE IF EXISTS fwg_diag_probe");
    $out['can_create_tables'] = true;
} catch (Throwable $e) {
    $out['can_create_tables'] = false;
    $out['create_error'] = fwg_diag_clean($e->getMessage());
}

// parent_links: Anzahl + Statusverteilung (nur Zahlen, keine Personenbezüge)
if (!empty($out['tables']['parent_links'])) {
    try {
        $out['parent_links_total'] = (int)$pdo->query('SELECT COUNT(*) FROM parent_links')->fetchColumn();
        $stmt = $pdo->query('SELECT status, COUNT(*) AS n FROM parent_links GROUP BY status');
        $out['parent_links_status'] = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (Throwable $e) {
        $out['parent_links_error'] = fwg_diag_clean($e->getMessage());
    }
}

json_response($out);
