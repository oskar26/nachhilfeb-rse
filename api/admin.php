<?php
// ==============================================================================
// FWG Nachhilfebörse - Admin Dashboard API (Overview, Users, Bans, Verification)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$admin = require_admin();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. OVERVIEW STATISTIKEN
// ------------------------------------------------------------------------------
if ($action === 'overview' && $method === 'GET') {
    $totalUsers = $pdo->query('SELECT COUNT(*) FROM profiles')->fetchColumn();
    $verifiedUsers = $pdo->query('SELECT COUNT(*) FROM profiles WHERE is_verified = 1')->fetchColumn();
    $activeAds = $pdo->query('SELECT COUNT(*) FROM ads WHERE is_active = 1 AND is_archived = 0')->fetchColumn();
    $openReports = $pdo->query('SELECT COUNT(*) FROM reports WHERE status = \'open\'')->fetchColumn();
    $openTickets = $pdo->query('SELECT COUNT(*) FROM support_tickets WHERE status = \'open\'')->fetchColumn();
    $totalMessages = $pdo->query('SELECT COUNT(*) FROM messages')->fetchColumn();

    // Letzte Aktivitäten (Audit Log)
    $recentLog = $pdo->query('
        SELECT l.*, a.display_name as admin_name
        FROM admin_audit_log l
        LEFT JOIN profiles a ON a.id = l.admin_id
        ORDER BY l.created_at DESC
        LIMIT 10
    ')->fetchAll();

    json_response([
        'stats' => [
            'total_users' => (int)$totalUsers,
            'verified_users' => (int)$verifiedUsers,
            'active_ads' => (int)$activeAds,
            'open_reports' => (int)$openReports,
            'open_tickets' => (int)$openTickets,
            'total_messages' => (int)$totalMessages,
        ],
        'audit_log' => $recentLog
    ]);
}

// ------------------------------------------------------------------------------
// 2. NUTZERLISTE
// ------------------------------------------------------------------------------
if ($action === 'users' && $method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $role = $_GET['role'] ?? '';

    $where = [];
    $params = [];

    if ($search) {
        $where[] = '(p.display_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ?)';
        $wild = '%' . $search . '%';
        $params = array_merge($params, [$wild, $wild, $wild, $wild]);
    }
    if ($role && in_array($role, ['student', 'sv_admin', 'parent'])) {
        $where[] = 'p.role = ?';
        $params[] = $role;
    }

    $sql = '
        SELECT p.*, u.email as auth_email, u.created_at as registered_at
        FROM profiles p
        JOIN users u ON u.id = p.id
    ';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY p.created_at DESC LIMIT 100';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    foreach ($users as &$u) {
        $u['subjects'] = json_decode($u['subjects'] ?? '[]', true);
        $u['settings'] = json_decode($u['settings'] ?? '{}', true);
        $u['is_verified'] = (bool)$u['is_verified'];
        $u['is_banned'] = (bool)$u['is_banned'];
    }

    json_response($users);
}

// ------------------------------------------------------------------------------
// 3. NUTZER SPERREN / ENTSPERREN
// ------------------------------------------------------------------------------
if ($action === 'ban_user' && $method === 'POST') {
    $data = get_json_input();
    $targetId = $data['user_id'] ?? null;
    $isBanned = !empty($data['is_banned']);
    $banType = in_array($data['ban_type'] ?? '', ['temporary', 'permanent']) ? $data['ban_type'] : 'temporary';
    $banReason = trim($data['ban_reason'] ?? '');
    $bannedUntil = !empty($data['banned_until']) ? $data['banned_until'] : null;

    if (!$targetId) {
        json_error('user_id erforderlich.');
    }
    if ($targetId === $admin['id']) {
        json_error('Du kannst dich nicht selbst sperren.', 400);
    }

    $stmt = $pdo->prepare('
        UPDATE profiles 
        SET is_banned = ?, ban_type = ?, ban_reason = ?, banned_until = ?
        WHERE id = ?
    ');
    $stmt->execute([
        $isBanned ? 1 : 0,
        $isBanned ? $banType : 'temporary',
        $isBanned ? $banReason : null,
        $isBanned && $banType === 'temporary' ? $bannedUntil : null,
        $targetId
    ]);

    // Audit Log schreiben
    $logId = generate_uuid();
    $pdo->prepare('
        INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
        VALUES (?, ?, ?, \'profile\', ?, ?)
    ')->execute([
        $logId,
        $admin['id'],
        $isBanned ? 'ban_user' : 'unban_user',
        $targetId,
        json_encode(['reason' => $banReason, 'type' => $banType, 'until' => $bannedUntil])
    ]);

    json_response([
        'message' => $isBanned ? 'Nutzer erfolgreich gesperrt.' : 'Nutzer erfolgreich entsperrt.'
    ]);
}

// ------------------------------------------------------------------------------
// 4. NUTZER VERIFIZIEREN
// ------------------------------------------------------------------------------
if ($action === 'verify_user' && $method === 'POST') {
    $data = get_json_input();
    $targetId = $data['user_id'] ?? null;
    $verify = !empty($data['is_verified']);

    if (!$targetId) {
        json_error('user_id erforderlich.');
    }

    $pdo->prepare('UPDATE profiles SET is_verified = ? WHERE id = ?')->execute([$verify ? 1 : 0, $targetId]);

    // Audit Log
    $logId = generate_uuid();
    $pdo->prepare('
        INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
        VALUES (?, ?, ?, \'profile\', ?, ?)
    ')->execute([
        $logId,
        $admin['id'],
        $verify ? 'verify_user' : 'unverify_user',
        $targetId,
        json_encode(['verified' => $verify])
    ]);

    json_response(['message' => $verify ? 'Nutzer verifiziert.' : 'Verifikation entzogen.']);
}

// ------------------------------------------------------------------------------
// 5. ROLLE ÄNDERN
// ------------------------------------------------------------------------------
if ($action === 'set_role' && $method === 'POST') {
    $data = get_json_input();
    $targetId = $data['user_id'] ?? null;
    $newRole = $data['role'] ?? '';

    if (!$targetId || !in_array($newRole, ['student', 'sv_admin', 'parent'])) {
        json_error('Gültige user_id und Rolle erforderlich.');
    }

    $pdo->prepare('UPDATE profiles SET role = ? WHERE id = ?')->execute([$newRole, $targetId]);

    json_response(['message' => "Rolle erfolgreich zu '$newRole' geändert."]);
}

json_error('Ungültige Admin-Aktion.', 404);
