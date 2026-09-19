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
    $bannedUsers = $pdo->query('SELECT COUNT(*) FROM profiles WHERE is_banned = 1')->fetchColumn();
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

    // Rollenverteilung + Stufenverteilung (für Analytics, ohne Volltabellen-Export)
    $byRole = [];
    foreach ($pdo->query('SELECT role, COUNT(*) as c FROM profiles GROUP BY role')->fetchAll() as $row) {
        $byRole[$row['role']] = (int)$row['c'];
    }
    $gradeDist = $pdo->query('
        SELECT grade_level as grade, COUNT(*) as c FROM profiles
        WHERE grade_level IS NOT NULL AND grade_level != ""
        GROUP BY grade_level ORDER BY c DESC LIMIT 15
    ')->fetchAll();
    foreach ($gradeDist as &$g) { $g['c'] = (int)$g['c']; }

    // Neueste Nutzer (für Overview)
    $recentUsers = $pdo->query('
        SELECT p.id, p.display_name, p.first_name, p.last_name, p.email, p.role,
               p.is_verified, p.is_banned, p.created_at
        FROM profiles p
        ORDER BY p.created_at DESC
        LIMIT 5
    ')->fetchAll();

    json_response([
        'stats' => [
            'total_users' => (int)$totalUsers,
            'verified_users' => (int)$verifiedUsers,
            'banned_users' => (int)$bannedUsers,
            'active_ads' => (int)$activeAds,
            'open_reports' => (int)$openReports,
            'open_tickets' => (int)$openTickets,
            'total_messages' => (int)$totalMessages,
        ],
        'by_role' => $byRole,
        'grade_distribution' => $gradeDist,
        'recent_users' => $recentUsers,
        'audit_log' => $recentLog
    ]);
}

// ------------------------------------------------------------------------------
// 2. NUTZERLISTE
// ------------------------------------------------------------------------------
if ($action === 'users' && $method === 'GET') {
    $search = mb_substr(trim($_GET['search'] ?? ''), 0, 100);
    $role = $_GET['role'] ?? '';
    $status = $_GET['status'] ?? 'all';
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 25)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $where = [];
    $params = [];

    if ($search) {
        $where[] = '(p.display_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ?)';
        $wild = '%' . $search . '%';
        $params = array_merge($params, [$wild, $wild, $wild, $wild]);
    }
    if ($role && in_array($role, ['student', 'sv_admin', 'coach_admin', 'parent'])) {
        $where[] = 'p.role = ?';
        $params[] = $role;
    }
    if (in_array($status, ['verified', 'unverified', 'banned'])) {
        if ($status === 'verified') { $where[] = 'p.is_verified = 1 AND p.is_banned = 0'; }
        if ($status === 'unverified') { $where[] = 'p.is_verified = 0 AND p.is_banned = 0'; }
        if ($status === 'banned') { $where[] = 'p.is_banned = 1'; }
    }

    $whereSql = !empty($where) ? ' WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM profiles p JOIN users u ON u.id = p.id' . $whereSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql = '
        SELECT p.*, u.email as auth_email, u.created_at as registered_at
        FROM profiles p
        JOIN users u ON u.id = p.id
    ' . $whereSql . ' ORDER BY p.created_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    foreach ($users as &$u) {
        $u['subjects'] = json_decode($u['subjects'] ?? '[]', true);
        $u['settings'] = json_decode($u['settings'] ?? '{}', true);
        $u['is_verified'] = (bool)$u['is_verified'];
        $u['is_banned'] = (bool)$u['is_banned'];
    }

    json_response(['data' => $users, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

// ------------------------------------------------------------------------------
// 3. NUTZER SPERREN / ENTSPERREN
// ------------------------------------------------------------------------------
if ($action === 'ban_user' && $method === 'POST') {
    $data = get_json_input();
    $targetId = $data['user_id'] ?? null;
    $isBanned = !empty($data['is_banned']);
    $banType = in_array($data['ban_type'] ?? '', ['temporary', 'permanent']) ? $data['ban_type'] : 'temporary';
    $banReason = mb_substr(trim($data['ban_reason'] ?? ''), 0, 500);
    $bannedUntil = !empty($data['banned_until']) ? $data['banned_until'] : null;
    // Nur gültige Datumsformate akzeptieren (YYYY-MM-DD oder YYYY-MM-DD HH:MM:SS)
    if ($bannedUntil !== null && !preg_match('/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/', $bannedUntil)) {
        $bannedUntil = null;
    }

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

    if (!$targetId || !in_array($newRole, ['student', 'sv_admin', 'coach_admin', 'parent'])) {
        json_error('Gültige user_id und Rolle erforderlich.');
    }
    if ($targetId === $admin['id']) {
        json_error('Du kannst deine eigene Admin-Rolle nicht ändern.', 400);
    }

    $pdo->prepare('UPDATE profiles SET role = ? WHERE id = ?')->execute([$newRole, $targetId]);

    // Audit Log (auch Rollenänderungen sind revisionspflichtig)
    $logId = generate_uuid();
    $pdo->prepare('
        INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
        VALUES (?, ?, \'set_role\', \'profile\', ?, ?)
    ')->execute([
        $logId,
        $admin['id'],
        $targetId,
        json_encode(['role' => $newRole])
    ]);

    json_response(['message' => "Rolle erfolgreich zu '$newRole' geändert."]);
}

// ------------------------------------------------------------------------------
// 6. NUTZER ENDGÜLTIG LÖSCHEN (DSGVO-Löschung, mit Audit-Spur)
// ------------------------------------------------------------------------------
if ($action === 'delete_user' && $method === 'POST') {
    $data = get_json_input();
    $targetId = $data['user_id'] ?? null;

    if (!$targetId) {
        json_error('user_id erforderlich.');
    }
    if ($targetId === $admin['id']) {
        json_error('Du kannst dich nicht selbst löschen.', 400);
    }

    $check = $pdo->prepare('SELECT id, display_name, email, role FROM profiles WHERE id = ?');
    $check->execute([$targetId]);
    $target = $check->fetch();
    if (!$target) {
        json_error('Nutzer nicht gefunden.', 404);
    }
    // SV-Admins nicht per Löschen entfernen (erst Rolle entziehen) — verhindert
    // versehentlichen Totalverlust des Admin-Zugangs.
    if ($target['role'] === 'sv_admin') {
        json_error('SV-Admins können nicht gelöscht werden. Entziehe zuerst die Admin-Rolle (Rolle ändern).', 400);
    }

    $pdo->beginTransaction();
    try {
        // Tabellen ohne Fremdschlüssel zuerst bereinigen
        $pdo->prepare('UPDATE promo_codes SET created_by = NULL WHERE created_by = ?')->execute([$targetId]);
        $pdo->prepare('DELETE FROM promo_redemptions WHERE user_id = ?')->execute([$targetId]);

        // Audit-Spur VOR dem Löschen schreiben (admin_id hat SET NULL, target_id bleibt als Text erhalten)
        $logId = generate_uuid();
        $pdo->prepare("
            INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
            VALUES (?, ?, 'delete_user', 'profile', ?, ?)
        ")->execute([
            $logId,
            $admin['id'],
            $targetId,
            json_encode(['display_name' => $target['display_name'], 'email' => $target['email'], 'role' => $target['role']])
        ]);

        // Löschen aus users kaskadiert: profiles, ads, requests, messages, reviews,
        // favorites, support, reports, parent_links, notifications, analytics (SET NULL)
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$targetId]);
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Admin delete_user failed: ' . $e->getMessage());
        json_error('Löschen fehlgeschlagen (Server-Fehler).');
    }

    json_response(['message' => 'Nutzer „' . ($target['display_name'] ?: 'Unbekannt') . '“ endgültig gelöscht (inkl. aller Anzeigen und Nachrichten).']);
}

// ------------------------------------------------------------------------------
// 7. AUDIT-LOG LISTE (für AdminAuditLog-Frontend, paginiert)
// ------------------------------------------------------------------------------
if ($action === 'auditlog' && $method === 'GET') {
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $filterAction = trim($_GET['filter_action'] ?? '');

    $where = '';
    $params = [];
    if ($filterAction !== '' && preg_match('/^[a-z_]{1,50}$/', $filterAction)) {
        $where = 'WHERE l.action = ?';
        $params[] = $filterAction;
    }

    $stmt = $pdo->prepare("
        SELECT l.*, a.display_name as admin_name
        FROM admin_audit_log l
        LEFT JOIN profiles a ON a.id = l.admin_id
        $where
        ORDER BY l.created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);

    json_response($stmt->fetchAll());
}

// ------------------------------------------------------------------------------
// 7. ELTERN-KIND-VERKNÜPFUNGEN EINES NUTZERS (für AdminUsers-Dialog)
// ------------------------------------------------------------------------------
if ($action === 'parent_links' && $method === 'GET') {
    $userId = trim($_GET['user_id'] ?? '');
    if ($userId === '' || mb_strlen($userId) > 64) {
        json_error('Gültige user_id erforderlich.');
    }

    $stmt = $pdo->prepare('
        SELECT l.*,
               p.display_name as parent_name,
               c.display_name as child_name
        FROM parent_links l
        LEFT JOIN profiles p ON p.id = l.parent_id
        LEFT JOIN profiles c ON c.id = l.child_id
        WHERE l.parent_id = ? OR l.child_id = ?
        ORDER BY l.created_at DESC
        LIMIT 50
    ');
    $stmt->execute([$userId, $userId]);

    json_response($stmt->fetchAll());
}

json_error('Ungültige Admin-Aktion.', 404);
