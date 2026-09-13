<?php
// ==============================================================================
// FWG Nachhilfebörse - Codes API (SV-Codes, Promo-Codes, Schüler-Coaching)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';

cors_headers();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// AUTO-MIGRATION: promo_codes Tabelle & Standard-Codes ('COACHING-AG' & 'banane')
// ------------------------------------------------------------------------------
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS promo_codes (
            id VARCHAR(36) PRIMARY KEY,
            code VARCHAR(64) NOT NULL UNIQUE,
            effect_type VARCHAR(32) NOT NULL DEFAULT 'ad_boost',
            push_level VARCHAR(32) NOT NULL DEFAULT 'standard',
            boost_days INT NOT NULL DEFAULT 14,
            max_uses INT DEFAULT NULL,
            current_uses INT NOT NULL DEFAULT 0,
            target_group VARCHAR(64) NOT NULL DEFAULT 'all',
            description VARCHAR(255) DEFAULT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            expires_at DATETIME DEFAULT NULL,
            created_by VARCHAR(36) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Standard-Codes anlegen, falls noch nicht vorhanden
    $count = $pdo->query("SELECT COUNT(*) FROM promo_codes")->fetchColumn();
    if ($count == 0) {
        $now = date('Y-m-d H:i:s');
        $expires = date('Y-m-d H:i:s', strtotime('+1 year'));
        
        // 1. Code für Schüler-Coaching AG Mitglieder
        $pdo->prepare("
            INSERT IGNORE INTO promo_codes 
            (id, code, effect_type, push_level, boost_days, max_uses, current_uses, target_group, description, is_active, expires_at, created_at)
            VALUES (?, 'COACHING-AG', 'coach_verification', 'super', 30, NULL, 0, 'coach', 'Offizieller Schüler-Coaching AG Mitgliedscode mit Verifizierung & Boost', 1, ?, ?)
        ")->execute([generate_uuid(), $expires, $now]);

        // 2. Empfehlungscode 'banane'
        $pdo->prepare("
            INSERT IGNORE INTO promo_codes 
            (id, code, effect_type, push_level, boost_days, max_uses, current_uses, target_group, description, is_active, expires_at, created_at)
            VALUES (?, 'banane', 'ad_boost', 'standard', 14, 50, 0, 'all', 'Beliebter FWG-Empfehlungscode: 14 Tage Anzeigen-Push', 1, ?, ?)
        ")->execute([generate_uuid(), $expires, $now]);
    }
} catch (Exception $e) {
    error_log("Promo codes migration note: " . $e->getMessage());
}

// ------------------------------------------------------------------------------
// 1. CODE PRÜFEN (öffentlich bei Registrierung oder im Chat/Modal)
// ------------------------------------------------------------------------------
if ($action === 'check' && $method === 'POST') {
    $data = get_json_input();
    $code = trim($data['code'] ?? '');

    if (empty($code)) {
        json_error('Kein Code übergeben.');
    }

    // A. Prüfe in invite_codes
    $stmt = $pdo->prepare('SELECT role, is_used, expires_at FROM invite_codes WHERE code = ?');
    $stmt->execute([$code]);
    $rec = $stmt->fetch();

    if ($rec && $rec['is_used'] == 0 && (empty($rec['expires_at']) || strtotime($rec['expires_at']) > time())) {
        json_response([
            'valid' => true,
            'type' => 'invite',
            'role' => $rec['role']
        ]);
    }

    // B. Prüfe in promo_codes
    $stmtPromo = $pdo->prepare('SELECT * FROM promo_codes WHERE (LOWER(code) = LOWER(?) OR code = ?) AND is_active = 1');
    $stmtPromo->execute([$code, $code]);
    $promo = $stmtPromo->fetch();

    if ($promo) {
        $isExpired = !empty($promo['expires_at']) && strtotime($promo['expires_at']) <= time();
        $isLimitReached = $promo['max_uses'] !== null && $promo['current_uses'] >= $promo['max_uses'];

        if (!$isExpired && !$isLimitReached) {
            json_response([
                'valid' => true,
                'type' => 'promo',
                'effect_type' => $promo['effect_type'],
                'push_level' => $promo['push_level'],
                'boost_days' => (int)$promo['boost_days'],
                'description' => $promo['description']
            ]);
        }
    }

    json_response(['valid' => false, 'message' => 'Ungültiger, inaktiver oder abgelaufener Code.']);
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

    // 1. Zuerst Invite-Codes prüfen
    $stmt = $pdo->prepare('SELECT * FROM invite_codes WHERE code = ? AND is_used = 0 AND (expires_at IS NULL OR expires_at > NOW())');
    $stmt->execute([$code]);
    $rec = $stmt->fetch();

    if ($rec) {
        $pdo->beginTransaction();
        try {
            $now = date('Y-m-d H:i:s');
            $pdo->prepare('UPDATE invite_codes SET is_used = 1, used_by = ?, used_at = ? WHERE id = ?')
                ->execute([$user['id'], $now, $rec['id']]);

            $pdo->prepare('UPDATE profiles SET is_verified = 1, role = ? WHERE id = ?')
                ->execute([$rec['role'], $user['id']]);

            $pdo->commit();

            json_response([
                'message' => "Einladungscode erfolgreich eingelöst! Rolle '{$rec['role']}' zugewiesen.",
                'role' => $rec['role'],
                'is_verified' => true
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_error('Fehler beim Einlösen des Zugangscodes: ' . $e->getMessage(), 500);
        }
    }

    // 2. Promo-Codes prüfen
    $stmtPromo = $pdo->prepare('SELECT * FROM promo_codes WHERE (LOWER(code) = LOWER(?) OR code = ?) AND is_active = 1');
    $stmtPromo->execute([$code, $code]);
    $promo = $stmtPromo->fetch();

    if ($promo) {
        $isExpired = !empty($promo['expires_at']) && strtotime($promo['expires_at']) <= time();
        $isLimitReached = $promo['max_uses'] !== null && $promo['current_uses'] >= $promo['max_uses'];

        if ($isExpired) {
            json_error('Dieser Promocode ist leider bereits abgelaufen.', 400);
        }
        if ($isLimitReached) {
            json_error('Dieser Promocode hat das maximale Nutzungslimit erreicht.', 400);
        }

        $pdo->beginTransaction();
        try {
            // Nutzungen hochzählen
            $pdo->prepare('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?')
                ->execute([$promo['id']]);

            $days = max(1, (int)$promo['boost_days']);
            $boostUntil = date('Y-m-d H:i:s', strtotime("+{$days} days"));

            // A. Schüler-Coaching Mitgliedschaft & Verifikation
            if ($promo['effect_type'] === 'coach_verification') {
                $pdo->prepare('UPDATE profiles SET is_coach = 1, is_verified = 1 WHERE id = ?')
                    ->execute([$user['id']]);
                // Zusätzlich aktive Anzeigen boosten
                $pdo->prepare('UPDATE ads SET boosted = 1, boosted_until = ? WHERE user_id = ? AND is_active = 1')
                    ->execute([$boostUntil, $user['id']]);
            }

            // B. Anzeigen-Boost
            if ($promo['effect_type'] === 'ad_boost') {
                $pdo->prepare('UPDATE ads SET boosted = 1, boosted_until = ? WHERE user_id = ? AND is_active = 1')
                    ->execute([$boostUntil, $user['id']]);
            }

            // C. Profil-Badge
            if ($promo['effect_type'] === 'badge') {
                $pdo->prepare('UPDATE profiles SET is_verified = 1 WHERE id = ?')
                    ->execute([$user['id']]);
            }

            $pdo->commit();

            // In-App Notification
            try {
                $notifId = generate_uuid();
                $pdo->prepare('
                    INSERT INTO notifications (id, user_id, type, title, message, data)
                    VALUES (?, ?, "achievement", ?, ?, ?)
                ')->execute([
                    $notifId,
                    $user['id'],
                    "Code erfolgreich aktiviert!",
                    "Du hast den Code „{$promo['code']}“ aktiviert. Vorteile wurden gutgeschrieben!",
                    json_encode(['promo_id' => $promo['id'], 'effect' => $promo['effect_type']])
                ]);
            } catch (Exception $e) {}

            json_response([
                'message' => "Code „{$promo['code']}“ erfolgreich aktiviert!",
                'effect_type' => $promo['effect_type'],
                'boost_days' => $days
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_error('Fehler beim Aktivieren des Promocodes: ' . $e->getMessage(), 500);
        }
    }

    json_error('Dieser Code ist ungültig oder abgelaufen.', 400);
}

// ------------------------------------------------------------------------------
// 3. ADMIN: PROMO-CODES VERWALTEN (List, Create, Toggle, Delete)
// ------------------------------------------------------------------------------
if ($action === 'promo_list' && $method === 'GET') {
    require_coach_or_admin();
    $stmt = $pdo->query('
        SELECT p.*, c.display_name as creator_name
        FROM promo_codes p
        LEFT JOIN profiles c ON c.id = p.created_by
        ORDER BY p.created_at DESC
    ');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['is_active'] = (bool)$r['is_active'];
        $r['boost_days'] = (int)$r['boost_days'];
        $r['current_uses'] = (int)$r['current_uses'];
        $r['max_uses'] = $r['max_uses'] !== null ? (int)$r['max_uses'] : null;
    }
    json_response($rows);
}

if ($action === 'promo_create' && $method === 'POST') {
    $admin = require_coach_or_admin();
    $data = get_json_input();

    $code = trim($data['code'] ?? '');
    if (empty($code)) {
        json_error('Der Code-Name darf nicht leer sein.');
    }

    $effectType = in_array($data['effect_type'] ?? '', ['ad_boost', 'badge', 'coach_verification', 'special_discount', 'custom'])
        ? $data['effect_type'] : 'ad_boost';
    $pushLevel = in_array($data['push_level'] ?? '', ['standard', 'super', 'ultra'])
        ? $data['push_level'] : 'standard';
    $boostDays = max(1, (int)($data['boost_days'] ?? 14));
    $maxUses = !empty($data['max_uses']) ? (int)$data['max_uses'] : null;
    $targetGroup = trim($data['target_group'] ?? 'all');
    $description = trim($data['description'] ?? '');

    $expiresAt = null;
    if (!empty($data['expires_at'])) {
        $expiresAt = date('Y-m-d H:i:s', strtotime($data['expires_at']));
    } else if (!empty($data['expiry_days'])) {
        $expDays = (int)$data['expiry_days'];
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expDays} days"));
    }

    $id = generate_uuid();
    $insert = $pdo->prepare('
        INSERT INTO promo_codes 
        (id, code, effect_type, push_level, boost_days, max_uses, current_uses, target_group, description, is_active, expires_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)
    ');
    $insert->execute([
        $id,
        $code,
        $effectType,
        $pushLevel,
        $boostDays,
        $maxUses,
        $targetGroup,
        $description,
        $expiresAt,
        $admin['id']
    ]);

    json_response([
        'message' => "Promocode „{$code}“ erfolgreich erstellt.",
        'id' => $id,
        'code' => $code
    ], 201);
}

if ($action === 'promo_toggle' && $method === 'POST') {
    require_coach_or_admin();
    $data = get_json_input();
    $codeId = $data['id'] ?? null;
    $isActive = !empty($data['is_active']) ? 1 : 0;

    if (!$codeId) {
        json_error('ID erforderlich.');
    }

    $pdo->prepare('UPDATE promo_codes SET is_active = ? WHERE id = ?')
        ->execute([$isActive, $codeId]);

    json_response(['message' => $isActive ? 'Code aktiviert.' : 'Code pausiert.']);
}

if ($action === 'promo_delete' && $method === 'POST') {
    require_coach_or_admin();
    $data = get_json_input();
    $codeId = $data['id'] ?? null;

    if (!$codeId) {
        json_error('ID erforderlich.');
    }

    $pdo->prepare('DELETE FROM promo_codes WHERE id = ?')->execute([$codeId]);
    json_response(['message' => 'Promocode gelöscht.']);
}

// ------------------------------------------------------------------------------
// 4. ADMIN: INVITE-CODES AUFLISTEN & GENERIEREN
// ------------------------------------------------------------------------------
if ($action === 'list' && $method === 'GET') {
    require_coach_or_admin();

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

if ($action === 'generate' && $method === 'POST') {
    $admin = require_coach_or_admin();
    $data = get_json_input();

    $count = max(1, min(50, (int)($data['count'] ?? 5)));
    $role = in_array($data['role'] ?? '', ['student', 'sv_admin', 'coach_admin', 'parent']) ? $data['role'] : 'student';
    $prefix = !empty($data['prefix']) ? strtoupper(trim($data['prefix'])) : ($role === 'coach_admin' ? 'COACH' : 'SV');

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

if ($action === 'delete_invite' && $method === 'POST') {
    require_coach_or_admin();
    $data = get_json_input();
    $id = $data['id'] ?? null;
    if ($id) {
        $pdo->prepare('DELETE FROM invite_codes WHERE id = ?')->execute([$id]);
        json_response(['message' => 'Einladungscode gelöscht.']);
    }
    json_error('ID fehlt.');
}

json_error('Ungültige Aktion.', 404);
