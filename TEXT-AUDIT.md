# Text-Audit FWG Nachhilfebörse

**Stand:** 11. November 2026  
**Gegenstand:** Alle nutzersichtbaren Texte der Web-App, dazu README, Produktdokumentation und die öffentlich erreichbaren Rechtstexte.  
**Nicht geändert:** Kein Quellcode, keine Rechtstexte, kein Commit, kein Deployment. Dieses Dokument ist die Arbeitsgrundlage für die nächste Phase.

**Kurz gesagt:** Die Inhalte sind inhaltlich nah am Produkt, aber der Ton schwankt zwischen Schulprojekt, Startup-Werbung und internem Technikjargon. Die größten Probleme sind falsche oder veraltete Feature-Aussagen, eine unklare Verifizierungsgeschichte, absolute Sicherheits- und Verfügbarkeitsversprechen sowie die nicht mehr vorhandene Eltern-Funktion in README und Schulleitungsdokumenten. Dazu kommen rechtliche Lücken und Platzhalter, die vor einer Veröffentlichung geklärt werden müssen.

## Umsetzungsstand (11.11.2026)

Umgesetzt wurden die bestätigten Punkte: Preisrichtwert etwa 12 € pro Stunde und individuell anpassbar, kein Eltern-Dashboard und keine Eltern-Verknüpfung, Verifizierung über den SV-Raum, „nur verifizierte Konten“, „mindestens einmal pro Woche“, Entfernen des Promo-Codes, Korrekturen an README, PRODUCT und Schulleitungsdokumenten, Cookie-Banner und Datenschutz-TL;DR, Chat-Löschen und Chat-Verbergen, „Strom“ zu „Übersicht“, Anglizismen und Werbesprache.

Bewusst unverändert bleiben: Impressum-Platzhalter, Einwilligungstext unter 16, Förderunterricht-Daten und der Satz zur verbindlichen Teilnahme, der Hinweis auf externe Image-Hoster, „Offline-Funktionen“, „sofort sichtbar“ und die jährliche Prüfung. Der Bilder-Upload über die Datenbank ist nicht umgesetzt, weil das Schema, API und Oberfläche ändert. Diese Punkte stehen am Ende als offen.

## 1. Annahmen zu Zweck und Zielgruppen

### 1.1 Zweck

Die Nachhilfebörse ist eine schulinterne Vermittlungsseite des Friedrich-Wilhelm-Gymnasiums Köln. Schülerinnen und Schüler können Nachhilfe suchen oder selbst Nachhilfe anbieten. Die Schülervertretung verifiziert Konten, moderiert Meldungen und stellt die technische Plattform. Die Börse vermittelt Kontakte. Sie führt keine Zahlungen aus und garantiert keinen Lernerfolg.

### 1.2 Zielgruppen

| Gruppe | Rolle | Besonderheit |
|---|---|---|
| Schülerinnen und Schüler der Klassen 5 bis 13 | Suchen oder bieten Nachhilfe an | Jüngere suchen häufiger, ältere bieten häufiger an. Die App wird überwiegend am Handy genutzt. |
| Eltern | Betreuen das Konto ihres Kindes mit | Kein eigener Elternaccount. Sie lesen den Eltern-Leitfaden und die Elternabschnitte der Startseite. |
| Schülervertretung | Verifiziert Konten, prüft Meldungen, moderiert | Verantwortet Inhalte und Regeln. Kein professionelles Support-Team. |
| Coaching-AG | Ehrenamtliche Nachhilfe für Klassen 5 und 6 | Eigene Schulung, eigener Status, eigenes Abzeichen. Nicht mit bezahlter Nachhilfe gleichzusetzen. |

### 1.3 Rollen und Grenzen

- Ein Konto gehört immer einer Schülerin oder einem Schüler des FWG. Eltern nutzen dieses Konto gemeinsam mit ihrem Kind. Es gibt kein separates Elternkonto, keine Verknüpfung und kein Eltern-Dashboard.
- Die Nutzung der Börse ist kostenlos. Die Nachhilfe selbst wird privat zwischen den Familien vereinbart und bezahlt. Die Coaching-AG ist ehrenamtlich.
- Nur verifizierte Konten können Anzeigen erstellen und Kontakt aufnehmen. Unverifizierte Konten bleiben eingeschränkt.
- Die Verifizierung erfolgt über einen SV-Code oder persönlich im SV-Raum. Beide Wege existieren im Code.
- Die Börse ersetzt keine schulische Förderung und keine professionelle Beratung. Bei Problemen vermittelt sie an das SV-Team.
- Es gibt keine Zahlung über die App, keine Werbung und keine externen Analyse- oder Werbedienste.

### 1.4 Anrede: Empfehlung

**Schülerinnen und Schüler werden geduzt. Eltern werden gesiezt.**

Begründung: Die App wird von Schülerinnen und Schülern bedient. „Du“ ist dort direkt und altersgerecht. Eltern lesen vor allem den Leitfaden und die Elternabschnitte. „Sie“ signalisiert Respekt und Distanz. Wichtig ist, die Anrede innerhalb eines Abschnitts nicht zu wechseln. Die Startseite darf zwischen Schüler- und Elternabschnitt wechseln, wenn der Adressat klar erkennbar ist.

Nicht empfohlen: alle Besucher siezen. Das würde die App für Klasse 5 und 6 unnötig fremd machen. Nicht empfohlen: Eltern duzen. Das passt nicht zum schulischen Kontext und zum Vertrauensziel.

### 1.5 Begriffe

Die Plattform verwendet aktuell parallel „Account“ und „Konto“, „Feed“ und „Strom“, „Match“ und „Vorschlag“, „Login“ und „Anmelden“, „Badge“ und „Abzeichen“. Das erschwert das Verständnis, besonders für Klasse 5 und 6 sowie für Eltern ohne technische Vorkenntnisse. Die Vereinheitlichung steht im Glossar in Abschnitt 3.

### 1.6 Live-Prüfung

Ohne Anmeldung geprüft:

- `/`
- `/#/coaching`
- `/#/eltern-leitfaden`
- `/#/impressum`
- `/#/datenschutz`
- `/#/login`
- `/#/nutzungsbedingungen`
- `/#/cookies`

Nicht geprüft, weil eine Anmeldung nötig ist:

- Feed und Anzeigenübersicht
- einzelne Anzeige
- Anfragen
- Chat
- Profil und öffentliches Profil
- Einstellungen
- Anzeige erstellen
- SV-Panel und Coach-Panel

Die Texte dieser Seiten wurden im Code gelesen. Sie sind unten mit Datei und Zeile belegt. Eine visuelle Prüfung der Innenräume steht noch aus.

### 1.7 Quellen und Grenzen

Gelesen wurden unter anderem `src/pages`, `src/components`, `api`, `index.html`, `README.md`, `PRODUCT.md` und `docs/schulleitung`. Für die Musterprüfung wurde `humanizer-de` im Modus „Sachlich“ angewendet. Der Sammelcheck für `README.md` fand 17 Emojis, 50 Sätze und gleichmäßige Absätze, aber keinen hohen Oberflächencluster. Solche Checks erkennen Werbe- und Projektsprache schwächer als Fließtextmuster. Deshalb zählt hier die Einzelprüfung.

Keine Rechtsberatung. Rechtstexte werden nicht umgeschrieben. Auffälligkeiten werden nur benannt. Zuständig für Entscheidungen sind Schulleitung, Datenschutzbeauftragte und das SV-Team.

## 2. Tonrichtlinie

1. Schreibe kurze, klare Sätze. Ein Gedanke pro Satz.
2. Bleibe sachlich und freundlich. Keine Werbung, keine Superlative, keine Ausrufezeichenketten.
3. Behaupte nur, was belegt ist. Keine Versprechen zu Noten, Tempo, Verfügbarkeit oder Kosten.
4. Nenne Grenzen. Sage, was die Börse nicht leistet und was sie nicht ersetzt.
5. Schreibe Anleitungen als nummerierte Schritte. Pro Schritt eine Handlung.
6. Duze Schülerinnen und Schüler. Sieze Eltern. Wechsle die Anrede nicht innerhalb eines Abschnitts.
7. Verwende die Begriffe aus dem Glossar. Ersetze englische Begriffe oder erkläre sie beim ersten Vorkommen.
8. Schreibe Fehlermeldungen so: was passiert ist, was man tun kann, ohne Schuldzuweisung.
9. Lasse Rechtstexte von der Schulleitung und der Datenschutzbeauftragten prüfen. Redigiere sie nicht ohne diese Prüfung.
10. Verwende keine Gedankenstriche als Stilmittel. Bereiche wie „10 bis 12 €“ oder „13:45 bis 14:30“ sind davon nicht betroffen.

## 3. Glossar

| Begriff | Bedeutung | Nicht mehr verwenden |
|---|---|---|
| Nachhilfebörse | Die Plattform der SV am FWG | Plattform, Marktplatz, Börse |
| Anzeige | Ein Angebot oder Gesuch in der Übersicht | Inserat, Gesuch, Angebot, Post |
| Konto | Der Zugang einer Schülerin oder eines Schülers | Account, Profil, Login |
| Anmelden | Mit einem bestehenden Konto hineingehen | Einloggen, Login |
| Registrieren | Ein neues Konto anlegen | Account erstellen, Sign-up |
| Übersicht | Die Liste der Anzeigen und Aktivitäten | Feed, Strom, Stream, Chronik |
| Merkliste | Gespeicherte Anzeigen | Favoriten, Bookmarks |
| Anfrage | Kontaktanfrage zu einer Anzeige | Match, Request, Kontaktanfrage |
| Vorschlag | Automatisch passende Anzeige | Match, Matching, Empfehlung |
| Chat | Nachrichtenbereich zu einer Anfrage | Messenger, Konversation |
| SV-Code | Persönlicher Code zur Verifizierung | SV-Einmalcode, SV-Einladungscode, Promocode |
| Verifizierung | Prüfung und Freischaltung durch die SV | Freischaltung, Verifikation, Check |
| Coaching-AG | Ehrenamtliche AG für Klassen 5 und 6 | Schüler-Coaching AG, Schüler-Coaching, Coaching |
| Coach | Geschulte Schülerin oder geschulter Schüler der Coaching-AG | Schüler-Coach, Tutor |
| Coach-Abzeichen | Sichtbarer Status der Coaching-AG | Badge, goldene Plakette |
| Nachhilfe | Privat vereinbarte, in der Regel bezahlte Lernunterstützung | Coaching, Unterricht |
| Richtwert | Unverbindliche Orientierung für den Preis | fairer Preis, Durchschnittspreis |
| Klasse | Jahrgangsstufe 5 bis 13 | Klassenstufe, Stufe, Jahrgangsstufe |
| SV-Team | Die Schülervertretung, die die Börse betreut | Support, Admin-Team, Moderation |
| Erziehungsberechtigte | Eltern oder andere Sorgeberechtigte | Eltern (nur wenn eindeutig) |
| Hervorgehoben | Anzeige mit besserer Platzierung durch Coach-Status oder SV-Aktion | Boost, Premium, Werbeanzeige |

## 4. Textbefunde

**Bewertungsraster:** Jede Zeile prüft sechs Punkte: Bezug zum tatsächlichen Produkt, Verständlichkeit für Klasse 5 bis 6 und Eltern, Ton, Werbesprache oder falsche Versprechen, Rechtschreibung und Grammatik, einheitliche Begriffe und Anrede.

**Prioritäten:**  
**Hoch** bedeutet falsche Tatsache, rechtliche Lücke, irreführende Handlung oder eine Aussage, die Vertrauen oder Sicherheit betrifft.  
**Mittel** bedeutet Werbesprache, unklare Anweisung oder uneinheitlicher Begriff.  
**Niedrig** bedeutet Politur, Typografie oder eine kleine sprachliche Verbesserung.

### 4.1 Meta, README und interne Dokumentation

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `index.html:7` | „... Kostenlos für das FWG.“ | „Kostenlos“ ist nicht auf die Nutzung begrenzt. Private Nachhilfe kostet. | „Die Nutzung der Börse ist kostenlos.“ | Mittel |
| `README.md:3` | „# 🎓 FWG Nachhilfebörse“ | Emoji und Badge-Optik passen nicht zum sachlichen Ton. | „# FWG Nachhilfebörse“ | Niedrig |
| `README.md:19` | „... Chat, Eltern-Dashboard und Pflicht zum Jugendschutz.“ | Das Eltern-Dashboard existiert nicht mehr. Die Featureliste ist falsch. | „... Chat und Regeln zum Jugendschutz. Eltern betreuen das Konto ihres Kindes mit.“ | Hoch |
| `README.md:61-67` | „Smart Matching“, „Anzeigen in Minuten“, „keine Fake-Reviews“, „Schüler-Coaching AG“ | Werbesprache, unverifizierte Tempo-Zusage, englische Begriffe, uneinheitlicher AG-Name. | „Suche nach Fach, Klasse, Preis, Ort und Verfügbarkeit.“ „Bewertungen sind erst nach einem Kontakt möglich.“ „Coaching-AG“ | Mittel |
| `README.md:74` | „Eltern-Dashboard: Kind verknüpfen, Fortschritt einsehen“ | Feature existiert nicht. Es gibt kein Elternkonto und keine Fortschrittsanzeige. | „Eltern nutzen das Konto ihres Kindes gemeinsam mit ihm. Ein eigenes Elternkonto gibt es nicht.“ | Hoch |
| `README.md:83` | „Promotion-Codes: z. B. `BANANE` für den Start“ | Ein veröffentlichter Code kann missbraucht werden. „Promotion“ ist Marketing. | Code entfernen. Wenn er noch gültig ist, sofort sperren. | Hoch |
| `README.md:92` | „PWA: installierbar ..., Offline-Prompt“ | „Offline-Prompt“ verspricht Offline-Nutzung, die nicht belegt ist. | „PWA: zum Startbildschirm hinzufügen; Hinweis auf Installation.“ | Mittel |
| `README.md:117-119` | „über zehn Monate“, „mehrere hundert Stunden“, „AI-generated“ | Zahlen sind teils unverifiziert. Englisch. Rechtfertigungston. | „Seit Ende 2025 wird die Börse mit KI-Unterstützung entwickelt. Ein großer Teil des Codes und der Texte wurde mit KI erstellt.“ | Mittel |
| `README.md:122` | „Weniger Maschine. Mehr Haltung ...“ | Slogan und Selbstlob. | „Wir legen offen, wie die Börse entstanden ist.“ | Mittel |
| `README.md:128` | „Zugang nur nach persönlicher Verifikation im SV-Raum“ | Widerspricht dem SV-Code, der laut Login sofort freischaltet. | „Zugang nach Verifizierung mit SV-Code oder im SV-Raum.“ | Hoch |
| `README.md:128` | „bei der jährlichen Prüfung durch das SV-Team kontrolliert“ | Eine jährliche Prüfung ist nicht belegt. | „Unverifizierte Konten bleiben gesperrt.“ Ohne Frequenzangabe. | Mittel |
| `README.md:130` | „Kein Tracking-Müll: ... keine IP-Speicherung“ | Aggressiver Ton. IP-Adressen werden mindestens für das Rate-Limiting verarbeitet. Ob Serverlogs sie speichern, ist offen. | „Keine externen Analyse- und Werbedienste. In der App-Datenbank werden keine IP-Adressen gespeichert.“ | Mittel |
| `README.md:191` | „von Schülern, für Schüler, mit offenen Augen.“ | Slogan. | „Ein Schülerprojekt der SV des FWG Köln.“ | Niedrig |
| `PRODUCT.md:27` | „Eltern-Dashboard + Leitfaden“ | Feature existiert nicht. | „Eltern-Leitfaden; Eltern nutzen das Konto ihres Kindes mit.“ | Hoch |
| `PRODUCT.md:35` | „Preise als Richtwerte (10–15 €/45 Min Coaching)“ | Widerspricht 10 bis 12 € pro 45 bis 60 Min auf der Website. | Zahl erst nach Entscheidung vereinheitlichen. | Hoch |
| `docs/schulleitung/00-Ein-Pager.md:55`, `02-QA-Katalog.md:187,468`, `03-Produkt-und-Demo.md:23,54,116`, `07-Hausaufgaben-und-Checkliste.md:76` | „Eltern-Dashboard“, „Kind verknüpfen“, „Fortschritt einsehen“ | Dokumente für Schulleitung und Demo beschreiben ein entferntes Feature. | Alle Stellen auf die gemeinsame Konto-Nutzung umstellen. Demo-Drehbuch korrigieren. | Hoch |
| `docs/schulleitung/03-Produkt-und-Demo.md:23` | „Registrierung + Verknüpfung mit 6-stelligem Code des Kindes (automatisch verifiziert)“ | Beschreibt eine nicht existierende Elternrolle und eine automatische Verifizierung. | Entfernen. Eltern nutzen das Schülerkonto. | Hoch |
| `docs/Eltern-Mitbetreuung.md:1-9` | „Das komplette Eltern-Konto- und Verknüpfungssystem wurde entfernt.“ | Die Datei ist die geltende Entscheidung. README und PRODUCT widersprechen ihr. | Als verbindliche Quelle verlinken und die anderen Dokumente daran ausrichten. | Niedrig |

### 4.2 Startseite

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Landing.tsx:249` | „Mathe-SOS oder Englisch-Ass? ... Jede Anzeige kommt von einem verifizierten Account.“ | Werbesprache, Rollenklischee, „Account“ statt „Konto“. | „Nachhilfe in Mathematik, Englisch und weiteren Fächern. Jede Anzeige stammt von einem verifizierten Konto.“ | Mittel |
| `src/pages/Landing.tsx:256,603` | „Jetzt loslegen“ | Unbestimmter Marketing-Button. Er sagt nicht, was danach kommt. | „Anzeigen ansehen“ oder „Zur Anmeldung“ | Niedrig |
| `src/pages/Landing.tsx:272`; `src/pages/Login.tsx:430` | „Kostenlos fürs FWG“ | Klingt, als sei auch die Nachhilfe kostenlos. | „Nutzung kostenlos“ und im Elternabschnitt: „Die Nachhilfe wird privat bezahlt.“ | Hoch |
| `src/pages/Landing.tsx:383` | „Drei Wege an ein Ziel: bereit für die Klausur.“ | Verspricht Klausurvorbereitung für alle. Nicht jede Anfrage hat eine Klausur. | „Drei Wege zur Nachhilfe.“ | Mittel |
| `src/pages/Landing.tsx:385` | „Reiß dir deinen Streifen ab.“ | Metapher ist unklar. Der Bezug zum Abreißzettel erschließt sich nicht. | „Wähle den Weg, der zu dir passt.“ | Mittel |
| `src/pages/Landing.tsx:385` | „Jeder Weg startet mit einem Klick und endet im Chat mit echten Mitschülern.“ | „Mit einem Klick“ ist Werbung. „Echte“ impliziert, andere seien unecht. Nicht jeder Weg endet im Chat. | „Jeder Weg beginnt mit einer Anzeige oder einer Anfrage.“ | Mittel |
| `src/pages/Landing.tsx:389` | „Direkter Kontakt in der App, verifizierte Mitschüler.“ | Kontakt gibt es erst nach Annahme der Anfrage. „Direkt“ ist irreführend. | „Kontakt über die App, sobald eine Anfrage angenommen ist.“ | Hoch |
| `src/pages/Landing.tsx:391` | „Setze eigene Preise, mache flexible Termine aus und sammle Bewertungen für dein Profil.“ | „Sammle Bewertungen“ klingt nach Gamification. Bewertungen sind nur nach Kontakt möglich. | „Lege deinen Preis fest, gib deine Zeiten an und antworte auf Anfragen.“ | Mittel |
| `src/pages/Landing.tsx:391` | „Ein Konto, gemeinsam genutzt“ | Klingt wie ein gemeinsamer Login. Es gibt ein Konto pro Kind, das Eltern mitbetreuen. | „Ein Konto pro Kind, das Sie mitbetreuen.“ | Hoch |
| `src/pages/Landing.tsx:487` | „Klick auf eine Ansicht öffnet sie groß — im Popup mit Pfeiltasten durchblättern.“ | Gedankenstrich, „Klick“ als Substantiv, „Popup“ als Anglizismus. | „Klicke auf eine Ansicht, um sie groß zu öffnen. Mit den Pfeiltasten kannst du durchblättern.“ | Niedrig |
| `src/pages/Landing.tsx:553-558` | „Präzise Filter ... exakt“, „Spannende Anzeigen ... Nichts geht verloren“, „Sichere Anfragen“, „Zeig, was du kannst“, „wie eine echte App ... PWA“ | Werbesprache, absolute Versprechen, „sicher“ als Überschrift, „PWA“ unerklärt. | „Filter nach Fach, Klasse, Ort und Preis.“ „Anzeigen speichern und später wiederfinden.“ „Private Kontaktdaten.“ „Beschreibe deine Fächer und deine Erfahrung.“ „Zum Startbildschirm hinzufügen und wie eine App öffnen.“ | Mittel |
| `src/pages/Landing.tsx:577,596` | „Handy, Moodle, E-Mail: erst nach Annahme deiner Anfrage sichtbar.“ „Kontakte erscheinen erst nach angenommener Anfrage.“ | Die E-Mail-Adresse kann im Profil öffentlich geschaltet werden. Die Aussage ist dann falsch. | „Telefonnummer und Moodle-Name sind erst nach Annahme sichtbar. E-Mail-Adressen können im Profil öffentlich sein.“ | Hoch |
| `src/pages/Landing.tsx:577` | „Schieb die Regler, so fühlt sich Kontrolle an.“ | Werbesprache. | „Mit den Reglern legst du fest, welche Kontaktdaten sichtbar sind.“ | Mittel |
| `src/pages/Landing.tsx:600` | „In drei Schritten verifiziert.“ | Login sagt „Schritt 1 von 2“. Die Zählung ist nicht einheitlich. | „So wird dein Konto verifiziert.“ oder die Schritte in Login und Landing angleichen. | Mittel |
| `src/pages/Landing.tsx:612` | „Besonderes Engagement am FWG“ | Lobende Etikette ohne Inhalt. | „Coaching-AG am FWG“ | Niedrig |
| `src/pages/Landing.tsx:615` | „Große helfen Kleinen“ | „Kleine“ kann abwertend wirken. | „Ältere Schülerinnen und Schüler unterstützen jüngere.“ | Mittel |
| `src/pages/Landing.tsx:619` | „Methoden fürs Lernen-Lernen“ | Jargon. | „Lernmethoden und Arbeitsorganisation“ | Niedrig |
| `src/pages/Landing.tsx:620` | „Goldenes Badge ... erkennen geprüfte Coaches sofort.“ | Das Abzeichen belegt Schulung und Verifizierung, nicht Qualität. „Sofort“ ist Werbung. | „Coaches mit Abzeichen haben die Schulung besucht und sind verifiziert.“ | Mittel |
| `src/pages/Landing.tsx:621` | „Unkomplizierte Vermittlung, faire Richtpreise ... und ein sicherer Chat in der App.“ | „Unkompliziert“, „fair“ und „sicher“ sind Wertungen. | „Kontakt über die App. Richtwert: 10 bis 12 € pro 45 bis 60 Minuten.“ | Mittel |
| `src/pages/Landing.tsx:633` | „Lust, Fünft- und Sechstklässler zu unterstützen?“ | Umgangssprache und uneinheitliche Bezeichnung. | „Du möchtest Schülerinnen und Schüler der Klassen 5 und 6 unterstützen?“ | Niedrig |
| `src/pages/Landing.tsx:647` | „... behalten Anzeigen, Anfragen und Matches im Blick.“ | „Matches“ ist Jargon. | „... behalten Anzeigen und Anfragen im Blick.“ | Mittel |
| `src/pages/Landing.tsx:652` | „Ihr Kind nutzt seinen verifizierten Account“ | Nicht jedes Konto ist verifiziert. | „Ihr Kind nutzt sein Konto.“ | Mittel |
| `src/pages/Landing.tsx:653` | „Alle Profile sind über die SV verifiziert.“ | Falsch. Unverifizierte Profile können existieren und aufgerufen werden. | „Nur verifizierte Konten können Anzeigen erstellen und Kontakt aufnehmen. Im Profil ist sichtbar, ob jemand verifiziert ist.“ | Hoch |
| `src/pages/Landing.tsx:654` | „Vergütung und Umfang klären Sie direkt mit der Anbieter-Familie.“ | „Anbieter-Familie“ ist kein üblicher Begriff. | „Vergütung und Umfang klären Sie direkt mit der Familie der Anbieterin oder des Anbieters.“ | Niedrig |
| `src/pages/Landing.tsx:655` | „Das SV-Team sichtet täglich und ist per E-Mail erreichbar.“ | Eine tägliche Sichtung ist nicht belegt. | „Das SV-Team prüft Meldungen. Bei Fragen erreichen Sie es unter info@nachhilfe-sv.de.“ | Hoch |
| `src/pages/Landing.tsx:679` | „Die clevere Art, am FWG zu lernen.“ | Werbeslogan. | „Nachhilfebörse der Schülervertretung am FWG.“ | Mittel |

### 4.3 Login und Registrierung

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Login.tsx:379` | „Gemeinsam lernen, besser werden.“ | Klingt wie ein Werbeslogan und verspricht Verbesserung. | „Nachhilfe am FWG.“ | Mittel |
| `src/pages/Login.tsx:387` | „Exklusiv für Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums.“ | „Exklusiv“ ist Marketing. Eltern werden nicht erwähnt, obwohl sie mitbetreuen. | „Für Schülerinnen und Schüler des Friedrich-Wilhelm-Gymnasiums Köln. Eltern nutzen das Konto ihres Kindes mit.“ | Mittel |
| `src/pages/Login.tsx:400,428` | „Sicher und verifiziert“ | „Sicher“ ist eine absolute Zusage. | „Verifizierte Konten“ | Mittel |
| `src/pages/Login.tsx:429` | „Kostenlos fürs FWG“ | Wie auf der Startseite unklar, ob die Nachhilfe gemeint ist. | „Nutzung kostenlos“ | Mittel |
| `src/pages/Login.tsx:451` | „Account erstellen“ | „Account“ statt „Konto“. | „Konto erstellen“ | Mittel |
| `src/pages/Login.tsx:456` | „Schritt 1 von 2 · dauert ca. 2 Minuten. Danach: E-Mail bestätigen.“ | Zeitversprechen und unklare Zählung. Die Verifizierung hat mehr Schritte. | „Schritt 1 von 2. Danach bestätigst du deine E-Mail-Adresse.“ | Mittel |
| `src/pages/Login.tsx:154` | „Bitte fülle alle Pflichtfelder (Name, Nachname, Geburtsdatum) aus.“ | „Name“ ist mehrdeutig. Das Feld heißt „Vorname“. | „Bitte fülle alle Pflichtfelder (Vorname, Nachname, Geburtsdatum) aus.“ | Niedrig |
| `src/pages/Login.tsx:247` | „Diese E-Mail ist bereits registriert. Versuche dich einzuloggen.“ | „Einloggen“ statt „anmelden“. | „Diese E-Mail ist bereits registriert. Melde dich an.“ | Niedrig |
| `src/pages/Login.tsx:273,306,311,314,337` | „Fast geschafft!“, „SV-Code erfolgreich eingelöst!“, „Registrierung erfolgreich!“, „E-Mail ... wurde gesendet!“ | Ausrufezeichen und Erfolgsrhetorik. | „Konto erstellt. Bitte bestätige deine E-Mail-Adresse.“ „SV-Code eingelöst.“ „E-Mail zum Zurücksetzen wurde gesendet.“ | Niedrig |
| `src/pages/Login.tsx:576` | „Ohne Code: Verifizierung vor Ort im SV-Raum. Mit Code: sofort freigeschaltet.“ | Der Code-Weg fehlt in VerifySteps, ParentGuide und AccessGuard. „Sofort“ ist eine Zusage. | „Mit SV-Code wird dein Konto direkt freigeschaltet. Ohne Code verifizierst du dich im SV-Raum.“ | Hoch |
| `src/pages/Login.tsx:583` | „E-Mail Adresse“ | Bindestrich fehlt. | „E-Mail-Adresse“ | Niedrig |
| `src/pages/Login.tsx:630` | „Einloggen“ und „Jetzt starten“ | Zwei Begriffe für dieselbe Handlung. „Jetzt starten“ ist Marketing. | „Anmelden“ und „Konto erstellen“ | Mittel |
| `src/pages/Login.tsx:637` | „Neue Accounts müssen durch einen SV-Code oder vor Ort verifiziert werden ...“ | „Accounts“ statt „Konten“. | „Neue Konten müssen mit einem SV-Code oder vor Ort verifiziert werden.“ | Niedrig |
| `src/pages/Login.tsx:543-557` | „Hinweis für Nutzer unter 16 Jahren (Art. 8 DSGVO)“ und Checkbox „Meine Erziehungsberechtigten stimmen ... zu.“ | Einwilligungstext. Nicht umschreiben. Die Checkbox ist eine Selbstauskunft des Kindes. Ob das als elterliche Einwilligung reicht, ist rechtlich zu prüfen. | Kein Vorschlag. BITTE PRÜFEN durch Schulleitung und Datenschutzbeauftragte. | Hoch |

### 4.4 Feed und Anzeigenübersicht

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Feed.tsx:202` | „Kostenloses Coaching für Klasse 5 & 6!“ | Ausrufezeichen. „Coaching“ kann als kostenpflichtige Nachhilfe missverstanden werden. | „Coaching-AG für Klasse 5 und 6. Die AG-Stunde ist ehrenamtlich.“ | Hoch |
| `src/pages/Feed.tsx:413` | „Nur Schüler-Coaches der AG anzeigen“ | Jargon und uneinheitlicher Begriff. | „Nur Coaches der Coaching-AG anzeigen“ | Mittel |
| `src/pages/Feed.tsx:443` | „Suchen nach Fächern, Namen...“ | Drei Punkte statt Auslassungszeichen, Plural unklar. | „Nach Fach oder Name suchen“ | Niedrig |
| `src/pages/Feed.tsx:488,829` | „Ergebnisse konnten nicht geladen werden“, „Anzeigen konnten nicht geladen werden“ | Zwei Varianten für denselben Fehler. | Einheitlich: „Die Anzeigen konnten nicht geladen werden. Bitte lade die Seite neu.“ | Niedrig |
| `src/pages/Feed.tsx:803` | „Sicherheit und Jugendschutz haben oberste Priorität. Alle Accounts werden persönlich durch die Schülervertretung verifiziert.“ | Absolute Behauptung. Unverifizierte Profile existieren. | „Sicherheit und Jugendschutz sind wichtige Ziele. Nur verifizierte Konten können Anzeigen erstellen und Kontakt aufnehmen.“ | Hoch |
| `src/pages/Feed.tsx:853,862` | „Keine Treffer für diese Filter“, „Der Feed ist leer“ | „Feed“ ist unerklärt. | „Keine Anzeigen für diese Filter“, „Noch keine Anzeigen“ | Mittel |
| `src/pages/Feed.tsx:884` | „Hervorgehobene Anzeige“ | Der Grund der Hervorhebung fehlt. | Tooltip oder Zusatz: „Hervorgehoben durch Coach-Status oder SV-Aktion. Nicht bezahlt.“ | Niedrig |
| `src/pages/Feed.tsx:801` | „Leitfaden für Eltern & Sicherheit“ | „&“ statt „und“, aber verständlich. | „Leitfaden für Eltern und Sicherheit“ | Niedrig |

### 4.5 Anzeige erstellen

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/CreateAd.tsx:418` | „Anzeige aufgeben“ | Unklar, ob Suchen oder Bieten gemeint ist. | „Anzeige erstellen“ | Niedrig |
| `src/pages/CreateAd.tsx:549` | „... nur bei passenden Anbietern (Match) ...“ | „Match“ ist Jargon. | „... nur bei passenden Anbietern und bei Nutzern, die diese Fächer anbieten.“ | Mittel |
| `src/pages/CreateAd.tsx:557` | „Einzelnachhilfe, Kleingruppe (2–4 Schüler) oder flexibel?“ | „Flexibel“ ist unklar. | „Einzelunterricht, Kleingruppe oder nach Absprache“ | Mittel |
| `src/pages/CreateAd.tsx:596,969` | „So erscheint deine Anzeige im Feed.“ „Kurzbeschreibung (für den Feed)“ | „Feed“ ist unerklärt. | „So erscheint deine Anzeige in der Übersicht.“ „Kurzbeschreibung (für die Übersicht)“ | Mittel |
| `src/pages/CreateAd.tsx:616` | „Mindestens 1 Fach wählen. Tippe zum Filtern, statt lange zu scrollen.“ | Ziffer statt Wort, aber UI-tauglich. Der zweite Satz ist gut. | „Wähle mindestens ein Fach.“ | Niedrig |
| `src/pages/CreateAd.tsx:707` | „19 Orte in 4 Gruppen, Mehrfachauswahl möglich.“ | Die Zahl kann sich ändern und ist technisch. | „Wähle alle Orte, die für dich passen. Mehrfachauswahl ist möglich.“ | Niedrig |
| `src/pages/CreateAd.tsx:919` | „Faire Preisempfehlung: ca. 10–12 € pro 45–60 Min Richtwert am FWG“ | „Fair“ ist eine Wertung. | „Richtwert am FWG: ca. 10 bis 12 € pro 45 bis 60 Minuten.“ | Mittel |
| `src/pages/CreateAd.tsx:933` | „Etwas über dem Durchschnitt. FWG-Richtwert: ...“ | „Durchschnitt“ ist nicht belegt. | „Etwas über dem FWG-Richtwert.“ | Mittel |
| `src/pages/CreateAd.tsx:940` | „Relativ hoch für Schüler-Nachhilfe. Erlaubt, aber prüfe bitte ...“ | „Erlaubt“ klingt nach Genehmigung. | „Deutlich über dem FWG-Richtwert. Bitte prüfe, ob der Preis so gemeint ist.“ | Mittel |
| `src/pages/CreateAd.tsx:951` | „Toll! Ehrenamtliche Nachhilfe stärkt den Zusammenhalt am FWG.“ | Lob und Werbung. | „Du bietest die Nachhilfe kostenlos an.“ | Mittel |
| `src/pages/CreateAd.tsx:958` | „... ca. 10–12 € ... ein beliebter und erprobter Richtwert.“ | „Beliebt und erprobt“ ist nicht belegt. | „Richtwert am FWG: ca. 10 bis 12 € pro 45 bis 60 Minuten.“ | Mittel |
| `src/pages/CreateAd.tsx:975` | „Ein Satz, der Lust aufs Antippen macht …“ | Werbesprache und Druck. | „Ein Satz, der dein Angebot zusammenfasst.“ | Mittel |
| `src/pages/CreateAd.tsx:1017` | „Empfehlung: Nutze kostenlose Image-Hoster (z.B. Imgur, Unsplash), da wir keine direkten Uploads hosten.“ | Empfiehlt fremde Dienste, nennt unpassende Beispiele und ist für Minderjährige datenschutzrechtlich heikel. „Unsplash“ ist keine Upload-Plattform. | „Bilder können nur über einen Link eingefügt werden. Veröffentliche keine Bilder, auf denen Personen erkennbar sind.“ | Hoch |
| `src/pages/CreateAd.tsx:1030` | „Fast fertig!“ und „Prüfe dein Gesuch“ | Zwei Tonlagen. | „Anzeige prüfen“ oder „Gesuch prüfen“ | Niedrig |
| `src/pages/CreateAd.tsx:1034,1096` | „Nach dem Veröffentlichen ist die Anzeige sofort sichtbar.“ „Wird veröffentlicht...“ | „Sofort“ ist eine Zusage. Drei Punkte statt Auslassungszeichen. | „Nach dem Veröffentlichen ist die Anzeige in der Übersicht sichtbar.“ „Anzeige wird veröffentlicht“ | Mittel |

### 4.6 Anzeige, Anfragen und Chat

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/AdDetails.tsx:122` | „Lade Anzeige...“ | Drei Punkte statt Auslassungszeichen. | „Anzeige wird geladen“ | Niedrig |
| `src/pages/AdDetails.tsx:137` | „Dieses Gesuch ist privat, nicht mehr aktiv oder für dich nicht freigeschaltet.“ | „Gesuch“ passt nicht zu Angeboten. | „Diese Anzeige ist privat, nicht mehr aktiv oder für dich nicht freigeschaltet.“ | Mittel |
| `src/pages/AdDetails.tsx:225` | „Einzeln“ | Weicht von „Einzelunterricht“ ab. | „Einzelunterricht“ | Niedrig |
| `src/pages/Requests.tsx:81` | „Akzeptieren“ | Weicht von „Annehmen“ ab, das sonst verwendet wird. | „Annehmen“ | Mittel |
| `src/pages/Requests.tsx:148` | „Warte auf Antwort – du bekommst Bescheid, sobald reagiert wird.“ | Gedankenstrich und Passiv. | „Warte auf Antwort. Du bekommst eine Nachricht, sobald die andere Person reagiert.“ | Niedrig |
| `src/pages/Requests.tsx:153` | „Im Feed findest du weitere passende Anzeigen.“ | „Feed“ ist unerklärt. | „In der Übersicht findest du weitere passende Anzeigen.“ | Mittel |
| `src/pages/Requests.tsx:159` | „Kontakt freigeschaltet!“ | Ausrufezeichen. | „Kontakt freigeschaltet.“ | Niedrig |
| `src/pages/Chat.tsx:185,358` | „Möchtest du diese Nachricht wirklich löschen?“ „Diese Nachricht wurde gelöscht.“ | Der Code löscht nur lokal. Andere sehen die Nachricht weiter. Die Aussage ist irreführend. | „Möchtest du diese Nachricht auf diesem Gerät ausblenden?“ „Nachricht auf diesem Gerät ausgeblendet.“ | Hoch |
| `src/pages/Chat.tsx:194,291` | „... blockieren? Der Chat wird auf diesem Gerät verborgen.“ und Button „Nutzer blockieren“ | Der Button verspricht mehr, als passiert. Es wird nur lokal verborgen. | Button „Chat verbergen“. Dialog: „Der Chat wird auf diesem Gerät verborgen. Der Verlauf bleibt für die SV-Moderation gespeichert.“ | Hoch |
| `src/pages/Chat.tsx:326` | „... über eine verschlüsselte Verbindung (HTTPS) übertragen und sicher in Deutschland gespeichert.“ | „Sicher“ ist eine absolute Zusage. | „... über eine verschlüsselte Verbindung (HTTPS) übertragen und auf Servern in Deutschland gespeichert.“ | Mittel |
| `src/pages/Chat.tsx:460` | „Nachricht schreiben...“ | Drei Punkte statt Auslassungszeichen. | „Nachricht schreiben“ | Niedrig |

### 4.7 Profil und Einstellungen

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Profile.tsx:541` | „Profil-Stärke“ | Gamification. | „Profil vervollständigen“ | Mittel |
| `src/pages/Profile.tsx:525` | „Account eingeschränkt“ | Unklar, warum. | „Dein Konto ist noch nicht verifiziert.“ | Mittel |
| `src/pages/Profile.tsx:603` | „Klasse / Jahrgangsstufe“ | Uneinheitlich mit „Klasse/Stufe“ und „Klassenstufen“. | „Klasse“ | Mittel |
| `src/pages/Profile.tsx:831` | „Nur Matching (Privat)“ | Jargon. | „Nur für Vorschläge sichtbar“ | Mittel |
| `src/pages/Profile.tsx:837` | „Smart-Matching-Algorithmus“ | Technische und werbliche Sprache. | „für passende Vorschläge“ | Mittel |
| `src/pages/Profile.tsx:652,676` | „E-Mail-Adresse öffentlich anzeigen“, „Telefonnummer öffentlich anzeigen“ | Es fehlt, wer die Daten sieht. | Zusatz: „Andere Nutzerinnen und Nutzer sehen die Angabe dann in deinem Profil.“ | Mittel |
| `src/pages/Settings.tsx:352` | „Datenschutz & Ihre Rechte (DSGVO)“ | Sie-Form mitten im Du-Kontext. | „Datenschutz und deine Rechte“ | Hoch |
| `src/pages/Settings.tsx:379` | „Stellt eine Löschanfrage ... (Bestätigung innerhalb von 14 Tagen).“ | Prozesszusage. Ob das SV-Team die Frist leisten kann, ist nicht belegt. | Kein Vorschlag ohne Prüfung. BITTE PRÜFEN. | Mittel |
| `src/pages/Settings.tsx:407` | „Wir antworten in der Regel innerhalb kurzer Zeit auf deine Anfragen.“ | Unbestimmte Zusage. | „Wir melden uns, sobald wir deine Anfrage bearbeitet haben.“ | Mittel |
| `src/pages/Settings.tsx:435` | „Hilf mit, die FWG-Community zu vergrößern!“ | Marketing und Anglizismus. | „Wenn dir die Börse hilft, kannst du sie weitergeben.“ | Mittel |
| `src/pages/Settings.tsx:473` | „Version 2.5.0 (Autumn Edition)“ | Englisch und Marketing. | „Version 2.5.0“ | Niedrig |
| `src/pages/Settings.tsx:474` | „Entwickelt für das FWG Köln von Oskar H.“ | Öffentliche Nennung eines Schülerentwicklers. Einwilligung und Datenschutz prüfen. | „Entwickelt für das FWG Köln.“ Oder Credit nur mit Einwilligung. | Mittel |
| `src/pages/Settings.tsx:483,487,520` | „SV-Code Einlösen“, „SV-Einladungscode...“, „... bestätige mit Enter.“ | Großschreibung, uneinheitlicher Code-Begriff, Anglizismus. | „SV-Code einlösen“, „SV-Code“, „... mit der Eingabetaste bestätigen.“ | Mittel |
| `src/pages/Settings.tsx:504,509` | „SV-Admin-Rechte freigeschaltet!“, „Coaching-Admin-Rechte freigeschaltet!“, „Account verifiziert! Lade neu...“ | Technische Rollensprache, Ausrufezeichen, „Account“. | „Du bist jetzt SV-Admin.“ „Du bist jetzt Coach-Admin.“ „Konto verifiziert. Bitte lade die Seite neu.“ | Mittel |

### 4.8 Social und Matching

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Social.tsx:188` | „Bitte einloggen, um deinen Strom zu sehen.“ | „Strom“ bedeutet hier Strom wie Elektrizität. Der Begriff ist unverständlich. | „Bitte melde dich an, um deine Übersicht zu sehen.“ | Hoch |
| `src/pages/Social.tsx:205` | „Anfragen, Matches und gemerkte Anzeigen in einem Strom ...“ | Drei Jargon-Begriffe in einem Satz. | „Anfragen, Vorschläge und gemerkte Anzeigen auf einer Seite. Das Wichtigste steht oben.“ | Hoch |
| `src/pages/Social.tsx:216,252,264,282` | „Einträge im Strom“, „Dein Strom wird geladen“, „Dein Strom konnte nicht geladen werden“, „Dein Strom ist leer“ | „Strom“ ist auf allen Zuständen unverständlich. | „Einträge in der Übersicht“, „Deine Übersicht wird geladen“, „Die Übersicht konnte nicht geladen werden“, „Noch keine Einträge“ | Hoch |
| `src/pages/Social.tsx:242,279` | „Ausgeblendete Matches wiederherstellen“, „Noch keine Matches“ | „Matches“ ist Jargon. | „Ausgeblendete Vorschläge wiederherstellen“, „Noch keine Vorschläge“ | Mittel |
| `src/pages/Social.tsx:286` | „... zu deinen Fächern, Klassen und Freistunden passt ...“ | „Freistunden“ ist unklar, weil die Plattform Verfügbarkeit nutzt. | „... zu deinen Fächern, Klassen und deiner Verfügbarkeit passt ...“ | Niedrig |
| `src/pages/Social.tsx:288` | „Merk Anzeigen aus dem Feed per Herz-Symbol – hier sammeln sie sich.“ | „Feed“, Gedankenstrich, unklarer Satzbau. | „Merke Anzeigen in der Übersicht über das Herz-Symbol. Sie erscheinen dann hier.“ | Mittel |
| `src/pages/Social.tsx:291` | „Anfragen, Matches und gemerkte Anzeigen laufen hier zusammen. Starte mit einer Anzeige!“ | Jargon und Ausrufezeichen. | „Anfragen, Vorschläge und gemerkte Anzeigen findest du hier. Erstelle eine Anzeige.“ | Mittel |
| `src/pages/Matching.tsx:72,110` | „Er/sie bietet“, „Er/sie sucht“, „FWG Schüler/in“ | Binäre Schreibweise und uneinheitliche Bezeichnung. | „Bietet Nachhilfe“, „Sucht Nachhilfe“, „Schülerin oder Schüler des FWG“ | Mittel |
| `src/pages/Matching.tsx:130` | „Keine nähere Beschreibung angegeben.“ | Umständlich. | „Keine Beschreibung angegeben.“ | Niedrig |

### 4.9 Komponenten und Systemtexte

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/components/CookieBanner.tsx:47` | „... zählen wir anonym auf unserem Server ...“ | Bei angemeldeten Konten ist die Statistik laut Datenschutz pseudonym, nicht anonym. | Kein Vorschlag ohne Rechtsprüfung. „pseudonym“ ergänzen und BITTE PRÜFEN. | Hoch |
| `src/components/InstallPrompt.tsx:153,189` | „Schneller Zugriff, Offline-Funktionen, Benachrichtigungen“ | Offline-Funktionen sind nicht belegt. Daten brauchen eine Verbindung. | „Schneller Zugriff und Benachrichtigungen“ | Hoch |
| `src/components/PushPrompt.tsx:54` | „Keine Neuigkeit mehr verpassen?“ | Werbesprache und Druck. | „Benachrichtigungen aktivieren?“ | Mittel |
| `src/components/PushPrompt.tsx:79` | „Einen Moment …“ | Auslassungszeichen, aber verständlich. | „Einen Moment“ | Niedrig |
| `src/components/ErrorBoundary.tsx:36-40` | „Ups, etwas ist schiefgelaufen. ... Deine Daten sind sicher – lade die Seite einfach neu.“ | Zu locker, „sicher“ absolut, Gedankenstrich, „einfach“ als Füllwort. | „Die Seite konnte nicht geladen werden. Deine Daten bleiben gespeichert. Bitte lade die Seite neu.“ | Mittel |
| `src/components/NotFound.tsx:12,29,63,78` | „Jetzt loslegen“, „404 · Zettel abgerissen“, „Nichts klebt hier.“, „Der Zettel ist weg — aber das Brett hängt noch voller Angebote.“ | Verspielte Metapher und Gedankenstrich. Für eine Schulplattform zu locker. | „Zur Startseite“, „Seite nicht gefunden“, „Vielleicht wurde die Anzeige gelöscht oder der Link ist veraltet.“ | Mittel |
| `src/components/AccessGuard.tsx:23` | „... Die Verifizierung erfolgt persönlich im SV-Raum.“ | Der SV-Code fehlt. | „Die Verifizierung erfolgt mit einem SV-Code oder persönlich im SV-Raum.“ | Hoch |
| `src/components/ReportWizard.tsx:107` | „Vielen Dank. Die SV prüft deine Meldung schnellstmöglich.“ | „Schnellstmöglich“ ist eine unbestimmte Zusage. | „Vielen Dank. Die SV prüft deine Meldung.“ | Mittel |
| `src/components/BannedScreen.tsx:27,116,146` | „Sperre abgelaufen – bitte lade die Seite neu.“ „Temporäre Sperre“ „Einspruch einlegen / Support kontaktieren“ | Gedankenstrich, „temporär“, „Support“. | „Die Sperre ist abgelaufen. Bitte lade die Seite neu.“ „Vorübergehende Sperre“ „Einspruch einlegen“ | Niedrig |
| `src/components/ShareDialog.tsx:69` | „Link in die Zwischenablage kopiert!“ | Ausrufezeichen. | „Link kopiert.“ | Niedrig |
| `src/components/SupportModal.tsx:336-377` | „Bug melden“, „Feature vorschlagen“, „Support-Chat“, „Ticket-Formular“, „Sofort losschreiben – ganz ohne Ticket-Formular.“ | Englische Techniksprache, Gedankenstrich, Werbeton. | „Fehler melden“, „Verbesserung vorschlagen“, „Nachrichten an das SV-Team“, „Schreibe direkt an das SV-Team. Du brauchst kein Formular.“ | Hoch |
| `src/components/SupportModal.tsx:477` | „Erstelle ein Bug-Report oder Feature-Request, um einen Support-Thread zu starten.“ | Grammatikfehler und drei Anglizismen. | „Erstelle eine Anfrage, um ein Gespräch mit dem SV-Team zu beginnen.“ | Mittel |
| `src/components/SupportModal.tsx:566` | „Erfolgreich eingereicht!“ | Ausrufezeichen und Papiersprache. | „Anfrage gesendet.“ | Niedrig |
| `src/components/AvatarMakerModal.tsx:328,649` | „Profilbild aktualisiert!“, „Foto geladen!“, „Profilbild-Maker“ | Ausrufezeichen und Anglizismus. | „Profilbild aktualisiert.“ „Foto ausgewählt.“ „Profilbild erstellen“ | Niedrig |
| `src/components/StaticLayout.tsx:107` | „Die clevere Art, am FWG zu lernen.“ | Werbeslogan. | „Nachhilfebörse der Schülervertretung am FWG.“ | Mittel |

### 4.10 Coaching und Eltern

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Coaching.tsx:12` | „Große helfen Kleinen“ | Kann abwertend wirken. | „Ältere Schülerinnen und Schüler unterstützen jüngere.“ | Mittel |
| `src/pages/Coaching.tsx:14` | „Das goldene Coach-Badge ... steht für Vertrauenswürdigkeit als Person ...“ | Das Abzeichen belegt Schulung und Verifizierung, nicht die Vertrauenswürdigkeit einer Person. | „Das Abzeichen zeigt, dass die Person geschult und verifiziert ist. Es ist keine Garantie für die Qualität der Nachhilfe.“ | Hoch |
| `src/pages/Coaching.tsx:16` | „Das Angebot wird in der Regel sehr gerne angenommen ...“ | Unbelegte Beliebtheitsaussage und Werbeton. | „Die Coaches kennen den Schulalltag der jüngeren Schülerinnen und Schüler.“ | Mittel |
| `src/pages/Coaching.tsx:18` | „Die Aufnahme erfolgt nach Schulung über einen persönlichen Coaching-Code – für alle mit denselben Kriterien.“ | Gedankenstrich, fehlender Artikel. | „Die Aufnahme erfolgt nach der Schulung über einen persönlichen Coaching-Code. Für alle gelten dieselben Kriterien.“ | Niedrig |
| `src/pages/Coaching.tsx:20` | „Sichtbarkeit ist bei uns nicht käuflich ... Versteckte Bevorzugungen gibt es nicht ... +24 Stunden Aktualität bzw. leicht bessere Match-Einordnung“ | Defensive Werbesprache, technische Zahlen, „Match“. | „Es gibt keine bezahlten Platzierungen. Anzeigen von Coaches werden etwas höher einsortiert, solange der Coach-Status aktiv ist.“ | Mittel |
| `src/pages/Coaching.tsx:22` | „Jede Schülerin und jeder Schüler kann kostenlos Anzeigen erstellen ...“ | „Kostenlos“ bezieht sich auf die Anzeige, nicht auf die Nachhilfe. Kann missverstanden werden. | „Das Erstellen einer Anzeige ist kostenlos. Die Nachhilfe wird privat bezahlt.“ | Hoch |
| `src/pages/Coaching.tsx:204` | „Badge & Start“ | Anglizismus. | „Abzeichen und Start“ | Mittel |
| `src/pages/Coaching.tsx:209` | „Account anlegen. Das dauert keine große Pause.“ | Unklarer Satz, „Account“. | „Lege ein Konto an.“ | Hoch |
| `src/pages/Coaching.tsx:210` | „Sag einfach: ‚Hey, ich habe mich angemeldet, ich möchte mich verifizieren lassen.‘“ | Umgangssprache und langer Satz. | „Sag im SV-Raum, dass du dich verifizieren lassen möchtest.“ | Niedrig |
| `src/pages/Coaching.tsx:211` | „Wir schalten dich frei. Du bist verifiziert.“ | Zwei Handlungen in einem Schritt. Der Doppelpunkt im Live-Text ist ein Renderingfehler. | Schritt 3: „Warte auf die Freischaltung.“ Danach: „Erst dann kannst du Anzeigen erstellen und Kontakt aufnehmen.“ | Hoch |
| `src/pages/Coaching.tsx:227` | „Die 7 Fairness-Regeln“ | Auf der Live-Seite waren keine Regeln sichtbar. Der Inhalt sind außerdem eher Hinweise als sieben Regeln. | „Regeln und Hinweise“ oder die sieben Regeln tatsächlich ausformulieren und sichtbar machen. BITTE PRÜFEN. | Hoch |
| `src/pages/Coaching.tsx:246` | „Kick-off am Mittwoch, 16.09. ... Ab dem 21.09. ...“ | Kein Jahr. Für eine Seite, die länger online ist, unklar. | „Start am Mittwoch, 16. September 2026 ... Ab dem 21. September 2026 ...“ | Mittel |
| `src/pages/Coaching.tsx:247` | „Nach der Anmeldung ist die Teilnahme verbindlich. Darüber hinaus ist eine freiwillige Teilnahme jederzeit möglich.“ | Widerspruch: verbindlich und freiwillig zugleich. | BITTE PRÜFEN, was gemeint ist. Danach klar formulieren. | Hoch |
| `src/pages/Coaching.tsx:259` | „Terminabsprachen ... trefft ihr gerne individuell persönlich oder per Mail ...“ | „Gerne“ und „individuell persönlich“ sind redundant. | „Termine für ein Lerncoaching vereinbart ihr persönlich oder per E-Mail mit ...“ | Niedrig |
| `src/pages/ParentGuide.tsx:52` | „Ein Konto pro Kind, je nach Alter gemeinsam betreut oder selbstständig genutzt.“ | Korrekt und klar. | Beibehalten. | Niedrig |
| `src/pages/ParentGuide.tsx:74` | „Ihr Kind meldet sich persönlich im SV-Raum und wird dort freigeschaltet.“ | Der SV-Code fehlt. | „Ihr Kind bestätigt sein Konto mit einem SV-Code oder persönlich im SV-Raum.“ | Hoch |
| `src/pages/ParentGuide.tsx:76` | „Unverifizierte Konten bleiben eingeschränkt und können deaktiviert werden.“ | Korrekt. | Beibehalten. | Niedrig |
| `src/pages/ParentGuide.tsx:106` | „Faire Preise: ca. 10–12 € / 45–60 Min“ | „Fair“ ist eine Wertung. Der Preis widerspricht PRODUCT.md. | „Richtwert: ca. 10 bis 12 € pro 45 bis 60 Minuten.“ Zahl erst nach Entscheidung. | Hoch |
| `src/pages/ParentGuide.tsx:135` | „Ein Konto, gemeinsam genutzt“ | Klingt wie ein gemeinsamer Login und widerspricht „Ein Konto pro Kind“. | „Ein Konto pro Kind, das Sie mitbetreuen.“ | Hoch |
| `src/pages/ParentGuide.tsx:173` | „Das SV-Team sichtet Meldungen täglich.“ | Nicht belegt. | „Das SV-Team prüft Meldungen. Bei Fragen erreichen Sie es unter info@nachhilfe-sv.de.“ | Hoch |

### 4.11 E-Mails und API-Meldungen

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `api/mailer.php:506` | „Willkommen an Bord!“ | Nautische Metapher und Werbeton. | „Willkommen bei der Nachhilfebörse“ | Mittel |
| `api/mailer.php:592,597` | „Neues Interesse an deiner Anzeige!“ „Gute Neuigkeiten! ... hat Interesse ...“ | Ausrufezeichen und Werbeton. | „Neue Anfrage zu deiner Anzeige“ „... hat eine Anfrage zu deiner Anzeige gesendet.“ | Mittel |
| `api/mailer.php:620,623` | „... hat deine Anfrage angenommen!“ „Großartig! ...“ | Ausrufezeichen und Jubelton. | „... hat deine Anfrage angenommen.“ „... hat deine Anfrage angenommen. Ihr könnt jetzt im Chat Termine und Details klären.“ | Mittel |
| `api/mailer.php:677,682` | „Match-Score: X% Übereinstimmung“ „Klasse, Fach und Unterrichtsform stimmen hervorragend überein. ... mit nur einem Klick ...“ | Prozentzahl wirkt exakter als die Logik ist. „Hervorragend“ und „mit nur einem Klick“ sind Werbung. | „Passende Anzeige“ und die Übereinstimmungen einzeln nennen. Keine Prozentzahl ohne belegte Berechnung. | Hoch |
| `api/mailer.php:702-711` | „Herzlichen Glückwunsch zu deinem Meilenstein!“ „Du hast ... verdient.“ „Dieses Abzeichen schmückt ab sofort dein öffentliches Profil ...“ | Gamification und Werbeton. | „Neues Abzeichen in deinem Profil“ „Das Abzeichen ist jetzt in deinem Profil sichtbar.“ | Mittel |
| `api/mailer.php:488` | „Dein Bestätigungs-Code – FWG Nachhilfebörse“ | Gedankenstrich im Betreff. | „Dein Bestätigungs-Code: FWG Nachhilfebörse“ | Niedrig |
| `api/ads.php:526`, `api/requests.php:238`, `api/reviews.php:170`, `api/support.php:163` | „Anzeige erfolgreich erstellt!“, „Anfrage erfolgreich gesendet!“, „Bewertung erfolgreich abgegeben!“, „Support-Ticket erfolgreich übermittelt!“ | Ausrufezeichen und Erfolgsrhetorik. | „Anzeige erstellt.“ „Anfrage gesendet.“ „Bewertung gespeichert.“ „Anfrage an das SV-Team gesendet.“ | Niedrig |
| `api/favorites.php:122` | „Anzeige gemerkt! ⭐“ | Emoji und Ausrufezeichen. | „Anzeige gespeichert.“ | Mittel |
| `api/messages.php:148`, `api/requests.php:207,220,294` | „Ein/e Mitschüler/in“ | Schreibweise mit Schrägstrich, binär und holprig. | „Mitschülerin oder Mitschüler“ | Mittel |
| `api/profiles.php:147,289`, `src/pages/Feed.tsx:202`, `src/pages/coach/CoachPanel.tsx:45` | „Kostenloses Coaching für Klasse 5 & 6!“ | Ausrufezeichen, „&“, Doppelbedeutung von „Coaching“. | „Coaching-AG für Klasse 5 und 6“ | Hoch |

### 4.12 Rechtstexte

Rechtstexte werden nicht umgeschrieben. Die Tabelle nennt nur Auffälligkeiten und Lücken. Zuständig sind Schulleitung und Datenschutzbeauftragte. Keine Rechtsberatung.

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/Impressum.tsx:37` | „Telefon: [Telefon: wird ergänzt]“ | Pflichtangabe fehlt. Das Label ist doppelt. | Kein Vorschlag. Telefonnummer ergänzen und Label einmal setzen. | Hoch |
| `src/pages/Impressum.tsx:73` | „[Name, Funktion: wird ergänzt]“ | Verantwortliche Person nach § 18 Abs. 2 MStV fehlt. | Kein Vorschlag. Name und Funktion ergänzen. | Hoch |
| `src/pages/Impressum.tsx:50-51,73` | „Ansprechpartner für Inhalte ... ist das SV-Team.“ und „[Name, Funktion] ... für das SV-Team“ | Zwei Zuständigkeiten für dieselbe Aufgabe. | Kein Vorschlag. Klären, wer verantwortlich ist. | Mittel |
| `src/pages/Datenschutz.tsx:48-49` | „Wir verkaufen nichts, wir tracken nicht ...“ | Steht in Spannung zur pseudonymen Nutzungsstatistik in Zeile 100. | Kein Vorschlag. Formulierung rechtlich prüfen. | Hoch |
| `src/pages/Datenschutz.tsx:107-110` | „die Einwilligung“ und „persönlichen Verifizierung“ werden live ohne Leerzeichen als „dieEinwilligung“ und „persönlichenVerifizierung“ gerendert. | Sichtbarer Darstellungsfehler durch JSX-Zeilenumbruch. | Kein inhaltlicher Vorschlag. Leerzeichen im Markup sicherstellen. | Hoch |
| `src/pages/Datenschutz.tsx:107-110` | „Bei der Registrierung wird sie abgefragt und dokumentiert, und bei der persönlichen Verifizierung im SV-Raum wird der Account zusätzlich geprüft.“ | Die Einwilligung ist nur eine Checkbox mit Zeitstempel. Eine Prüfung der elterlichen Zustimmung ist nicht erkennbar. | Kein Vorschlag. Rechtlich prüfen, ob eine Elternbestätigung nötig ist. | Hoch |
| `src/pages/Datenschutz.tsx:145` | „Moderationsprotokolle ... bewahren wir ... noch 12 Monate auf und löschen sie danach.“ | Eine automatische Löschung nach 12 Monaten ist im Code nicht erkennbar. | Kein Vorschlag. Technische Löschroutine prüfen oder Aussage anpassen. | Hoch |
| `src/pages/Datenschutz.tsx:159-162` | „Die vollständige Löschung ... beantragst du über ein Support-Ticket ...“ | Die 14-Tage-Bestätigung ist eine Prozesszusage, keine automatische Löschung. | Kein Vorschlag. Prüfen, ob das SV-Team die Frist leisten kann. | Mittel |
| `src/components/CookieBanner.tsx:47` | „... zählen wir anonym ...“ | Bei angemeldeten Konten ist die Statistik pseudonym. | Kein Vorschlag. „Anonym“ durch „ohne IP-Adresse“ ersetzen und rechtlich prüfen. | Hoch |
| `src/pages/Nutzungsbedingungen.tsx:220` | „Richtpreise 10–12 €/45–60 Min“ | Widerspricht PRODUCT.md mit 10–15 €/45 Min. | Kein Vorschlag. Eine Zahl festlegen. | Hoch |
| `src/pages/Nutzungsbedingungen.tsx:198` | „... können Accounts erstellen ...“ | „Accounts“ statt „Konten“. | Kein inhaltlicher Vorschlag. Begriff nur nach Rechtsprüfung ändern. | Niedrig |
| `src/pages/Nutzungsbedingungen.tsx:285` | „... über ein Support-Ticket in der App ...“ | „Support-Ticket“ ist technisch. | Kein Vorschlag. Rechtstext nicht redigieren. | Niedrig |
| `src/pages/Datenschutz.tsx:100` | „... nicht anonym, sondern pseudonym; sie wird nach 90 Tagen automatisch gelöscht.“ | Korrekt und transparent. | Beibehalten. | Niedrig |

### 4.13 Weitere Systemtexte

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/components/CookieBanner.tsx:44` | „Datenschutz & Cookies“ | „&“ statt „und“, aber verständlich. | „Datenschutz und Cookies“ | Niedrig |
| `src/components/PushPrompt.tsx:58-59` | „Du hast Benachrichtigungen abgelehnt. Aktiviere sie in den Browser-Einstellungen ...“ | Korrekt und hilfreich. | Beibehalten. | Niedrig |
| `src/components/NotificationCenter.tsx:263-264` | „Nichts Neues“ „Du bist auf dem aktuellen Stand.“ | Klar. | Beibehalten. | Niedrig |
| `src/pages/BannedScreen.tsx:106` | „Kein spezifischer Grund angegeben. Bitte kontaktiere die SV.“ | Klar, aber „spezifisch“ ist unnötig. | „Kein Grund angegeben. Bitte kontaktiere die SV.“ | Niedrig |
| `src/pages/ReportWizard.tsx:252` | „Missbrauch der Meldefunktion kann zu einer Sperre deines Kontos führen.“ | Korrekt. | Beibehalten. | Niedrig |
| `src/pages/AccessGuard.tsx:23` | „... Anzeigen zu durchsuchen, Anfragen zu senden oder zu chatten.“ | „Chatten“ ist umgangssprachlich. | „... Anzeigen zu durchsuchen, Anfragen zu senden oder Nachrichten zu schreiben.“ | Niedrig |
| `src/pages/Settings.tsx:474` | „Entwickelt für das FWG Köln von Oskar H.“ | Öffentliche Namensnennung eines Minderjährigen. | Nur mit Einwilligung nennen. Sonst „Entwickelt für das FWG Köln.“ | Mittel |

### 4.14 Weitere Seiten

| Ort | Aktueller Text | Problem | Vorschlag | Priorität |
|---|---|---|---|---|
| `src/pages/PublicProfile.tsx:91` | „Profil wird geladen...“ | Drei Punkte statt Auslassungszeichen. | „Profil wird geladen“ | Niedrig |
| `src/pages/UpdatePassword.tsx:58,64` | „Fehler beim Aktualisieren: “ + technische Fehlermeldung | Die Meldung kann englische oder technische Texte anzeigen. Sie sagt nicht, was man tun kann. | „Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.“ | Mittel |
| `src/pages/UpdatePassword.tsx:60` | „Dein Passwort wurde erfolgreich aktualisiert!“ | Ausrufezeichen und Erfolgsrhetorik. | „Passwort geändert.“ | Niedrig |
| `src/pages/Transparenz.tsx:51` | „Agentisches Coding: KI-Agenten schreiben, ändern und testen den Code ...“ | „Agentisches Coding“ ist Fachjargon. | „KI-Programme haben große Teile des Codes geschrieben und getestet. Ein Mensch hat Ziele gesetzt und geprüft.“ | Mittel |
| `src/pages/Transparenz.tsx:59` | „AI-generated ist AI-generated“ | Tautologie und Englisch. | „Ein großer Teil des Codes und der Texte wurde mit KI erstellt.“ | Mittel |
| `src/pages/Transparenz.tsx:42` | „Seit Ende 2025, also über zehn Monate ...“ | Die Zahl ist eine Momentaufnahme und kann veralten. | „Seit Ende 2025.“ Ohne Dauerangabe. | Niedrig |
| `src/pages/Cookies.tsx:77` | „... bei Anmeldung mit Konto-Kennung, pseudonym ...“ | Korrekt und konsistent mit dem Datenschutz. | Beibehalten. Der Cookie-Banner sollte dieselbe Formulierung nutzen. | Niedrig |
| `src/pages/VerifyEmail.tsx:79` | „Nichts im Postfach? Schau auch im Spam-Ordner nach.“ | Klar und hilfreich. | Beibehalten. | Niedrig |

## 5. BITTE PRÜFEN

Die folgenden Punkte sind keine Stilfragen. Sie brauchen eine Entscheidung, eine technische Prüfung oder eine rechtliche Bewertung.

1. **Preisrichtwert:** Gilt 10 bis 12 € pro 45 bis 60 Minuten oder 10 bis 15 € pro 45 Minuten? Betroffen sind `Landing.tsx:621`, `ParentGuide.tsx:106`, `Coaching.tsx:206`, `CreateAd.tsx:919,926,933,958`, `Nutzungsbedingungen.tsx:220`, `PRODUCT.md:35` und `docs/schulleitung/02-QA-Katalog.md:360`.
2. **Elternmodell:** Das Eltern-Dashboard wurde laut `docs/Eltern-Mitbetreuung.md` entfernt. README, PRODUCT und mehrere Schulleitungsdokumente beschreiben es weiterhin. Alle Stellen korrigieren, besonders das Demo-Drehbuch `docs/schulleitung/03-Produkt-und-Demo.md`.
3. **Verifizierungswege:** Login und Settings nennen SV-Code und SV-Raum. VerifySteps, ParentGuide und AccessGuard nennen nur den SV-Raum. Beide Wege sind technisch vorhanden. Überall einheitlich beschreiben.
4. **„Alle Profile sind verifiziert“:** Diese Aussage ist falsch. Unverifizierte Profile können existieren. Nur die Aussage „Nur verifizierte Konten können Anzeigen erstellen und Kontakt aufnehmen“ ist belegt.
5. **„Täglich“:** Landing und ParentGuide versprechen eine tägliche Sichtung von Meldungen. Eine interne Zielsetzung von unter 24 Stunden ist kein Nachweis für eine tägliche Prüfung. Entweder Prozess belegen oder Zeitversprechen entfernen.
6. **Löschfristen:** Die Bestätigung einer Kontolöschung innerhalb von 14 Tagen ist eine Prozesszusage. Prüfen, ob das SV-Team sie einhalten kann. Die Löschung der Moderationsprotokolle nach 12 Monaten ist im Code nicht erkennbar.
7. **Einwilligung unter 16:** Die Registrierung speichert eine Checkbox und ein Datum. Eine Prüfung durch Eltern oder Erziehungsberechtigte ist nicht erkennbar. Rechtlich prüfen, ob das für Art. 8 DSGVO ausreicht. Zuständig: Schulleitung und Datenschutzbeauftragte.
8. **Cookie-Banner und Datenschutz:** „Anonym“ im Banner und „wir tracken nicht“ im TL;DR stehen im Widerspruch zur pseudonymen Statistik mit Konto-Kennung. Nur markieren, nicht ohne Rechtsprüfung ändern.
9. **Impressum:** Telefonnummer und verantwortliche Person nach § 18 Abs. 2 MStV fehlen. Das ist eine Pflichtangabe, keine Stilfrage.
10. **Promo-Code `BANANE`:** Der Code steht öffentlich in `README.md:83`. Prüfen, ob er noch gültig ist. Wenn ja, sperren.
11. **„Offline-Funktionen“:** `InstallPrompt.tsx` verspricht Offline-Funktionen. Prüfen, was die PWA tatsächlich offline kann. Sonst den Satz entfernen.
12. **„Sofort sichtbar“ und „sofort freigeschaltet“:** Prüfen, ob Anzeigen und SV-Codes tatsächlich ohne Verzögerung aktiv sind. Sonst „nach der Prüfung“ schreiben.
13. **Jährliche Prüfung:** `README.md:128` behauptet eine jährliche Kontrolle unverifizierter Konten. Prüfen, ob dieser Prozess existiert.
14. **Die 7 Fairness-Regeln:** Auf der Live-Seite waren keine Regeln sichtbar. Der Abschnitt enthält eher Hinweise als sieben Regeln. Prüfen, ob die Inhalte fehlen oder eingeklappt sind.
15. **Förderunterricht:** „Nach der Anmeldung ist die Teilnahme verbindlich. Darüber hinaus ist eine freiwillige Teilnahme jederzeit möglich.“ Dieser Widerspruch muss geklärt werden. Außerdem fehlt das Jahr bei „16.09.“ und „21.09.“.
16. **Bilder:** `CreateAd.tsx:1017` empfiehlt Imgur und Unsplash. Beides sind keine geeigneten Upload-Wege für eine Schulplattform. Prüfen, ob Bild-URLs überhaupt öffentlich sein sollen und ob Minderjährige darauf erkennbar sein können.
17. **Öffentliche E-Mail:** Die Startseite sagt, E-Mail werde erst nach Annahme sichtbar. Im Profil gibt es einen Schalter „E-Mail-Adresse öffentlich anzeigen“. Prüfen, welche Aussage gilt.
18. **Entwicklername:** `Settings.tsx:474` nennt „Oskar H.“ öffentlich. Einwilligung und Datenschutz prüfen.
19. **„Die clevere Art, am FWG zu lernen.“** Der Satz steht auf der Startseite, im Footer und in `StaticLayout.tsx`. Er ist Werbung, keine Information. Ersetzen.
20. **README und PRODUCT als öffentliche Dokumente:** Beide enthalten veraltete Features und Marketing. Vor dem nächsten Teilen mit Schulleitung oder Presse korrigieren.

## 6. Offene Fragen

1. Welcher Preisrichtwert gilt verbindlich: 10 bis 12 € pro 45 bis 60 Minuten oder 10 bis 15 € pro 45 Minuten?
2. Soll die Verifizierung überall als „SV-Code oder SV-Raum“ beschrieben werden, oder soll der Code-Weg bewusst nicht beworben werden?
3. Kann das SV-Team Meldungen täglich sichten und Löschungen innerhalb von 14 Tagen bestätigen?
4. Gibt es eine technische Löschroutine für Moderationsprotokolle nach 12 Monaten?
5. Wie soll die Einwilligung der Erziehungsberechtigten bei unter 16-Jährigen eingeholt und geprüft werden?
6. Soll „Coaching“ nur für die ehrenamtliche AG und „Nachhilfe“ für bezahlte Angebote stehen?
7. Bleibt es bei „Schüler duzen, Eltern siezen“, auch auf der Startseite und im Login?
8. Soll ich für die App-Innenseiten einen Testzugang erhalten, damit Feed, Chat, Profil und Einstellungen auch visuell geprüft werden können?

## 7. Empfohlene Reihenfolge für die Umsetzung

1. **Tatsachen zuerst:** Eltern-Dashboard, Verifizierungswege, „alle Profile“, „täglich“, Preise und Impressum korrigieren.
2. **Rechtliches danach:** Einwilligung, Cookie-Banner, Löschfristen und Datenschutz mit Schulleitung und Datenschutzbeauftragter klären. Keine Textänderung ohne diese Prüfung.
3. **Dann die Irreführungen:** Chat-Löschen, Chat-Blockieren, „Strom“, „Kostenlos“ und „Offline-Funktionen“.
4. **Dann die Sprache:** Werbesprache, Anglizismen, Ausrufezeichen und Gedankenstriche entfernen. Glossar anwenden.
5. **Zum Schluss:** Feinschliff bei Fehlermeldungen, Leerzuständen und kleinen Grammatikfehlern.

## 8. Grenzen dieses Audits

- Die App-Innenseiten wurden nicht live gesehen. Die Texte stammen aus dem Code.
- Rechtstexte wurden nicht umgeschrieben und nicht rechtlich bewertet.
- Es wurden keine Preise, Fristen, Zuständigkeiten oder Prozesse erfunden. Wo eine Angabe fehlt, steht „BITTE PRÜFEN“.
- Die Live-Seite kann von den hier zitierten Codeständen abweichen. Das ist bei `Coaching.tsx` bereits sichtbar: Der Live-Text weicht redaktionell leicht vom Fallback im Code ab.
- Die Zeilennummern sind eine Orientierung. Während der Prüfung haben sich einige Dateien um eine Zeile verschoben. Die zitierten Textstellen sind über den Wortlaut eindeutig zu finden.
