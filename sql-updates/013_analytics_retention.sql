-- ==============================================================================
-- 013: Aufbewahrungsgrenze für Statistikdaten (90 Tage)
--
-- Hintergrund (Datenschutz, Art. 5 Abs. 1 lit. e DSGVO):
--   Die Tabelle page_analytics speichert bei angemeldeten Nutzern zusätzlich die
--   Konto-Kennung (user_id), um die Zahl der aktiven Personen zu ermitteln. Diese
--   Zuordnung ist pseudonym und darf nicht unbegrenzt gespeichert werden.
--   Dasselbe gilt für die Fächer-Klicks (subject_clicks).
--
-- Umsetzung:
--   1) Die API bereinigt die Tabellen selbstständig (api/analytics.php,
--      fwg_analytics_cleanup) – probabilistisch bei ca. jedem 100. Schreibzugriff,
--      da auf dem Shared Hosting kein verlässlicher Cron läuft.
--   2) Diese Datei ist die dokumentierte Alternative / der manuelle Lauf.
--      Sie kann jederzeit ausgeführt werden und ist mehrfach ausführbar.
--
-- Empfehlung: einmal im Monat (z. B. anlässlich des Monatsberichts im Schülerrat)
-- aufrufen – entweder hier in phpMyAdmin oder über einen Cronjob im KAS.
-- ==============================================================================

DELETE FROM `page_analytics` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM `subject_clicks` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Kontrolle: Wie viele Zeilen liegen noch im Aufbewahrungsfenster?
-- SELECT COUNT(*) AS views_90d FROM `page_analytics` WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL 90 DAY);
-- SELECT COUNT(*) AS clicks_90d FROM `subject_clicks` WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL 90 DAY);
