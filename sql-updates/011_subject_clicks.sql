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
