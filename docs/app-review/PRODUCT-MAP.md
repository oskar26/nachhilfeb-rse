# PRODUCT-MAP — FWG Nachhilfebörse

Stand: 16.11.2026 · Branch `app-ux-review` · Basis-Commit `136850e`

## Zweck in einem Satz

Die schulinterne Nachhilfebörse des FWG Köln bringt Schüler:innen, die Nachhilfe suchen, mit älteren Schüler:innen zusammen, die sie geben — verifiziert, von der SV moderiert, ohne kommerziellen Marktplatz.

## Rollen und Ziele

| Rolle | Wer | Ziel | Wichtigste Oberfläche |
| --- | --- | --- | --- |
| Suchende:r | Klasse 5–7, Klausurvorbereitung | Schnell passende Anzeige finden, Kontakt aufnehmen, Termin abstimmen | Entdecken (`/`), Anzeige (`/ad/:id`), Anfragen/Chat |
| Bietende:r | ab Klasse 8, Coaching-AG | Anzeige erstellen, Anfragen beantworten, Termine und Lernfortschritt dokumentieren | Neue Anzeige, Anfragen, Chat, Profil |
| Eltern | gemeinsames Kinderkonto | Überblick, Sicherheit, seriöse Regeln, Datenschutz | Willkommen, Eltern-Leitfaden, Coaching, Transparenz |
| Coaching-Leitung | coach_admin | Coaches verwalten, Codes vergeben, Coaching-Seite pflegen, Protokoll | Coaching Panel (`/coach-panel`) |
| SV | sv_admin | Verifizieren, moderieren, melden, Nutzer verwalten, Statistiken | SV-Bereich (`/sv-panel`) |

Eine Person kann suchen und bieten. Es gibt kein separates Elternkonto.

## Screen-Inventar

### Öffentlich (ohne Login)

| Route | Screen | Zeigt | Erreichbar über |
| --- | --- | --- | --- |
| `/welcome` | Willkommen | Hero, Zielgruppen, Vertrauenspunkte, CTA Registrieren/Anmelden | Direktaufruf, Logo, „Willkommen“ |
| `/landing` | Landing | identische Marketing-Fläche (Alias) | Direktaufruf |
| `/login` | Anmelden/Registrieren | Tabs, E-Mail/Passwort, Registrierung mit Einladungscode | Willkommen-CTA, Redirect bei fehlendem Login |
| `/verify-email` | E-Mail bestätigen | 6-stelliger Code, erneut senden | Nach Registrierung |
| `/update-password` | Passwort neu setzen | Neues Passwort, Token aus Link | E-Mail-Link |
| `/impressum` | Impressum | Rechtliches | Footer/Willkommen |
| `/datenschutz` | Datenschutz | Rechtliches | Footer/Willkommen |
| `/cookies` | Cookies | Rechtliches | Footer/Willkommen |
| `/nutzungsbedingungen` | Nutzungsbedingungen | Rechtliches | Footer/Willkommen |
| `/eltern-leitfaden` | Eltern-Leitfaden | Ablauf, Sicherheit, gemeinsame Kontonutzung | Willkommen, Infos-Leiste |
| `/coaching` | Coaching-AG | Regeln, Abzeichen, Anmeldung, Poster | Willkommen, Infos-Leiste, Coach-Badge |
| `/transparenz` | Transparenz | Statistik/Moderation ohne Tracker | Footer/Willkommen |
| `*` | Nicht gefunden | Fehlerseite mit Weg zurück | Fehlbedienung |

### Angemeldet (App-Shell mit Sidebar/ Bottom-Nav)

| Route | Screen | Zeigt | Erreichbar über |
| --- | --- | --- | --- |
| `/` | Entdecken (Feed) | Info-Leiste, Suche, Fach-Chips, Filter, Sortierung, Anzeigenkarten | Start, Bottom-Nav „Entdecken“ |
| `/create-ad` | Neue Anzeige | 6-Schritt-Stepper (Typ/Titel, Fächer, Klassen, Ort/Zeit, Preis, Vorschau), Entwurf | Sidebar, Bottom-Nav „+“ |
| `/ad/:id` | Anzeige | Titel, Preis, Fächer, Beschreibung, Person, Verfügbarkeit, Merken/Teilen/Anfragen | Feed, Merkliste, Profil |
| `/requests` | Social · Anfragen | Tabs, eingehende/ausgehende Anfragen, Status, Chat öffnen, bewerten | Sidebar „Anfragen“, Bottom-Nav „Social“ |
| `/social` | Social · Alle | Anfragen, Vorschläge, Merkliste in einer Ansicht | Bottom-Nav „Social“ |
| `/matches` | Social · Vorschläge | berechnete Passungen mit Begründung | Sidebar „Vorschläge“ |
| `/favorites` | Social · Merkliste | gemerkte Anzeigen | Sidebar „Merkliste“ |
| `/chats` | Chats | suchbare Unterhaltungsliste, ungelesen, Zeit | Sidebar „Chats“, Anfragen-Header |
| `/chat/:requestId` | Chat | Nachrichten, Termin-Nachrichten, Blockieren/Melden, Composer | Chats, Anfragen, Anzeige |
| `/profile` | Profil | Identitätskarte, persönliche Angaben, Fächer, Verfügbarkeit, Avatar, eigene Anzeigen | Sidebar, Bottom-Nav „Profil“ |
| `/profile/:id` | Öffentliches Profil | Profil, Anzeigen, Bewertungen, Kontakt | Name/Avatar in Karten, Chat |
| `/settings` | Einstellungen | Erscheinungsbild, Benachrichtigungen, Neuigkeiten, Privatsphäre, Blockliste, Konto, Datenexport, Passwort | Sidebar, Bottom-Nav „Optionen“ |
| `/coach-panel` | Coaching Panel | Hero, Schülerliste, Coaching-Codes, Startseiten-Info, Protokoll, Seiteneditor | Sidebar (nur coach_admin) |
| `/sv-panel` | SV-Bereich | Admin-Shell mit Tabs | Sidebar (nur sv_admin) |

### SV-Bereich (Tabs unter `/sv-panel`)

| Tab | Zeigt |
| --- | --- |
| Übersicht | Kennzahlen (Nutzer, Anzeigen, Meldungen, gesperrt), Seitenaufrufe 7 Tage, letzte Meldungen, neue Nutzer |
| Support & Feedback | Tickets, Verlauf, Antworten, Status |
| Nutzer | Suche/Filter, Rollen, verifizieren, sperren, löschen |
| Anzeigen | alle Anzeigen, aktiv/inaktiv, melden/entfernen |
| News / Infos | Neuigkeiten anlegen, anpinnen, löschen |
| Meldungen | Reports, Verlauf, entscheiden |
| Mehr | Codes & Verifikation, Audit & Coaching, Analytics, Chat |
| Codes & Verifikation | Einladungs-/Coaching-/Promo-Codes erzeugen, einlösen, entziehen |
| Audit & Coaching | Audit-Log, Coach-Zuordnung |
| Analytics | Aufrufe, Geräte, Stunden, Tage, Fächer |
| Chat | SV-Chatübersicht |

## Kern-Flows mit Schrittzahl

| Flow | Schritte (Tap/Klick) | Beteiligte Screens |
| --- | --- | --- |
| Registrieren + verifizieren | 1 Willkommen → 2 Registrieren → 3 Formular → 4 Code per E-Mail → 5 bestätigen → 6 Profil-Onboarding → 7 Verifikation im SV-Raum (offline) | `/welcome`, `/login`, `/verify-email`, `/profile` |
| Anzeige finden | 1 Entdecken → 2 Fach-Chip oder Suche → 3 Filter (optional) → 4 Karte → 5 Anzeige | `/`, `/ad/:id` |
| Anfrage senden | 1 Anzeige → 2 „Anfrage senden“ → 3 Nachricht → 4 senden → 5 Anfragen | `/ad/:id`, `/requests` |
| Anfrage annehmen + chatten | 1 Anfragen → 2 Anfrage → 3 annehmen → 4 Chat öffnen → 5 Nachricht senden | `/requests`, `/chat/:requestId` |
| Termin abstimmen | 1 Chat → 2 Termin-Nachricht → 3 Datum/Uhrzeit → 4 ICS herunterladen | `/chat/:requestId` |
| Anzeige erstellen | 1 „+“ → 2 Typ/Titel → 3 Fächer → 4 Klassen → 5 Ort/Zeit → 6 Preis → 7 Vorschau → 8 veröffentlichen | `/create-ad` |
| Merken | 1 Karte → 2 Herz → 3 Merkliste | `/`, `/favorites` |
| Bewerten | 1 Anfrage abgeschlossen → 2 „Bewerten“ → 3 Sterne + Text → 4 senden | `/requests`, Dialog |
| Melden | 1 Anzeige/Profil/Chat → 2 Menü → 3 „Melden“ → 4 Grund → 5 senden | Dialog, `/sv-panel` Meldungen |
| SV verifiziert | 1 SV-Bereich → 2 Nutzer → 3 Person → 4 verifizieren | `/sv-panel` |
| Coach-Code | 1 Coaching Panel → 2 Coaching-Codes → 3 Code erzeugen → 4 Code weitergeben | `/coach-panel` |

## Navigationsbaum

```
Öffentlich
├─ /welcome ── /login ── /verify-email ── /profile (Onboarding)
│   ├─ /eltern-leitfaden
│   ├─ /coaching
│   ├─ /transparenz
│   └─ /impressum · /datenschutz · /cookies · /nutzungsbedingungen
└─ /update-password (E-Mail-Link)

App (geschützt, Zugangs-Gate für unverifizierte Konten)
├─ Entdecken / ── Anzeige /ad/:id ── Anfrage / Chat
├─ Social /social · /requests · /matches · /favorites
├─ Chats /chats ── Chat /chat/:requestId
├─ Neue Anzeige /create-ad
├─ Profil /profile ── öffentliches Profil /profile/:id
├─ Einstellungen /settings
├─ Coaching Panel /coach-panel            (coach_admin)
└─ SV-Bereich /sv-panel                   (sv_admin)
    ├─ Übersicht
    ├─ Support & Feedback
    ├─ Nutzer
    ├─ Anzeigen
    ├─ News / Infos
    ├─ Meldungen
    ├─ Codes & Verifikation
    ├─ Audit & Coaching
    ├─ Analytics
    └─ Chat
```

Mobil: Bottom-Nav mit Entdecken · Social · Erstellen (+) · Optionen · Profil; Kopfzeile als schwebende Pille mit Menü und Glocke. Desktop: Sidebar mit Menü/Erstellen/Konto und Profilkarte unten.
