-- =============================================================================
-- FWG Nachhilfebörse – Update 001: session_format + view_count in ads
-- Hochladen NACH dem Deploy des neuen Codes (Reihenfolge egal, Datei ist
-- mehrfach ausführbar). Import-Dauer: wenige Sekunden.
-- =============================================================================

ALTER TABLE `ads`
  ADD COLUMN IF NOT EXISTS `session_format` ENUM('single','group','any') NOT NULL DEFAULT 'any' AFTER `price_details`,
  ADD COLUMN IF NOT EXISTS `view_count` INT NOT NULL DEFAULT 0 AFTER `boosted_until`;
