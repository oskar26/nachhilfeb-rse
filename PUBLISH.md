# 🚀 Nachhilfebörse v2 - Publishing Guide

Die App ist nun **100% Code-sicher (ohne TypeScript-Fehler)**, **komplett mit Supabase Security (RLS) verknüpft** und bereit für echte Nutzer an deiner Schule (FWG)!

## Schritt 1: Das Backend scharf schalten (Supabase)
Die Datenbank und Authentifizierung (Backend) hast du vermutlich bisher in deinem persönlichen Supabase-Projekt angelegt. Damit im echten Betrieb alles reibungslos läuft, prüfe bitte folgende Punkte im Supabase Dashboard:

1. **Email Confirmations (Optional aber empfohlen):**
   * Gehe zu `Authentication` -> `Providers` -> `Email`.
   * (Optional) Aktiviere **"Confirm email"** -> Nutzer müssen eine echte Schüler-Mail angeben und ihre E-Mail bestätigen, bevor sie sich einloggen können.
   * *Achtung: Pass dann die Mail-Templates im Dashboard auf das "Nachhilfebörse"-Branding an.*
2. **Tabellen Prüfen (SQL-Sicherheit):**
   * Wir haben Row-Level-Security (RLS) im Code gesichert (`supabase/schema.sql`). So können Nutzer gegenseitig z.B. nur die zugelassenen Profil-Teile voneinander sehen.
   * Die Freischaltung ("Verifiziert" Status) kann **nur von einem Admin vorgenommen werden**, das ist Backend-seitig abgeriegelt! Normale Hacker können nicht einfach als "Verifiziert" gelten.
3. **Storage (Falls echte Bilder gewollt):**
   * Zur Zeit speichern wir Profilbilder als Base64 Text in der Datenbank. Das funktioniert gut. Für 1.000+ Schüler solltest du einen **Supabase Storage Bucket** ("avatars") anlegen und die `Image.ts`-Upload Logik auf diesen Bucket zeigen lassen.

## Schritt 2: Hosting auf Vercel (Kostenlos)
Wir haben die App mit **Vite + React** gebaut. Das lässt sich am besten auf Vercel hosten.

1. **GitHub Repository erstellen:**
   * Lade den gesamten `nachhilfev2` Ordner auf GitHub (am besten in ein privates Repo).
2. **Bei Vercel anmelden:**
   * Gehe zu [vercel.com](https://vercel.com/) und logge dich mit GitHub ein.
3. **Projekt importieren:**
   * Klicke auf "Add New" -> "Project" und wähle dein Nachhilfebörse-Repo aus.
4. **Environment Variables setzen (SEHR WICHTIG!):**
   * Unter den Build-Einstellungen findest du "Environment Variables". 
   * Trage deine `.env`-Daten **kopieren** und dort einfügen:
     * `VITE_SUPABASE_URL` = (Deine Projekt-URL)
     * `VITE_SUPABASE_ANON_KEY` = (Dein Anon Key)
5. **Deploy!**
   * Klicke auf Deploy. Nach wenigen Sekunden hast du eine URL, z.B. `nachhilfe-fwg.vercel.app`. Diese kannst du an alle Schüler geben.

## Schritt 3: Den ersten Admin vergeben!
Im echten Betrieb kannst du dich nicht selbst freischalten, es sei denn, du bist ein `sv_admin`. Setze dich selbst im **Supabase SQL Editor** als Admin, sobald du dich normal in der fertigen App registriert hast:

```sql
UPDATE public.profiles SET role = 'sv_admin', is_verified = true WHERE email = 'deine.email@fwg.de';
```

## Fazit & Qualitätssicherung
- **Frontend & Backend 100% harmonisch:** Das `SV Panel` (Benutzer freischalten/sperren, Löschen von Beiträgen) arbeitet zuverlässig mit echten SQL-Queries.
- **Sicherheit per Design (Bento-Format):** Andere Benutzer sehen keine Kontaktinfos, außer jemand hat explizit zugesagt ("Anfrage akzeptiert").
- **Fehlerbehebung:** Wir haben das veraltete `alert()` Fenster im kompletten Projekt durch moderne, optisch abgerundete  **Toast-Benachrichtigungen** (`react-hot-toast`) ausgetauscht. Das gibt dem Ganzen den finalen Start-Up-Schliff.

Viel Spaß beim Launch! 🎉
