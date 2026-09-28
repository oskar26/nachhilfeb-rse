# Produktüberblick & Demo-Drehbuch

**Zweck:** Alles, was die SV über das eigene Produkt wissen muss — Funktionen, Zahlen, Grenzen,
Demo-Ablauf. Stand: September 2026.

---

## 1. In einem Satz

Die FWG Nachhilfebörse ist eine schulinterne Web-App (PWA), in der verifizierte Schülerinnen und
Schüler des FWG Nachhilfe anbieten und finden, moderiert und verifiziert von der SV — ohne
kommerziellen Anbieter, ohne Werbung, mit Hosting in Deutschland.

**Adresse:** https://nachhilfe-sv.de · **Quellcode:** github.com/oskar26/nachhilfeb-rse

---

## 2. Wer nutzt was

| Rolle | Was sie kann | Wie sie reinkommt |
|---|---|---|
| **Schüler/in** | Anzeigen erstellen, suchen, filtern, merken, anfragen, chatten, bewerten | Registrierung + persönliche Verifizierung im SV-Raum |
| **Elternteil** | Kind verknüpfen, Anzeigen/Anfragen/Matches/Merkliste/Bewertungen einsehen, Profil des Kindes pflegen, Anzeigen pausieren | Registrierung + Verknüpfung mit 6-stelligem Code des Kindes (automatisch verifiziert) |
| **Coach** (Coaching AG) | wie Schüler/in + Badge auf Profil und Anzeigen | Coaching AG, Schulung durch Frau Balistreri |
| **SV-Admin** | Verifizieren, moderieren, Meldungen, Nutzerverwaltung, Codes, Analytics, Audit-Log | SV-Team, Rechte über Invite/Vergabe |

Nicht-verifizierte Konten sind **technisch** eingeschränkt: Sie können keine Anzeigen
veröffentlichen, keine Anfragen senden und nicht chatten — die Sperre sitzt im Server, nicht nur
in der Oberfläche.

---

## 3. Funktionsumfang (was tatsächlich im Produkt steckt)

**Kern**
- Anzeigen in zwei Richtungen: „Ich biete“ / „Ich suche“, mit Fächern, Klassenstufen, Ort,
  Format, Preis, Verfügbarkeit, Bildern
- Feed mit Suche und Filtern (Fach, Klassenstufe, Preis, Zeit, verifiziert, Coach)
- Anfragen mit Status, Chat, Terminvorschläge, Kalender-Export (ICS)
- Bewertungen nur nach tatsächlichem Kontakt (keine Bewertung ohne Anfrage)
- Merkliste, gespeicherte Suchen mit Benachrichtigung bei neuen Treffern

**Vertrauen & Sicherheit**
- Verifizierung im SV-Raum (kein Code-Versand, keine Selbstfreischaltung)
- Wortfilter auf Deutsch und Englisch (Schweregrade), blockt vor dem Absenden, mit
  SV-Filtertraining (Wortliste durch die SV erweiterbar)
- Melde-Button in Anzeige, Nachricht und Profil, mit Meldegrund und Bearbeitungsstatus
- Moderationsbereich: Verwarnung, temporäre und dauerhafte Sperre, Begründung, Widerspruchsweg
- Audit-Log: jede Verwaltungs- und Moderationsaktion wird protokolliert (wer, was, wann, warum)
- Kontakte (Handynummer, Moodle-Name, E-Mail, Sonstiges) sind **einzeln und standardmäßig
  versteckt** und werden erst nach angenommener Anfrage sichtbar

**Eltern**
- Eltern-Dashboard mit Live-Sicht auf Anzeigen, Anfragen, Matches, Merkliste, Bewertungen
- Chat bleibt für Eltern **unlesbar** (nur Status) — bewusste Grenze
- Eltern-Leitfaden als eigene Infoseite
- Eltern-Account wird mit der ersten Kind-Verknüpfung automatisch verifiziert

**Coaching AG**
- Eigene Coaching-Seite mit Regeln, Ablauf und Badge-Erklärung
- Coach-Badge auf Profil und Anzeigen (geprüfte Vertrauenswürdigkeit als Person, keine
  Erfolgsgarantie)

**Betrieb & Statistik für die SV**
- Live-Kennzahlen (Anzeigen, Nutzer, Seitenaufrufe) ohne externen Analysedienst
- Trend-Auswertungen nach Seite, Gerät, Browser, Tageszeit — **ohne IP-Adressen**, ohne Drittland
- News-/Hinweis-Widget für SV-Mitteilungen

**Technisch**
- PWA: auf dem Homescreen installierbar (iOS/Android/Desktop), Offline-Hinweis
- Dark Mode, mobile-first, große Bedienelemente, Tastaturbedienung, reduzierte Bewegung
  respektiert
- Kein Tracking, keine Werbe-Cookies, keine Drittanbieter-Skripte

**Was ausdrücklich nicht drin ist**
- Keine Zahlungsabwicklung, keine Gebühren, keine Provision
- Keine Noten, keine Leistungsdaten, kein Kontakt zu Lehrkräften, keine Verknüpfung zu
  Schulverwaltungssystemen
- Keine anonymen Gäste, keine schulfremden Nutzer
- Keine anlasslose Überwachung privater Chats

---

## 4. Zahlen (Stand September 2026, nachprüfbar im Repository)

| Kennzahl | Wert |
|---|---|
| Quellcode | ~37.200 Zeilen (TypeScript/React + PHP) |
| Dateien | 109 TypeScript/TSX · 27 API-Module |
| Oberflächen-Bausteine | 51 Komponenten, 37 Seiten |
| Datenbank | 18 Tabellen im Hauptschema, 12 Migrationen |
| Entwicklung | seit Ende 2025, mit agentischem Coding, mehrere hundert Stunden |
| Betriebskosten | ca. 90 €/Jahr (Domain + Hosting), aus SV-Mitteln |
| Externe Dienste | keine (kein Analytics, kein CDN, kein US-Cloud) |

*Live-Nutzerzahlen immer tagesaktuell aus dem SV-Panel ziehen (`Analytics`), nicht aus Folien
verwenden.*

---

## 5. Demo-Drehbuch (5 Minuten, am Handy)

**Vorbereitung:** Demo-Account eingeloggt, Bildschirm auf maximale Helligkeit, Flugmodus aus,
Ladekabel dabei. Reihenfolge einüben — nicht improvisieren.

| # | Schritt | Was gezeigt wird | Was gesagt wird (1 Satz) |
|---|---|---|---|
| 1 | Startseite (`#/welcome`) | Drei Wege: suchen, bieten, Eltern | „Das ist der Einstieg — für Schüler und für Eltern.“ |
| 2 | Login/Registrierung | Altersabfrage + Eltern-Einwilligung unter 16 | „Unter 16 geht ohne Elternteil nichts.“ |
| 3 | Verifizierungsschritt | Hinweis „Verifizierung im SV-Raum“ | „Freigeschaltet wird nur persönlich, nicht per Code.“ |
| 4 | Feed | Filter, Fach-Chips, Preis, Klasse | „Filtern nach Fach und Klasse, nur Verifizierte werden angezeigt.“ |
| 5 | Anzeige | Preis, Ort, Beschreibung, Kontakt **verdeckt** | „Handynummer sieht man erst nach Annahme der Anfrage.“ |
| 6 | Melde-Button | Meldegrund-Dialog | „In jedem Inhalt: melden, mit Grund. Wir sichten werktags.“ |
| 7 | Anfrage/Chat | Match, Status, ICS-Export | „Terminabsprache im System, nicht über private Nummern.“ |
| 8 | SV-Panel | Meldungen, Nutzer, Audit-Log | „Alles protokolliert: wer, wann, warum.“ |
| 9 | Eltern-Dashboard | Kind verknüpft, Anzeigen sichtbar, Chat verdeckt | „Eltern sehen alles außer dem Chat — bewusst.“ |
| 10 | Datenschutz/Transparenz | Löschfristen, Open Source, KI-Hinweis | „Und wir sagen offen, wie das entstanden ist.“ |

**Regeln für die Demo**
- Nie durch Menüs irren: Wenn ein Schritt hängt, kommentarlos weiter — Fehler nicht erklären,
  sondern das nächste Ziel aufrufen.
- Keine echten Nutzerdaten anderer Personen zeigen. Demo-Account oder eigener Account.
- Nach der Demo: **Handy weg.** Ab hier wird geredet.

---

## 6. Was wir über das Produkt ehrlich sagen (und warum das kein Nachteil ist)

| Grenze | Unsere Formulierung im Gespräch |
|---|---|
| Es ist ein Schülerprojekt, kein kommerzielles Produkt | „Ein Institut hat mehr Funktionen und einen Support. Wir haben dafür Verifizierung, Nähe und null Kosten — und wir behaupten nicht, mehr zu sein, als wir sind.“ |
| KI-gestützte Entwicklung | „Offengelegt auf der Transparenzseite. Der Vorteil: Wir sind schnell. Der Nachteil: Es können Unschärfen drin sein. Deshalb ist der Code öffentlich und Fehlerlisten sind gepflegt.“ |
| Kein Support rund um die Uhr | „Meldungen werktags, Ziel unter 24 Stunden. Bei akuten Vorfällen eine Rufkette bis zu den Verbindungslehrkräften.“ |
| Ausbaustufen offen | „Kalender-/Erinnerungsfunktionen und eine Verschlüsselung der Chats sind mögliche nächste Schritte — nicht Teil des Starts.“ |
| Abhängigkeit von wenigen Personen | „Deshalb: zwei Admins, Übergabe-Checkliste, Notfall-Umschlag, dokumentierte Struktur.“ |

---

## 7. Rollout-Vorschlag (falls die Schulleitung „schrittweise“ möchte)

| Stufe | Umfang | Dauer | Erfolgskriterium |
|---|---|---|---|
| 1 | Coaching AG + SV intern, nur Klassen 5/6 als Suchende | 4 Wochen | 10 Anzeigen, 5 vermittelte Kontakte, keine Meldung mit Handlungsbedarf |
| 2 | Alle Klassen 5–10 | 6 Wochen | Eltern-Info verteilt, alle Nutzer verifiziert, Monatsbericht liegt vor |
| 3 | Oberstufe inkl. Klausurphasen-Specials | laufend | Wachstum ohne Moderationsengpass |
| Jederzeit | Not-Aus | – | Plattform in unter 24 h abschaltbar, Löschung binnen 30 Tagen |

Diese Staffelung ist das beste Angebot an eine zögernde Schulleitung: **kleiner Anfang,
nachprüfbare Kriterien, jederzeit stoppbar.**

---

## 8. Screenshots für die Sitzung

Im Ordner [`../screenshots/`](../screenshots/) liegen die aktuellen Ansichten (Desktop, iPhone,
iPad). Für das Gespräch genügen drei Ausdrucke oder ein Tablet: **Feed**, **Anzeige mit
Melde-Button**, **SV-Panel**. Alles andere zeigt die Live-Demo besser.
