<?php
// ==============================================================================
// FWG Nachhilfebörse - Saved Searches API (B4)
// GET    – eigene gemerkte Suchen
// POST   – Suche merken (ersetzt die bisherige; MVP: 1 Suche pro Nutzer)
// DELETE ?id=<id> – Suche entfernen (ohne id: alle eigenen entfernen)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// Auto-Migration: saved_searches Tabelle (fehlte in sql-updates 001-009)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS saved_searches (
            id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            query JSON NOT NULL,
            query_hash CHAR(64) NOT NULL,
            last_notified_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY idx_saved_user_hash (user_id, query_hash),
            KEY idx_saved_query (query_hash),
            CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {
    // Fallback ohne FK (falls Constraint-Name bereits belegt ist)
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS saved_searches (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                query JSON NOT NULL,
                query_hash CHAR(64) NOT NULL,
                last_notified_at DATETIME DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_saved_user_hash (user_id, query_hash),
                KEY idx_saved_query (query_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $ex2) {}
}

$user = require_verified();

// Suchparameter normalisieren (feste Schlüsselreihenfolge → stabiler Hash)
function fwg_normalize_saved_query(array $q): ?array {
    $query = mb_substr(trim((string)($q['query'] ?? '')), 0, 100);
    $type = in_array($q['type'] ?? '', ['all', 'offer', 'search'], true) ? $q['type'] : 'all';

    $subject = null;
    if (isset($q['subject']) && is_string($q['subject']) && $q['subject'] !== '' && mb_strlen($q['subject']) <= 40) {
        $subject = $q['subject'];
    }

    $grades = [];
    if (is_array($q['grades'] ?? null)) {
        foreach (array_slice($q['grades'], 0, 12) as $g) {
            if (is_string($g) && $g !== '' && mb_strlen($g) <= 8) $grades[] = $g;
        }
        $grades = array_values(array_unique($grades));
    }

    $minPrice = is_numeric($q['minPrice'] ?? null) ? max(0, min(1000, (int)$q['minPrice'])) : 0;
    $maxPrice = is_numeric($q['maxPrice'] ?? null) ? max(0, min(1000, (int)$q['maxPrice'])) : 1000;
    if ($maxPrice <= $minPrice) return null;

    $sortKey = in_array($q['sortKey'] ?? '', ['newest', 'oldest', 'cheapest', 'priciest', 'popular', 'saved'], true)
        ? $q['sortKey'] : 'newest';

    return [
        'query' => $query,
        'type' => $type,
        'subject' => $subject,
        'grades' => $grades,
        'minPrice' => $minPrice,
        'maxPrice' => $maxPrice,
        'onlyCoaches' => !empty($q['onlyCoaches']),
        'filterByTime' => !empty($q['filterByTime']),
        'sortKey' => $sortKey,
    ];
}

// ------------------------------------------------------------------------------
// 1. LISTE
// ------------------------------------------------------------------------------
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare('SELECT id, query, last_notified_at, created_at FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['id']]);
        $searches = [];
        foreach ($stmt->fetchAll() as $row) {
            $row['query'] = json_decode((string)$row['query'], true);
            $searches[] = $row;
        }
        json_response(['searches' => $searches]);
    } catch (Throwable $e) {
        error_log('saved_searches list failed: ' . $e->getMessage());
        json_error('Gespeicherte Suchen konnten nicht geladen werden.', 500);
    }
}

// ------------------------------------------------------------------------------
// 2. SPEICHERN (ersetzt die bisherige Suche; MVP: 1 Suche pro Nutzer)
// ------------------------------------------------------------------------------
if ($method === 'POST') {
    $data = get_json_input();
    $normalized = is_array($data['query'] ?? null) ? fwg_normalize_saved_query($data['query']) : null;
    if ($normalized === null) {
        json_error('Ungültige Suchparameter.');
    }

    $hash = hash('sha256', json_encode($normalized));
    $id = generate_uuid();

    try {
        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM saved_searches WHERE user_id = ?')->execute([$user['id']]);
        $pdo->prepare('INSERT INTO saved_searches (id, user_id, query, query_hash) VALUES (?, ?, ?, ?)')
            ->execute([$id, $user['id'], json_encode($normalized), $hash]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('saved_searches save failed: ' . $e->getMessage());
        json_error('Suche konnte nicht gespeichert werden. Bitte später erneut versuchen.', 500);
    }

    json_response(['search' => ['id' => $id, 'query' => $normalized]], 201);
}

// ------------------------------------------------------------------------------
// 3. ENTFERNEN (id optional; ohne id werden alle eigenen entfernt)
// ------------------------------------------------------------------------------
if ($method === 'DELETE') {
    $targetId = trim((string)($_GET['id'] ?? ''));
    try {
        if ($targetId !== '') {
            $pdo->prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?')->execute([$targetId, $user['id']]);
        } else {
            $pdo->prepare('DELETE FROM saved_searches WHERE user_id = ?')->execute([$user['id']]);
        }
    } catch (Throwable $e) {
        error_log('saved_searches delete failed: ' . $e->getMessage());
        json_error('Suche konnte nicht entfernt werden. Bitte später erneut versuchen.', 500);
    }
    json_response(['ok' => true]);
}

json_error('Unbekannte Aktion.', 404);
