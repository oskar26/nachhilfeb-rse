<?php
// ==============================================================================
// FWG Nachhilfebörse - Auth API (Register, Login, Me, Update Password)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/middleware.php';

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
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $role = in_array($data['role'] ?? '', ['student', 'sv_admin', 'parent']) ? $data['role'] : 'student';
    $grade = !empty($data['grade']) ? trim($data['grade']) : null;
    $letter = !empty($data['letter']) ? trim($data['letter']) : null;
    $birthDate = !empty($data['birthDate']) ? $data['birthDate'] : null;
    $parentalConsent = !empty($data['parentalConsent']);
    $inviteCode = trim($data['inviteCode'] ?? '');

    if (!$email) {
        json_error('Bitte gib eine gültige E-Mail-Adresse ein.');
    }
    if (strlen($password) < 8) {
        json_error('Das Passwort muss mindestens 8 Zeichen lang sein.');
    }
    if (empty($firstName) || empty($lastName)) {
        json_error('Vor- und Nachname sind erforderlich.');
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
// 4. PASSWORT AKTUALISIEREN
// ------------------------------------------------------------------------------
if ($action === 'update_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = require_auth();
    $data = get_json_input();
    $newPassword = $data['newPassword'] ?? $data['password'] ?? '';

    if (strlen($newPassword) < 8) {
        json_error('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([$newHash, $user['id']]);

    json_response(['message' => 'Passwort erfolgreich aktualisiert.']);
}

// ------------------------------------------------------------------------------
// 5. LOGOUT (Client-seitig durch Löschen des Tokens, Endpoint zur Bestätigung)
// ------------------------------------------------------------------------------
if ($action === 'logout') {
    json_response(['message' => 'Erfolgreich abgemeldet.']);
}

json_error('Ungültige Auth-Aktion.', 404);
