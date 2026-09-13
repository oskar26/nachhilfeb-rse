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

function require_coach_or_admin(): array {
    $user = require_auth();
    if ($user['role'] !== 'sv_admin' && $user['role'] !== 'coach_admin') {
        json_error('Zugriff verweigert. Diese Aktion erfordert SV-Admin- oder Schüler-Coaching-Rechte.', 403);
    }
    return $user;
}
