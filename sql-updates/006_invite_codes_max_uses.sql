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
