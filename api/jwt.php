<?php
// ==============================================================================
// FWG Nachhilfebörse - Pure PHP JWT Implementation (HMAC-SHA256)
// ==============================================================================

require_once __DIR__ . '/config.php';

class JWT {
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    private static function requireStrongSecret(string $secret): void {
        // Fail-Closed: kein leeres/kurzes Secret, kein committed Default mehr akzeptieren
        if (strlen($secret) < 32) {
            error_log('JWT_SECRET missing or too short (>=32 chars required).');
            json_error('Server-Konfigurationsfehler. Bitte wende dich an den Support.', 500);
        }
    }

    public static function sign(array $payload, string $secret = JWT_SECRET, int $expiry = JWT_EXPIRY): string {
        self::requireStrongSecret($secret);
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiry;

        $encodedHeader = self::base64UrlEncode(json_encode($header));
        $encodedPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$encodedHeader.$encodedPayload", $secret, true);
        $encodedSignature = self::base64UrlEncode($signature);

        return "$encodedHeader.$encodedPayload.$encodedSignature";
    }

    public static function verify(string $token, string $secret = JWT_SECRET): ?array {
        if (strlen($secret) < 32) {
            error_log('JWT verify refused: JWT_SECRET missing or too short.');
            return null;
        }
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        // Alg-Confusion-Schutz: nur HS256 akzeptieren
        $header = json_decode(self::base64UrlDecode($encodedHeader), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') {
            return null;
        }

        $signature = self::base64UrlDecode($encodedSignature);
        $expectedSignature = hash_hmac('sha256', "$encodedHeader.$encodedPayload", $secret, true);

        if (!hash_equals($expectedSignature, $signature)) {
            return null; // Ungültige Signatur
        }

        $payload = json_decode(self::base64UrlDecode($encodedPayload), true);
        if (!is_array($payload)) {
            return null;
        }

        // Ablaufdatum prüfen
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Abgelaufen
        }

        return $payload;
    }
}
