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
