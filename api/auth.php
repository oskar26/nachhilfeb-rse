<?php
// ==============================================================================
// FWG Nachhilfebörse - Auth API (Register, Login, Me, Update Password)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';


cors_headers();

$action = $_GET['action'] ?? '';
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// 1. REGISTRIERUNG
// ------------------------------------------------------------------------------
if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    
    $email = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $data['password'] ?? '';
    
    // Vor- und Nachname aus allen möglichen Quellen extrahieren
    $firstName = trim($data['firstName'] ?? $data['first_name'] ?? $data['options']['data']['first_name'] ?? $data['options']['data']['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? $data['last_name'] ?? $data['options']['data']['last_name'] ?? $data['options']['data']['lastName'] ?? '');

    // Falls full_name existiert
    $fullName = trim($data['fullName'] ?? $data['full_name'] ?? $data['options']['data']['full_name'] ?? $data['options']['data']['name'] ?? $data['name'] ?? '');
    if ((empty($firstName) || empty($lastName)) && !empty($fullName)) {
        $parts = preg_split('/\s+/', $fullName, 2);
        if (empty($firstName)) $firstName = $parts[0] ?? '';
        if (empty($lastName)) $lastName = $parts[1] ?? ($parts[0] ?? '');
    }

    if (!empty($firstName) && empty($lastName) && str_contains($firstName, ' ')) {
        $parts = preg_split('/\s+/', $firstName, 2);
        $firstName = $parts[0];
        $lastName = $parts[1];
    }

    $role = in_array($data['role'] ?? $data['options']['data']['role'] ?? '', ['student', 'sv_admin', 'parent']) 
        ? ($data['role'] ?? $data['options']['data']['role']) 
        : 'student';
    $grade = !empty($data['grade']) ? trim($data['grade']) : (!empty($data['options']['data']['grade']) ? trim($data['options']['data']['grade']) : null);
    $letter = !empty($data['letter']) ? trim($data['letter']) : (!empty($data['options']['data']['letter']) ? trim($data['options']['data']['letter']) : null);
    $birthDate = !empty($data['birthDate']) ? $data['birthDate'] : (!empty($data['birth_date']) ? $data['birth_date'] : (!empty($data['options']['data']['birthDate']) ? $data['options']['data']['birthDate'] : null));
    $parentalConsent = !empty($data['parentalConsent']) || !empty($data['parental_consent']) || !empty($data['options']['data']['parentalConsent']);
    $inviteCode = trim($data['inviteCode'] ?? $data['invite_code'] ?? $data['code'] ?? $data['options']['data']['inviteCode'] ?? '');

    if (!$email) {
        json_error('Bitte gib eine gültige E-Mail-Adresse ein.');
    }
    if (strlen($password) < 8) {
        json_error('Das Passwort muss mindestens 8 Zeichen lang sein.');
    }
    if (empty($firstName)) {
        json_error('Vorname ist erforderlich.');
    }
    if (empty($lastName)) {
        $lastName = '.';
    }

    // Prüfen, ob E-Mail bereits existiert
    $checkStmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        json_error('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.', 409);
    }

    // Optional: SV-Code vorab validieren
    $codeRecord = null;
    if (!empty($inviteCode)) {
        $codeStmt = $pdo->prepare('
            SELECT * FROM invite_codes 
            WHERE code = ? AND is_used = 0 AND (expires_at IS NULL OR expires_at > NOW())
        ');
        $codeStmt->execute([$inviteCode]);
        $codeRecord = $codeStmt->fetch();
        if (!$codeRecord) {
            json_error('Der eingegebene SV-Code ist ungültig oder wurde bereits eingelöst.', 400);
        }
    }

    // Transaktion starten
    $pdo->beginTransaction();
    try {
        $userId = generate_uuid();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        // 1. User erstellen
        $userStmt = $pdo->prepare('
            INSERT INTO users (id, email, password_hash, email_verified)
            VALUES (?, ?, ?, 1)
        ');
        $userStmt->execute([$userId, $email, $passwordHash]);

        // 2. Profil erstellen
        $displayName = $firstName . ' ' . mb_substr($lastName, 0, 1, 'UTF-8') . '.';
        $isVerified = $codeRecord ? 1 : 0;
        $finalRole = $codeRecord ? $codeRecord['role'] : $role;

        $profileStmt = $pdo->prepare('
            INSERT INTO profiles (
                id, first_name, last_name, display_name, grade_level, class_letter,
                role, email, birth_date, parental_consent_given, parental_consent_date,
                is_verified, onboarding_complete, settings, subjects
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ');
        $now = date('Y-m-d H:i:s');
        $profileStmt->execute([
            $userId,
            $firstName,
            $lastName,
            $displayName,
            $finalRole === 'student' ? $grade : null,
            $finalRole === 'student' ? $letter : null,
            $finalRole,
            $email,
            $birthDate,
            $parentalConsent ? 1 : 0,
            $parentalConsent ? $now : null,
            $isVerified,
            json_encode(['email_visible' => false, 'phone_visible' => false]),
            json_encode([])
        ]);

        // 3. SV-Code als eingelöst markieren
        if ($codeRecord) {
            $redeemStmt = $pdo->prepare('
                UPDATE invite_codes 
                SET is_used = 1, used_by = ?, used_at = ? 
                WHERE id = ?
            ');
            $redeemStmt->execute([$userId, $now, $codeRecord['id']]);
        }

        $pdo->commit();

        // 4. Willkommens-E-Mail versenden
        try {
            send_email_welcome($email, $firstName, $finalRole);
        } catch (Exception $e) {
            error_log('Fehler beim Versenden der Willkommens-Mail: ' . $e->getMessage());
        }

        // Token generieren
        $token = JWT::sign([
            'sub' => $userId,
            'email' => $email,
            'role' => $finalRole
        ]);

        // Profil zurückliefern
        $fetchProfile = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
        $fetchProfile->execute([$userId]);
        $profile = $fetchProfile->fetch();

        // JSON Dekodieren für Client
        $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true);
        $profile['settings'] = json_decode($profile['settings'] ?? '{}', true);

        json_response([
            'token' => $token,
            'user' => [
                'id' => $userId,
                'email' => $email
            ],
            'profile' => $profile
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        json_error('Fehler bei der Registrierung: ' . $e->getMessage(), 500);
    }
}

// ------------------------------------------------------------------------------
// 2. LOGIN
// ------------------------------------------------------------------------------
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        json_error('Bitte E-Mail und Passwort eingeben.');
    }

    $stmt = $pdo->prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_error('Ungültige Zugangsdaten. E-Mail oder Passwort falsch.', 401);
    }

    // Profil abrufen
    $profileStmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $profileStmt->execute([$user['id']]);
    $profile = $profileStmt->fetch();

    // Ban-Status prüfen
    if ($profile && $profile['is_banned']) {
        if ($profile['ban_type'] === 'temporary' && !empty($profile['banned_until'])) {
            $bannedUntil = strtotime($profile['banned_until']);
            if ($bannedUntil > time()) {
                json_error('Dein Account ist vorübergehend gesperrt bis ' . date('d.m.Y H:i', $bannedUntil), 403, [
                    'is_banned' => true,
                    'ban_reason' => $profile['ban_reason'],
                    'banned_until' => $profile['banned_until']
                ]);
            } else {
                $pdo->prepare('UPDATE profiles SET is_banned = 0, ban_reason = NULL, banned_until = NULL WHERE id = ?')
                    ->execute([$user['id']]);
                $profile['is_banned'] = 0;
            }
        } else {
            json_error('Dein Account wurde dauerhaft gesperrt.', 403, [
                'is_banned' => true,
                'ban_reason' => $profile['ban_reason']
            ]);
        }
    }

    $token = JWT::sign([
        'sub' => $user['id'],
        'email' => $user['email'],
        'role' => $profile['role'] ?? 'student'
    ]);

    if ($profile) {
        $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true);
        $profile['settings'] = json_decode($profile['settings'] ?? '{}', true);
    }

    json_response([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ],
        'profile' => $profile
    ]);
}

// ------------------------------------------------------------------------------
// 3. CURRENT USER (ME)
// ------------------------------------------------------------------------------
if ($action === 'me' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $user = require_auth();
    $profileStmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $profileStmt->execute([$user['id']]);
    $profile = $profileStmt->fetch();

    if ($profile) {
        $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true);
        $profile['settings'] = json_decode($profile['settings'] ?? '{}', true);
    }

    json_response([
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ],
        'profile' => $profile
    ]);
}

// ------------------------------------------------------------------------------
// 4. PASSWORT ZURÜCKSETZEN ANFRAGEN (Sendet E-Mail)
// ------------------------------------------------------------------------------
if ($action === 'reset_password_request' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    $email = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);

    if ($email) {
        $stmt = $pdo->prepare('
            SELECT u.id, p.first_name 
            FROM users u 
            LEFT JOIN profiles p ON p.id = u.id 
            WHERE u.email = ?
        ');
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        if ($row) {
            $resetToken = JWT::sign([
                'sub' => $row['id'],
                'purpose' => 'reset_password'
            ], JWT_SECRET, 7200); // 2 Stunden gültig

            try {
                send_email_password_reset($email, $row['first_name'] ?: 'Schüler/in', $resetToken);
            } catch (Exception $e) {
                error_log('Fehler beim Senden der Passwort-Reset-Mail: ' . $e->getMessage());
            }
        }
    }

    // Aus Sicherheitsgründen immer Erfolgsmeldung zurückgeben
    json_response(['message' => 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen versendet.']);
}

// ------------------------------------------------------------------------------
// 5. PASSWORT AKTUALISIEREN (eingeloggt oder mit Reset-Token)
// ------------------------------------------------------------------------------
if ($action === 'update_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    $newPassword = $data['newPassword'] ?? $data['password'] ?? '';
    $resetToken = $data['token'] ?? null;
    $targetUserId = null;

    if (strlen($newPassword) < 8) {
        json_error('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
    }

    if ($resetToken) {
        $payload = JWT::verify($resetToken);
        if (!$payload || ($payload['purpose'] ?? '') !== 'reset_password' || empty($payload['sub'])) {
            json_error('Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.', 400);
        }
        $targetUserId = $payload['sub'];
    } else {
        $user = require_auth();
        $targetUserId = $user['id'];
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([$newHash, $targetUserId]);

    json_response(['message' => 'Passwort erfolgreich aktualisiert.']);
}

// ------------------------------------------------------------------------------
// 6. LOGOUT (Client-seitig durch Löschen des Tokens, Endpoint zur Bestätigung)
// ------------------------------------------------------------------------------
if ($action === 'logout') {
    json_response(['message' => 'Erfolgreich abgemeldet.']);
}

json_error('Ungültige Auth-Aktion.', 404);
