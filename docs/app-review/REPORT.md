# App-UX-Review — FWG Nachhilfebörse (Schritt 6)

Branch `app-ux-review` · Worktree `../nachhilfev2-app-ux-review` · Basis `136850e` · Stand 16.11.2026
Nur App-Oberflächen; Marketing-Website, Auth-Logik, Zahlungen, Berechtigungen, Datenmodelle, API-Verträge und Datenbank unverändert.

## Executive Summary

1. **Die Karten waren auf dem Handy kaputt, nicht die Daten.** Preisblock und Metadaten kämpften um dieselbe Zeile; Klasse/Pillen brachen mitten im Wort. Metadaten haben jetzt eine eigene volle Zeile, Titel in der Anzeige die volle Breite.
2. **Die Typografie ließ Wörter zusammenkleben.** Plus Jakarta Sans setzt das Leerzeichen mit ~0,15 em; „Willkommen zurück“ las sich als ein Wort. Ein skaliertes `word-spacing` behebt das app-weit, ohne Copy anzufassen.
3. **Die App hatte drei Avatar-Sprachen.** Karten nutzten farbige Initialen, Profil und öffentliches Profil graue Platzhalter. Jetzt überall dieselbe runde, farbige Initiale.
4. **Rollen-Zugänge waren Sackgassen.** „Zugriff verweigert“ war roter Text ohne Weg zurück; der Verifizierungs-Gate hatte ein graues Icon und keinen Hilfelink. Beide sind jetzt erklärende Zustände mit primärer und sekundärer Aktion.
5. **Die größten offenen Themen sind Struktur, nicht Kosmetik:** mobile Shell ohne Wortmarke (L-1), fehlendes Verifizierungsmerkmal auf Karten (L-2), vier Social-Tabs als zweite Navigationsebene (L-3). Diese brauchen eine Produktentscheidung.

## Findings

| ID | Bereich | Schwere | Bucket | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| F-001 | Typografie: Wortabstand zu eng | hoch | Small | Done | 19ae1f8 |
| F-002 | Feed-Karte: Metazeile bricht mitten im Pill | hoch | Medium | Done | 3602cd6 |
| F-003 | Anzeige: Titel auf 244 px eingeengt | hoch | Medium | Done | 3602cd6 |
| F-004 | Bottom-Nav: Inhalt scheint durch | mittel | Small | Done | 19ae1f8 |
| F-005 | Profil: grauer Platzhalter, zwei Avatar-Buttons | mittel | Medium | Done | 6306ec8 |
| F-006 | Profil-Banner gelb→blau gewaschen | niedrig | Small | Done | 6306ec8 |
| F-007 | Coach-Zugriff: nackte Fehlermeldung ohne Aktion | mittel | Small | Done | 15a240e |
| F-008 | Merkliste: Anzeigentitel statt Person, doppelte Pills | mittel | Medium | Done | fc9c28e |
| F-009 | Gate: graues Icon-Quadrat, kein Hilfelink | mittel | Small | Done | 15a240e |
| F-010 | Coach-Liste: „Klasse Q1a“, „1 aktive Coaches“ | mittel | Small | Done | 15a240e |
| F-011 | Coach-Suche: Platzhalter abgeschnitten | niedrig | Small | Done | 15a240e |
| F-012 | /matches und /favorites hießen „Social“ mit falschem Untertitel | mittel | Small | Done | fc9c28e |
| F-013 | Neue Anzeige: „Entwurf verwerfen“ vor dem Formular, früher „Noch offen“-Hinweis | mittel | Medium | Skipped | – |
| F-014 | Login: aktiver Tab nur graue Fläche | niedrig | Small | Done | 1cda676 |
| F-015 | Chat-Fläche beige/oliv außerhalb der Palette | mittel | Small | Done | 19ae1f8 |
| F-016 | Öffentliches Profil: „Klasse Q1“, eckiger Avatar | mittel | Small | Done | 6306ec8 |
| F-017 | News-Popup: 56-px-Icon-Kachel über H2 (Detector) | niedrig | Small | Skipped | – |
| F-018 | Mobile Shell ohne Wortmarke | hoch | Large | Proposed (L-1) | – |
| F-019 | Kein Verifizierungsmerkmal auf Karten/Anzeige | hoch | Large | Proposed (L-2) | – |
| F-020 | Social-Hub: vier Tabs + Typ-Pills | mittel | Large | Proposed (L-3) | – |
| F-021 | Admin mobil: Tabs/ Tabellen unter Bottom-Nav | mittel | Large | Proposed (L-5) | – |
| F-022 | Stepper-Labels kollidieren bei 343 px | mittel | Large | Proposed (L-6) | – |

Skipped-Begründung: F-013 berührt den Entwurfs-Lebenszyklus (Autosave, Verwerfen) und wurde kurz vor Abschluss nicht mehr angefasst, um Datenverlust auszuschließen; als Vorschlag in L-6 beschrieben. F-017 ist eine Detector-Empfehlung ohne Nutzerproblem; Änderung am News-Popup hätte die Mock-Datenanzeige verändert und wurde bewusst offen gelassen.

## Umgesetzt (vorher → nachher)

**Typografie** (`src/index.css`): globales `word-spacing: 0.085em` pro Element. Vorher 5,75 px Leerraum bei 28 px (0,20 em), jetzt 6,7 px; „Willkommen zurück“, „bevorzugten Design-Modus“ und „Kontakt läuft“ lesen wieder als Wortgruppen.

**Bottom-Nav** (`Layout.tsx`): Gradient mit 55 % Deckkraft → `bg-card/95` plus Blur. Inhalte scheinen nicht mehr durch die Pille.

**Chat-Fläche** (`chat-theme.module.css`): Beige #faf7ee und Olive-Doodles → kühles #f3f5f8 mit grauen Doodles; Header/Composer auf Kartenweiß; Schatten entfärbt.

**Feed-Karte** (`Feed.tsx`): Preis rechts, Name+Stufe links, Typ/Klasse/Boost in eigener voller Zeile; `whitespace-nowrap` gegen Brüche im Pill.

**Anzeige** (`AdDetails.tsx`): Titel volle Breite; Preis mobil als eine Zeile („12 € / 60 Min ≈ 12 €/h“), Desktop unverändert rechts.

**Profil / öffentliches Profil**: farbige Initialen statt grauer Platzhalter, ein Bearbeiten-Affordance statt zwei, gelber Banner, „Stufe Q1“ statt „Klasse Q1“.

**Zugänge**: Verifizierungs-Gate mit gelbem Icon-Kreis, H1, CTA und sekundärem Hilfelink; Coach-Sperre mit Icon, Erklärung und „Zurück zur Übersicht“.

**Rollen-Texte**: „1 aktiver Coach“ / „n Coaches“, „Stufe Q1“ statt „Klasse Q1a“, kürzerer Suchplatzhalter.

**Social**: eigene H1 und Untertitel für Anfragen, Vorschläge, Merkliste; Merkliste führt mit Person, Typ und Stufe, ohne doppelte Pills.

**Login**: aktiver Tab als weiße Karte mit Ring und Semibold statt grauer Fläche.

## Impeccable-Command-Log (Schritte 1–20)

| # | Schritt | Aufruf / Ziel | Status | Ergebnis | Commit |
| --- | --- | --- | --- | --- | --- |
| 1 | init | Produktkontext geprüft (`PRODUCT.md`) | N/A | Produktdatei aktuell, keine Neuanlage | – |
| 2 | document | `impeccable context`, Token-Scan, `DESIGN.md` + `.impeccable/design.json` | Done | Designsystem aus Code neu geschrieben (gitignored) | – |
| 3 | critique | Kernseiten 375/768/1280 | Done | `critiques/core-screens.md` | – |
| 4 | audit | A11y/Responsive/Tastatur-Stichproben, DOM-Messungen | Done | Befunde F-001–F-016 | – |
| 5 | detect | `npx impeccable detect src`; `detect http://localhost:5173/#/welcome` und `#/login` | Done | src: 0 Anti-Patterns, 48 Advisories; welcome: 4, login: 1 (Exit 2) | – |
| 6 | shape | Kein Umbau vor den Fixes nötig | N/A | Große Umbauten als L-1–L-6 dokumentiert | – |
| 7 | clarify | `Social.tsx`, `Favorites.tsx`, `Login.tsx`, `CoachPanel.tsx` | Done | F-008, F-010, F-011, F-012, F-014 | fc9c28e, 1cda676, 15a240e |
| 8 | distill | – | N/A | Keine Überladung, die Entfernen rechtfertigt | – |
| 9 | layout | `Feed.tsx`, `AdDetails.tsx` | Done | F-002, F-003 | 3602cd6 |
| 10 | typeset | `src/index.css` | Done | F-001 | 19ae1f8 |
| 11 | colorize | `Profile.tsx`, `PublicProfile.tsx` | Done | F-005, F-006, F-016 | 6306ec8 |
| 12 | quieter | – | N/A | Keine als zu laut bewertete Fläche | – |
| 13 | onboard | `AccessGuard.tsx` | Done | F-009 | 15a240e |
| 14 | harden | `CoachPanel.tsx`, `AccessGuard.tsx` | Done | F-007, F-010 | 15a240e |
| 15 | adapt | Alle 26 Routen bei 375, 768, 1280 | Done | 90 Screenshots, Rollen-Captures für SV/Coach/unverifiziert | – |
| 16 | animate | – | N/A | Keine neuen Bewegungen; bestehende 150-ms-Transitionen bleiben | – |
| 17 | optimize | – | N/A | Keine messbare Ursache in diesem Durchgang | – |
| 18 | extract | – | N/A | Keine neue Duplizierung durch die Fixes | – |
| 19 | polish | Alle geänderten Screens neu aufgenommen | Done | Keine Regressionen; Screenshots in `screens/` | 19ae1f8–1cda676 |
| 20 | audit + detect erneut | `detect src` und `detect #/login` | Done | src 0 Anti-Patterns/45 Advisories; URL 1 offener Hinweis (News-Popup) | – |

## Qualitätsstand

| Prüfung | Vorher (136850e) | Nachher |
| --- | --- | --- |
| `npx tsc -b` | sauber | sauber |
| `npm test` | 20 Dateien, 206 Tests | 20 Dateien, 206 Tests |
| `npm run lint` | 0 Fehler, 169 Warnungen | 0 Fehler, 169 Warnungen |
| `npx impeccable detect src` | 0 Anti-Patterns | 0 Anti-Patterns |
| `npx impeccable detect <URL>` | 4 (welcome), 1 (login) | 1 (login, News-Popup) |

## So startest du die geänderte App

1. Demo-API: `cd /tmp/opencode/fwg-ux-mock && node server.mjs` (Port 8099, reine Demodaten).
2. App: `cd ../nachhilfev2-app-ux-review && VITE_API_URL=http://localhost:8099 npx vite --port 5173`.
3. Login: `lena@demo.local / demo1234` (verifiziert), `tim@demo.local` (unverifiziert), `sv@demo.local`, `coach@demo.local`.
4. Screenshots: `node /tmp/opencode/fwg-ux-mock/capture.mjs` bzw. `capture-users.mjs`.

## Offene Fragen

- Soll die mobile Kopfzeile die Wortmarke zurückbekommen (L-1) oder reicht der Seitenkontext?
- Ist Verifizierung auf Karten ein Muss für Elternvertrauen (L-2) oder bewusst nur im Profil?
- Bleiben vier Social-Einstiege, oder wird daraus eine Übersicht (L-3)?
- Dürfen Demo-/Seed-Daten dauerhaft im Repo liegen, damit Reviews reproduzierbar sind?

## Nächster Fokus

L-1 und L-2 zuerst: Sie zahlen direkt auf Wiedererkennen und Vertrauen ein. Danach L-6 (Erstellfluss) und L-5 (Admin mobil), weil dort die meisten Fehlbedienungen entstehen.
