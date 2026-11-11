# FWG Nachhilfebörse

Die schulinterne Nachhilfebörse der Schülervertretung am Friedrich-Wilhelm-Gymnasium Köln. Schülerinnen und Schüler der Klassen 5 bis 13 können Nachhilfe suchen oder selbst Nachhilfe anbieten.

- Website: [nachhilfe-sv.de](https://nachhilfe-sv.de)
- Quellcode: [github.com/oskar26/nachhilfeb-rse](https://github.com/oskar26/nachhilfeb-rse)
- Träger: Schülervertretung (SV) des Friedrich-Wilhelm-Gymnasiums Köln
- Rechtliches: [Impressum](https://nachhilfe-sv.de/#/impressum), [Datenschutz](https://nachhilfe-sv.de/#/datenschutz), [Transparenz](https://nachhilfe-sv.de/#/transparenz)

## Was ist die Nachhilfebörse?

Die Nachhilfebörse ist eine Progressive Web App (PWA) für das FWG Köln. Sie vermittelt Kontakte zwischen Schülerinnen und Schülern, die Nachhilfe suchen, und solchen, die Nachhilfe anbieten.

Die Nutzung der Börse ist kostenlos. Die Nachhilfe selbst wird privat zwischen den Familien vereinbart und bezahlt. Ein Richtwert sind etwa 12 € pro Stunde. Der Preis ist individuell anpassbar.

Nur verifizierte Konten können Anzeigen erstellen, Kontakt aufnehmen oder Anzeigen ansehen. Die Verifizierung erfolgt persönlich im SV-Raum. Das SV-Team prüft, ob die Person das FWG besucht, und schaltet das Konto frei.

## Funktionen

### Für Schülerinnen und Schüler

- Anzeigen erstellen: Nachhilfe anbieten oder suchen, mit Fächern, Klasse, Ort, Format, Preis, Verfügbarkeit und Bildern.
- Übersicht und Filter: nach Fach, Klasse, Preis, Ort und Verfügbarkeit.
- Merkliste: Anzeigen speichern und später wiederfinden.
- Anfragen und Chat: Kontakt aufnehmen und Termine absprechen.
- Profile: Beschreibung, Fächer, Verifizierungsstatus.
- Bewertungen: erst nach einem Kontakt möglich.
- Coaching-AG: geschulte Schülerinnen und Schüler ab Klasse 8 unterstützen die Klassen 5 und 6.

### Für Eltern

Eltern nutzen das Konto ihres Kindes gemeinsam mit ihm. Ein eigenes Elternkonto gibt es nicht. In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung. Wie eng Eltern mitbetreuen, entscheiden sie mit ihrem Kind.

Der Eltern-Leitfaden erklärt Sicherheit, Verifizierung, Preise und Kontaktwege: [nachhilfe-sv.de/#/eltern-leitfaden](https://nachhilfe-sv.de/#/eltern-leitfaden).

### Für die SV

- Verifizierung im SV-Raum.
- Moderation von Meldungen und Nutzerverwaltung.
- Statistik zu Anzeigen, Nutzern und Seitenaufrufen ohne externe Tracker.

## Technik

- React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Tiptap.
- PHP-API mit MySQL bei ALL-INKL.
- PWA: zum Startbildschirm hinzufügen, Installationshinweis.
- Dark Mode und Light Mode.
- News-Hinweise und Push-Benachrichtigungen.

## Sicherheit und Datenschutz

- Unverifizierte Konten bleiben gesperrt. Das SV-Team kontrolliert sie bei der jährlichen Prüfung.
- Serverseitiger Inhaltsfilter.
- Keine externen Analyse- oder Werbedienste.
- In der App-Datenbank werden keine IP-Adressen gespeichert. IP-Adressen werden für das Rate-Limiting verarbeitet.
- Hosting in Deutschland.
- Die Nutzungsstatistik ist bei angemeldeten Konten pseudonym und wird nach 90 Tagen gelöscht.

Details: [Datenschutzerklärung](https://nachhilfe-sv.de/#/datenschutz), [Cookies](https://nachhilfe-sv.de/#/cookies).

## Projekt

Die Börse entsteht seit Ende 2025 mit KI-Unterstützung. Ein großer Teil des Codes und der Texte wurde mit KI erstellt. Ein Mensch setzt Ziele, prüft und entscheidet. Die Verantwortung für Inhalte, Sicherheit, Datenschutz und Features trägt das SV-Team.

Der Quellcode ist öffentlich. Fehler und Lücken können trotzdem vorkommen. Rückmeldungen an [technik@nachhilfe-sv.de](mailto:technik@nachhilfe-sv.de) oder als [Issue auf GitHub](https://github.com/oskar26/nachhilfeb-rse/issues).

## Mitmachen

1. Fork erzeugen und Branch anlegen.
2. Änderung mit klarer Commit-Nachricht.
3. Pull Request öffnen und kurz beschreiben, was sich warum ändert.

## Lizenz und Rechte

Entwickelt für das Friedrich-Wilhelm-Gymnasium Köln, betrieben durch die Schülervertretung. Der Quellcode ist öffentlich. Die Plattform ist ein nicht-kommerzielles Schülerprojekt.

Rechtliches: [Impressum](https://nachhilfe-sv.de/#/impressum), [Nutzungsbedingungen](https://nachhilfe-sv.de/#/nutzungsbedingungen).
