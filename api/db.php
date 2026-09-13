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

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Keine Passwörter in der Fehlerausgabe exponieren
                json_error('Datenbankverbindung fehlgeschlagen. Bitte prüfe die Verbindungsdaten in api/config.php.', 500, [
                    'message' => $e->getMessage()
                ]);
            }
        }

        return self::$instance;
    }
}
