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
