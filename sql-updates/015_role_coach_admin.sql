-- ==============================================================================
-- 015: Rolle `coach_admin` im Profil-ENUM ergänzen
-- ==============================================================================
-- Hintergrund: Middleware (require_coach_or_admin), die Code-Einlösung und das
-- Admin-Panel nutzen die Rolle `coach_admin` bereits, das Prod-ENUM kannte den
-- Wert bisher aber nicht (student/sv_admin/parent). Damit schlugen Rollenwechsel
-- auf coach_admin entweder hart fehl (Strict Mode) oder speicherten still einen
-- leeren Wert.
--
-- In phpMyAdmin ausführen (SQL-Tab). Bestehende Werte bleiben unverändert.
-- ==============================================================================

ALTER TABLE profiles
    MODIFY role ENUM('student', 'sv_admin', 'coach_admin', 'parent') NOT NULL DEFAULT 'student';

-- Kontrolle: Das ENUM muss jetzt coach_admin enthalten.
-- SHOW COLUMNS FROM profiles LIKE 'role';
