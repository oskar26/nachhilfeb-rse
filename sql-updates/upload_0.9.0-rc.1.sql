-- FWG Nachhilfebörse – alle SQL-Updates bis 0.9.0-rc.1
-- Enthält 001–016 in der richtigen Reihenfolge.
-- Alle Statements sind mehrfach ausführbar; es werden keine Daten gelöscht,
-- außer den in 013/014 ausdrücklich beschriebenen Aufräumregeln.

-- ===== sql-updates/001_ads_session_format_viewcount.sql =====
-- =============================================================================
-- FWG Nachhilfebörse – Update 001: session_format + view_count in ads
-- Hochladen NACH dem Deploy des neuen Codes (Reihenfolge egal, Datei ist
-- mehrfach ausführbar). Import-Dauer: wenige Sekunden.
-- =============================================================================

ALTER TABLE `ads`
  ADD COLUMN IF NOT EXISTS `session_format` ENUM('single','group','any') NOT NULL DEFAULT 'any' AFTER `price_details`,
  ADD COLUMN IF NOT EXISTS `view_count` INT NOT NULL DEFAULT 0 AFTER `boosted_until`;

-- ===== sql-updates/002_ad_views.sql =====
-- =============================================================================
-- FWG Nachhilfebörse – Update 002: ad_views (Aufrufe pro Anzeige)
-- Anonyme Zählung ohne IP-Adresse (DSGVO-sparsam). Mehrfach ausführbar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ad_views` (
  `id` VARCHAR(36) NOT NULL,
  `ad_id` VARCHAR(36) NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ad_views_ad` (`ad_id`),
  KEY `idx_ad_views_date` (`viewed_at`),
  CONSTRAINT `fk_ad_views_ad` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== sql-updates/003_coaching_tables.sql =====
-- =============================================================================
-- FWG Nachhilfebörse – Update 003: Coaching-Tabellen sicherstellen
-- (promo_codes, promo_redemptions, admin_audit_log, app_settings)
-- Falls die Auto-Migration der API bei eurem Hoster kein CREATE TABLE darf,
-- legt diese Datei alles an. Mehrfach ausführbar, löscht keine Daten.
-- Hinweis: Fest einprogrammierte Codes gibt es bewusst nicht – Einmal-Codes
-- für SV-/Coaching-Admins werden im SV-Panel erzeugt (Reiter „Codes").
-- =============================================================================

CREATE TABLE IF NOT EXISTS `promo_codes` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `effect_type` VARCHAR(32) NOT NULL DEFAULT 'ad_boost',
  `push_level` VARCHAR(32) NOT NULL DEFAULT 'standard',
  `boost_days` INT NOT NULL DEFAULT 14,
  `max_uses` INT DEFAULT NULL,
  `current_uses` INT NOT NULL DEFAULT 0,
  `target_group` VARCHAR(64) NOT NULL DEFAULT 'all',
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `expires_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_promo_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promo_redemptions` (
  `id` VARCHAR(36) NOT NULL,
  `promo_id` VARCHAR(36) NULL,
  `code` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `effect_type` VARCHAR(32) NOT NULL DEFAULT 'ad_boost',
  `redeemed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `revoked_at` DATETIME NULL,
  `revoked_by` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_redemp_code` (`code`),
  KEY `idx_redemp_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_audit_log` (
  `id` VARCHAR(36) NOT NULL,
  `admin_id` VARCHAR(36) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` VARCHAR(36) DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` VARCHAR(36) NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alte Rate-Codes aus dem öffentlichen Git-Verlauf ungültig machen:
DELETE FROM `invite_codes`
  WHERE `code` IN ('SV-ADMIN-2026', 'COACH-2026', 'PARENT-2026', 'BALISTRERI-COACH');
DELETE FROM `promo_codes` WHERE `code` = 'banane';

-- ===== sql-updates/004_filter_reports.sql =====
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

-- ===== sql-updates/005_email_verification.sql =====
-- 005: E-Mail-Verifizierung (6-stelliger Code pro Nutzer)
-- Importieren NACH 001-004. Idempotent (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS `email_verifications` (
  `user_id` VARCHAR(36) NOT NULL,
  `code_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_email_verifications_exp` (`expires_at`),
  CONSTRAINT `fk_email_verifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== sql-updates/006_invite_codes_max_uses.sql =====
-- =============================================================================
-- FWG Nachhilfebörse – Update 006: Mehrfach-Einlösung für Einladungs-Codes
-- Hochladen NACH dem Deploy des neuen Codes. Mehrfach ausführbar.
-- Hintergrund: invite_codes kannte bisher nur „einmal einlösbar" (is_used-Flag).
-- Neu: max_uses (1x/2x/5x/10x/unbegrenzt) + current_uses-Zähler für die
-- Anzeige „Nutzungen" im SV-Panel (Reiter Codes → Einladungen).
-- =============================================================================

ALTER TABLE `invite_codes`
  ADD COLUMN IF NOT EXISTS `max_uses` INT NULL DEFAULT NULL AFTER `is_used`,
  ADD COLUMN IF NOT EXISTS `current_uses` INT NOT NULL DEFAULT 0 AFTER `max_uses`;

-- ===== sql-updates/007_page_analytics.sql =====
-- ==============================================================================
-- 007: page_analytics (Seitenaufrufe-Statistik, cookiefrei, keine IPs)
-- Tabelle fehlte in 001-006 (war nur im Haupt-Schema). Mehrfach ausführbar.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `page_analytics` (
  `id` VARCHAR(36) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `device_type` ENUM('mobile', 'tablet', 'desktop') NOT NULL DEFAULT 'desktop',
  `browser` VARCHAR(50) NOT NULL DEFAULT 'Other',
  `user_id` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_path` (`path`),
  KEY `idx_analytics_created` (`created_at`),
  CONSTRAINT `fk_analytics_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== sql-updates/008_app_settings.sql =====
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

-- ===== sql-updates/009_parent_links.sql =====
-- ==============================================================================
-- 009: parent_links (Verknüpfung Elternkonto ⇄ Kind)
-- Tabelle fehlte in 001-008 (war nur im Haupt-Schema). Mehrfach ausführbar.
-- Behebt HTTP 500 bei „Verknüpfung bestätigen".
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `parent_links` (
  `id` VARCHAR(36) NOT NULL,
  `parent_id` VARCHAR(36) NOT NULL,
  `child_id` VARCHAR(36) NOT NULL,
  `status` ENUM('pending', 'active', 'revoked') NOT NULL DEFAULT 'pending',
  `permissions` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `linked_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_parent_child` (`parent_id`, `child_id`),
  CONSTRAINT `fk_pl_parent` FOREIGN KEY (`parent_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pl_child` FOREIGN KEY (`child_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== sql-updates/010_saved_searches.sql =====
-- 010_saved_searches.sql
-- Gemerkte Feed-Suchen (MVP: eine Suche pro Nutzer) + Debounce-Zeitpunkt für
-- Benachrichtigungen bei passenden neuen Anzeigen.
-- Mehrfach ausführbar.

CREATE TABLE IF NOT EXISTS `saved_searches` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `query` JSON NOT NULL,
    `query_hash` CHAR(64) NOT NULL,
    `last_notified_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_saved_user_hash` (`user_id`, `query_hash`),
    KEY `idx_saved_query` (`query_hash`),
    CONSTRAINT `fk_saved_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== sql-updates/011_subject_clicks.sql =====
-- 011_subject_clicks.sql
-- Anonyme Fächer-Klicks für die "Beliebt:"-Reihe im Feed (keine IPs, kein Nutzerbezug).
-- Mehrfach ausführbar.

CREATE TABLE IF NOT EXISTS `subject_clicks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_subject_clicks_subject` (`subject`),
    KEY `idx_subject_clicks_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== sql-updates/012_parent_autoverify.sql =====
-- ==============================================================================
-- 012: Auto-Verifikation für Eltern-Accounts
-- Ab sofort gilt ein Eltern-Account mit der ersten AKTIVEN Kind-Verknüpfung als
-- verifiziert (analog zur persönlichen SV-Raum-Verifikation bei Schüler-Accounts).
-- Diese Datei bringt BESTEHENDE Accounts auf den neuen Stand. Mehrfach ausführbar.
-- ==============================================================================

-- Eltern, die mind. eine aktive Verknüpfung haben, sofort verifizieren.
UPDATE `profiles` p
SET p.`is_verified` = 1
WHERE p.`role` = 'parent'
  AND p.`is_verified` = 0
  AND EXISTS (
    SELECT 1 FROM `parent_links` pl
    WHERE pl.`parent_id` = p.`id`
      AND pl.`status` = 'active'
  );

-- Eltern ohne aktive Verknüpfung bleiben NICHT verifiziert (Gate bleibt bestehen:
-- require_verified() verlangt weiterhin eine aktive Verknüpfung).
-- Rein dokumentarisch: keine weiteren Schemaänderungen nötig.

-- ===== sql-updates/013_analytics_retention.sql =====
-- ==============================================================================
-- 013: Aufbewahrungsgrenze für Statistikdaten (90 Tage)
--
-- Hintergrund (Datenschutz, Art. 5 Abs. 1 lit. e DSGVO):
--   Die Tabelle page_analytics speichert bei angemeldeten Nutzern zusätzlich die
--   Konto-Kennung (user_id), um die Zahl der aktiven Personen zu ermitteln. Diese
--   Zuordnung ist pseudonym und darf nicht unbegrenzt gespeichert werden.
--   Dasselbe gilt für die Fächer-Klicks (subject_clicks).
--
-- Umsetzung:
--   1) Die API bereinigt die Tabellen selbstständig (api/analytics.php,
--      fwg_analytics_cleanup) – probabilistisch bei ca. jedem 100. Schreibzugriff,
--      da auf dem Shared Hosting kein verlässlicher Cron läuft.
--   2) Diese Datei ist die dokumentierte Alternative / der manuelle Lauf.
--      Sie kann jederzeit ausgeführt werden und ist mehrfach ausführbar.
--
-- Empfehlung: einmal im Monat (z. B. anlässlich des Monatsberichts im Schülerrat)
-- aufrufen – entweder hier in phpMyAdmin oder über einen Cronjob im KAS.
-- ==============================================================================

DELETE FROM `page_analytics` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM `subject_clicks` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Kontrolle: Wie viele Zeilen liegen noch im Aufbewahrungsfenster?
-- SELECT COUNT(*) AS views_90d FROM `page_analytics` WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL 90 DAY);
-- SELECT COUNT(*) AS clicks_90d FROM `subject_clicks` WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL 90 DAY);

-- ===== sql-updates/014_reviews_unique.sql =====
-- ----------------------------------------------------------------------------
-- 014_reviews_unique.sql
--
-- Bewertungen: nur noch eine Bewertung pro Autor+Ziel möglich.
-- Vor dem Setzen des Unique-Keys werden vorhandene Duplikate entfernt.
-- Es bleibt jeweils die NEUESTE Bewertung des Paares erhalten.
--
-- Ausführen im phpMyAdmin (SQL-Tab), siehe docs/NUTZER-AUFGABEN.md.
-- ----------------------------------------------------------------------------

-- 1) Duplikate entfernen (ältere Bewertungen je Paar löschen)
DELETE r1 FROM reviews r1
JOIN reviews r2
  ON r1.author_id = r2.author_id
 AND r1.target_user_id = r2.target_user_id
 AND (r1.created_at < r2.created_at
      OR (r1.created_at = r2.created_at AND r1.id < r2.id));

-- 2) Eindeutigkeit erzwingen
ALTER TABLE reviews ADD UNIQUE KEY uq_reviews_author_target (author_id, target_user_id);

-- ===== sql-updates/015_role_coach_admin.sql =====
-- ==============================================================================
-- 015: Rolle `coach_admin` im Profil-ENUM ergänzen
-- ==============================================================================
-- Hintergrund: Middleware (require_coach_or_admin), die Code-Einlösung und das
-- Admin-Panel nutzen die Rolle `coach_admin` bereits, das Prod-ENUM kannte den
-- Wert bisher aber nicht (student/sv_admin/parent). Damit schlugen Rollenwechsel
-- auf coach_admin entweder hart fehl (Strict Mode) oder speicherten still einen
-- leeren Wert.
--
-- In phpMyAdmin ausführen (SQL-Tab). Bestehende Werte bleiben unverändert.
-- ==============================================================================

ALTER TABLE profiles
    MODIFY role ENUM('student', 'sv_admin', 'coach_admin', 'parent') NOT NULL DEFAULT 'student';

-- Kontrolle: Das ENUM muss jetzt coach_admin enthalten.
-- SHOW COLUMNS FROM profiles LIKE 'role';

-- ===== sql-updates/016_privacy_chat_consent_blocks.sql =====
-- ==============================================================================
-- 016: Titel, Lesebestätigungen, Meldungsdetails, Blockieren, Elternbestätigung
-- ==============================================================================
-- In phpMyAdmin (SQL-Tab) ausführen. Die Datei ist für MariaDB geschrieben und
-- kann mehrfach ausgeführt werden (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).
--
-- Enthalten:
--   1) ads.title             – eigener Anzeigentitel (bisher nur in der UI)
--   2) messages.read_at      – echte Lesebestätigung statt nur is_read
--   3) reports.description   – Beschreibung aus dem Melde-Assistenten
--      reports.related_message_ids – Bezug zu Chat-Nachrichten
--   4) user_blocks           – gegenseitiges Blockieren zwischen Konten
--   5) parental_consents     – Elternbestätigung per E-Mail-Link (unter 16)
--   6) profiles.analytics_opt_out – Statistik-Widerspruch ohne E-Mail
-- ==============================================================================

ALTER TABLE `ads`
    ADD COLUMN IF NOT EXISTS `title` VARCHAR(120) NULL AFTER `user_id`;

ALTER TABLE `profiles`
    MODIFY `avatar_url` MEDIUMTEXT NULL;

ALTER TABLE `messages`
    ADD COLUMN IF NOT EXISTS `read_at` DATETIME NULL AFTER `is_read`;

ALTER TABLE `reports`
    ADD COLUMN IF NOT EXISTS `description` TEXT NULL AFTER `evidence`,
    ADD COLUMN IF NOT EXISTS `related_message_ids` JSON NULL AFTER `description`;

CREATE TABLE IF NOT EXISTS `user_blocks` (
    `blocker_id` VARCHAR(36) NOT NULL,
    `blocked_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`blocker_id`, `blocked_id`),
    KEY `idx_user_blocks_blocked` (`blocked_id`),
    CONSTRAINT `fk_user_blocks_blocker` FOREIGN KEY (`blocker_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_user_blocks_blocked` FOREIGN KEY (`blocked_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parental_consents` (
    `user_id` VARCHAR(36) NOT NULL,
    `parent_email` VARCHAR(255) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `confirmed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    KEY `idx_parental_consents_token` (`token_hash`),
    CONSTRAINT `fk_parental_consents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `profiles`
    ADD COLUMN IF NOT EXISTS `analytics_opt_out` TINYINT(1) NOT NULL DEFAULT 0 AFTER `settings`;

-- Kontrolle:
-- SHOW COLUMNS FROM ads LIKE 'title';
-- SHOW COLUMNS FROM messages LIKE 'read_at';
-- SHOW COLUMNS FROM reports LIKE 'description';
-- SHOW COLUMNS FROM profiles LIKE 'analytics_opt_out';
-- SELECT * FROM user_blocks;
-- SELECT * FROM parental_consents;
