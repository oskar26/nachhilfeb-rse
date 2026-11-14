# 🚀 Deployment-Anleitung – FWG Nachhilfebörse v2

Diese Anleitung erklärt, wie die FWG Nachhilfebörse v2 eingerichtet, migriert und deployt wird.

> ⚠️ **Historisches Dokument (Supabase-Ära):** Der Produktivbetrieb läuft über ALL-INKL (PHP/MySQL).
> Deploy: GitHub Action [`.github/workflows/deploy-allinkl.yml`](.github/workflows/deploy-allinkl.yml) (Build + FTPS).
> Schema-Updates: [`sql-updates/README.md`](sql-updates/README.md). Die Abschnitte 2–4 beschreiben das frühere Supabase-Setup und gelten nicht mehr.

---

## Voraussetzungen

| Tool | Version | Verwendungszweck |
|------|---------|-----------------|
| Node.js | ≥ 18 | Frontend-Build |
| npm | ≥ 9 | Paketverwaltung |
| Git | beliebig | Versionskontrolle |

---

## 1. Lokale Entwicklung

### Installation
```bash
# Repository klonen
git clone <dein-repo-url>
cd nachhilfev2

# Abhängigkeiten installieren
npm install
```

### Umgebungsvariablen
Erstelle eine `.env`-Datei im Root-Verzeichnis (Vorlage: `.env.example`):

```env
# Keine Pflicht-Variablen nötig. Optional: VITE_API_URL (Standard: /api)
```

> ⚠️ **Wichtig**: Committe niemals die `.env`-Datei mit echten Schlüsseln! Die `.gitignore` ist bereits so konfiguriert, dass `.env` ausgeschlossen wird.

### Entwicklungsserver starten
```bash
npm run dev
```
Die App läuft dann auf `http://localhost:5173`.

### Build erstellen (Produktion)
```bash
npm run build
```
Die optimierten Dateien befinden sich im `dist/`-Ordner.

---

## 2. Supabase-Datenbankeinrichtung

### Neues Supabase-Projekt erstellen
1. Gehe zu [supabase.com](https://supabase.com) → New Project
2. Notiere die **Project URL** und den **Anon Key** (für `.env`)
3. Öffne den **SQL Editor** in deinem Supabase-Dashboard

### Migrations ausführen (Reihenfolge beachten!)

Führe die SQL-Dateien in dieser Reihenfolge im SQL Editor aus:

```
1. supabase/schema.sql           → Grundlegende Tabellen & Typen
2. supabase/init_all.sql         → Initiale Daten, Funktionen, Trigger
3. supabase/add_messages.sql     → Messages-Tabelle
4. supabase/fix_favorites.sql    → Favorites-Fix
5. supabase/fix_ratings.sql      → Ratings-Fix
6. supabase/fix_not_null.sql     → NOT NULL Constraints
7. supabase/migration_phase8.sql → Phase 8 Features
8. supabase/fix_phase8_db.sql    → Phase 8 Bugfixes
9. supabase/migration_v2_update.sql → V2 Update (Eltern, Reports, Boost, etc.)
```

> ⚠️ **Wichtig**: Führe die Migrations **in dieser Reihenfolge** aus! Spätere Migrations bauen auf früheren auf.

### Migration ausführen
1. Öffne den SQL-Editor in deinem Supabase-Dashboard
2. Kopiere den Inhalt der jeweiligen SQL-Datei
3. Klicke auf "Run" oder drücke `Ctrl+Enter`
4. Warte bis „Success. No rows returned" erscheint

### Supabase Storage konfigurieren (optional)
Falls du Avatare oder Belege direkt in Supabase Storage hosten möchtest (Anzeigenbilder laufen über `api/upload.php` und `uploads/ads/`):
1. Gehe zu **Storage** → New Bucket
2. Name: `avatars` (öffentlich), `evidence` (privat)
3. Passe die Storage-Policies an

### Anzeigenbilder auf ALL-INKL (api/upload.php)
Anzeigen können Bilder direkt hochladen. Die Dateien liegen nicht in der
Datenbank, sondern im Webspace unter `uploads/ads/`; die App speichert nur die
absolute `https://…`-URL in `image_urls`.

1. Ordner `uploads/` und `uploads/ads/` auf dem Webspace anlegen bzw. erhalten.
   `npm run build` kopiert `uploads/ads/.htaccess` nach
   `dist/uploads/ads/.htaccess`; beim Deployment die `.htaccess` aus
   `dist/uploads/ads/` übernehmen. `api/upload.php` legt die Schutzdatei
   zusätzlich selbst an, falls der Ordner erst zur Laufzeit entsteht.
   Hochgeladene Bilder gehören nie ins Build-Artefakt und müssen bei
   Deployments erhalten bleiben (z. B. `uploads/` ausnehmen).
2. Der PHP-Benutzer muss dort schreiben dürfen. Üblich ist:
   ```bash
   chmod 755 uploads uploads/ads
   # Falls der Upload weiterhin scheitert (anderer PHP-Benutzer):
   chmod 775 uploads uploads/ads
   # bzw. Eigentümer auf den PHP/FPM-Benutzer setzen:
   chown -R www-data:www-data uploads uploads/ads
   ```
3. `uploads/ads/.htaccess` muss auf dem Server aktiv sein; der Webspace muss
   `.htaccess`-Overrides erlauben (bei ALL-INKL Standard). Es verbietet
   Skriptausführung, Directory-Listing und setzt
   `X-Content-Type-Options: nosniff`. Prüfe nach dem Deploy:
   `https://…/uploads/ads/test.php` und `…/test.html` müssen 403 liefern,
   ein vorhandenes Bild dagegen 200. Ist die Datei leer oder kein reguläres
   File, bricht `api/upload.php` bewusst mit `upload_unavailable` ab, bis die
   Schutzdatei korrigiert oder gelöscht wurde.
4. PHP muss mindestens 5-MB-Uploads annehmen. Prüfe in der `php.ini`
   (bzw. bei ALL-INKL in den PHP-Einstellungen):
   ```ini
   upload_max_filesize = 6M
   post_max_size = 8M
   ```
5. `APP_URL` in `api/config.php` muss auf die öffentliche `https://`-Domain
   zeigen. `api/upload.php` gibt damit absolute URLs zurück; `api/ads.php`
   akzeptiert aus Sicherheitsgründen nur `https://`-Bildadressen.
6. `api/upload.php` akzeptiert ausschließlich JPEG, PNG und WebP bis 5 MB,
   geprüft über `finfo` und `getimagesize` (kein SVG, keine ausführbaren
   Dateien). Der Dateiname wird serverseitig zufällig erzeugt.
7. Kann der Server nicht schreiben, antwortet der Endpunkt mit
   `Bild-Upload ist auf diesem Server nicht verfügbar. Bitte nutze stattdessen
   eine Bild-URL.` (HTTP 500, `code: upload_unavailable`). Die URL-Eingabe in
   CreateAd bleibt in diesem Fall als Fallback nutzbar.

---

## 3. Deployment-Optionen

### Option A: Vercel (empfohlen)

1. Forke das Repository und verbinde es mit [vercel.com](https://vercel.com)
2. Füge die Umgebungsvariablen hinzu:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Framework: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Klicke auf **Deploy**

Vercel erkennt automatisch Vite-Projekte. Bei jedem Push auf `main` wird automatisch neu deployed.

### Option B: Netlify

1. Verbinde das Repository mit [netlify.com](https://netlify.com)
2. Build-Einstellungen:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Umgebungsvariablen in **Site Settings** → **Environment Variables** eintragen
4. Für SPA-Routing: Erstelle `public/_redirects`:
   ```
   /* /index.html 200
   ```

### Option C: Schulserver / FTP-Hosting

1. Führe lokal `npm run build` aus
2. Lade den kompletten `dist/`-Ordner per FTP auf den Webserver hoch
3. Stelle sicher, dass der Webserver Single Page Application (SPA) Routing unterstützt
4. Bei Apache: Erstelle `.htaccess` im `dist/`-Verzeichnis:
   ```apache
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```
5. Bei Nginx: Füge in der Server-Konfiguration hinzu:
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

---

## 4. Supabase Auth-Konfiguration

### E-Mail-Einstellungen
1. Gehe zu **Authentication** → **Providers** → **Email**
2. Aktiviere „Confirm Email" (empfohlen für Produktion)
3. Passe die E-Mail-Templates unter **Email Templates** auf Deutsch an

### Redirect URLs
1. Gehe zu **Authentication** → **URL Configuration**
2. Füge deine Domain als **Site URL** hinzu: `https://deine-domain.de`
3. Füge zu **Redirect URLs** hinzu:
   - `https://deine-domain.de/**`
   - `http://localhost:5173/**` (für Entwicklung)

### Passwort-Reset
Die App verwendet `window.location.origin + '/update-password'` als Redirect. Stelle sicher, dass diese Route erreichbar ist.

---

## 5. RLS (Row Level Security) prüfen

Alle Tabellen sollten RLS aktiviert haben. Prüfe dies im SQL Editor:

```sql
-- Alle Tabellen ohne RLS anzeigen
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT relname 
  FROM pg_class 
  WHERE relrowsecurity = true
);
```

Falls Tabellen ohne RLS erscheinen, aktiviere sie:
```sql
ALTER TABLE public.tabellenname ENABLE ROW LEVEL SECURITY;
```

---

## 6. Nach dem Deployment prüfen

### Checkliste
- [ ] Landing Page lädt korrekt
- [ ] Registrierung funktioniert (ohne und mit SV-Code)
- [ ] E-Mail-Bestätigung wird versendet
- [ ] Login funktioniert
- [ ] Anzeigen können erstellt werden
- [ ] Feed zeigt Anzeigen korrekt an
- [ ] Admin-Panel ist nur für `sv_admin`-Nutzer zugänglich
- [ ] PWA-Installation funktioniert auf Mobilgeräten
- [ ] Hervorgehobene Anzeigen werden korrekt angezeigt

### Erste Admin-Einrichtung
1. Registriere dich mit deiner E-Mail-Adresse
2. Führe im SQL Editor aus:
   ```sql
   UPDATE public.profiles 
   SET role = 'sv_admin', is_verified = true 
   WHERE id = 'deine-user-id';
   ```
3. Lade die Seite neu → Admin-Panel erscheint in der Navigation

---

## 7. Wartung & Updates

### Neue Migration anwenden
1. Erstelle eine neue `.sql`-Datei im `supabase/`-Verzeichnis
2. Dokumentiere alle Änderungen
3. Teste lokal (falls Supabase CLI verwendet wird)
4. Führe die Migration im Produktions-SQL-Editor aus

### SV-Codes generieren (im laufenden Betrieb)
1. Als `sv_admin` einloggen
2. Admin-Panel → Codes-Tab
3. Einzelne oder Batch-Codes generieren und an neue Schüler verteilen

### Nutzer manuell freischalten
```sql
UPDATE public.profiles 
SET is_verified = true 
WHERE id = 'nutzer-uuid';
```

### Nutzer sperren
```sql
INSERT INTO public.user_bans (user_id, banned_by, reason, ban_type)
VALUES ('nutzer-uuid', 'admin-uuid', 'Grund der Sperrung', 'permanent');
```

---

## 8. Umgebungsvariablen Referenz

| Variable | Pflicht | Beschreibung |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL deines Supabase-Projekts |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Öffentlicher Anon-Key (sicher für Client-seitige Nutzung) |

> **Hinweis**: Der Anon-Key ist durch RLS-Policies gesichert. Er kann sicher im Client-Code verwendet werden – niemals den Service-Role-Key im Client verwenden!

---

## 9. Bekannte Einschränkungen

- **Bildupload**: Direkte Uploads laufen über `api/upload.php` und benötigen einen beschreibbaren `uploads/ads/`-Ordner (siehe oben). Ohne Schreibrechte bleibt die externe Bild-URL der Fallback.
- **Push-Benachrichtigungen**: In-App-Benachrichtigungen sind implementiert. Web-Push erfordert einen VAPID-Key-Setup im Backend.
- **E-Mails**: Alle E-Mails werden über Supabase's eingebauten E-Mail-Provider versendet. Für Produktion wird ein eigener SMTP-Server empfohlen.

---

*Letzte Aktualisierung: Version 2 – Feinschliff-Update*
