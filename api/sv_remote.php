<?php
// ==============================================================================
// FWG Nachhilfebörse - SV-Manager Fernsteuerung (direkter MySQL-Zugriff per API-Key)
//
// ABLAGE:  Diese Datei auf dem ALL-INKL-Server ablegen als  api/sv_remote.php
//          (im gleichen Ordner wie admin.php, also z. B. neben auth.php/admin.php)
// KEY:     In  api/db_credentials.php  eine Zeile ergänzen:
//              define('SV_REMOTE_KEY', 'DEIN-LANGER-ZUFALLS-KEY');
//          (Die Datei liegt nur auf dem Server, sie wird nie per Git verteilt.)
//
// AUFRUF:  https://nachhilfe-sv.de/api/sv_remote.php?action=users&...
//          Key mitsenden als Header  X-SV-Key: ...  (oder ?key=...)
// ==============================================================================

require_once __DIR__ . '/db.php'; // lädt config.php (inkl. db_credentials.php) + response.php

$method = $_SERVER['REQUEST_METHOD'];

// CORS: bewusst offen (*), weil Auth per Key läuft und keine Cookies nutzt.
// Damit funktioniert der SV-Manager von überall (localhost, Theken-Pi, Domain).
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-SV-Key');
header('Vary: Origin');
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- API-Key-Prüfung (zeitkonstanter Vergleich) ---
$provided = $_SERVER['HTTP_X_SV_KEY'] ?? $_GET['key'] ?? '';
$expected = defined('SV_REMOTE_KEY') ? (string) SV_REMOTE_KEY : '';
if ($expected === '') {
    json_error('SV_REMOTE_KEY nicht gesetzt (in api/db_credentials.php eintragen)', 500);
}
if (!is_string($provided) || !hash_equals($expected, (string) $provided)) {
    json_error('Unbefugt (falscher API-Key)', 401);
}

$action = $_GET['action'] ?? '';
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// Verbindungstest
// ------------------------------------------------------------------------------
if ($action === 'ping' && $method === 'GET') {
    json_response(['ok' => true, 'time' => date('c')]);
}

// ------------------------------------------------------------------------------
// Nutzerliste (gleiche Filter wie Admin-Panel: search/role/status/limit/offset)
// ------------------------------------------------------------------------------
if ($action === 'users' && $method === 'GET') {
    $search = trim((string) ($_GET['search'] ?? ''));
    $role = (string) ($_GET['role'] ?? '');
    $status = (string) ($_GET['status'] ?? '');
    $limit = max(1, min(100, (int) ($_GET['limit'] ?? 25)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));

    $where = [];
    $params = [];
    if ($search !== '') {
        $where[] = '(p.display_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }
    if (in_array($role, ['student', 'sv_admin', 'coach_admin', 'parent'], true)) {
        $where[] = 'p.role = ?';
        $params[] = $role;
    }
    if ($status === 'verified') {
        $where[] = 'p.is_verified = 1 AND p.is_banned = 0';
    } elseif ($status === 'unverified') {
        $where[] = 'p.is_verified = 0 AND p.is_banned = 0';
    } elseif ($status === 'banned') {
        $where[] = 'p.is_banned = 1';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM profiles p JOIN users u ON u.id = p.id $whereSql");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $dataStmt = $pdo->prepare(
        "SELECT p.*, u.email as auth_email, u.created_at as registered_at " .
        "FROM profiles p JOIN users u ON u.id = p.id $whereSql " .
        "ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset"
    );
    $dataStmt->execute($params);

    json_response(['data' => $dataStmt->fetchAll(), 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

// ------------------------------------------------------------------------------
// Verifizieren / Entziehen  (POST user_id, is_verified)
// ------------------------------------------------------------------------------
if ($action === 'verify' && $method === 'POST') {
    $in = get_json_input();
    $targetId = trim((string) ($in['user_id'] ?? ''));
    if ($targetId === '') {
        json_error('user_id fehlt');
    }
    $verify = !empty($in['is_verified']) ? 1 : 0;
    $stmt = $pdo->prepare('UPDATE profiles SET is_verified = ? WHERE id = ?');
    $stmt->execute([$verify, $targetId]);
    if ($stmt->rowCount() === 0) {
        json_error('Nutzer nicht gefunden', 404);
    }
    try {
        fwg_audit($pdo, 'sv_remote', $verify ? 'verify_user' : 'unverify_user', 'profile', $targetId, []);
    } catch (Throwable $e) {
        // Audit darf die Aktion nie blockieren
    }
    json_response(['ok' => true, 'is_verified' => $verify]);
}

// ------------------------------------------------------------------------------
// Bearbeiten  (POST user_id + Felder; gleiche Whitelist wie Admin-Panel)
// ------------------------------------------------------------------------------
if ($action === 'update' && $method === 'POST') {
    $in = get_json_input();
    $targetId = trim((string) ($in['user_id'] ?? ''));
    if ($targetId === '') {
        json_error('user_id fehlt');
    }
    $exists = $pdo->prepare('SELECT id FROM profiles WHERE id = ?');
    $exists->execute([$targetId]);
    if (!$exists->fetch()) {
        json_error('Nutzer nicht gefunden', 404);
    }

    $allowedText = [
        'first_name', 'last_name', 'display_name', 'grade_level', 'class_letter',
        'bio', 'moodle_name', 'phone_number', 'contact_other',
        'avatar_url', 'avatar_type', 'banner_color', 'birth_date',
    ];
    $fields = [];
    $params = [];
    foreach ($allowedText as $tf) {
        if (array_key_exists($tf, $in)) {
            $fields[] = "`$tf` = ?";
            $params[] = $in[$tf];
        }
    }
    if (array_key_exists('is_verified', $in)) {
        $fields[] = '`is_verified` = ?';
        $params[] = !empty($in['is_verified']) ? 1 : 0;
    }
    if (array_key_exists('role', $in)) {
        if (!in_array($in['role'], ['student', 'sv_admin', 'coach_admin', 'parent'], true)) {
            json_error('Ungültige Rolle');
        }
        $fields[] = '`role` = ?';
        $params[] = $in['role'];
    }
    if (!$fields) {
        json_error('Keine änderbaren Felder übergeben');
    }
    $params[] = $targetId;
    $stmt = $pdo->prepare('UPDATE profiles SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($params);

    $fresh = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $fresh->execute([$targetId]);
    json_response(['ok' => true, 'profile' => $fresh->fetch()]);
}

// ------------------------------------------------------------------------------
// Löschen  (POST user_id; kein sv_admin-Löschen; Kaskade über users-Tabelle)
// ------------------------------------------------------------------------------
if ($action === 'delete' && $method === 'POST') {
    $in = get_json_input();
    $targetId = trim((string) ($in['user_id'] ?? ''));
    if ($targetId === '') {
        json_error('user_id fehlt');
    }
    $rowStmt = $pdo->prepare('SELECT id, display_name, email, role FROM profiles WHERE id = ?');
    $rowStmt->execute([$targetId]);
    $row = $rowStmt->fetch();
    if (!$row) {
        json_error('Nutzer nicht gefunden', 404);
    }
    if ($row['role'] === 'sv_admin') {
        json_error('SV-Admins können nicht per Fernsteuerung gelöscht werden (erst Rolle entziehen)');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE promo_codes SET created_by = NULL WHERE created_by = ?')->execute([$targetId]);
        $pdo->prepare('DELETE FROM promo_redemptions WHERE user_id = ?')->execute([$targetId]);
        // Kaskade: fk_profiles_user (ON DELETE CASCADE) räumt profiles + Rest weg.
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$targetId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Löschen fehlgeschlagen');
    }
    try {
        fwg_audit($pdo, 'sv_remote', 'delete_user', 'profile', $targetId, []);
    } catch (Throwable $e) {
        // Audit darf die Aktion nie blockieren
    }
    json_response(['ok' => true]);
}

json_error('Unbekannte Aktion', 404);
