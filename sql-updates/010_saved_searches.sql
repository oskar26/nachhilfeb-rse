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
