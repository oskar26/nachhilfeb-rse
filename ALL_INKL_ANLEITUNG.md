# 🚀 ALL-INKL.com Deployment- & Einrichtungsanleitung
## FWG Nachhilfebörse – Domain: `nachhilfe-sv.de`

Diese Anleitung führt dich Schritt für Schritt durch die Einrichtung deiner Nachhilfebörse auf deinem **ALL-INKL PrivatPlus** Server – inklusive nativer MySQL-Datenbank und vollautomatischem Push-Deployment via GitHub Actions.

---

## 📑 Übersicht der Schritte

1. [MySQL-Datenbank in ALL-INKL KAS anlegen](#1-mysql-datenbank-anlegen)
2. [Datenbankschema in phpMyAdmin importieren](#2-schema-in-phpmyadmin-importieren)
3. [Datenbank-Passwort konfigurieren](#3-datenbank-zugangsdaten-konfigurieren)
4. [Domain & kostenloses SSL in KAS einrichten](#4-domain--ssl-zertifikat-einrichten)
5. [Automatisches Deployment via GitHub Actions (Immer Pushen)](#5-automatisches-deployment-einrichten)
6. [Alternative: Manueller Upload per FTP/FileZilla](#6-alternative-manueller-ftp-upload)

---

## 1. MySQL-Datenbank anlegen

1. Logge dich in dein **ALL-INKL KAS** (Kundenadministrationssystem) ein: `https://kas.all-inkl.com`
2. Klicke im linken Menü auf **Datenbanken**.
3. Klicke oben rechts auf **Neue Datenbank anlegen**.
4. Trage eine Beschreibung ein, z.B.: `FWG Nachhilfebörse`.
5. Vergib ein sicheres **Passwort** (oder lass eins generieren).
6. Klicke auf **Speichern**.
7. **Wichtig:** Notiere dir die angezeigten Daten:
   * **Datenbankname** (sieht z.B. so aus: `d0123456`)
   * **Nutzername** (meist identisch mit dem Datenbanknamen: `d0123456`)
   * **Passwort** (dein eben vergebenes Passwort)
   * **Server / Host**: Bei ALL-INKL immer `localhost`

---

## 2. Schema in phpMyAdmin importieren

1. Klicke in der Datenbank-Übersicht im KAS ganz rechts neben deiner neuen Datenbank auf das kleine **phpMyAdmin-Icon** (oder öffne phpMyAdmin über den Link in KAS).
2. Melde dich mit deinen Datenbank-Zugangsdaten an.
3. Wähle in der linken Seitenleiste deine Datenbank aus.
4. Klicke oben in der Menüleiste auf **Importieren**.
5. Klicke auf **Datei auswählen** und wähle die Datei:
   ```
   sql/allinkl_schema.sql
   ```
   *(aus diesem Projektordner)*.
6. Scrolle ganz nach unten und klicke auf **Importieren** (oder **OK**).
7. Fertig! Alle 15 Tabellen für Schüler, Anzeigen, Chat, Bewertungen, Support und Admin-Logs sind nun blitzschnell und sauber angelegt.

> ℹ️ **Bereits enthalten:** Das Schema enthält bereits initial freigeschaltete Admin- und Schüler-Codes (u.a. `SV-ADMIN-2026`).

---

## 3. Datenbank-Zugangsdaten konfigurieren

Damit das PHP-Backend auf deinem Server weiß, wie es sich mit der Datenbank verbindet, gibt es zwei Wege:

### Der beste Weg: `db_credentials.php` auf dem Server
Erstelle im Ordner `api/` auf deinem ALL-INKL Server eine kleine Datei namens `db_credentials.php` (diese wird von Git ignoriert und niemals versehentlich überschrieben):

```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'dein_datenbankname');    // z.B. d0123456
define('DB_USER', 'dein_datenbanknutzer');   // z.B. d0123456
define('DB_PASS', 'dein_datenbankpasswort');
define('JWT_SECRET', 'ein-langer-geheimer-zufallstext-fuer-sitzungen-123456');
```

---

## 4. Domain & SSL-Zertifikat einrichten

1. Klicke im KAS links auf **Domain**.
2. Suche deine Domain `nachhilfe-sv.de` und klicke rechts auf das **Bearbeiten-Icon (Stift)**.
3. **Ziel / Pfad:** Trage einen eigenen Unterordner ein, z.B.:
   ```
   /nachhilfe-sv/
   ```
   *(So bleibt dein Webspace sauber organisiert).*
4. **SSL-Schutz:**
   * Klicke auf den Reiter **SSL-Schutz** (oder den Button *SSL schützen*).
   * Wähle **Let's Encrypt** (kostenlos).
   * Setze den Haken bei **SSL erzwingen (Weiterleitung auf https://)**.
   * Klicke auf **Zertifikat beziehen**.

---

## 5. Automatisches Deployment einrichten

Damit ich (oder du) einfach jederzeit `git push origin main` ausführen können und die Seite innerhalb von 30 Sekunden live ist:

### Schritt 5.1: Separaten FTP-Nutzer in KAS anlegen
1. Klicke im KAS links auf **FTP**.
2. Klicke auf **Neuen Benutzer anlegen**.
3. **Benutzername:** z.B. `f0123456_deploy`
4. **Passwort:** Ein sicheres Passwort vergeben und notieren.
5. **Heimatverzeichnis:** Klicke auf das Ordnersymbol und wähle **genau den Zielordner deiner Domain** aus:
   ```
   /nachhilfe-sv/
   ```
   *(Dadurch landet der FTP-Nutzer direkt im Web-Root der Domain).*
6. Klicke auf **Speichern**.

### Schritt 5.2: GitHub Secrets hinterlegen
Gehe in deinem GitHub-Repository (`oskar26/nachhilfeb-rse`) auf:
* **Settings** → **Secrets and variables** → **Actions**
* Klicke auf **New repository secret** und erstelle folgende 4 Secrets:

| Secret Name | Wert / Beispiel |
|---|---|
| `FTP_SERVER` | Dein Server-Name aus KAS (z.B. `w0123456.kasserver.com` oder `nachhilfe-sv.de`) |
| `FTP_USERNAME` | Der angelegte FTP-Nutzer (z.B. `f0123456_deploy`) |
| `FTP_PASSWORD` | Das vergebene FTP-Passwort |
| `FTP_SERVER_DIR` | `/` |

### Schritt 5.3: Fertig!
Ab jetzt läuft alles automatisch:
Sobald ein Commit auf `main` gepusht wird, startet die GitHub Action `.github/workflows/deploy-allinkl.yml`, baut das Vite-Frontend mit dem PHP-Backend und synchronisiert alles via verschlüsseltem FTPS direkt auf deinen Server!

---

## 6. Alternative: Manueller FTP-Upload

Falls du es einmalig sofort testen möchtest oder kein GitHub Actions nutzen willst:
1. Führe lokal im Projektverzeichnis aus:
   ```bash
   npm run build
   ```
2. Öffne ein FTP-Programm deiner Wahl (z.B. [FileZilla](https://filezilla-project.org/)).
3. Verbinde dich mit deinen ALL-INKL FTP-Daten.
4. Navigiere in das Verzeichnis `/nachhilfe-sv/`.
5. Lade **den gesamten Inhalt** des lokalen Ordners `dist/` hoch (inklusive `.htaccess`, `api/`, `assets/`, `index.html`).

---

## 🔑 Erste Schritte nach dem Upload

1. Rufe deine Website auf: `https://nachhilfe-sv.de`
2. Klicke auf **Registrieren**.
3. Gib deine Daten ein und nutze im Feld **SV-Code**:
   ```
   SV-ADMIN-2026
   ```
4. Klicke auf **Registrieren** → Du bist sofort als **SV-Admin** freigeschaltet und hast Zugriff auf das vollständige Admin-Panel!
