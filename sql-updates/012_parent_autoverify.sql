-- ==============================================================================
-- 012: Auto-Verifikation für Eltern-Accounts
-- Ab sofort gilt ein Eltern-Account mit der ersten AKTIVEN Kind-Verknüpfung als
-- verifiziert (analog zur persönlichen SV-Raum-Verifikation bei Schüler-Accounts).
-- Diese Datei bringt BESTEHENDE Accounts auf den neuen Stand. Mehrfach ausführbar.
-- ==============================================================================

-- Eltern, die mind. eine aktive Verknüpfung haben, sofort verifizieren.
UPDATE `profiles` p
SET p.`is_verified` = 1
WHERE p.`role` = 'parent'
  AND p.`is_verified` = 0
  AND EXISTS (
    SELECT 1 FROM `parent_links` pl
    WHERE pl.`parent_id` = p.`id`
      AND pl.`status` = 'active'
  );

-- Eltern ohne aktive Verknüpfung bleiben NICHT verifiziert (Gate bleibt bestehen:
-- require_verified() verlangt weiterhin eine aktive Verknüpfung).
-- Rein dokumentarisch: keine weiteren Schemaänderungen nötig.
