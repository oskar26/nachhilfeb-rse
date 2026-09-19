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
