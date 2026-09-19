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
