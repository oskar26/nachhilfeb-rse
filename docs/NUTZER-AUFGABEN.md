# Nutzer-Aufgaben (phpMyAdmin & Co.)

Diese Datei sammelt alle Aufgaben, die **du** im Browser / in phpMyAdmin machen
musst. Alles andere (PHP-Code, Frontend) wird automatisch über GitHub Actions
deployt, sobald ich einen Stand pushe.

---

## 1. phpMyAdmin öffnen

1. Bei ALL-INKL im KAS einloggen → **Datenbanken** → **phpMyAdmin** öffnen.
2. Die Datenbank der Nachhilfebörse auswählen (die mit den `profiles`/`ads`-Tabellen).
3. Oben den Reiter **SQL** öffnen.

## 2. Abfragen (Ergebnis bitte zurückkopieren)

Bitte die folgenden Abfragen einzeln im SQL-Tab ausführen und das Ergebnis
zurück an mich kopieren:

**A) Datenbank-Version (wichtig für JSON-Filter):**
```sql
SELECT VERSION() AS db_version;
```

**B) Alle Tabellen:**
```sql
SHOW TABLES;
```

**C) Spalten der wichtigsten Tabellen:**
```sql
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('ads','profiles','invite_codes','promo_codes','saved_searches',
                     'subject_clicks','email_verifications','app_settings',
                     'filter_overrides','page_analytics','messages','ad_views')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

**D) Frühere Coaching-Backdoor prüfen (erwartet: `is_active = 0` oder keine Zeile):**
```sql
SELECT id, code, effect_type, is_active, created_by, created_at
FROM promo_codes
WHERE code = 'COACHING-AG';
```

**E) Rolle prüfen (wichtig — „coach_admin“ muss erlaubt sein):**
```sql
SHOW COLUMNS FROM profiles LIKE 'role';
```
Erwartet wird ein ENUM, das **coach_admin** enthält, z. B.
`enum('student','sv_admin','coach_admin','parent')`.
Falls `coach_admin` fehlt: kurz melden, dann bereite ich eine Migration
(015) für dich vor.

## 3. Bewertungen absichern (einmalig)

Ich habe im Repo die Datei **`sql-updates/014_reviews_unique.sql`** angelegt.
Sie sorgt dafür, dass jede Person eine andere Person nur **einmal** bewerten
kann (entfernt vorher eventuelle Duplikate).

Bitte den **kompletten Inhalt** dieser Datei im phpMyAdmin-SQL-Tab ausführen:

```sql
DELETE r1 FROM reviews r1
JOIN reviews r2
  ON r1.author_id = r2.author_id
 AND r1.target_user_id = r2.target_user_id
 AND (r1.created_at < r2.created_at
      OR (r1.created_at = r2.created_at AND r1.id < r2.id));

ALTER TABLE reviews ADD UNIQUE KEY uq_reviews_author_target (author_id, target_user_id);
```

Wenn beide Befehle ohne Fehler durchlaufen, ist alles erledigt.

## 4. Frage: SV-Manager (sv_remote.php)

Wird `sv_remote.php` (externer SV-Manager mit API-Key) noch benutzt?
Falls ja: wird der Key als **HTTP-Header** (`X-SV-Key`) geschickt oder
per URL (`...?key=...`)? Damit ich den Zugang sicherer machen kann.

## 5. Dateien hochladen?

Normalerweise **nicht nötig**: Jeder Push auf `main` deployt automatisch
per GitHub Actions (Build + Upload zu ALL-INKL). Wenn ich dir künftig
einen manuellen Upload sagen will, steht er extra hier mit exaktem Dateipfad
und Zielordner.

## 6. Nachtrag: COACHING-AG deaktivieren (falls noch aktiv)

Die Prüfung ergab: Der alte Coach-Code `COACHING-AG` war in der Datenbank noch
aktiv (`is_active = 1`). Bitte einmal ausführen (falls nicht schon geschehen):

```sql
UPDATE promo_codes SET is_active = 0 WHERE code = 'COACHING-AG' AND created_by IS NULL;
```

Kontrolle:

```sql
SELECT code, is_active FROM promo_codes WHERE code = 'COACHING-AG';
```

Erwartet: `is_active = 0`.

## 7. Nachtrag: Rolle `coach_admin` freischalten (Migration 015)

Die Produktions-Datenbank erlaubt der Rolle `profiles.role` derzeit nur
`student` / `sv_admin` / `parent` — der Wert `coach_admin` fehlt, obwohl ihn
Middleware, Code-Einlösung und Admin-Panel bereits nutzen. Bitte im SQL-Tab
ausführen (vollständiger Inhalt von `sql-updates/015_role_coach_admin.sql`):

```sql
ALTER TABLE profiles MODIFY role ENUM('student', 'sv_admin', 'coach_admin', 'parent') NOT NULL DEFAULT 'student';
```

Kontrolle: `SHOW COLUMNS FROM profiles LIKE 'role';` — `coach_admin` muss jetzt
im ENUM stehen. Bestehende Rollen bleiben unverändert.
