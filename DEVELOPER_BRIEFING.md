# FWG Nachhilfebörse — Verbessertes Entwickler-Briefing (aktualisiert)

**Ziel:** Ein klares, ausführliches und umsetzbares Briefing, das einem neuen Entwickler alle bisherigen Anforderungen, Fehlerbeschreibungen und neuen Wünsche bündig übergibt. Dieses Dokument ersetzt und verbessert die ursprüngliche Kurzbeschreibung und integriert alle nachträglich gemeldeten Anforderungen.

---

## 1) Kurz-Kontext / Zweck (1 Satz)

Mobile-zentrierte, installierbare PWA (Desktop + Mobile) für das Friedrich-Willem-Gymnasium (FWG): eine sichere, datensparsame Nachhilfebörse, in der Schülerinnen und Schüler Nachhilfe anbieten/finden, Termine vereinbaren, sich durch die Schülervertretung (SV) verifizieren lassen und die SV die Moderation übernimmt.

---

## 2) Warum diese App? (Motivation)

Viele Schüler*innen wissen nicht, wer innerhalb der Schule Nachhilfe anbietet. Externe Plattformen sind zu allgemein, oft kommerziell und nicht schul-intern. Die App schafft eine vertrauenswürdige, schulinterne Lösung: Kontakte bleiben innerhalb der Schule, die SV verifiziert und moderiert; keine Zahlungsabwicklung über die Plattform im MVP.

---

## 3) Zielgruppe & Regeln (kurz, konkret)

* **Zielgruppe:** Schüler*innen Jahrgangsstufen 5–13 des FWG (Minderjährige: besondere Anforderungen an Transparenz und Elterninformationen).
* **Moderation:** SV verwaltet Verifikationen, Reports und kann Anzeigen/Accounts sperren. SV-Mitglieder haben ein separates SV-Panel.
* **Wichtig:** Keine Zahlungsabwicklung im MVP; keine sensiblen Daten ohne Einwilligung; Melde-/Report-Funktion; GDPR-konforme Datenlöschung.

---

## 4) Kernanforderungen (Produkt / UX, kein Code)

> Der Anspruch: **Nicht nur ein Prototyp.** Die App muss stabil sein, alle implementierten Features fehlerfrei funktionieren, modern aussehen, flüssige Animationen besitzen und sich auf Mobile wie eine native App anfühlen.

### A. User-Accounts

* Registrierung per **SV-Code** (primärer Flow) oder klassisch + Nachverifikation (sekundärer Flow). Siehe Abschnitt Auth & Verifikation.
* Pflichtfelder: Geburtsdatum (Rechtssicherheit), Klassenstufe. Anzeigenname: Vorname + Initial (z. B. "Max H.").
* Optionale Felder: Profilbild (client-side komprimiert), E‑Mail, Moodle-Name, Telefonnummer (Sichtbarkeits-Flag).
* Nach erstmaliger Anmeldung: Weiterleitung zur **Profil-Creation-Page** (bzw. Onboarding), erst danach ist die App voll nutzbar.

### B. Anzeigen (Listings)

* Jeder Nutzer kann mehrere Anzeigen haben: Typ `Ich biete` / `Ich suche`.
* Felder: Titel, (längere) Beschreibung, Fächer (Multi-Select Chips, color-coded), Klassenstufen (Multi), Ort (vordefinierte Optionen + Custom), Format (Einzel/Gruppen/Online), Preis (€/Minute, €/Stunde wird berechnet / VB / kostenlos), Verfügbarkeit (Wochenplan mit 15‑Minuten-Takt), Bilder (optional), Max-Teilnehmer (bei Gruppen).
* Erstellen-Screen: sequenziell (Stepper). **Problem behoben:** Klarer Weiter-Button, Validierung pro Schritt, Preview vor Publish.

### C. Feed / Suche / Filter

* Feed: Karten, zeitlich sortierbar; Badges: `Biete` / `Suche` / `Neu` (<48h) / `Verifiziert`.
* Sticky-Filter-Bar (Fach, Ort, Format), erweiterte Filter-Modal: Klassenstufe, Preis-Spanne (Schieberegler), Verfügbarkeit (Wochentage + Zeitfenster), Rating, nur Verifizierte, nur Favoriten, Sortierung (Empfohlen, Beliebt, Höchste Bewertung, Neueste).
* Suche: nach Anzeigen; Suche nach **Profilen** optional (default deaktiviert).

### D. Favoriten / Merkliste

* Tags/Collections: z. B. `Später`, `Interessant` — Nutzer kann Anzeigen taggen.

### E. Terminvereinbarung

* Interessent schlägt Termin (Datum/Zeit) vor → Anbieter bestätigt → ICS-Export (Kalender), Push/Benachrichtigung an beide.
* Kalender-UI: Wochenübersicht mit auswählbaren Zeitfenstern (mehrere Tage möglich).

### F. Bewertungen / Reputation

* 1–5 Sterne + optionaler Kommentar. Nur nach bestätigtem Kontakt/Termin möglich.
* **Wichtig:** Keine Anzeige von Bewertungen wenn 0 Reviews — keine Fake-Aggregation.

### G. Reports & Moderation

* Meldefunktion auf Anzeigen/Profilen/Chats → landet in SV-Queue.
* SV-Aktionen: warnen, sperren, löschen, begründete Ablehnung mit Nachricht an Nutzer.

### H. SV-Panel (Admin-SV)

* Minimal, nicht consumer-like: SV kann **Accounts anlegen/löschen**, Anzeigen löschen, Verifikations-Queue verwalten, Reports bearbeiten, einfache Analytics (Neu Anzeigen/Woche, Top-Fächer, Reports/Woche).
* **Keine Profil-Erstellungs-Pflicht** für SV: keine Telefonpflicht, kein Profil-Setup für SV-Admins.
* SV kann **Codes generieren** (siehe Auth) und Ausdruck/Download (PDF) mit Code + QR + Name des Users auf Thermodruckpapier / A4 generieren.

---

## 5) Authentifikation & Verifikation — **NEUES, wichtig**

Zwei Implementierte Wege (beide müssen funktionieren):

### Flow A — **SV-Code (Primär, empfohlen)**

1. SV generiert im SV-Panel einen **einmaligen alphanumerischen Code** (≥20 Zeichen empfohlen) oder QR-Code; optional: Ablaufdatum und Rolle `Schüler`.
2. Code wird **gedruckt / als PDF** (Thermal-Bon-Layout) oder auf Wunsch fotografiert, und als Einmal-Code ausgegeben.
3. Neuer Nutzer wählt "Mit SV-Code anmelden" → Eingabe oder Scan des QR → Account wird created + sofort als `verifiziert` markiert (oder Status: aktiv).

**Sicherheitsanforderungen:** Codes müssen stark genug (20+ Zeichen, Kombi aus Groß/Klein/Buchstaben und Zahlen), einmalig, serverseitig gesichert, und verfallbar sein.

### Flow B — **Self-Signup + Vor-Ort-Verifikation**

1. Nutzer registriert via Web-Formular (Name, Kontaktdaten, Geburtsdatum). Status: `Ausstehend`.
2. Nutzer geht später zum SV-Raum, zeigt Ausweis; SV öffnet das Profil in der Verifikations-Queue und klickt `Verifizieren` → Konto wird aktiv.
3. SV hat Button `Drucken (Code + QR + Name)` um dem Nutzer einen Ausdruck zu geben.

**UI-Hinweis:** Nach Signup zeigt die App stets den Hinweis: *„Bitte verifiziere dein Konto im SV-Raum (Glaskasten)“*.

---

## 6) Druck / PDF / QR Anforderungen

* SV kann für jeden `pending` Nutzer eine druckbare Seite erzeugen (PDF → Thermobon-Format + A4). Inhalt: Name, Klasse, generierter Code (alphanumerisch), QR-Code, Datum, SV-Signatur-Feld.
* PDF-Layout: einfach, druckerfreundlich, QR groß genug (min. 200px), guter Kontrast.

---

## 7) Design / UI / Visuals (konkret)

* **Mobile-first PWA**, responsive für Desktop & iPad; Bottom navigation auf Mobile; auf Desktop Sidebar + Topbar.
* **Designsprache:** minimalistisches, seriöses UI mit Teil-Glassmorphism (Frosted-Glass), weiche Animationen, schnelle micro-interactions — Anlehnung an Apple/Google/Notion/OpenAI-Richtlinien.
* **Farben / Tokens:** Primär-CTA = Gelb, Sekundär/Header = Blau. Light & Dark Mode unterstützen.
* **Animationen:** sanfte transitions (0.12–0.25s), spring-damped motion für Buttons, Skeleton-Loading für Listen.
* **Accessibility:** ausreichende Farbkontraste, große Tap-Targets, Screenreader-Labels.

### Fach-Chips / Color-Coding (exakte Werte)

> Bitte diese Farben als Design Tokens anlegen (HEX).

* **Deutsch:** `#1E90FF` (weiß text)
* **Englisch:** `#003366` + 🇬🇧 Icon
* **Französisch:** Tricolore (`#0055A4` / `#FFFFFF` / `#EF4135`) + 🇫🇷
* **Kunst:** Gradient `#FF6EC7` → `#FFD166`
* **Griechisch:** `#0D5EAF`
* **Latein:** `#C19A6B`
* **Musik:** `#7B3FBF`
* **Literatur:** `#8B0000`
* **Kultur:** `#2E8B57`
* **Geschichte:** `#8B4513`
* **Pädagogik:** `#FF8C00`
* **Erdkunde:** `#2B7A78`
* **Philosophie:** `#4B0082`
* **Sozialwissenschaften:** `#708090`
* **Wirtschaft & Gesell.:** `#1F4E79`
* **Wirtschaft & Politik:** `#005A9C`
* **Biologie:** `#2E8B57`
* **Chemie:** `#00A5CF`
* **Informatik:** `#00AEEF`
* **Mathematik:** `#D62728`
* **Physik:** `#0F52BA`
* **Blauer Planet:** Gradient `#0077BE` → `#00A0B0`
* **Prakt. Philosophie:** `#B497BD`
* **Religion:** `#FFD700`
* **Sport:** `#32CD32`

**UX:** Chips scrollen horizontal, ausgewählt = Outline + Häkchen + invertierter Hintergrund (Kontrast hoch).

---

## 8) Listing-Erstellung & Filter — Details

* **Steps:** 1) Typ + Titel 2) Fächer + Klassenstufen 3) Ort + Format 4) Preis (€/Minute oder Pauschale + VB + kostenlos) 5) Verfügbarkeit (Wochentage + Uhrzeiten mit 15‑Min-Takt) 6) Beschreibung + Bilder 7) Vorschau & Publizieren.
* **Validierung:** Pflichtfelder markieren; `Weiter` Button nur aktiv wenn Step validiert.
* **Filter UI:** Oben 3–4 Quick-Filters (Fach / Ort / Format / Sortierung), „Alle Filter“ öffnet Modal mit erweiterten Optionen (Preis-Slider, Wochentage, Zeitspanne, Verifizierungsfilter).
* **Verfügbarkeit-Logik:** Bei Suche wählbare Zeitspannen -> zeige alle, die sich überlappen (nicht nur exakte Übereinstimmung).

---

## 9) Medien & Performance

* **Profilbilder:** Client-side Kompression/Resizing (WebP, Quality ~60) → Ziel: < 50 KB, max 150 KB.
* **Bilder in Anzeigen:** max 3–4 Bilder, server-side resized. CDN empfohlen.
* **Ladeverhalten:** Skeletons, Lazy-loading, Service-Worker für PWA-Caching.

---

## 10) Notifications & Chat (Platzhalter / MVP)

* **Push-Benachrichtigungen** (MVP: optional, Phase 2 empfohlen) — Ziel: native-like Push (via Web Push + Service Worker).
* **In-App Nachrichten:** initialer MVP kann `Kontakt-Optionen öffnen` (zeigt Moodle-Name / E‑Mail / Telefonnummer-Felder) statt vollwertigem Chat. Chat kann Phase‑2 sein. Wenn Chat implementiert wird: nur Text, keine Date-Uploads.

---

## 11) Datenschutz & Sicherheit

* **Erforderlich:** GDPR-konforme Löschung, Audit-Log für Verifikationen (wer hat wann verifiziert), sichere Speicherung von Codes, keine Speicherung von Zahlungsdaten.
* **Sensible Daten:** Telefonnummer und private Kontakte nur sichtbar, wenn Nutzer das aktiviert.
* **Chat/Upload:** keine Date-Uploads in erster Version.

---

## 12) Fehler & bekannte Bugs (Aufgabe für Entwickler)

* Audit der existierenden App: Liste erstellen mit Priorität (Blocker/High/Medium/Low) — Beispiele aus Feedback:

  * Anzeigenerstellung: Stepper bricht ab → `Weiter` funktioniert nicht.
  * SV-Panel: Layout-Bugs, fehlende Logout-Funktion, fehlende Druckfunktion.
  * Profil: Fake-Angaben (z. B. 12 Reviews ohne Bewertungen) → Rework der Logik.
  * Filter: zu wenige Fächer, fehlende Preisspanne / Zeitfilter.
  * Push-Benachrichtigungen & Privatsphäre-Einstellungen funktionieren nicht.

**Aufgabe:** Führe sofort einen kompletten End‑to‑End Test (SignUp → ProfilCreate → Create Ad → Search → Request → Confirm → ICS → Review → Report) durch und liefere einen Bug-Report mit Steps to reproduce und Priorisierung.

---

## 13) Akzeptanzkriterien / Tests (MVP)

* Registrierung via SV-Code: Code kann eingescannt/eingegeben werden → Account aktiv.
* Registrierung via Self-Signup: Account `Ausstehend` → SV verifiziert in Panel → Nutzer wird aktiv benachrichtigt.
* Anzeige erstellen: vollständiger Stepper ohne Blocking-Fehler, Preview & Publish.
* Suche/Filter: mindestens Fach, Klassenstufe, Preis, Wochentag/Zeitraum und Verifizierte-Filter funktionsfähig.
* Termin: ICS exportiert, Benachrichtigungen ausgetestet.
* SV-Panel: kann Verifikationen durchführen, Reports sehen, Anzeigen löschen, Benutzer löschen.
* Profile: Logout funktioniert, Profil editierbar, Profilbild-Upload mit Kompression.
* UI: Mobile-first, responsive, Dark & Light Mode, konsistente Styles.

---

## 14) Deliverables & Phasen

**Phase 0 — Audit & Bugfixes** (1): Kompletter Testreport + Hotfixes für Blocker.
**Phase 1 — MVP (Essentiell):** Auth (SV-Code + Self-Signup), Profile Create, Anzeigen erstellen/listen/filtern, Favoriten, SV-Panel Grundfunktionen, Reports, Ratings, Terminvereinbarung + ICS, responsive PWA, Bildkompression.
**Phase 2 — Nice-to-have:** Push Notifications, Chat-Integration (oder Moodle-Linking), erweiterte Analytics, Offline-First / service-worker improvements.
**Phase 3 — Optional:** Bezahlsystem (rechtlich prüfen), komplexe Scheduling, Integrationen (Moodle API).

---

## 15) Technische Empfehlungen (optional, aber nützlich)

* Frontend: React/Preact + TypeScript + Vite oder Next.js (nur wenn SSR / SEO nötig). TailwindCSS für Tokens / Themes. PWA + Workbox Service Worker.
* Backend: Node.js/Express oder Firebase / Supabase (Auth + DB). DB: PostgreSQL oder Supabase Postgres.
* Storage: S3/CDN oder Supabase Storage; Image processing via serverless function.
* Deployment: CI/CD, automatische Tests, Staging-Umgebung (FWG-Test).

---

## 16) Microcopy / UI-Texte (bereit zur Verwendung)

* Onboarding: „Willkommen bei der FWG-Nachhilfebörse. Bitte verifiziere dein Konto im SV-Raum (Glaskasten), damit deine Anzeigen sichtbar werden.“
* Popup nach Registrieren: „Bitte gehe in der nächsten Pause zum SV-Kasten und lass dich verifizieren. Dort erhältst du auch deinen Anmeldecode.“
* Fehler: „Geburtsdatum fehlt — für die Nutzung der App wird dein Alter benötigt.“
* Report: „Melden — Die Schülervertretung schaut sich das an.“

---

## 17) Zusatz: Was du jetzt tun sollst (konkrete To‑Dos für den Entwickler)

1. **Audit** der jetzigen App (End-to-End Test) und Lieferung eines Bugreports (während 2 Arbeitstage).
2. **Hotfix** der Blocker (Anzeigenerstellung-Stepper, Logout, SV-Panel Layout).
3. **Implementierung** der Auth-Flows (SV-Code + Self-Signup) inkl. Druck/PDF/QR.
4. **Ergänzung** aller Fächer + Farb-Tokens und Filter-Parameter (Preis-Slider, Wochentag/Zeiten).
5. **Profilbild-Kompression** client-side implementieren (WebP, Ziel < 50–150 KB).
6. **End-to-End-Tests** + Acceptance Tests nach Liste in Abschnitt 13.
7. **Lieferung**: Staging-URL + 2 vorläufige Test-Accounts mit Codes (die Codes müssen sicher sein; erstelle sie in Staging DB und sende separat über sicheren Kanal).

---

## 18) Offene Fragen / Annahmen (für Developer zu bestätigen)

* Erwartung an Push-Notifications (Web‑Push oder native wrappers?) — Vorschlag: Web Push + Service Worker (Phase 2).
* Druckformat für Thermobons: Größe / Drucker-Modell? (als default A6/Bons-Style in PDF implementieren).
* Moodle-Integration: nur Feld `Moodle-Name` im Profil oder echte OAuth/Single-Sign-On? (MVP: nur Feld / Link.)

---

## 19) Abschluss / Ton & Priorität

* Ziel: stabile, fertige App — kein Prototyp. UX muss poliert, responsive, und performant sein.
* Priorisiere **Stabilität & Vollständigkeit der Funktionen** vor Feature-Expansion.

---

**Anhang:** Bitte implementiere die Liste aller Fächer (wie oben) vollständig und achte auf das Farbschema. Nach dem Audit erwarte ich einen PR-Plan mit Ticketaufteilung (Jira/GitHub Issues) und realistischen, aber zielorientierten Milestones.

*Ende des Briefings.*
