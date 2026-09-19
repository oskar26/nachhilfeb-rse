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
