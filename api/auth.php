<?php
// ==============================================================================
// FWG Nachhilfebörse - Auth API (Register, Login, Me, Update Password, Elternbestätigung)
// ==============================================================================

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/parental-consent.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/ratelimit.php';


cors_headers();

$action = $_GET['action'] ?? '';
$pdo = DB::getConnection();

// ------------------------------------------------------------------------------
// AUTO-MIGRATION: E-Mail-Verifizierungscodes (6-stelliger Code, 30 Min. gültig)
// ------------------------------------------------------------------------------
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS email_verifications (
            user_id VARCHAR(36) PRIMARY KEY,
            code_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            attempts TINYINT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {}

// AUTO-MIGRATION: pending_email (E-Mail-Wechsel mit 6-stelligem Code)
try {
    $pdo->query("SELECT pending_email FROM email_verifications LIMIT 0");
} catch (Exception $e) {
    try {
        $pdo->exec("ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255) NULL");
    } catch (Exception $ex) {
        try {
            $pdo->exec("ALTER TABLE email_verifications ADD COLUMN pending_email VARCHAR(255) NULL");
        } catch (Exception $ex2) {}
    }
}

// ------------------------------------------------------------------------------
// AUTO-MIGRATION: Elternbestätigung per E-Mail-Link (Nutzer unter 16)
// user_id ist VARCHAR(36) wie users.id. In token_hash liegt ausschließlich der
// SHA-256-Hash des Tokens, niemals das Token selbst.
// ------------------------------------------------------------------------------
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS parental_consents (
            user_id VARCHAR(36) NOT NULL,
            parent_email VARCHAR(255) NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            confirmed_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id),
            KEY idx_parental_consents_token (token_hash),
            CONSTRAINT fk_parental_consents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $ex) {
    // Fallback ohne FK, falls der Constraint-Name bereits vergeben ist.
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS parental_consents (
                user_id VARCHAR(36) NOT NULL,
                parent_email VARCHAR(255) NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                confirmed_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id),
                KEY idx_parental_consents_token (token_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $ex2) {}
}

// ------------------------------------------------------------------------------
// HELFER: Alter & Elternbestätigung
// ------------------------------------------------------------------------------

/**
 * Prüft anhand des Geburtsdatums (YYYY-MM-DD), ob die Person unter 16 ist.
 * Ohne/ungültigem Geburtsdatum gilt die Person nicht als minderjährig – die
 * Registrierung erlaubt das Feld weiterhin optional (Bestandsverhalten).
 */
function fwg_is_under_16(?string $birthDate): bool {
    if ($birthDate === null || $birthDate === '') {
        return false;
    }
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $birthDate, $m)) {
        return false;
    }
    $year = (int)$m[1];
    $month = (int)$m[2];
    $day = (int)$m[3];
    if (!checkdate($month, $day, $year)) {
        return false;
    }
    $birth = new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day));
    $today = new DateTimeImmutable('today');
    return $birth->diff($today)->y < 16;
}

/**
 * Liefert true, wenn für diesen (minderjährigen) Nutzer noch keine bestätigte
 * Eltern-Einwilligung vorliegt. Für Nutzer ab 16 ist die Prüfung immer false.
 * Bei Datenbankfehlern wird für Minderjährige fail-closed entschieden.
 */
function fwg_parental_consent_pending(PDO $pdo, string $userId, ?string $birthDate, $given): bool {
    $isUnder16 = fwg_is_under_16($birthDate);
    if (!$isUnder16) {
        return false;
    }
    if (empty($given)) {
        return true;
    }
    try {
        $stmt = $pdo->prepare('SELECT confirmed_at FROM parental_consents WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        $consentRow = $row === false ? null : $row;
    } catch (Exception $e) {
        error_log('Elternbestätigung: Prüfung fehlgeschlagen: ' . $e->getMessage());
        return true;
    }
    return !fwg_parental_consent_allows($isUnder16, (bool)$given, $consentRow);
}

/**
 * Einfache, mobile HTML-Seite für den Elternbestätigungs-Link. Der Link wird im
 * Browser geöffnet, daher bewusst HTML statt JSON und ohne externe Assets.
 */
function fwg_render_parental_consent_page(bool $success, string $heading, string $message, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    // Kein Token über den Referer an nachfolgende Seiten weiterreichen.
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");

    $headingHtml = htmlspecialchars($heading, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $messageHtml = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $ctaUrl = htmlspecialchars($success ? APP_URL . '/#/login' : APP_URL, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $ctaText = $success ? 'Zur Anmeldung' : 'Zur Startseite';
    $accent = $success ? '#15803d' : '#b91c1c';
    $accentSoft = $success ? '#dcfce7' : '#fee2e2';
    $icon = $success ? '✓' : '!';

    echo <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="robots" content="noindex, nofollow">
    <title>$headingHtml – FWG Nachhilfebörse</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            background: #faf7ef;
            color: #18181b;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .card {
            width: 100%;
            max-width: 460px;
            background: #ffffff;
            border: 2px solid #09090b;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 8px 8px 0 #09090b;
        }
        .top { height: 8px; background: #facc15; }
        .inner { padding: 28px 24px 26px; }
        .icon {
            display: grid;
            place-items: center;
            width: 48px;
            height: 48px;
            margin-bottom: 16px;
            border-radius: 50%;
            background: $accentSoft;
            color: $accent;
            font-size: 26px;
            font-weight: 900;
            line-height: 1;
        }
        .badge {
            display: inline-block;
            margin-bottom: 12px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #52525b;
        }
        h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.25; }
        p { margin: 0 0 20px; font-size: 15px; line-height: 1.65; color: #3f3f46; }
        .button {
            display: inline-block;
            padding: 13px 20px;
            background: #facc15;
            color: #09090b;
            border: 2px solid #09090b;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 800;
            text-decoration: none;
        }
        .foot {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e4e4e7;
            font-size: 12px;
            line-height: 1.6;
            color: #71717a;
        }
        .foot a { color: #3f3f46; }
    </style>
</head>
<body>
    <main class="card">
        <div class="top"></div>
        <div class="inner">
            <div class="icon" aria-hidden="true">$icon</div>
            <div class="badge">FWG Nachhilfebörse</div>
            <h1>$headingHtml</h1>
            <p>$messageHtml</p>
            <a class="button" href="$ctaUrl">$ctaText</a>
            <div class="foot">
                Fragen? Schreib uns an <a href="mailto:info@nachhilfe-sv.de">info@nachhilfe-sv.de</a>.
            </div>
        </div>
    </main>
</body>
</html>
HTML;
    exit;
}

// ------------------------------------------------------------------------------
// 0. ELTERNBESTÄTIGUNG (GET-Link aus der E-Mail, kein Login nötig)
// ------------------------------------------------------------------------------
if ($action === 'confirm_parental_consent' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $token = isset($_GET['token']) && is_string($_GET['token']) ? trim($_GET['token']) : '';

    // 32 Byte random_bytes() als Hex = exakt 64 Zeichen.
    if ($token === '' || !preg_match('/^[a-f0-9]{64}$/i', $token)) {
        fwg_render_parental_consent_page(
            false,
            'Link ungültig',
            'Dieser Bestätigungslink ist ungültig. Bitte öffne den Link direkt aus der E-Mail.',
            400
        );
    }

    $tokenHash = hash('sha256', strtolower($token));

    try {
        $stmt = $pdo->prepare('SELECT user_id, expires_at, confirmed_at FROM parental_consents WHERE token_hash = ? LIMIT 1');
        $stmt->execute([$tokenHash]);
        $consent = $stmt->fetch();
    } catch (Exception $e) {
        // Bewusst ohne Token im Log.
        error_log('Elternbestätigung: Datenbankfehler beim Token-Lookup: ' . $e->getMessage());
        fwg_render_parental_consent_page(
            false,
            'Das hat nicht geklappt',
            'Die Bestätigung konnte gerade nicht geprüft werden. Bitte versuche es in ein paar Minuten erneut.',
            500
        );
    }

    if (!$consent) {
        fwg_render_parental_consent_page(
            false,
            'Link ungültig',
            'Zu diesem Link gibt es keine offene Elternbestätigung. Bitte öffne den Link direkt aus der E-Mail.',
            404
        );
    }

    if (!empty($consent['confirmed_at'])) {
        fwg_render_parental_consent_page(
            true,
            'Bereits bestätigt',
            'Diese Elternbestätigung wurde bereits abgeschlossen. Dein Kind kann sich jetzt in der Nachhilfebörse anmelden.'
        );
    }

    if (empty($consent['expires_at']) || strtotime($consent['expires_at']) < time()) {
        fwg_render_parental_consent_page(
            false,
            'Link abgelaufen',
            'Der Bestätigungslink ist nicht mehr gültig (7 Tage). Bitte wende dich an info@nachhilfe-sv.de, damit ein neuer Link erstellt wird.',
            410
        );
    }

    try {
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE parental_consents SET confirmed_at = NOW() WHERE user_id = ? AND confirmed_at IS NULL')
            ->execute([$consent['user_id']]);
        $pdo->prepare('UPDATE profiles SET parental_consent_given = 1, parental_consent_date = NOW() WHERE id = ?')
            ->execute([$consent['user_id']]);
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Elternbestätigung: Speichern fehlgeschlagen: ' . $e->getMessage());
        fwg_render_parental_consent_page(
            false,
            'Das hat nicht geklappt',
            'Die Bestätigung konnte gerade nicht gespeichert werden. Bitte versuche es in ein paar Minuten erneut.',
            500
        );
    }

    fwg_render_parental_consent_page(
        true,
        'Elternbestätigung erfolgreich',
        'Vielen Dank! Die Einwilligung ist gespeichert. Dein Kind kann sich jetzt in der Nachhilfebörse anmelden.'
    );
}

// ------------------------------------------------------------------------------
// 1. REGISTRIERUNG
// ------------------------------------------------------------------------------
if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    // Anti-Spam: max. 5 Registrierungen pro Stunde und IP
    fwg_require_rate_limit('register', 5, 3600);
    
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

    // Security: Selbst-Registrierung nur als student. sv_admin/coach_admin NUR via Invite-Code.
    $role = 'student';
    $grade = !empty($data['grade']) ? trim($data['grade']) : (!empty($data['options']['data']['grade']) ? trim($data['options']['data']['grade']) : null);
    $letter = !empty($data['letter']) ? trim($data['letter']) : (!empty($data['options']['data']['letter']) ? trim($data['options']['data']['letter']) : null);
    $birthDate = !empty($data['birthDate']) ? $data['birthDate'] : (!empty($data['birth_date']) ? $data['birth_date'] : (!empty($data['options']['data']['birthDate']) ? $data['options']['data']['birthDate'] : null));
    $parentalConsent = !empty($data['parentalConsent']) || !empty($data['parental_consent']) || !empty($data['options']['data']['parentalConsent']) || !empty($data['options']['data']['parental_consent']);
    $parentEmailRaw = $data['parentEmail'] ?? $data['parent_email'] ?? $data['options']['data']['parentEmail'] ?? $data['options']['data']['parent_email'] ?? '';
    if (!is_string($parentEmailRaw)) {
        $parentEmailRaw = '';
    }
    $parentEmailRaw = trim($parentEmailRaw);
    $parentEmail = $parentEmailRaw !== '' ? filter_var($parentEmailRaw, FILTER_VALIDATE_EMAIL) : null;
    $inviteCode = trim($data['inviteCode'] ?? $data['invite_code'] ?? $data['code'] ?? $data['options']['data']['inviteCode'] ?? '');

    if (!$email || strlen($email) > 254) {
        json_error('Bitte gib eine gültige E-Mail-Adresse ein.');
    }
    if (strlen($password) < 8 || strlen($password) > 128) {
        json_error('Das Passwort muss 8–128 Zeichen lang sein.');
    }
    $firstName = mb_substr($firstName, 0, 80);
    $lastName = mb_substr($lastName, 0, 80);
    if (empty($firstName)) {
        json_error('Vorname ist erforderlich.');
    }
    if (empty($lastName)) {
        $lastName = '.';
    }
    if ($birthDate !== null) {
        $birthDateStr = (string)$birthDate;
        if (
            !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $birthDateStr, $birthDateParts)
            || !checkdate((int)$birthDateParts[2], (int)$birthDateParts[3], (int)$birthDateParts[1])
        ) {
            json_error('Ungültiges Geburtsdatum (erwartet YYYY-MM-DD).');
        }
    }

    // Unter 16: echte Elternbestätigung per E-Mail-Link. Die Checkbox des Kindes
    // bleibt als Bestätigung "Ich habe mit meinen Eltern gesprochen" bestehen,
    // ersetzt aber nicht mehr die Einwilligung der Erziehungsberechtigten.
    $requiresParentalConsent = fwg_is_under_16($birthDate !== null ? (string)$birthDate : null);
    if ($requiresParentalConsent) {
        if (!$parentalConsent) {
            json_error('Bitte bestätige, dass du mit deinen Erziehungsberechtigten über die Nutzung gesprochen hast.', 400, [
                'code' => 'parental_consent_missing'
            ]);
        }
        if ($parentEmailRaw !== '' && (!$parentEmail || strlen($parentEmailRaw) > 254)) {
            json_error('Bitte gib eine gültige E-Mail-Adresse eines Erziehungsberechtigten an.', 400, [
                'code' => 'parent_email_invalid'
            ]);
        }
        // Ohne separate Elternadresse wird die Konto-Adresse verwendet. Das ist
        // besonders für jüngere Kinder wichtig, die noch keine eigene E-Mail haben.
        if (!$parentEmail) {
            $parentEmail = $email;
        }
    }

    $inviteCode = mb_substr($inviteCode, 0, 64);

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
            json_error('Der eingegebene Code ist ungültig oder wurde bereits eingelöst.', 400);
        }
    }

    // Transaktion starten
    $pdo->beginTransaction();
    try {
        $userId = generate_uuid();
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        // 1. User erstellen (E-Mail zunächst UNBESTÄTIGT – Freischaltung per Code-Mail)
        $userStmt = $pdo->prepare('
            INSERT INTO users (id, email, password_hash, email_verified)
            VALUES (?, ?, ?, 0)
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
            $requiresParentalConsent ? 0 : 1,
            $requiresParentalConsent ? null : $now,
            $isVerified,
            json_encode(['email_visible' => false, 'phone_visible' => false]),
            json_encode([])
        ]);

        // 2b. Elternbestätigung: Token nur als SHA-256-Hash speichern.
        // Ein bestehender Eintrag wird ersetzt (erneute Registrierung/Anforderung).
        $parentalToken = null;
        if ($requiresParentalConsent) {
            $parentalToken = bin2hex(random_bytes(32));
            $pdo->prepare('
                INSERT INTO parental_consents (user_id, parent_email, token_hash, expires_at, confirmed_at)
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NULL)
                ON DUPLICATE KEY UPDATE
                    parent_email = VALUES(parent_email),
                    token_hash = VALUES(token_hash),
                    expires_at = VALUES(expires_at),
                    confirmed_at = NULL,
                    created_at = NOW()
            ')->execute([$userId, $parentEmail, hash('sha256', $parentalToken)]);
        }

        // 3. SV-Code atomar einlösen (gleiche Semantik wie codes.php Redeem:
        //    max_uses/current_uses beachten, damit als Mehrfach-Code erzeugte
        //    Einladungen auch bei der Registrierung mehrfach nutzbar sind und
        //    parallele Registrierungen keine Doppel-Einlösung erlauben).
        if ($codeRecord) {
            $recMax = isset($codeRecord['max_uses']) && $codeRecord['max_uses'] !== null ? (int)$codeRecord['max_uses'] : 1;
            if ($recMax <= 1) {
                $redeemStmt = $pdo->prepare('UPDATE invite_codes SET is_used = 1, current_uses = current_uses + 1, used_by = ?, used_at = ? WHERE id = ? AND is_used = 0');
                $redeemStmt->execute([$userId, $now, $codeRecord['id']]);
            } else {
                // is_used zuerst aus dem ALTEN Zählerstand berechnen, dann hochzählen.
                $redeemStmt = $pdo->prepare('UPDATE invite_codes SET is_used = IF(current_uses + 1 >= ?, 1, 0), current_uses = current_uses + 1, used_by = ?, used_at = ? WHERE id = ? AND is_used = 0 AND current_uses < ?');
                $redeemStmt->execute([$recMax, $userId, $now, $codeRecord['id'], $recMax]);
            }
            if ($redeemStmt->rowCount() !== 1) {
                $pdo->rollBack();
                json_error('Der eingegebene Code wurde soeben bereits eingelöst. Bitte versuche es erneut.', 409);
            }
        }

        $pdo->commit();

        // 4. Bestätigungs-Code erzeugen (6-stellig, 30 Minuten gültig) und per E-Mail senden.
        // Gegen Spam-Accounts: Ohne diesen Code gibt es KEIN Login-Token (siehe verify_email + Login-Gate).
        $verifyCode = (string)random_int(100000, 999999);
        $verifyStmt = $pdo->prepare('
            INSERT INTO email_verifications (user_id, code_hash, expires_at, attempts)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)
            ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0
        ');
        $verifyStmt->execute([$userId, password_hash($verifyCode, PASSWORD_BCRYPT)]);

        $mailSent = false;
        try {
            $mailSent = (bool)send_email_verification($email, $firstName, $verifyCode);
        } catch (Exception $e) {
            error_log('Fehler beim Versenden der Bestätigungs-Mail: ' . $e->getMessage());
        }

        // 4b. Elternbestätigung per E-Mail-Link (nur unter 16). Das Token selbst
        // wird nie geloggt oder an den Client zurückgegeben – nur der Hash liegt
        // in der Datenbank.
        $parentalMailSent = false;
        if ($requiresParentalConsent && $parentalToken !== null) {
            $consentUrl = APP_URL . '/api/auth.php?action=confirm_parental_consent&token=' . urlencode($parentalToken);
            try {
                $parentalMailSent = (bool)send_email_parental_consent($parentEmail, $firstName, $consentUrl);
            } catch (Exception $e) {
                $parentalMailSent = false;
                error_log('Fehler beim Versenden der Elternbestätigungs-Mail: ' . $e->getMessage());
            }
        }

        // Profil zurückliefern (OHNE Token – erst nach Code-Bestätigung gibt es eine Session)
        $fetchProfile = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
        $fetchProfile->execute([$userId]);
        $profile = $fetchProfile->fetch();

        // JSON Dekodieren für Client
        $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true);
        $profile['settings'] = json_decode($profile['settings'] ?? '{}', true);

        json_response([
            'needs_verification' => true,
            'parental_consent_pending' => $requiresParentalConsent,
            'parental_mail_sent' => $parentalMailSent,
            'user' => [
                'id' => $userId,
                'email' => $email
            ],
            'profile' => $profile,
            'mail_sent' => $mailSent
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Register failed: ' . $e->getMessage());
        json_error('Fehler bei der Registrierung. Bitte versuche es später erneut.', 500);
    }
}

// ------------------------------------------------------------------------------
// 1b. E-MAIL BESTÄTIGEN (6-stelliger Code aus der Bestätigungs-Mail)
// ------------------------------------------------------------------------------
if ($action === 'verify_email' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    // Missbrauchsschutz: max. 10 Code-Versuche pro 10 Minuten und IP
    fwg_require_rate_limit('verify', 10, 600);

    $email = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $userId = mb_substr(trim($data['user_id'] ?? $data['userId'] ?? ''), 0, 36);
    $code = preg_replace('/\D/', '', (string)($data['code'] ?? ''));

    if ((!$email && !$userId) || strlen($code) !== 6) {
        json_error('Bitte gib den 6-stelligen Code aus der E-Mail ein.');
    }

    // User finden (per ID oder E-Mail)
    if ($userId) {
        $uStmt = $pdo->prepare('SELECT id, email FROM users WHERE id = ?');
        $uStmt->execute([$userId]);
    } else {
        $uStmt = $pdo->prepare('SELECT id, email FROM users WHERE email = ?');
        $uStmt->execute([$email]);
    }
    $found = $uStmt->fetch();
    if (!$found) {
        // Bewusst generisch (kein Account-Enumeration)
        usleep(400000);
        json_error('Der Code ist falsch oder abgelaufen. Bitte fordere einen neuen Code an.', 400);
    }

    $vStmt = $pdo->prepare('SELECT code_hash, expires_at, attempts FROM email_verifications WHERE user_id = ?');
    $vStmt->execute([$found['id']]);
    $row = $vStmt->fetch();
    if (!$row) {
        json_error('Es liegt kein offener Bestätigungs-Code vor. Bitte fordere einen neuen Code an.', 400);
    }
    if ((int)$row['attempts'] >= 5) {
        json_error('Zu viele Fehlversuche. Bitte fordere einen neuen Code an.', 429);
    }
    if (strtotime($row['expires_at']) < time()) {
        $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$found['id']]);
        json_error('Der Code ist abgelaufen (30 Minuten). Bitte fordere einen neuen Code an.', 400);
    }
    if (!password_verify($code, $row['code_hash'])) {
        $pdo->prepare('UPDATE email_verifications SET attempts = attempts + 1 WHERE user_id = ?')->execute([$found['id']]);
        usleep(400000);
        json_error('Der Code ist falsch. Bitte prüfe die E-Mail und versuche es erneut.', 400);
    }

    // Erfolg: Code verbrauchen, E-Mail als bestätigt markieren, Session ausstellen
    $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$found['id']]);
    $pdo->prepare('UPDATE users SET email_verified = 1 WHERE id = ?')->execute([$found['id']]);

    $profileStmt = $pdo->prepare('SELECT * FROM profiles WHERE id = ?');
    $profileStmt->execute([$found['id']]);
    $profile = $profileStmt->fetch();
    $role = $profile['role'] ?? 'student';

    // E-Mail ist bestätigt, aber die Elternbestätigung (unter 16) fehlt:
    // KEIN JWT und keine Willkommens-Mail. Der Parent-Link bleibt 7 Tage gültig.
    if (fwg_parental_consent_pending(
        $pdo,
        $found['id'],
        $profile['birth_date'] ?? null,
        $profile['parental_consent_given'] ?? 0
    )) {
        json_response([
            'success' => true,
            'parental_consent_pending' => true,
            'message' => 'E-Mail bestätigt. Ein Elternteil muss die Nutzung noch bestätigen.'
        ]);
    }

    // Willkommens-Mail erst JETZT (bestätigte Adresse – kein Spam an Fremde)
    try {
        send_email_welcome($found['email'], $profile['first_name'] ?? 'Schüler/in', $role);
    } catch (Exception $e) {
        error_log('Fehler beim Versenden der Willkommens-Mail: ' . $e->getMessage());
    }

    $token = JWT::sign([
        'sub' => $found['id'],
        'email' => $found['email'],
        'role' => $role
    ]);

    if ($profile) {
        $profile['subjects'] = json_decode($profile['subjects'] ?? '[]', true);
        $profile['settings'] = json_decode($profile['settings'] ?? '{}', true);
    }

    json_response([
        'token' => $token,
        'user' => [
            'id' => $found['id'],
            'email' => $found['email']
        ],
        'profile' => $profile
    ]);
}

// ------------------------------------------------------------------------------
// 1c. BESTÄTIGUNGS-CODE ERNEUT SENDEN
// ------------------------------------------------------------------------------
if ($action === 'resend_code' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    // Missbrauchsschutz: max. 5 Code-Mails pro Stunde und IP (Antwort bleibt generisch)
    fwg_require_rate_limit('resend', 5, 3600);

    $email = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $userId = mb_substr(trim($data['user_id'] ?? $data['userId'] ?? ''), 0, 36);

    if ($userId) {
        $uStmt = $pdo->prepare('SELECT u.id, u.email, u.email_verified, p.first_name FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = ?');
        $uStmt->execute([$userId]);
    } elseif ($email) {
        $uStmt = $pdo->prepare('SELECT u.id, u.email, u.email_verified, p.first_name FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.email = ?');
        $uStmt->execute([$email]);
    } else {
        $uStmt = null;
    }

    $found = $uStmt ? $uStmt->fetch() : null;
    if ($found && empty($found['email_verified'])) {
        $verifyCode = (string)random_int(100000, 999999);
        $pdo->prepare('
            INSERT INTO email_verifications (user_id, code_hash, expires_at, attempts)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)
            ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0
        ')->execute([$found['id'], password_hash($verifyCode, PASSWORD_BCRYPT)]);
        try {
            send_email_verification($found['email'], $found['first_name'] ?: 'Schüler/in', $verifyCode);
        } catch (Exception $e) {
            error_log('Fehler beim erneuten Senden des Bestätigungs-Codes: ' . $e->getMessage());
        }
    }

    // Immer generisch antworten (kein Account-Enumeration)
    json_response(['message' => 'Falls für diese Adresse eine unbestätigte Registrierung vorliegt, wurde ein neuer Code versendet (30 Minuten gültig).']);
}

// ------------------------------------------------------------------------------
// 2. LOGIN
// ------------------------------------------------------------------------------
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_input();
    // Brute-Force-Schutz: max. 10 Login-Versuche pro 10 Minuten und IP
    fwg_require_rate_limit('login', 10, 600);
    $email = mb_substr(trim($data['email'] ?? ''), 0, 254);
    $password = is_string($data['password'] ?? null) ? $data['password'] : '';

    if (empty($email) || empty($password) || strlen($password) > 128) {
        // Bewusst generisch + kleine Verzögerung gegen Credential-Stuffing/Enumeration
        usleep(400000);
        json_error('Ungültige Zugangsdaten. E-Mail oder Passwort falsch.', 401);
    }

    $stmt = $pdo->prepare('SELECT id, email, password_hash, email_verified FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        usleep(400000);
        json_error('Ungültige Zugangsdaten. E-Mail oder Passwort falsch.', 401);
    }

    // E-Mail noch nicht bestätigt? Kein Login – erst Code eingeben (Spam-Schutz).
    // Bestehende Konten (vor Einführung der Verifizierung) sind als bestätigt markiert.
    if (empty($user['email_verified'])) {
        json_error('Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte gib den Code aus der Bestätigungs-Mail ein.', 403, [
            'code' => 'email_not_verified',
            'email' => $user['email'],
            'user_id' => $user['id']
        ]);
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
                json_error('Dein Konto ist vorübergehend gesperrt bis ' . date('d.m.Y H:i', $bannedUntil), 403, [
                    'is_banned' => true,
                    'ban_reason' => $profile['ban_reason'],
                    'banned_until' => $profile['banned_until']
                ]);
            } else {
                fwg_clear_expired_ban($pdo, $user['id']);
                $profile['is_banned'] = 0;
            }
        } else {
            json_error('Dein Konto wurde dauerhaft gesperrt.', 403, [
                'is_banned' => true,
                'ban_reason' => $profile['ban_reason']
            ]);
        }
    }

    // Unter 16 ohne bestätigte Eltern-Einwilligung: kein Login/JWT.
    if (fwg_parental_consent_pending(
        $pdo,
        $user['id'],
        $profile['birth_date'] ?? null,
        $profile['parental_consent_given'] ?? 0
    )) {
        json_error('Ein Elternteil muss die Nutzung noch per E-Mail bestätigen. Bitte prüfe das E-Mail-Postfach deiner Eltern.', 403, [
            'code' => 'parental_consent_pending',
            'parental_consent_pending' => true
        ]);
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

    // Konsistent zum Login: Ein bereits ausgestelltes Token darf einen
    // minderjährigen Nutzer ohne bestätigte Eltern-Einwilligung nicht weiter
    // als eingeloggt behandeln. (get_auth_user() liegt in middleware.php und
    // wird von require_auth() genutzt; die Prüfung hier deckt den /me-Flow ab.)
    if ($profile && fwg_parental_consent_pending(
        $pdo,
        $user['id'],
        $profile['birth_date'] ?? null,
        $profile['parental_consent_given'] ?? 0
    )) {
        json_error('Ein Elternteil muss die Nutzung noch per E-Mail bestätigen. Bitte prüfe das E-Mail-Postfach deiner Eltern.', 403, [
            'code' => 'parental_consent_pending',
            'parental_consent_pending' => true
        ]);
    }

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
    // Missbrauchsschutz: max. 5 Reset-Mails pro Stunde und IP (Antwort bleibt generisch)
    fwg_require_rate_limit('pwreset', 5, 3600);
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

    if (strlen($newPassword) < 8 || strlen($newPassword) > 128) {
        json_error('Das neue Passwort muss 8–128 Zeichen lang sein.');
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

        // Ohne Reset-Token (eingeloggter Nutzer) muss das aktuelle Passwort
        // mitgeschickt und geprüft werden. Der Reset-Link bleibt davon unberührt.
        $currentPassword = $data['currentPassword'] ?? $data['current_password'] ?? '';
        if (!is_string($currentPassword) || $currentPassword === '') {
            json_error('Das aktuelle Passwort ist falsch.', 400, [
                'code' => 'current_password_required'
            ]);
        }
        if (strlen($currentPassword) > 128) {
            usleep(200000);
            json_error('Das aktuelle Passwort ist falsch.', 403, [
                'code' => 'invalid_current_password'
            ]);
        }

        $pwStmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
        $pwStmt->execute([$targetUserId]);
        $pwRow = $pwStmt->fetch();
        if (!$pwRow || !password_verify($currentPassword, $pwRow['password_hash'])) {
            usleep(200000);
            json_error('Das aktuelle Passwort ist falsch.', 403, [
                'code' => 'invalid_current_password'
            ]);
        }
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

// ------------------------------------------------------------------------------
// 8. E-MAIL-ADRESSE ÄNDERN – SCHRITT 1: CODE ANFORDERN
//    Speichert die gewünschte Adresse in email_verifications.pending_email und
//    verschickt den 6-stelligen Code an die NEUE Adresse.
// ------------------------------------------------------------------------------
if ($action === 'request_email_change' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = require_auth();
    fwg_require_rate_limit('email_change', 5, 600);

    $data = get_json_input();
    $newEmail = filter_var(trim($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);

    if (!$newEmail) {
        json_error('Bitte gib eine gültige E-Mail-Adresse ein.', 400);
    }
    if (strtolower($newEmail) === strtolower($user['email'] ?? '')) {
        json_error('Das ist bereits Ihre aktuelle E-Mail-Adresse.', 400);
    }

    // Adresse muss frei sein
    $dup = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?');
    $dup->execute([strtolower($newEmail), $user['id']]);
    if ($dup->fetch()) {
        // Bewusst generisch – keine Account-Enumeration
        json_error('Für diese Adresse kann kein Code versendet werden.', 400);
    }

    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hash = password_hash($code, PASSWORD_BCRYPT);
    $expires = date('Y-m-d H:i:s', time() + 1800);

    $pdo->prepare('
        INSERT INTO email_verifications (user_id, code_hash, expires_at, attempts, pending_email)
        VALUES (?, ?, ?, 0, ?)
        ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at),
                                attempts = 0, pending_email = VALUES(pending_email)
    ')->execute([$user['id'], $hash, $expires, $newEmail]);

    try {
        send_email_verification($newEmail, 'Hallo', $code);
    } catch (Exception $e) {
        error_log('E-Mail-Wechsel: Versand fehlgeschlagen: ' . $e->getMessage());
        json_error('Der Bestätigungscode konnte nicht versendet werden. Bitte versuche es später erneut.', 500);
    }

    json_response([
        'message' => 'Bestätigungscode wurde an die neue Adresse gesendet.',
        'email' => $newEmail
    ]);
}

// ------------------------------------------------------------------------------
// 9. E-MAIL-ADRESSE ÄNDERN – SCHRITT 2: CODE BESTÄTIGEN
// ------------------------------------------------------------------------------
if ($action === 'confirm_email_change' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = require_auth();
    fwg_require_rate_limit('verify', 10, 600);

    $data = get_json_input();
    $code = preg_replace('/\D/', '', (string)($data['code'] ?? ''));

    if (strlen($code) !== 6) {
        json_error('Bitte gib den 6-stelligen Code aus der E-Mail ein.', 400);
    }

    $vStmt = $pdo->prepare('SELECT code_hash, expires_at, attempts, pending_email FROM email_verifications WHERE user_id = ?');
    $vStmt->execute([$user['id']]);
    $row = $vStmt->fetch();

    if (!$row || empty($row['pending_email'])) {
        json_error('Es liegt kein offener Adresswechsel vor. Bitte fordere einen neuen Code an.', 400);
    }
    if ((int)$row['attempts'] >= 5) {
        $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$user['id']]);
        json_error('Zu viele Fehlversuche. Bitte fordere einen neuen Code an.', 429);
    }
    if (strtotime($row['expires_at']) < time()) {
        $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$user['id']]);
        json_error('Der Code ist abgelaufen (30 Minuten). Bitte fordere einen neuen Code an.', 400);
    }
    if (!password_verify($code, $row['code_hash'])) {
        $pdo->prepare('UPDATE email_verifications SET attempts = attempts + 1 WHERE user_id = ?')->execute([$user['id']]);
        usleep(400000);
        json_error('Der Code ist falsch. Bitte prüfe die E-Mail und versuche es erneut.', 400);
    }

    // Nochmal prüfen, ob die Adresse inzwischen vergeben wurde
    $dup = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?');
    $dup->execute([strtolower($row['pending_email']), $user['id']]);
    if ($dup->fetch()) {
        $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$user['id']]);
        json_error('Diese Adresse wurde inzwischen vergeben.', 400);
    }

    $pdo->prepare('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?')
        ->execute([$row['pending_email'], $user['id']]);
    $pdo->prepare('UPDATE profiles SET email = ? WHERE id = ?')
        ->execute([$row['pending_email'], $user['id']]);
    $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$user['id']]);

    json_response([
        'message' => 'E-Mail-Adresse wurde geändert.',
        'email' => $row['pending_email']
    ]);
}

json_error('Ungültige Auth-Aktion.', 404);
