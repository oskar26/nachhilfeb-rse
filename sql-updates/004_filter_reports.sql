-- ============================================================================
-- FWG Nachhilfebörse – SQL-Update 004: Filter-Training + Meldungen
-- Importieren NACH 001–003 (Reihenfolge egal, alles mehrfach ausführbar).
-- Anleitung: sql-updates/README.md (phpMyAdmin → Datenbank → Importieren)
-- ============================================================================

-- 1) Trainings-Tabelle für den Profanity-2.0-Filter (wahr/falsch-Reviews).
--    Wird vom Backend (api/moderation.php) sonst automatisch angelegt;
--    dieser Import macht es vorab explizit und sichtbar.
CREATE TABLE IF NOT EXISTS filter_overrides (
    word VARCHAR(128) PRIMARY KEY,
    action ENUM('allow','block') NOT NULL DEFAULT 'allow',
    created_by VARCHAR(36) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Meldungen-Tabelle sicherstellen (falls der allererste Import
--    sql/allinkl_schema.sql nie vollständig lief).
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    reporter_id VARCHAR(36) NOT NULL,
    reported_user_id VARCHAR(36) DEFAULT NULL,
    ad_id VARCHAR(36) DEFAULT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'sonstiges',
    reason VARCHAR(1000) NOT NULL,
    sub_reason VARCHAR(500) DEFAULT NULL,
    evidence LONGTEXT DEFAULT NULL,
    status ENUM('offen','in_bearbeitung','erledigt','abgelehnt') NOT NULL DEFAULT 'offen',
    admin_notes VARCHAR(2000) DEFAULT NULL,
    resolved_by VARCHAR(36) DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Optional: Schwere-Spalte für Filter-Meldungen (kritisch/hoch),
--    falls eure reports-Tabelle sie noch nicht hat.
--    ALTER TABLE reports ADD COLUMN severity VARCHAR(16) DEFAULT NULL;
