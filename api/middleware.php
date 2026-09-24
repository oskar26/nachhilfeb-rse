<?php
// ==============================================================================
// FWG Nachhilfebörse - Auth & Middleware Helper
// ==============================================================================

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

function get_bearer_token(): ?string {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER['Authorization']);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    } else if (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $headers = $requestHeaders['Authorization'] ?? $requestHeaders['authorization'] ?? null;
    }

    if (!empty($headers) && preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
        return $matches[1];
    }
    return null;
}

function get_auth_user(): ?array {
    $token = get_bearer_token();
    if (!$token) {
        return null;
    }

    $payload = JWT::verify($token);
    if (!$payload || empty($payload['sub'])) {
        return null;
    }

    $pdo = DB::getConnection();
    $stmt = $pdo->prepare('
        SELECT u.id, u.email, u.email_verified,
               p.first_name, p.last_name, p.display_name, p.role, p.grade_level, p.class_letter,
               p.is_verified, p.is_coach, p.is_banned, p.ban_type, p.ban_reason, p.banned_until,
               p.avatar_url, p.avatar_type, p.banner_color, p.onboarding_complete
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
        WHERE u.id = ?
    ');
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch();

    if (!$user) {
        return null;
    }

    // Prüfen, ob Nutzer temporär oder permanent gebannt ist
    if ($user['is_banned']) {
        if ($user['ban_type'] === 'temporary' && !empty($user['banned_until'])) {
            $bannedUntil = strtotime($user['banned_until']);
            if ($bannedUntil > time()) {
                json_error('Dein Account ist vorübergehend gesperrt bis ' . date('d.m.Y H:i', $bannedUntil), 403, [
                    'is_banned' => true,
                    'ban_reason' => $user['ban_reason'],
                    'banned_until' => $user['banned_until']
                ]);
            } else {
                // Sperre ist abgelaufen: Status in DB zurücksetzen
                $resetStmt = $pdo->prepare('UPDATE profiles SET is_banned = 0, ban_reason = NULL, banned_until = NULL WHERE id = ?');
                $resetStmt->execute([$user['id']]);
                $user['is_banned'] = 0;
            }
        } else {
            json_error('Dein Account wurde dauerhaft gesperrt.', 403, [
                'is_banned' => true,
                'ban_reason' => $user['ban_reason']
            ]);
        }
    }

    $user['is_coach'] = !empty($user['is_coach']);
    return $user;
}

function require_auth(): array {
    $user = get_auth_user();
    if (!$user) {
        json_error('Nicht autorisiert. Bitte melde dich an.', 401);
    }
    return $user;
}

function require_admin(): array {
    $user = require_auth();
    if ($user['role'] !== 'sv_admin') {
        json_error('Zugriff verweigert. Diese Aktion erfordert SV-Admin-Rechte.', 403);
    }
    return $user;
}

// Zugriffsstufe (D5): Nur verifizierte Konten – Eltern erst mit aktiv verknüpftem Kind –
// dürfen Feed/Anzeigen, Anfragen, Chat, Merkliste und Bewertungen nutzen.
// SV-/Coach-Admins bleiben rollout-sicher ausgenommen. Liefert JSON-`code` für den Client-Guard.
function require_verified(): array {
    $user = require_auth();
    if (in_array($user['role'], ['sv_admin', 'coach_admin'], true)) {
        return $user;
    }
    if ($user['role'] === 'parent') {
        $pdo = DB::getConnection();
        $hasActiveLink = false;
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM parent_links WHERE parent_id = ? AND status = 'active'");
            $stmt->execute([$user['id']]);
            $hasActiveLink = (int)$stmt->fetchColumn() > 0;
        } catch (Throwable $e) {
            error_log('require_verified parent link check failed: ' . $e->getMessage());
        }
        if (!$hasActiveLink) {
            json_error('Bitte verknüpfen Sie zuerst ein Kind, um diese Funktion zu nutzen.', 403, ['code' => 'parent_link_required']);
        }
        return $user;
    }
    if (empty($user['is_verified'])) {
        json_error('Du musst dich erst verifizieren.', 403, ['code' => 'not_verified']);
    }
    return $user;
}

function require_coach_or_admin(): array {
    $user = require_auth();
    if ($user['role'] !== 'sv_admin' && $user['role'] !== 'coach_admin') {
        json_error('Zugriff verweigert. Diese Aktion erfordert SV-Admin- oder Schüler-Coaching-Rechte.', 403);
    }
    return $user;
}

// Eltern-Lesezugriff auf ein Kind-Konto. Prüft eine aktive Verknüpfung und
// (optional) die gesetzte Permission. SV-Admins dürfen immer (Moderation).
// Liefert ['user' => …, 'link' => …|null, 'permissions' => …].
function fwg_assert_parent_of(string $childId, string $need = ''): array {
    $user = require_auth();
    if ($childId === '' || !preg_match('/^[0-9a-f-]{36}$/i', $childId)) {
        json_error('Ungültige Kind-Kennung.', 400);
    }
    if ($user['id'] === $childId) {
        json_error('Das ist das eigene Konto – bitte den regulären Endpunkt nutzen.', 400);
    }
    if ($user['role'] === 'sv_admin') {
        return ['user' => $user, 'link' => null, 'permissions' => []];
    }
    $pdo = DB::getConnection();
    try {
        $stmt = $pdo->prepare("SELECT * FROM parent_links WHERE parent_id = ? AND child_id = ? AND status = 'active'");
        $stmt->execute([$user['id'], $childId]);
        $link = $stmt->fetch();
    } catch (Throwable $e) {
        error_log('fwg_assert_parent_of check failed: ' . $e->getMessage());
        json_error('Verknüpfung konnte nicht geprüft werden. Bitte später erneut versuchen.', 500);
    }
    if (!$link) {
        json_error('Sie haben keinen Zugriff auf dieses Kind-Konto.', 403, ['code' => 'parent_link_required']);
    }
    $perms = json_decode($link['permissions'] ?? '{}', true) ?: [];
    if ($need !== '' && array_key_exists($need, $perms) && !$perms[$need]) {
        json_error('Diese Einsicht ist in den Kind-Einstellungen deaktiviert.', 403, ['code' => 'parent_permission_denied']);
    }
    return ['user' => $user, 'link' => $link, 'permissions' => $perms];
}

// Fan-out: Eltern über Aktivitäten ihres Kindes informieren.
// Respektiert permissions.can_receive_notifications. Wirft nie.
// $skipParentId überspringt einen Eltern-Account (z. B. den handelnden Elternteil).
function fwg_notify_parents(PDO $pdo, string $childId, string $type, string $title, string $message, array $data = [], string $skipParentId = ''): void {
    if ($childId === '') {
        return;
    }
    try {
        $stmt = $pdo->prepare("SELECT parent_id, permissions FROM parent_links WHERE child_id = ? AND status = 'active'");
        $stmt->execute([$childId]);
        $links = $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('fwg_notify_parents lookup failed: ' . $e->getMessage());
        return;
    }
    foreach ($links as $link) {
        if ($skipParentId !== '' && $link['parent_id'] === $skipParentId) {
            continue;
        }
        $perms = json_decode($link['permissions'] ?? '{}', true) ?: [];
        if (array_key_exists('can_receive_notifications', $perms) && !$perms['can_receive_notifications']) {
            continue;
        }
        try {
            $pdo->prepare('
                INSERT INTO notifications (id, user_id, type, title, message, data)
                VALUES (?, ?, ?, ?, ?, ?)
            ')->execute([
                generate_uuid(),
                $link['parent_id'],
                mb_substr($type, 0, 50),
                mb_substr($title, 0, 255),
                mb_substr($message, 0, 2000),
                json_encode(array_merge($data, ['child_id' => $childId]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
        } catch (Throwable $e) {
            error_log('fwg_notify_parents insert failed: ' . $e->getMessage());
        }
    }
}
