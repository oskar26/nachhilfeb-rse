# SQL-Updates hochladen – Anleitung (phpMyAdmin, ALL-INKL)

Dieser Ordner enthält kleine SQL-Dateien für Änderungen **nach** dem ersten
Import von `sql/allinkl_schema.sql`. Alle Dateien sind **mehrfach ausführbar**
und löschen keine Daten.

## Dateien in der richtigen Reihenfolge

| Nr. | Datei | Was macht sie? |
|-----|-------|----------------|
| 001 | `001_ads_session_format_viewcount.sql` | Neue Spalten `session_format` (Einzel/Kleingruppe/Egal) + `view_count` (Aufrufe) in `ads` |
| 002 | `002_ad_views.sql` | Neue Tabelle `ad_views` (anonyme Aufruf-Zählung pro Anzeige, ohne IP) |
| 003 | `003_coaching_tables.sql` | Stellt Coaching-Tabellen sicher (`promo_codes`, `promo_redemptions`, `admin_audit_log`, `app_settings`), entfernt alte Beispiel-Codes aus dem Git-Verlauf |
| 004 | `004_filter_reports.sql` | Neue Tabelle `filter_overrides` (Filter-Training: freigegebene/geblockte Wörter) + sicherer Umgang mit der `reports`-Tabelle (inkl. evtl. `severity`-Spalte) |
| 005 | `005_email_verification.sql` | Neue Tabelle `email_verifications` (6-stelliger Verifizierungs-Code, Bcrypt-Hash, 30 Min. gültig) |
| 006 | `006_invite_codes_max_uses.sql` | Neue Spalten `max_uses` + `current_uses` in `invite_codes` (Codes 1x/2x/5x/10x oder unbegrenzt einlösbar) |
| 007 | `007_page_analytics.sql` | Neue Tabelle `page_analytics` (Seitenaufrufe-Statistik fürs Dashboard, cookiefrei, keine IPs) |
| 008 | `008_app_settings.sql` | Stellt `app_settings` sicher (Coach-Info-Box + Coaching-Seiten-Inhalte als JSON) |
| 009 | `009_parent_links.sql` | Neue Tabelle `parent_links` (Eltern-Kind-Verknüpfung; fehlte in 001-008 → 500 beim Verknüpfen) |
| 010 | `010_saved_searches.sql` | Neue Tabelle `saved_searches` (gemerkte Feed-Suchen + Benachrichtigung bei neuen Treffern) |
| 011 | `011_subject_clicks.sql` | Neue Tabelle `subject_clicks` (anonyme Fächer-Klicks für „Beliebte Kategorien") |

## So geht's (dauert ca. 2 Minuten)

1. **Einloggen:** ALL-INKL-KAS → **Datenbanken** → bei eurer Datenbank auf **phpMyAdmin** klicken (oder direkt über die phpMyAdmin-Adresse aus der KAS-Datenbankübersicht).
2. **Datenbank wählen:** Links in der Liste eure Datenbank anklicken (Name steht in `api/db_credentials.php` bzw. als `DB_NAME`-Umgebungsvariable).
3. **Importieren:** Oben auf den Reiter **„Importieren"** klicken → **„Datei auswählen"** → die Datei `001_...sql` von eurem Rechner wählen → ganz unten auf **„OK"** klicken.
4. **Erfolgsmeldung** abwarten („Import wurde erfolgreich abgeschlossen") → Schritte 3–4 für `002_...sql` bis `011_...sql` wiederholen.
5. **Prüfen (optional):** Links auf die Tabelle `ads` → Reiter **„Struktur"** → dort müssen `session_format` und `view_count` auftauchen.

## Falls etwas rot wird

- **„Tabelle existiert bereits" / „Duplicate column"**: Harmlos – Datei einfach erneut bzw. die nächste Datei importieren. Alle Befehle prüfen vorher, ob das Ziel schon existiert.
- **„Unknown database"**: Ihr seid in der falschen Datenbank (Schritt 2 prüfen).
- **„Access denied / CREATE command denied"**: Der DB-Nutzer darf keine Tabellen anlegen – dann im KAS dem Nutzer alle Rechte auf die Datenbank geben und erneut importieren.
