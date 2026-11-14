<?php
// ==============================================================================
// FWG Nachhilfebörse - Blocks API (Konten blockieren / entblocken)
// ==============================================================================
// Blockierungen sind einseitig gespeichert (blocker_id -> blocked_id).
// Die Anwendung prüft bei Bedarf beide Richtungen (siehe requests.php).
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// Auto-Migration: ältere Datenbanken ohne 016-Import funktionsfähig halten.
// Wichtig: profiles.id ist VARCHAR(36) (UUID), deshalb müssen auch die
// Block-Spalten VARCHAR(36) sein – nicht INT.
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_blocks (
            blocker_id VARCHAR(36) NOT NULL,
            blocked_id VARCHAR(36) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (blocker_id, blocked_id),
            KEY idx_user_blocks_blocked (blocked_id),
            CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES profiles (id) ON DELETE CASCADE,
            CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES profiles (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Exception $e) {
    // Falls die Tabelle bereits in einer älteren Variante existiert, ist das
    // kein Grund, den gesamten Endpunkt zu blockieren.
    error_log('user_blocks Auto-Migration: ' . $e->getMessage());
}

$user = require_auth();

// ------------------------------------------------------------------------------
// 1. GET: LISTE DER BLOCKIERTEN KONTEN
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT p.id,
               p.display_name,
               p.avatar_url,
               p.avatar_type,
               ub.created_at
        FROM user_blocks ub
        JOIN profiles p ON p.id = ub.blocked_id
        WHERE ub.blocker_id = ?
        ORDER BY ub.created_at DESC, p.display_name ASC
    ');
    $stmt->execute([$user['id']]);

    json_response($stmt->fetchAll());
}

// ------------------------------------------------------------------------------
// 2. POST: BLOCKIEREN / ENTBLOCKEN / STATUS ABFRAGEN
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();

    // action darf sowohl im JSON-Body als auch als Query-/Form-Parameter kommen.
    $actionRaw = $data['action'] ?? ($_POST['action'] ?? ($_GET['action'] ?? ''));
    $targetRaw = $data['user_id'] ?? ($_POST['user_id'] ?? ($_GET['user_id'] ?? ''));
    $action = is_string($actionRaw) ? strtolower(trim($actionRaw)) : '';
    $targetId = is_string($targetRaw) ? trim($targetRaw) : '';

    if (!in_array($action, ['block', 'unblock', 'status'], true)) {
        json_error('Ungültige Aktion. Erlaubt sind block, unblock und status.');
    }
    if ($targetId === '') {
        json_error('user_id ist erforderlich.');
    }

    if ($action === 'block') {
        if ($targetId === $user['id']) {
            json_error('Du kannst dich nicht selbst blockieren.');
        }

        // Ziel muss existieren, sonst würde INSERT IGNORE einen Fremdschlüssel-
        // Fehler verschlucken und die Blockierung stillschweigend nicht anlegen.
        $check = $pdo->prepare('SELECT 1 FROM profiles WHERE id = ? LIMIT 1');
        $check->execute([$targetId]);
        if (!$check->fetchColumn()) {
            json_error('Nutzer nicht gefunden.', 404);
        }

        $pdo->prepare('INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)')
            ->execute([$user['id'], $targetId]);

        json_response([
            'blocked' => true,
            'message' => 'Nutzer wurde blockiert.'
        ]);
    }

    if ($action === 'unblock') {
        $pdo->prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
            ->execute([$user['id'], $targetId]);

        json_response([
            'blocked' => false,
            'message' => 'Blockierung wurde aufgehoben.'
        ]);
    }

    // action === 'status'
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?');
    $stmt->execute([$user['id'], $targetId]);

    json_response(['blocked' => (int)$stmt->fetchColumn() > 0]);
}

json_error('Methode nicht erlaubt.', 405);
