-- ==============================================================================
-- FWG NACHHILFEBÖRSE - DATENBANKSCHEMA FÜR ALL-INKL (MySQL 8 / MariaDB)
-- Encoding: UTF-8 (utf8mb4)
-- Kompatibel mit ALL-INKL phpMyAdmin
-- ==============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ------------------------------------------------------------------------------
-- 1. Tabelle: users (Authentifizierung & Passwörter)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Tabelle: profiles (Schüler-, Admin- und Elternprofile)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(36) NOT NULL,
  `first_name` VARCHAR(100) DEFAULT NULL,
  `last_name` VARCHAR(100) DEFAULT NULL,
  `display_name` VARCHAR(200) DEFAULT NULL,
  `grade_level` VARCHAR(20) DEFAULT NULL,
  `class_letter` VARCHAR(10) DEFAULT NULL,
  `role` ENUM('student', 'sv_admin', 'parent') NOT NULL DEFAULT 'student',
  `subjects` JSON DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `moodle_name` VARCHAR(100) DEFAULT NULL,
  `phone_number` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `contact_other` VARCHAR(255) DEFAULT NULL,
  `settings` JSON DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `avatar_type` VARCHAR(20) NOT NULL DEFAULT 'image',
  `banner_color` VARCHAR(30) DEFAULT NULL,
  `birth_date` DATE DEFAULT NULL,
  `parental_consent_given` TINYINT(1) NOT NULL DEFAULT 0,
  `parental_consent_date` DATETIME DEFAULT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_banned` TINYINT(1) NOT NULL DEFAULT 0,
  `ban_type` ENUM('temporary', 'permanent') NOT NULL DEFAULT 'temporary',
  `ban_reason` TEXT DEFAULT NULL,
  `banned_until` DATETIME DEFAULT NULL,
  `average_rating` FLOAT NOT NULL DEFAULT 0,
  `onboarding_complete` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_profiles_role` (`role`),
  KEY `idx_profiles_verified` (`is_verified`),
  CONSTRAINT `fk_profiles_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Tabelle: ads (Nachhilfe-Angebote & Gesuche)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ads` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('offer', 'search') NOT NULL,
  `subjects` JSON NOT NULL,
  `grade_levels` JSON NOT NULL,
  `locations` JSON NOT NULL,
  `custom_location` TEXT DEFAULT NULL,
  `price_details` JSON DEFAULT NULL,
  `duration_minutes` JSON DEFAULT NULL,
  `short_description` TEXT DEFAULT NULL,
  `long_description` TEXT DEFAULT NULL,
  `image_urls` JSON DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `boosted` TINYINT(1) NOT NULL DEFAULT 0,
  `boosted_until` DATETIME DEFAULT NULL,
  `promo_code_used` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ads_user` (`user_id`),
  KEY `idx_ads_active_type` (`is_active`, `type`),
  KEY `idx_ads_boosted` (`boosted`, `boosted_until`),
  CONSTRAINT `fk_ads_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Tabelle: ad_requests (Kontaktanfragen für Nachhilfe)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_requests` (
  `id` VARCHAR(36) NOT NULL,
  `ad_id` VARCHAR(36) NOT NULL,
  `requester_id` VARCHAR(36) NOT NULL,
  `owner_id` VARCHAR(36) NOT NULL,
  `role` VARCHAR(50) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_requests_ad` (`ad_id`),
  KEY `idx_requests_requester` (`requester_id`),
  KEY `idx_requests_owner` (`owner_id`),
  KEY `idx_requests_status` (`status`),
  CONSTRAINT `fk_requests_ad` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requests_requester` FOREIGN KEY (`requester_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requests_owner` FOREIGN KEY (`owner_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Tabelle: messages (Chat-Nachrichten)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(36) NOT NULL,
  `request_id` VARCHAR(36) NOT NULL,
  `sender_id` VARCHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_request` (`request_id`, `created_at`),
  KEY `idx_messages_sender` (`sender_id`),
  CONSTRAINT `fk_messages_request` FOREIGN KEY (`request_id`) REFERENCES `ad_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Tabelle: reviews (Bewertungen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(36) NOT NULL,
  `ad_id` VARCHAR(36) DEFAULT NULL,
  `author_id` VARCHAR(36) NOT NULL,
  `target_user_id` VARCHAR(36) NOT NULL,
  `rating` FLOAT NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_target` (`target_user_id`),
  KEY `idx_reviews_author` (`author_id`),
  CONSTRAINT `fk_reviews_ad` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reviews_author` FOREIGN KEY (`author_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_target` FOREIGN KEY (`target_user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Tabelle: favorites (Merkliste)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id` VARCHAR(36) NOT NULL,
  `ad_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `ad_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_ad` FOREIGN KEY (`ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Tabelle: invite_codes (SV-Registrierungs- & Verifizierungscodes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invite_codes` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `used_by` VARCHAR(36) DEFAULT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `role` ENUM('student', 'sv_admin', 'parent') NOT NULL DEFAULT 'student',
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_invite_code` (`code`),
  CONSTRAINT `fk_invite_creator` FOREIGN KEY (`created_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invite_user` FOREIGN KEY (`used_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Tabelle: support_tickets (Hilfe, Feedback & Bug-Reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('bug', 'feature', 'support') NOT NULL DEFAULT 'support',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'normal', 'high', 'critical') NOT NULL DEFAULT 'normal',
  `device_info` JSON DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_user` (`user_id`),
  KEY `idx_support_status` (`status`),
  CONSTRAINT `fk_support_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Tabelle: support_messages (Support-Chat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_messages` (
  `id` VARCHAR(36) NOT NULL,
  `ticket_id` VARCHAR(36) NOT NULL,
  `sender_id` VARCHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `is_admin_reply` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sm_ticket` (`ticket_id`),
  CONSTRAINT `fk_sm_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_sender` FOREIGN KEY (`sender_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Tabelle: reports (Meldewesen für unpassende Anzeigen/Nutzer)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reports` (
  `id` VARCHAR(36) NOT NULL,
  `reporter_id` VARCHAR(36) NOT NULL,
  `reported_user_id` VARCHAR(36) DEFAULT NULL,
  `reported_ad_id` VARCHAR(36) DEFAULT NULL,
  `category` ENUM('profil', 'anzeige', 'chat', 'datenschutz', 'sonstiges') NOT NULL DEFAULT 'anzeige',
  `reason` TEXT NOT NULL,
  `sub_reason` VARCHAR(100) DEFAULT NULL,
  `priority` ENUM('normal', 'hoch', 'kritisch') NOT NULL DEFAULT 'normal',
  `status` ENUM('open', 'investigating', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  `resolution_type` ENUM('warn', 'ban', 'delete', 'dismiss', 'escalate') DEFAULT NULL,
  `evidence` JSON DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `resolved_by` VARCHAR(36) DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status` (`status`),
  CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_target_user` FOREIGN KEY (`reported_user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_target_ad` FOREIGN KEY (`reported_ad_id`) REFERENCES `ads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Tabelle: admin_audit_log (Revisionssicheres SV-Admin-Protokoll)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_audit_log` (
  `id` VARCHAR(36) NOT NULL,
  `admin_id` VARCHAR(36) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` VARCHAR(36) DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_id`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Tabelle: parent_links (Verknüpfung Elternkonto mit Kind)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 14. Tabelle: notifications (In-App Benachrichtigungen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT DEFAULT NULL,
  `data` JSON DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Tabelle: news (SV-Ankündigungen / News-Popups)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `news` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `author_id` VARCHAR(36) DEFAULT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_news_author` FOREIGN KEY (`author_id`) REFERENCES `profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Initialdaten: Vorinstallierte SV-Codes
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `invite_codes` (`id`, `code`, `role`, `is_used`, `created_at`) VALUES
('00000000-0000-4000-8000-000000000001', 'SV-ADMIN-2026', 'sv_admin', 0, NOW()),
('00000000-0000-4000-8000-000000000002', 'SV-FWG-SCHUELER-1', 'student', 0, NOW()),
('00000000-0000-4000-8000-000000000003', 'SV-FWG-SCHUELER-2', 'student', 0, NOW()),
('00000000-0000-4000-8000-000000000004', 'SV-FWG-ELTERN-1', 'parent', 0, NOW());

SET foreign_key_checks = 1;
