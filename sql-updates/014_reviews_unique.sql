-- ----------------------------------------------------------------------------
-- 014_reviews_unique.sql
--
-- Bewertungen: nur noch eine Bewertung pro Autor+Ziel möglich.
-- Vor dem Setzen des Unique-Keys werden vorhandene Duplikate entfernt.
-- Es bleibt jeweils die NEUESTE Bewertung des Paares erhalten.
--
-- Ausführen im phpMyAdmin (SQL-Tab), siehe docs/NUTZER-AUFGABEN.md.
-- ----------------------------------------------------------------------------

-- 1) Duplikate entfernen (ältere Bewertungen je Paar löschen)
DELETE r1 FROM reviews r1
JOIN reviews r2
  ON r1.author_id = r2.author_id
 AND r1.target_user_id = r2.target_user_id
 AND (r1.created_at < r2.created_at
      OR (r1.created_at = r2.created_at AND r1.id < r2.id));

-- 2) Eindeutigkeit erzwingen
ALTER TABLE reviews ADD UNIQUE KEY uq_reviews_author_target (author_id, target_user_id);
