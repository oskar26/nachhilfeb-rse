-- =============================================================================
-- FWG Nachhilfebörse – Update 008: app_settings sicherstellen
-- Tabelle speichert Coach-Info-Box + Coaching-Seiten-Inhalte (JSON in setting_value).
-- In 003 enthalten; fehlt ggf. nach reinem Import von sql/allinkl_schema.sql.
-- Mehrfach ausführbar, löscht keine Daten. Kein Spalten-Update nötig:
-- content_json liegt als Schlüssel in setting_value (LONGTEXT), nicht als Spalte.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` VARCHAR(36) NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
