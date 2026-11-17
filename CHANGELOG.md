# Versionshistorie

Die Nachhilfebörse wird seit dem 7. November 2025 entwickelt. Die folgenden
Versionen fassen die wichtigsten Design- und Funktionsstände zusammen. Frühe
Nummern sind rückblickend aus der Commit-Historie gruppiert; nur die aktuelle
Version ist ein konkreter Pre-Release.

## 0.9.0-rc.1 – 17. November 2026 (Pre-Release)

Das große Design- und Funktionsupdate, kurz vor dem Release. Noch keine finale
Freigabe.

### Navigation und App-Gerüst

- Einheitliche Navigation für Desktop und Mobil: Entdecken, Social, Chats,
  Anzeige erstellen und Profil.
- Chats direkt in der mobilen Bottom-Navigation; Einstellungen über das Profil.
- Rollenabhängige Sidebar für Coaching- und SV-Panel.
- News wandern in die App (Feed-Karte und Schnellmenü). Kein blockierendes
  Popup mehr beim ersten Aufruf.

### Social und Matching

- Ausführliche Match-Karten mit Prozentwert, gemeinsamen Fächern, Gründen,
  Preis, Ort und Zeiten.
- „Passend zu deiner Anzeige“ und direkter Weg zur Anzeige.
- Anfragen, Vorschläge und Merkliste in einem gemeinsamen Social-Strom.
- Filter und Deep-Links für alle Social-Bereiche.

### Chat und Termine

- Chat-Übersicht mit Conversation-Summaries, Ungelesen-Zählern und letzten
  Nachrichten.
- Terminvorschläge, Bestätigung und ICS-Export.
- Blockieren, Melden und Lesebestätigungen.
- Verbesserte Fehler- und Leerzustände.

### Anzeigen und Profile

- Anzeigenkarten mit Titel zuerst, einer Meta-Zeile und klarer Hierarchie.
- Preisangaben verständlicher: „Verhandelbar“ statt „VB“ in Metatexten.
- Profilfelder im Lesemodus als normale Felder statt ausgegraut.
- Fester Avatar-Ring, bessere Kontakt- und Einstellungsseiten.
- Sechs-Schritte-Anzeige mit Autosave und Bestätigung vor dem Verwerfen.

### Vertrauen, Eltern und Coaching

- Eltern können das Konto mitbetreuen. Wenn das Kind noch keine eigene
  E-Mail-Adresse hat, wird die E-Mail-Adresse der Eltern verwendet.
- Unter-16-Einwilligung weiterhin per Bestätigungslink.
- Eltern-Leitfaden und Landing erklären das Kontomodell transparent.
- Coaching-Tabelle auf Mobil und Desktop identisch, nur kompakter.
- Förderunterricht 1. HJ 26/27 mit aktuellen Terminen.

### Design und Barrierefreiheit

- Landing kompakter, ein klarer Handlungsaufruf pro Abschnitt.
- Kühler Dark Mode mit warmer gelber Marke.
- Größere Touch-Ziele, saubere Fokus- und Fehlerzustände.
- Dokumentation mit mobilen Seitenaktionen und ruhigerem Plattform-Button.

### Technik und Betrieb

- PWA, Docs-Site und PHP/MySQL-API auf dem aktuellen Stand.
- Screenshots für Website, Schüler- und SV-Ansicht aktualisiert.
- SQL-Update 016 für Chat, Einwilligung und Blockieren.

## 0.8.0 – 16. November 2026

- App-UX-Review F-001–F-022: Navigation, Feed, Social, Profile, Chat und
  Formulare.
- Mobile Bottom-Navigation, Social-Tabs und Typ-Filter.
- Dokumentations-Shell mit Suche, Seitenaktionen und Dark Mode.
- Screenshots für alle öffentlichen und angemeldeten Ansichten.

## 0.7.0 – 15. November 2026

- Landing-Redesign mit klarerem Aufbau und kürzeren Wegen zur Registrierung.
- Mobile App-Shell, neue Seitenübergänge und taktiles Feedback.
- Chat-Kontrast, Lesbarkeit und Terminübersicht verbessert.
- Erste vollständige Screenshot-Serie für Website und App.

## 0.6.0 – 14. November 2026

- Großes Funktionsupdate aus 14 Aufgabenbereichen.
- Chat-Gespräche, Termine und Anfragen als zusammenhängender Ablauf.
- Mobile Navigation, Motion und Avatar-Editor.
- Docs-Shell mit Inhaltsverzeichnis, Suche und LLM-Ausgabe.
- Admin- und Analytics-Bereich, Coaching-Panel und Stundenpläne.
- Anzeigen-Flow, Uploads, Preislogik und Profilverfügbarkeit.
- Datenschutz, Einwilligungen und Blockieren.

## 0.5.0 – Oktober 2026

- Dokumentationsseite für Plattform, Regeln und Datenschutz.
- Landing-Überarbeitung und App-UX-Review.
- Eltern-Leitfaden, gespeicherte Suchen und Fächer-Statistik.
- Matching- und Merkliste als eigene Social-Bereiche.

## 0.4.0 – September 2026

- Umstellung der API auf PHP 8 und MariaDB bei ALL-INKL.
- E-Mail-Benachrichtigungen, Passwort-Reset und Support-Tickets.
- PWA-Installation, Offline-Hinweise und Push-Vorbereitung.
- Matching, Avatar-Editor, Teilen-Funktion und Coaching-AG.
- Erste versionierte SQL-Updates für das Produktionsschema.

## 0.3.0 – August 2026

- Dark Mode und überarbeitete mobile Navigation.
- Admin-News, Ankündigungen und Moderation.
- Sicherheits- und Datenschutzrunde: Inhaltsfilter, Rate-Limits,
  Umgebungsvariablen und GitHub-Pages-Absicherung.
- SQL-Richtlinien und erste Datenbankmigrationen.

## 0.2.0 – Juli 2026

- Admin-News und Ankündigungen für die Schulgemeinde.
- Mobile Verbesserungen für Feed, Profile und Formulare.
- Erste SQL-Updates und Betriebsdokumentation.

## 0.1.0 – 20. Juni 2026

- Erster v2-Stand der Nachhilfebörse.
- Registrierung, Login, Verifizierung und Profile.
- Anzeigen, Favoriten, mobile Ansicht und Cookie-Hinweise.
- Erste Eltern-Kind-Verknüpfung und Admin-Werkzeuge.
