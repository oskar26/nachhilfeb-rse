<?php
// ==============================================================================
// FWG Nachhilfebörse - Codes API (SV-Codes check, redeem, list, generate)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

cors_headers();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. CODE PRÜFEN (öffentlich bei Registrierung)
// ------------------------------------------------------------------------------
if ($action === 'check' && $method === 'POST') {
    $data = get_json_input();
    $code = trim($data['code'] ?? '');

    if (empty($code)) {
        json_error('Kein Code übergeben.');
    }

    $stmt = $pdo->prepare('
        SELECT role, is_used, expires_at 
        FROM invite_codes 
        WHERE code = ?
    ');
    $stmt->execute([$code]);
    $rec = $stmt->fetch();

    if (!$rec || $rec['is_used'] == 1 || (!empty($rec['expires_at']) && strtotime($rec['expires_at']) <= time())) {
        json_response(['valid' => false, 'message' => 'Ungültiger oder abgelaufener Code.']);
    }

    json_response([
        'valid' => true,
        'role' => $rec['role']
    ]);
}

// ------------------------------------------------------------------------------
// 2. CODE EINLÖSEN (für eingeloggte Nutzer)
// ------------------------------------------------------------------------------
if ($action === 'redeem' && $method === 'POST') {
    $user = require_auth();
    $data = get_json_input();
    $code = trim($data['code'] ?? '');

    if (empty($code)) {
        json_error('Bitte gib einen Code ein.');
    }

    $stmt = $pdo->prepare('
        SELECT * FROM invite_codes 
        WHERE code = ? AND is_used = 0 AND (expires_at IS NULL OR expires_at > NOW())
    ');
    $stmt->execute([$code]);
    $rec = $stmt->fetch();

    if (!$rec) {
        json_error('Dieser Code ist ungültig, abgelaufen oder wurde bereits verwendet.', 400);
    }

    $pdo->beginTransaction();
    try {
        $now = date('Y-m-d H:i:s');
        
        // Code entwerten
        $updateCode = $pdo->prepare('
            UPDATE invite_codes 
            SET is_used = 1, used_by = ?, used_at = ? 
            WHERE id = ?
        ');
        $updateCode->execute([$user['id'], $now, $rec['id']]);

        // Profil verifizieren und Rolle übernehmen
        $updateProfile = $pdo->prepare('
            UPDATE profiles 
            SET is_verified = 1, role = ? 
            WHERE id = ?
        ');
        $updateProfile->execute([$rec['role'], $user['id']]);

        $pdo->commit();

        json_response([
            'message' => "Code erfolgreich eingelöst! Rolle '{$rec['role']}' zugewiesen.",
            'role' => $rec['role'],
            'is_verified' => true
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_error('Fehler beim Einlösen des Codes: ' . $e->getMessage(), 500);
    }
}

// ------------------------------------------------------------------------------
// 3. ADMIN: CODES AUFLISTEN
// ------------------------------------------------------------------------------
if ($action === 'list' && $method === 'GET') {
    require_admin();

    $stmt = $pdo->query('
        SELECT c.*, 
               creator.display_name as creator_name,
               user.display_name as user_name
        FROM invite_codes c
        LEFT JOIN profiles creator ON creator.id = c.created_by
        LEFT JOIN profiles user ON user.id = c.used_by
        ORDER BY c.created_at DESC
    ');
    $codes = $stmt->fetchAll();

    json_response($codes);
}

// ------------------------------------------------------------------------------
// 4. ADMIN: BATCH-CODES GENERIEREN
// ------------------------------------------------------------------------------
if ($action === 'generate' && $method === 'POST') {
    $admin = require_admin();
    $data = get_json_input();

    $count = max(1, min(50, (int)($data['count'] ?? 5)));
    $role = in_array($data['role'] ?? '', ['student', 'sv_admin', 'parent']) ? $data['role'] : 'student';
    $prefix = !empty($data['prefix']) ? strtoupper(trim($data['prefix'])) : 'SV';

    $generated = [];
    $insert = $pdo->prepare('
        INSERT INTO invite_codes (id, code, created_by, role, is_used)
        VALUES (?, ?, ?, ?, 0)
    ');

    for ($i = 0; $i < $count; $i++) {
        $randomPart1 = strtoupper(bin2hex(random_bytes(2)));
        $randomPart2 = strtoupper(bin2hex(random_bytes(2)));
        $code = "{$prefix}-{$randomPart1}-{$randomPart2}";
        $id = generate_uuid();

        $insert->execute([$id, $code, $admin['id'], $role]);
        $generated[] = [
            'id' => $id,
            'code' => $code,
            'role' => $role
        ];
    }

    json_response([
        'message' => "$count Codes erfolgreich generiert.",
        'codes' => $generated
    ], 201);
}

json_error('Ungültige Aktion.', 404);
