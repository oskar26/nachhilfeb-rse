# FIXLIST — Konsistenz-, Bug- & Zugriffs-Runde (24.09.2026)

Quelle: User-Feedback 24.09.2026 (Screenshots: Feed mobil, Eltern-Dashboard, Verknüpfungs-Modal).
Format: Ist-Zustand (File:Line) → Fix → Abnahme.
Architektur-Fakt: Prod-Backend = PHP/MySQL (`api/*.php`). `src/lib/supabase.ts` ist nur eine Bridge.

---

## A. Tab-Leisten & globale Konsistenz

### A1 — Tab-Leisten flickern / Breite springt (Schülercoaching, Matches, Merkliste, Social)
**Ist:** 4 getrennte Implementierungen, keine gemeinsame Quelle:
1. `src/components/ui/Tabs.tsx:39-88` — framer-motion `layoutId="activeTabIndicator"` (globale ID → Teleport/Flackern bei Re-Mounts; nur in `Requests.tsx:96-103` im Einsatz).
2. `src/pages/Social.tsx:80-111` — reines CSS, `flex-1` + `truncate` (Labels schrumpfen → wirkt inkonsistent schmal).
3. `src/pages/coach/CoachPanel.tsx:230-281` — reines CSS, 5 Tabs `flex-1` („Startseiten-Info" ≈ die gemeinte „Startzeiten"-Fläche).
4. `src/pages/Matching.tsx:699-757` — eigene Pill-Leiste (Details in B5). Zudem `layoutId` in `Layout.tsx:246-250` (Nav-Dot) und in den Switch-Thumbs (A3).
**Fix:** Ein gemeinsames `src/components/ui/TabBar.tsx` (Contract: `items: {key,label,count?}[]`, `value`, `onChange`):
- reines CSS, KEINE `layoutId`/`layout`-Animation (das Flackern),
- `w-full grid grid-cols-N` → identische Breite in jedem Zustand; zu lange Labels: horizontales Scrollen der Leiste statt Schrumpf-Truncate,
- Counts als Badge mit fester `min-w` (kein Breitensprung wenn eine Zahl dazukommt),
- `role="tablist"` + `aria-selected`, große Touch-Targets.
Einsetzen in: Social.tsx, CoachPanel.tsx, Matching.tsx, Requests.tsx. `ui/Tabs.tsx` wird zum Wrapper darauf (oder deprecated). Aktiv-Farbe in hell UND dark sichtbar (User: „oben in der Leiste wird keine Farbe angezeigt" — das ist der dunkle Modus, dort brauchbare aktive Fläche wählen).
**Abnahme:** Schnelles Tab-Wechseln → null Breiten-/Positionswechsel der Leiste, kein Flackern; Desktop + Mobil + Dark; Coaching-Panel mit 5 langen Labels sauber.

### A2 — „Verifiziert"-Tag: Stempel-Look → cleanes Pill
**Ist:** `Profile.tsx:420-423` nutzt `.stamp-ring` (`index.css:251-253`) + `-rotate-2` + eckige Kante → Tapatmuster-Stempel. 6 abweichende Inline-Badges: Feed.tsx:861, Matching.tsx:250, PublicProfile.tsx:157, AdDetails.tsx:170, Landing.tsx:401, Profile.tsx.
**Fix:** Ein `src/components/ui/VerifiedPill.tsx` (`size?: sm|md`): `rounded-full`, solide Grüntöne (hell: `bg-green-100 border-green-200 text-green-800`; dark: `bg-green-500/15 border-green-500/30 text-green-400`), `BadgeCheck`-Icon, keine Rotation, kein inset-Ring. `.stamp-ring` bleibt nur für die bewusst gestempelten Elemente (Coaching.tsx:606 „Ehrenamtlich", NotFound.tsx 404, Landing-Demo-Tickets). Einsetzen an allen 6 obigen Stellen.
**Abnahme:** Überall dasselbe Pill; Profil-Karte ohne Stempel-Optik; stilistisch wie die saubere Variante auf AdDetails/PublicProfile.

### A3 — „Öffentlich"-Slider bewegt den Knopf nicht
**Ist:** `Profile.tsx:22-46` + identisch in `Settings.tsx:21-44`: die framer-motion `layout`-Prop auf dem Thumb überschreibt `translate-x-5` (beides schreibt `transform`) → Track wechselt die Farbe, der Knopf bleibt stehen.
**Fix:** Neuer `src/components/ui/Switch.tsx` (reines CSS: Thumb-Punkt via `checked ? translate-x-5 : translate-x-0` + `transition-transform`, keine `layout`-Prop, `role="switch"`, `aria-checked`, Space-Taste toggelt). Ersetzen in Profile.tsx (Kontaktmöglichkeiten 584-593/608-617) und Settings.tsx (alle Switches, u. a. 306-326); den funktionierenden Inline-Switch der Privacy-Demo (Landing.tsx:593-599) danach auf dieselbe Komponente legen.
**Abnahme:** Klick animiert den Knopf weich (hell + dark), Tastatur toggelt, Profile und Settings verhalten sich identisch.

### A4 — Zusätzliche Kontaktmöglichkeiten mit Öffentlich-Flag
**Ist:** `profiles` hat `phone_number`, `email`, `contact_other` (`contact_other` wird gespeichert, aber nirgends gerendert!). Sichtbarkeit nur für `settings.email_visible`/`phone_visible` (`sql/allinkl_schema.sql:38-42`, Whitelist `api/profiles.php:924-936`). `Profile.tsx:74-78` enthält bereits einen ungenutzten Key `contact_links[]`.
**Fix:** Eigene Liste im JSONB: `settings.custom_contacts: [{ id, type, value, is_public }]` (keine DB-Migration nötig).
- UI (Profil-Bearbeiten): Bereich „Weitere Kontakte" — Hinzufügen (Typ: Discord/Instagram/Sonstiges), pro Eintrag Öffentlich-Switch (neues Switch.tsx aus A3) + Löschen. Bestehenden Wert aus `contact_other` migrieren.
- Backend: `api/profiles.php` speichert `settings` eh als JSON — aber das serverseitige Masking in `api/profiles.php:742-753` erweitern: private Einträge werden bei Fremd-Sicht genullt (nicht nur UI-Filter).
- Consumer: `AdDetails.tsx:300-312` und `Requests.tsx:150-166/219-235` rendern öffentliche custom_contacts mit Typ-Icon.
**Abnahme:** Kontakt anlegen, auf privat stellen → Fremd-Account sieht ihn nicht (auch nicht im API-Response); auf öffentlich → sichtbar, u. a. in Anzeige-Details.

---

## B. Feed / Entdecken / Suchen

### B1 — Sortier-Select springt beim Filtern in die Mitte
**Ist:** `Feed.tsx:521-552`: `flex justify-between` mit kind-abhängigen Elementen — Count links, Sort mittig, „Filter zurücksetzen" (543-551) nur wenn `hasActiveFilters` (268-277) → die Positionen hüpfen beim ersten Setzen eines Filters.
**Fix:** Feste Grundstruktur: links Gruppe „Count + zurücksetzen", rechts `ml-auto` das Sort-Select. Der Zurücksetzen-Button bekommt einen stabilen Slot (inclusive-Halterung, Ein-/Ausblenden rein über `AnimatePresence` opacity; keine Breiten-/Positionsänderung der Row). `min-w-0`, Select bleibt immer rechts in derselben Zeile.
**Abnahme:** Sort-Select bleibt bei gleicher X-Position, ob Filter aktiv sind oder nicht; Desktop wie Mobil.

### B2 — „Beliebte Kategorien" echt tracken statt hardcoded
**Ist:** Chips sind hardcoded (`Feed.tsx:490-519`); es gibt kein Klick-Tracking (`src/lib/analytics.ts` kann nur Page-Views).
**Fix:**
1. `sql-updates/011_subject_clicks.sql`: Tabelle `subject_clicks (id BIGINT AUTO_INCREMENT PK, subject VARCHAR(50), created_at DATETIME)` + Index auf subject. README in `sql-updates/README.md` ergänzen.
2. `api/analytics.php`: neues `action=track_category` (POST, subject validieren, gleiche Rate-Limits wie track) und `action=popular_subjects` (öffentlich: Top 8 der letzten 30 Tage).
3. Feed: bei Chip-Klick (Feed.tsx:607) fire-and-forget Track; die „Beliebt:"-Reihe rendert das Top-Ranking vom Endpoint (1 Fetch pro Session, localStorage-Cache 6 h), Fallback = die bisherigen 8 Fächer, wenn leer/Fehler.
4. Rechtstexte: `Datenschutz.tsx` (Abschnitt anonyme Statistik erweitern: anonyme Fächer-Klicks, Zweck „beliebte Kategorien im Feed"), `Cookies.tsx` (Speicher-Tabelle + Beschreibung) und `CookieBanner.tsx` (Copy erwähnt die Messung; informatorischer Charakter der Seite bleibt — kein Consent-Fluss, bewusst).
**Abnahme:** Nach echten Klicks ordnen sich die Chips nach Häufigkeit (kein Stat aus dem Nichts); Rechtstexte erwähnen die Messung; bei leerer DB/Fehler läuft der Feed mit Fallback-Liste.

### B3 — Filter-Panel: schwarze Balken + Ruckeln/Layout-Shift
**Ist:**
- Schwarze Balken = Kategorie-Überschriften als schwarze Pills (`Feed.tsx:600`: `bg-gray-950 text-white px-2 py-1`) über den Fächer-Gruppen — Poster-Ästhetik, fühlt sich im App-UI falsch an.
- Layout-Shift: Panel expandiert mit `height 0→auto` (554-561) und drückt das Grid nach unten; dazu der Reflow aus B1.
**Fix:**
- Kategorie-Titel im normalen UI-Stil: kleine graue Labels (`text-xs font-semibold uppercase tracking-wide text-gray-500`), kein Balken.
- Mobil: Render des Filter-Panels als **Bottom-Sheet** (slide-up, fester Höhe, gleiche visuelle Sprache wie bestehende Modals, `role="dialog"`, Schließen-Button); Desktop: Inline-Expand ohne Grid-Verschiebung (nur opacity/translate; der Feed-Bereich darunter behält seine Höhe).
- „Filter"- und „Merken"-Buttons auf `h-11` (44px) Targets (aktuell h-8), klarer aktiv/inaktiv-Zustand; Details zum Filter-Badge in C3.
**Abnahme:** Keine schwarzen Balken; kein Sprung des Grids beim Öffnen/Schließen; Mobil-Weg: Filter → Sheet; alle Touch-Ziele ≥44px.

### B4 — Suche merken/entmerken + Benachrichtigungen bei Treffern
**Ist:** Ein einziger localStorage-Slot (`Feed.tsx:47`, Save 317-338); Button zeigt „Gemerkt" — Entfernen geht nur über das X im Banner (644-652), nicht am Button; nichts serverseitig, keine Notifications bei neuen Treffern.
**Fix:**
1. „Merken"-Button wird echter Toggle: aktiv → Klick entfernt die gespeicherte Suche (Label/Icon wechseln), klarer Entmerken-Zustand.
2. Server: `sql-updates/010_saved_searches.sql` (id, user_id, query JSON, last_notified_at, UNIQUE(user_id, query_hash) für MVP 1 Suche pro User) + `api/saved_searches.php` (List/Save/Delete, auth-Pflicht).
3. Benachrichtigung: bei erfolgreichem Ad-Veröffentlichen (`api/ads.php`) die gespeicherten Suchen gegen die neue Anzeige matchen (Fach; optional Preis-/Klassen-Filter) → INSERT in bestehende `notifications`-Tabelle (`allinkl_schema.sql:284-296`) beim Suchen-Inhaber; Debounce via `last_notified_at` (max. 1 Notif pro Suche/24 h).
4. Der Feed-Toggle synchronisiert mit der API (localStorage bleibt als Offline-Fallback).
**Abnahme:** Merken an/aus am Button möglich; neue Anzeige mit passendem Fach erzeugt für andere User eine Notification im Bell-Menü; Doppelspeichern eines exakt gleichen Filters verhindert.

### B5 — Matches: „Ich suche/Ich biete" klebt direkt unter der Tab-Leiste
**Ist:** Social-Tab-Leiste (`Social.tsx:81-111`) + direkt darunter die Pill-Bar mit `flex-wrap` (`Matching.tsx:699-757`: „Alle N / Ich suche / Ich biete" + optionaler „Wiederherstellen"-Button → wirkt als zweite Zeile/Leiste, sieht doppelt-pilled aus).
**Fix:** Eine einheitliche Zeile: Filter-Segmente links, „ausgeblendete wiederherstellen" als Textlink rechts (nur wenn n > 0), kein Wrap; mobil: horizontal scrollbar anstatt umgebrochen. Wiederherstellen-Link deutlicher trennen (keine zweite Pill-Bar). Zusätzlich der TabBar-Standard aus A1 innerhalb der Matches-Seite verwenden. (Die Struktur bleibt: zuerst Tab, dann Segmentierung, keine zweite Leistenhülle.)
**Abnahme:** Desktop und Mobil uneingeschränkt eine Zeile; kein Wrap/Umbruch; visuell eine zusammenhängende Matches-Seite statt zweier Leistenbleche.

---

## C. Shell / Nav / Profil

### C1 — „Anmelden"-Button im Header (Desktop + Mobil)
**Ist:** `SiteHeader.tsx` hat GAR KEINEN CTA (Desktop-Cluster 190-229: nur SV-Zeile + Burger; mobiles Sheet 273-300: nur Links). „Jetzt loslegen" existiert nur in den Landing-Sektionen.
**Fix:**
- Desktop: rechts ein schmaler Outline-/Ghost-Button „Anmelden" (→ `/login`, `h-11 px-4`, border `white/20`, klein genug, um nicht mit dem gestalterischen CTA-Landing „Jetzt loslegen" zu kollidieren). Eingeloggte User sehen den Button nicht.
- Mobil: im Sheet unten fix im Daumenbereich (wie in DESIGN.md vorgesehen, Safe-Area einhalten), ebenfalls „Anmelden"; nach Login kein Button.
**Abnahme:** Desktop: Header zeigt durchgehend schmalen Anmelden-Button; Mobil: Button im Sheet; eingeloggt verschwindet er überall.

### C2 — Mobile Mittelknopf (FAB) verbuggt
**Ist:** `Layout.tsx:203-223`: FAB ist ein `<NavLink>` mit framer `whileTap`-Scale und `-mt-6`-Überstand (Tap-Race zwischen Skalierung und Navigation); bei Eltern-Account wird er `null` → Loch in der Nav.
**Fix:** Button statt NavLink (Tap → `navigate('/create-ad')`, keine Motion-Scale in der Tappfad, `press`-Utility für Feedback), Fix-Hit-Target 64px, `aria-label` + sichtbares Label; bei Eltern: FAB gar nicht rendern und die 5 Slots ohne Loch füllen („Eltern" ersetzt die Mittelposition oder saubere 4er-Nav).
**Abnahme:** Tap zuverlässig, kein optisches Zittern; Eltern-Nav ohne Loch; weißer Ring trifft Rand sauber.

### C3 — Mobil fehlt ein sichtbarer „Filter"-Einstieg
**Ist:** Filter/Merken existieren mobil (Feed.tsx:453-473) — aber `h-8`-Buttons, unauffällig; das Konzept „gespeicherte Suche" ist aus Mobil ohne Weg „Filter erstellen + merken".
**Fix:** Feed-Toolbar: 44px-Button „Filter" mit Badge (Anzahl aktiver Filter) → öffnet das B3-Sheet; im Sheet unten CTA „Diese Suche merken" (B4). Desktop-Toolbar bekommt dasselbe Badge. Buttons optisch klarer (Outline-Stattdessen-Ghost).
**Abnahme:** Mobil ist Filter mit 1 Tap erreichbar, Zähler sichtbar; Merken aus dem Sheet heraus möglich.

### C4 — PublicProfile auf Desktop zu schmal
**Ist:** `PublicProfile.tsx:107-112`: `max-w-3xl mx-auto` (768px, enger Streifen).
**Fix:** `max-w-5xl mx-auto`; ab `md`: 2 Spalten — links Bio/Kontakt/Statistik, rechts Verfügbarkeit + Anzeigen (letzte optional sticky). Mobil unverändert einspaltig.
**Abnahme:** Desktop 1440 prägnant breit genutzt ohne engen Mittelfaden; Mobil unverändert sauber.

### C5 — Mobile Profil-Karte (Name/Avatar) unscharf
**Ist-Kandidaten:** `Profile.tsx:248` `backdrop-blur-md` auf der Header-Karte (Offscreen-Raster beim Mobile-Browser), `360-364` Avatar-Wrapper `whileHover scale(1.05)` (permanenter Compositing-Layer), `250` `transition-all duration-700`.
**Fix:** Karte solide füllen (kein backdrop-blur), Avatar-whileHover entfernen, `transition-all` → gezielte Transition. Avatarseite PNG (256px) bleibt; kein weiteres Raster-Zoom.
**Abnahme:** Mobil-Screenshot: Avatar und Name scharf (auch während Öffnen/Animieren).

### C6 — „Wann hast du Zeit?": Samstag + Sonntag 8:00–22:00
**Ist:** Slots laufen nur 13:30–22:00 (`AvailabilityCalendar.tsx:14-25`, `generateSlots()`); Sa/So sind in `DAYS` (5-11) vorhanden, aber read-only-Ansichten filtern leere Tage weg (74-77); Edit-Grid unklar/zu klein (Rows dubios).
**Fix:** `generateSlots()` → 8:00 bis 22:00 in 30-min-Schritten (28 Zellen pro Tag). Edit-Ansicht zeigt fest alle 7 Tage (Desktop: 7 Spalten kompakt; Mobil: horizontales Scrollen mit Sticky-Spalte der Uhrzeit). Spaltenbreite stabil (kein Zappeln zwischen den Ansichten). Read-only behält das Filtern leerer Tage. Help-Text (193) auf 8-22 updaten. Datenformat (availability JSON) bleibt — keine Migration.
**Abnahme:** Neuer Slot unsätzlich; Sa/So im Profil-Edit 8-22 auswählbar und werden auf PublicProfile/Match-Vergleich angezeigt, wenn gesetzt.

---

## D. Eltern-Feature

### D1 — „Verknüpfung bestätigen" → HTTP 500 (Root Cause: fehlende Tabelle)
**Ist:** `api/profiles.php:484-486` prüft Duplikate direkt auf `parent_links` **ohne try/catch**. Die Tabelle ist in Prod höchstwahrscheinlich nicht vorhanden: `sql-updates/001-008` enthält kein einziges Eltern-SQL — nur `sql/allinkl_schema.sql:265-279` (nur wirksam, wenn das Full-Schema importiert wurde). Der INSERT (499-507) mislabeled jede Exception als 409 „bereits verknüpft". Gleicher Bug in `api/admin.php:333-353`.
**Fix:**
1. `sql-updates/009_parent_links.sql` mit `CREATE TABLE IF NOT EXISTS` (Spalten/Keys exakt wie `allinkl_schema.sql:265-279`, utf8mb4) + Eintrag in `sql-updates/README.md` + Hinweis an den User: einmal importieren.
2. Runtime-Auto-Migrate im Parent-Branch (idempotent, Muster wie `api/profiles.php:17-55` für Auto-Migrations).
3. try/catch um den Duplikat-Check; echte 500s als JSON mit klarer Nachricht und `error_log`; 409 nur bei echtem Duplikat.
4. `admin.php` dito absichern.
**Abnahme:** Tabelle importiert/automigriert + Code deployt: „Verknüpfung bestätigen" → Erfolg (Schritt 3), das Kind erscheint im Dashboard; zweiter Versuch → sauberer 409-Fehler, nie 500.

### D2 — Eltern-Dashboard Redesign („gelber Balken rechts", Spacing)
**Ist:** dunkle Header-Karte mit dünnem gelben Streifen (`ParentDashboard.tsx:215`) + großes gelbes CTA rechts oben (218-220) → wirkt wie „gelber Balken rechts", hässlich. Im Flow (`ParentLinkFlow.tsx`) inkonstantes Spacing über die Steps.
**Fix:**
- Header-Karte: kein gelber Deko-Streifen; Icon-Tile bleibt gelb (Brand-Anker), CTA kompakt (`h-11`, `rounded-full`) mit ordentlichem Gap.
- ParentLinkFlow: festes vertikales Raster (gap-4, gleiche Karten-Paddings), fortlaufender Fortschritts-Indicator (z. B. „Schritt 1 von 2" + Dots), gleichbleibende Button-Reihenfolge/Abstände, 2 klar beschriftete Steps (Code → Bestätigen).
**Abnahme:** Desktop + Mobil Screens: kein „gelber Balken rechts", Abstände/Schritte wirken aufgeräumt.

### D3 — Kind-Code: 6 abgerundete Einzelboxen
**Ist:** ein einziges Textfeld mit `tracking-[0.5em]` (`ParentLinkFlow.tsx:252-260`), Mindest-Länge 4.
**Fix:** Neues `src/components/ui/OtpInput.tsx`: 6 eigenständige abgerundete Quadrate (`w-12 h-14 rounded-xl`, je 1 Zeichen zentriert), Auto-Advance, Paste von 6 Zeichen füllt alle, Backspace springt zurück, Auto-Submit bei 6 Zeichen, `inputMode` + uppercase, max 6 Zeichen endgültig. Dasselbe Muster wiederverwenden in `VerifyEmail.tsx:93-99` (auch dort 6-stelliger Code — später ersetzen).
**Abnahme:** 6 Boxen sichtbar; mehr als 6 Zeichen unmöglich; Paste füllt alles; Tastaturbedienung ok.

### D4 — Fehlermeldung unterscheidet Netz vs. sonstige Fehler nicht
**Ist:** Feed/ParentDashboard/Favorites fangen Arbitrary: `.catch(() => setFetchError(true))` und schmeißen den Fehler weg (`Feed.tsx:230-240`, `ParentDashboard.tsx:228-238`, `Favorites.tsx:50-76`); `api.ts:101-110` verpackt generisch.
**Fix:** `src/lib/api.ts` klassifiziert sauber: 403 → „Verifizierung/Zugriff fehlt", 5xx → „Server-Fehler (HTTP 500)", Abort → „Zeitüberschreitung", sonst → Verbindungsproblem. Error-Objekt inkl. Status bis zur Komponente durchreichen; Fehler-Cards zeigen Farbe + konkreten Text + „Erneut versuchen". (D1-D-Fix eliminiert die 500-Fälle, D5 liefert für 403 den richtigen Modal-Weg.)
**Abnahme:** HTTP-500 im Parent-Flow zeigt „Server-Fehler", nicht „Internet prüfen"; 403 (unverified) führt zum D5-Modal.

### D5 — Unverifizierte Accounts & verknüpfungslose Eltern: Zugriffstufe (Datenschutz)
**Ist:** Nur Anzeige-Erstellung ist verifizierungsgeköpft (`CreateAd.tsx:417-434` + `api/ads.php:210-224`); Feed/Requests/Chat/Favorites offen; Route-Guard (`App.tsx:61-102`) prüft nur Auth + Onboarding.
**Fix:**
1. Backend: gemeinsamer Guard `require_verified()` im API-Layer für: ads (list/detail), requests, messages, favorites, review-submit; Ausnahmen: Profil/Settings, Profil-Update, Verify-Email, Parent-Link-Endpunkte, statische Public-Data. Response: 403 mit JSON `code: "not_verified"` (bzw. `"parent_link_required"`).
2. Frontend: neuer `src/components/AccessGuard.tsx` + Weiche in `App.tsx`: erlaubt unverifiziert/ohne Verknüpfung NUR `/profile`, `/settings`, `/login`, `/verify-email`, `/parent-dashboard` (für Eltern), `/welcome` + statische Seiten. Sonst Modal mit genauer Meldung: „Du musst dich erst verifizieren." / für Eltern „Bitte verknüpfen Sie zuerst ein Kind." — ohne Anzeigen-Content/Chat dahinter; Buttons zu Profil & Eltern-Dashboard.
3. AuthContext: `parentLinkReady` via `parentLinks.list()`; SV-Admin bleibt rollout-safe.
**Abnahme:** Frischer unverified Account: Feed/Matches/Chat → Modal (Text genau wie oben), Einstellungen/Profil-Bearbeiten laufen; nach Verifizierung alles offen. Parent ohne verknüpftes Kind: gleiches für Anzeigen/Chat, aber CTA zum Eltern-Dashboard.

### D6 — Eltern sehen die aktuellen Anzeigen der Kinder (statt Fehler)
**Ist:** Umstandsursache D1: fehlende `parent_links`-Tabelle → `GET /profiles.php?action=parent_links` (311-422) respektive Feed wirft generische Internet-Fehler (siehe auch D4).
**Fix:** D1 (Tabelle + Auto-Migrate + Catch) und danach in ParentDashboard pro Kind die aktuellen Anzeigen-Karten sauber laden/lregeln; Feed-Error-Fälle via D4 mit korrektem Text.
**Abnahme:** Verknüpfte Eltern sehen im Dashboard Kind + dessen Anzeigen/Stats; Feed lädt ohne Error-Card.

---

## E. Startseite (Landing)

### E1 — „monatliche Seitenaufrufe" zeigen nichts
**Ist:** Frontend liest `page_views_30d` (`Landing.tsx:269-282`; Anzeige `:425`); Backend liefert es (`api/analytics.php:127-146`), ABER: (a) liegt die `page_analytics`-Tabelle nur vor, wenn `sql-updates/007` importiert wurde (Prod-Status offen), (b) fängt die exception die `$views = 0` (→ „0 Seitenaufrufe") und (c) kann der `ads`-Count (ohne `is_archived`-Spalte) den ganzen Endpoint 500en.
**Fix:**
1. `analytics.php`: Auto-`CREATE TABLE IF NOT EXISTS page_analytics` (Muster wie profiles.php) + fehlertoleranter ads-Count (Spalten-Check statt 500).
2. Landing: eigentliche Zahl anzeigen; bei leerer Tabelle „—" (keine Fake-Zahlen).
3. Label konsistent machen: „Seitenaufrufe (letzte 30 Tage)" — passt exakt zur Query.
**Abnahme:** Landing zeigt eine echte Zahl, ohne Daten sauber „—"; kein 500 mehr durch fehlende Kolonnen.

### E2 — Schwarzes Brett mobil: Scroll-getriebene horizontale Animation
**Ist:** reines CSS scroll-snap horizontal (`index.css:268-283` `.board-phones`), auf Desktop Grid (376-394). Keine Bindung an vertikales Scrollen.
**Fix:** Framer `useScroll({ target: sectionRef })` + `useTransform` → horizontaler `translateX` der Kartenreihe innerhalb einer langen Scroll-Strecke: auf Mobil wird die Sektion hoch (`h-[220vh]`) und der Kartenlauf `sticky`, beim Runterscrollen fahren die Handy-Pins von rechts nach links; ist der Streifen durch, scrollt der Rest normal weiter. Desktop: bleibt 3-spaltig statisch. `useReducedMotion` → statische Variante. Kein Scroll-Listener (useScroll ist rAF-basiert — Design-Regel bleibt).
**Abnahme:** Mobil: beim Runterscrollen gleitet die Kartenreihe horizontal, dann fließt das Scrollen nahtlos weiter; Desktop unverändert; reduced-motion statisch.

---

## F. Tracking & Rechtstexte
Bereitgestellt in B2 (subject_clicks + `popular_subjects` + Datenschutz + Cookies + Banner-Copy).

---

## G. Reihenfolge (Execution-Plan)

1. **Backend zuerst:** D1 (SQL 009 + PHP-Guards/Catches), D4 (Fehler-Klassifizierung in api.ts/PHP), D5-Backend-Guards, E1 (analytics Auto-Migrate). Danach kurz verifizieren (Deploy-Pfad dem User nennen).
2. **Shell-Komponenten:** Switch (A3), VerifiedPill (A2), TabBar (A1), OtpInput (D3).
3. **Seiten-Umbau:** A1 einbauen (CoachPanel, Social, Matching, Requests); A3 einbauen (Profile, Settings, Landing-Inline); A2 an 6 Stellen; B1, B3, B5; C1, C2, C4, C5, C6.
4. **Features:** A4 (eigene Kontakte + Masking), B2 (Klick-Tracking + Rechtstexte), B4 (Gespeicherte Suchen + Notifications), D5-Gate-UI, E2 (Brett-Scroll-Animation).
5. **Copy/Legal** finalisieren (CookieBanner/Datenschutz/Cookies).
6. **Verifikation (begrenzt):** `npx tsc --noEmit`, `vite build`, `detect.mjs --json` über alle geänderten Targets, 1 Playwright-Smoke (Desktop + Mobil), max. 2 Screenshot-Runden; alle Runde-1-Funde gesammelt in einem Batch fixen.

**Bewusst außerhalb des Scopes:** Chat-WhatsApp-Optik (geparkt), `#brett`-PNG-Mockups (User liefert Assets), Welcome-Umbau, mehrere gespeicherte Suchen (MVP: einer pro User).

---

## Umsetzungsstatus (24.09.2026)

Alle Punkte A–E umgesetzt. Verifikation: `npx tsc -b` (echter Check; `tsc --noEmit` im Root ist wegen Solution-Config ein NOP) und `npm run build` clean; `detect.mjs` über die geänderten Ziele: nur ein eigenes Finding (Profile-Trash-Button) – behoben, danach 0; Playwright-Smoke 12/12 PASS (Desktop + Mobil + reduced-motion), inkl. Nachfix der Brett-Animation (Transform lag auf dem Clip-Scroller; neuer `.board-track`). `ui/Tabs.tsx` (layoutId-Flackern) ist mangels Nutzung entfernt.

**Manuelle Schritte für die Inbetriebnahme:**
1. SQL in phpMyAdmin importieren: `sql-updates/009_parent_links.sql`, `sql-updates/010_saved_searches.sql`, `sql-updates/011_subject_clicks.sql` (die PHP-Endpunkte legen die Tabellen zusätzlich per Auto-Migration an – der Import ist die saubere Variante).
2. `api/` auf ALL-INKL hochladen; **neu:** `api/saved_searches.php`.
3. Frontend bauen und `dist/` hochladen (`npm run build`; `dist/api` wird mitkopiert, `db_credentials.php` bewusst nicht).
4. Kurztest: Eltern-Kind verknüpfen (D1), Landing-Label „Seitenaufrufe (letzte 30 Tage)" (E1), eigene Suche merken → neue passende Anzeige erzeugt Glocken-Notification (B4).

Bekannte, gewollte Abweichungen: B2 nutzt einen Memory-Cache pro Session statt `localStorage` (kein zusätzlicher Storage-Eintrag); A4 speichert eigene Kontakte im `settings`-JSON (keine DB-Migration); B4 erlaubt genau eine gemerkte Suche pro Nutzer (ersetzt die vorige).

**Nachtrag (Post-Deploy-Diagnose):** Alle Schreib-Endpunkte liefen in Prod auf HTTP 500. Ursache war `api/response.php: generate_uuid()`: der `vsprintf`-Formatstring hatte 9 `%s`-Platzhalter, `str_split(bin2hex(...), 4)` liefert aber 8 Werte → `ValueError` bei jedem Aufruf (u. a. Eltern-Verknüpfen, Anzeige erstellen, Registrierung, Chat). Behoben in `8f3af46`; verifiziert auf Prod über `api/diag.php` (`probe_insert/probe_bind/probe_exec = ok`). `api/diag.php` ist ein reiner Diagnose-Endpunkt (nur Ja/Nein + Zahlen, keine Inhalte) und kann nach der Fehlersuche wieder gelöscht werden.
