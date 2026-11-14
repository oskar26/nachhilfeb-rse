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
