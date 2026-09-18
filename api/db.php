<?php
// ==============================================================================
// FWG Nachhilfebörse - PDO Database Connection Manager
// ==============================================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';

class DB {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_NAME,
                DB_CHARSET
            );

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];

            // Fail-Closed bei fehlender Konfiguration (kein Fallback-Geheimnis im Repo)
            if (empty(DB_NAME) || empty(DB_USER)) {
                error_log('DB config missing: DB_NAME/DB_USER nicht gesetzt (Env oder db_credentials.php).');
                json_error('Datenbankverbindung fehlgeschlagen. Bitte wende dich an den Support.', 500);
            }

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Details nur ins Server-Log, niemals an den Client (kein Info-Leak von Host/DSN)
                error_log('DB connection failed: ' . $e->getMessage());
                json_error('Datenbankverbindung fehlgeschlagen. Bitte wende dich an den Support.', 500);
            }
        }

        return self::$instance;
    }
}
