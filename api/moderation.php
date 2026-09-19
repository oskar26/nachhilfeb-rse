<?php
// ==============================================================================
// FWG Nachhilfebörse - Moderations-API (Profanity 2.0 Filter-Feedback)
// - GET  ?action=overrides        (eingeloggt): Allow-/Block-Overrides für Engine
// - POST ?action=override         (SV-Admin): Wort zu Allow-/Blockliste
// - POST ?action=override_delete  (SV-Admin): Wort entfernen
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo = DB::getConnection();

// Auto-Migration: Filter-Overrides (Filter-Training durch die SV)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS filter_overrides (
            word VARCHAR(120) PRIMARY KEY,
            action ENUM('allow','block') NOT NULL DEFAULT 'block',
            created_by VARCHAR(36) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $e) {
    error_log('filter_overrides migration note: ' . $e->getMessage());
}

// ------------------------------------------------------------------------------
// 1. Overrides lesen (alle eingeloggten Nutzer, kein PII)
// ------------------------------------------------------------------------------
if ($action === 'overrides' && $method === 'GET') {
    require_auth();
    $rows = $pdo->query('SELECT word, action FROM filter_overrides')->fetchAll();
    $allow = [];
    $block = [];
    foreach ($rows as $r) {
        if (($r['action'] ?? '') === 'allow') $allow[] = $r['word'];
        else $block[] = $r['word'];
    }
    json_response(['allow' => $allow, 'block' => $block]);
}

// ------------------------------------------------------------------------------
// 2. Override setzen (nur SV-Admin, mit Audit)
// ------------------------------------------------------------------------------
if ($action === 'override' && $method === 'POST') {
    $admin = require_admin();
    $data = get_json_input();
    $word = mb_strtolower(trim($data['word'] ?? ''));
    $word = mb_substr($word, 0, 120);
    $act = ($data['action'] ?? '') === 'allow' ? 'allow' : 'block';
    if ($word === '') {
        json_error('Kein Wort übergeben.');
    }
    $pdo->prepare('INSERT INTO filter_overrides (word, action, created_by) VALUES (?, ?, ?)
                   ON DUPLICATE KEY UPDATE action = VALUES(action), created_by = VALUES(created_by)')
        ->execute([$word, $act, $admin['id']]);
    fwg_audit($pdo, $admin['id'], 'filter_override_set', 'filter', $word, ['action' => $act]);
    json_response(['message' => "Filter-Feedback gespeichert: „{$word}“ → {$act}."]);
}

// ------------------------------------------------------------------------------
// 3. Override entfernen (nur SV-Admin, mit Audit)
// ------------------------------------------------------------------------------
if ($action === 'override_delete' && $method === 'POST') {
    $admin = require_admin();
    $data = get_json_input();
    $word = mb_strtolower(trim($data['word'] ?? ''));
    if ($word === '') {
        json_error('Kein Wort übergeben.');
    }
    $pdo->prepare('DELETE FROM filter_overrides WHERE word = ?')->execute([$word]);
    fwg_audit($pdo, $admin['id'], 'filter_override_delete', 'filter', $word, []);
    json_response(['message' => "Filter-Feedback für „{$word}“ entfernt."]);
}

json_error('Methode nicht erlaubt.', 405);
