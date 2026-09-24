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
    $out['pdo_class'] = get_class($pdo);
    $out['files'] = [
        'diag' => md5_file(__FILE__),
        'db' => is_file(__DIR__ . '/db.php') ? md5_file(__DIR__ . '/db.php') : null,
        'response' => is_file(__DIR__ . '/response.php') ? md5_file(__DIR__ . '/response.php') : null,
    ];
    try { $out['emulate'] = $pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES); } catch (Throwable $e2) {}
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

    // Struktur der Tabelle (Spaltennamen/Typen) – zeigt, ob eine alte/falsche Variante existiert
    try {
        $cols = $pdo->query('SHOW COLUMNS FROM parent_links')->fetchAll(PDO::FETCH_ASSOC);
        $out['parent_links_columns'] = array_map(
            static fn($c) => $c['Field'] . ':' . $c['Type'] . ($c['Null'] === 'NO' ? ' NOT NULL' : ''),
            $cols
        );
    } catch (Throwable $e) {
        $out['parent_links_columns_error'] = fwg_diag_clean($e->getMessage());
    }

    // Fremdschlüssel (leer, wenn die Ersatz-Tabelle ohne FK angelegt wurde)
    try {
        $fkStmt = $pdo->query("SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parent_links' AND REFERENCED_TABLE_NAME IS NOT NULL");
        $out['parent_links_fks'] = $fkStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {}

    try {
        $out['sql_mode'] = (string)$pdo->query('SELECT @@sql_mode')->fetchColumn();
    } catch (Throwable $e) {}

    // Probe-Insert mit Rollback: reproduziert einen Insert-Fehler ohne Daten zu ändern
    $sqlProbe = 'INSERT INTO parent_links (id, parent_id, child_id, status, permissions, created_at, linked_at) VALUES (?, ?, ?, "active", ?, NOW(), NOW())';
    try {
        $pid = $pdo->query('SELECT id FROM profiles LIMIT 1')->fetchColumn();
    } catch (Throwable $e) {
        $pid = false;
    }
    if (!$pid) {
        $out['probe_insert'] = 'skipped (keine Profile vorhanden)';
    } else {
        // Variante 1: prepare + execute(array)
        try {
            $pdo->beginTransaction();
            $ins = $pdo->prepare($sqlProbe);
            $out['probe_query_placeholders'] = substr_count((string)$ins->queryString, '?');
            $out['probe_query_string'] = (string)$ins->queryString;
            $ins->execute([generate_uuid(), $pid, $pid, json_encode(['can_view_ads' => true], JSON_UNESCAPED_UNICODE)]);
            $out['probe_insert'] = 'ok';
        } catch (Throwable $e) {
            $out['probe_insert'] = 'failed';
            $out['probe_insert_error'] = fwg_diag_clean($e->getMessage());
            $out['probe_insert_sqlstate'] = $e->getCode();
            if ($e instanceof PDOException && isset($e->errorInfo[1])) {
                $out['probe_insert_errno'] = $e->errorInfo[1];
            }
        } finally {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
        }

        // Variante 2: prepare + bindValue (ohne Array)
        try {
            $pdo->beginTransaction();
            $ins2 = $pdo->prepare($sqlProbe);
            $ins2->bindValue(1, generate_uuid());
            $ins2->bindValue(2, $pid);
            $ins2->bindValue(3, $pid);
            $ins2->bindValue(4, json_encode(['can_view_ads' => true], JSON_UNESCAPED_UNICODE));
            $ins2->execute();
            $out['probe_bind'] = 'ok';
        } catch (Throwable $e) {
            $out['probe_bind_error'] = fwg_diag_clean($e->getMessage());
        } finally {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
        }

        // Variante 3: exec() mit Literalen (ohne Prepared Statement)
        try {
            $pdo->beginTransaction();
            $literal = "'" . generate_uuid() . "', '" . $pid . "', '" . $pid . "', 'active', NULL, NOW(), NOW()";
            $pdo->exec('INSERT INTO parent_links (id, parent_id, child_id, status, permissions, created_at, linked_at) VALUES (' . $literal . ')');
            $out['probe_exec'] = 'ok';
        } catch (Throwable $e) {
            $out['probe_exec_error'] = fwg_diag_clean($e->getMessage());
        } finally {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
        }
    }
}

json_response($out);
