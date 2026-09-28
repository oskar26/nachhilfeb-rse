# Q&A-Katalog — Fragen, Antworten, Fundstellen

**Gebrauch:** Spickzettel für das Gespräch. Zu jeder Frage: eine **Antwort in Sprechsprache**
(das ist der Satz, der gesagt wird), dahinter die **Fundstelle bzw. Begründung** für Rückfragen.
Am Ende (Abschnitt J) die **Formulierungen, die wir vermeiden müssen**.

**Grundhaltung:** Kurz antworten. Bei Risiken: Risiko benennen → Maßnahme nennen → Nachweis anbieten.
Niemals behaupten, etwas sei „rechtlich geprüft“, was nur das SV-Team gelesen hat.

---

## A. Grundsätzliches

**A1 · „Was ist die Nachhilfebörse überhaupt?“**
Eine Vermittlungsplattform der SV, nur für das FWG: Schülerinnen und Schüler suchen oder bieten
Nachhilfe, die SV verifiziert die Nutzer persönlich und moderiert die Inhalte. Wir vermitteln nur
den Kontakt — den Nachhilfeunterricht verabreden die Familien privat.
*Hintergrund: § 74 Abs. 1 SchulG NRW, Nr. 2.2.1 SV-Erlass.*

**A2 · „Warum machen wir das? Gibt es das nicht schon?“**
Es gibt kommerzielle Nachhilfeinstitute und es gibt Klassengruppen. Das eine kostet viel Geld,
das andere hat keine Moderation. Unsere Börse ist kostenlos, schulintern, verifiziert und
moderiert — und sie funktioniert auch für Familien, die sich ein Institut nicht leisten können.
*Hintergrund: Digitale Teilhabe; Kosten für die Schule: 0 €.*

**A3 · „Wie viele nutzen das schon?“**
Kurz die Live-Zahlen vom Sitzungstag nennen (aus dem SV-Panel oder `api/analytics/summary`).
Nie geschätzte Zahlen nennen — die Zahlen stehen in der App und sind nachprüfbar.
*Hinweis: „Demo-Anzeigen“ auf der Startseite sind als Demo gekennzeichnet — das ist Absicht, und wir
erfinden keine Nutzerzahlen.*

**A4 · „Ist das fertig oder noch ein Prototyp?“**
Es läuft. Anmelden, Anzeige erstellen, suchen, anfragen, chatten, melden, moderieren funktioniert;
Eltern können Konten verknüpfen. Was fehlt, sind Ausbaustufen (z. B. Kalender-Ausblick,
Feinschliff). Wir sagen offen: Das ist ein Schülerprojekt, kein fertiges Industrieprodukt.

**A5 · „Wer hat das gebaut? Eine Agentur?“**
Nein. Das SV-Team, mit Unterstützung durch KI-Werkzeuge (sogenanntes agentisches Coding).
Ein großer Teil von Code und Texten ist maschinell erstellt — das steht offen auf der Seite
„Transparenz“ und im GitHub-Repository. Entscheidungen, Prüfung, Rechtstexte und die Freigabe
liegen bei Menschen.
*Fundstelle: nachhilfe-sv.de/#/transparenz.*

**A6 · „Was kostet das die Schule?“**
Nichts. Domain und Hosting zahlt die SV aus ihren eigenen Mitteln. Für die Schule entstehen
weder Personalkosten noch Sachkosten noch ein Wartungsvertrag.
*Fundstelle: Nr. 8.1 SV-Erlass; Hosting bei ALL-INKL (~7 €/Monat, SV-Mittel).*

**A7 · „Was passiert, wenn ihr in zwei Jahren alle abgeht?“**
Es gibt eine Übergabe-Regel: Zugangsdaten liegen in einem verschlossenen Notfall-Umschlag bei den
Verbindungslehrkräften, dazu eine Übergabe-Checkliste. Die Plattform kann jederzeit in einen
schreibgeschützten Zustand gesetzt werden. Open Source: Jede Nachfolge-SV kann weiterentwickeln.

**A8 · „Warum so ein aufwendiges Ding statt Aushang am schwarzen Brett?“**
Weil das schwarze Brett datenschutzfrei ist, aber unlösbare Probleme hat: Es kennt keine
Zuständigkeit, keine Verifizierung, keine Löschung und keinen Missbrauchsweg. Und Klassenbeste
hängen sich nicht mit Handynummer auf. Die App steht bewusst **allen** offen, ohne dass jemand
seine Nummer öffentlich macht.

---

## B. Recht & Zuständigkeit

**B1 · „Dürfen Schüler so etwas überhaupt? Das ist doch Schulbetrieb.“**
Ja. Der SV-Erlass zählt die „Förderung von fachlichen, kulturellen, sportlichen, politischen und
sozialen Interessen“ ausdrücklich zu den Aufgaben der SV — inklusive Arbeitsgemeinschaften und
Arbeitskreisen. Eine Nachhilfebörse ist eine klassische selbstgewählte Aufgabe.
*Fundstelle: § 74 Abs. 1 SchulG NRW; Nr. 2.2.1 SV-Erlass.*

**B2 · „Wer muss dem zustimmen?“**
Sie. Sonstige Veranstaltungen der SV sind Schulveranstaltungen, wenn die Schulleitung vorher
zustimmt. Das ist die Rechtsgrundlage, die wir brauchen — und die einzige.
*Fundstelle: § 74 Abs. 5 SchulG NRW; Nr. 6.2 SV-Erlass.*

**B3 · „Brauchen wir eine Satzung oder eine Satzungsänderung?“**
Nein. Die SV kann sich eine Satzung geben, sie muss aber nicht — und sie bedarf keiner Genehmigung.
Die Börse kann als Ausschuss-Aufgabe des Schülerrats beschlossen werden.
*Fundstelle: Nr. 1.10 und Nr. 3.4.3 SV-Erlass.*

**B4 · „Muss die Schulkonferenz zustimmen?“**
Nein, das ist keine Konferenzangelegenheit. Es ist eine SV-Aufgabe. Wir berichten aber gerne im
Rahmen der üblichen Berichte — Transparenz kostet nichts.

**B5 · „Muss die Bezirksregierung oder die Stadt Köln zustimmen?“**
Nur Ihre Zustimmung ist erforderlich. Die Schulaufsicht wird erst dann zuständig, wenn Sie die
Zustimmung versagen und der Schülerrat die Entscheidung herbeiführt. Der Schulträger ist nicht
beteiligt, weil kein städtisches Personal und keine städtische Infrastruktur genutzt werden.
*Fundstelle: Nr. 6.3 SV-Erlass (letzter Satz).*

**B6 · „Können Sie die Zustimmung nur aus zwei Gründen versagen?“**
Ja, ausweislich des Erlasses: bei besonderer Gefahr für Leib und Leben oder wenn die Veranstaltung
geeignet ist, den Bildungs- und Erziehungsauftrag zu gefährden. Vorher werden wir als SV und die
Verbindungslehrkraft angehört.
*Fundstelle: Nr. 6.3 SV-Erlass.*

**B7 · „Eine Website ist doch keine Veranstaltung.“**
Richtig, der Erlass wurde 1979 geschrieben — er kennt keine Websites. Trotzdem ist die Zustimmung
der richtige Weg: Sie macht die Börse formal zum SV-Angebot, damit die Verantwortung eindeutig ist.
Alternativ wäre die Börse ein rein privates Projekt von Schülern, das den Namen der Schule nutzt —
dann wäre die Verantwortung völlig unklar, und das wollen wir ausdrücklich nicht.
*Das ist die ehrlichste Antwort auf die formal stärkste Nachfrage. Nicht ausweichen!*

**B8 · „Ist das kommerziell? Muss man ein Gewerbe anmelden?“**
Nein. Weder SV noch Schule nehmen Geld ein. Es gibt keine Werbung, keine Provision, keine
Gebühren. Werbliche Anzeigen sind in den Nutzungsbedingungen verboten.
*Hintergrund: Auch ohne Gewerbe bleibt es ein nicht-kommerzielles Angebot der Schule.*

**B9 · „Dürfen Externe mitmachen — etwa Nachbarn oder Geschwister?“**
Nein. Zugang nur für FWG-Angehörige nach persönlicher Verifizierung im SV-Raum. Das ist der Kern
des Sicherheitskonzepts. Auf Beschluss des Schülerrats und im Einvernehmen mit Ihnen könnten
theoretisch auch schulfremde Personen teilnehmen — wir wollen das ausdrücklich **nicht**.
*Fundstelle: Nr. 6.2 Satz 3 SV-Erlass (Möglichkeit, die wir bewusst nicht nutzen).*

**B10 · „Wer ist der Betreiber — die SV ist doch kein Verein?“**
Praktisch: die SV als Teil der Schule. Rechtlich sauber wird es genau durch Ihre Zustimmung:
Dann ist es eine Veranstaltung der Schule, und die Verantwortung liegt dort, wo die Aufsicht liegt.
Klartext: Die SV kann nicht selbst haften wie eine Firma — es haftet die Schule bzw. dort, wo
die gesetzliche Haftung greift, greift sie. Genau deshalb wollen wir die Zustimmung schriftlich.
*Fundstelle: Nr. 1.6 SV-Erlass („Die SV ist Teil der Schule und unterliegt damit den für die Schule
geltenden Vorschriften“); BASS 10-41 Nr. 4 (Schulleitung verantwortlich).*

**B11 · „Und wenn uns das später nicht mehr gefällt?“**
Ihre Zustimmung ist widerruflich. Es gibt ein dokumentiertes Not-Aus-Verfahren: Plattform
abschaltbar, Daten exportierbar, Löschung binnen 30 Tagen. Das steht so auch in der
Vereinbarung.

**B12 · „Brauchen wir einen Beschluss des Schülerrats?“**
Ja, und den haben wir: Der Schülerrat beschließt die Börse als AG/Ausschuss-Aufgabe und benennt das
Betriebsteam. Das Protokoll liegt vor.
*Fundstelle: Nr. 2.2.1, Nr. 3.4.3 SV-Erlass.*

---

## C. Datenschutz

**C1 · „Wer ist datenschutzrechtlich verantwortlich?“**
Mit Ihrer Zustimmung: die Schule bzw. Sie als Schulleitung — so wie bei jedem anderen schulischen
Verfahren auch. Wir haben die vollständigen Unterlagen schon vorbereitet: Verfahrensbeschreibung,
Eintrag für das Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO), technische und
organisatorische Maßnahmen und das Löschkonzept.
*Fundstelle: BASS 10-41 Nr. 4: „Die Schule ist … speichernde Stelle … Für das Einhalten der
Datenschutzvorschriften ist die Schulleiterin oder der Schulleiter verantwortlich.“*

**C2 · „Muss der Datenschutzbeauftragte eingeschaltet werden?“**
Ja — und das ist ein Vorteil, keine Hürde. Die Dienstanweisung für automatisierte Datenverarbeitung
in der Schule verlangt, dass ein Verfahren **vor Nutzung mit Echtdaten** im Verfahrensverzeichnis
dokumentiert und dem behördlichen Datenschutzbeauftragten **zur Vorabkontrolle vorgelegt** wird.
Wir haben das Schreiben und die Unterlagen fertig; Sie müssen es nur weiterleiten.
*Fundstelle: BASS 10-41 Nr. 4 (Dienstanweisung ADV).*

**C3 · „Müssen wir die Datenschutzaufsicht (LDI NRW) informieren?“**
Nein, eine Vorabmeldung ist nicht vorgesehen. Die Aufsichtsbehörde ist erst im Ernstfall
angesprochen — bei einer Datenpanne mit Risiko für Betroffene, dann binnen 72 Stunden.
*Fundstelle: Art. 33 DSGVO.*

**C4 · „Brauchen wir eine Datenschutz-Folgenabschätzung?“**
Nach Einschätzung des Schulministeriums ist für Verarbeitungen von Schülerdaten zu schulischen
Zwecken in der Regel keine DSFA erforderlich. Wir haben die Prüffragen trotzdem in der
Verfahrensbeschreibung beantwortet, damit der bDSB die Einschätzung bestätigen oder korrigieren
kann. Unsere Verarbeitung: keine Profilbildung, keine Scoring-Verfahren, keine sensiblen Daten.
*Fundstelle: MSB NRW, FAQ Datenschutz (DSFA bei schulischen Verarbeitungen in der Regel nicht
erforderlich); Art. 35 DSGVO.*

**C5 · „Werden die Kinder heimlich überwacht?“**
Nein. Es gibt keine anlasslose Kontrolle privater Chats. Geprüft wird an drei Stellen: durch den
automatischen Wortfilter beim Absenden, bei einer Meldung durch Nutzer und stichprobenartig bei
öffentlichen Anzeigen. Alles andere wäre rechtlich unzulässig und auch nicht nötig.
*Hintergrund: § 45 SchulG NRW / VO-DV I erlauben schulische Verarbeitung nur, soweit sie zur
Aufgabenwahrnehmung erforderlich ist; Chat-Inhalte sind nicht Gegenstand der Vermittlungsaufgabe.*

**C6 · „Welche Daten werden überhaupt gespeichert?“**
Konto: E-Mail, selbst gewählter Name, Rolle, Klassenstufe, Geburtsdatum (nur für Alters- und
Schulregel-Prüfung). Profil/Anzeige: was der Nutzer freiwillig einträgt. Dazu Chat-Nachrichten,
Verifizierungsstatus und ein Moderationsprotokoll. Das steht vollständig in der
Datenschutzerklärung und in der Verfahrensbeschreibung.
*Fundstelle: Art. 13, 15 DSGVO; Datenschutzerklärung Abschnitt 2.*

**C7 · „Und die Geburtsdaten — die sind doch besonders schützenswert?“**
Sie werden nur für die Altersregeln gebraucht, sind für andere Nutzer nicht sichtbar und nicht
abrufbar. E-Mail und Geburtsdatum sind grundsätzlich nie Teil öffentlicher Profile.
*Wichtig: Diese Aussage ist nach einer technischen Korrektur (September 2026) tatsächlich korrekt
und im Code erzwungen. Wenn danach gefragt wird: „Das war ein Punkt, den wir selbst gefunden und
behoben haben.“*

**C8 · „Brauchen Minderjährige eine Einwilligung und wie wird die geprüft?“**
Bei unter 16 Jahren ist die Einwilligung der Erziehungsberechtigten erforderlich (Art. 8 DSGVO).
Die Einwilligung wird bei der Registrierung abgefragt, das Eltern-Dashboard dokumentiert die
Verknüpfung, und im SV-Raum wird persönlich geprüft. Zusätzlich empfehlen wir, dass Eltern
ihr Konto mit dem des Kindes verknüpfen — dann ist die Verantwortung doppelt sichtbar.
*Fundstelle: Art. 8 Abs. 1 und Abs. 2 DSGVO; Nutzungsbedingungen § 2.*

**C9 · „Was ist mit einem Vertrag mit dem Hoster?“**
Es wird ein Vertrag zur Auftragsverarbeitung mit ALL-INKL abgeschlossen (Art. 28 DSGVO). Das ist
eine Standarderklärung im Kundenbereich und in wenigen Minuten erledigt. Ohne diesen Vertrag wäre
das Hosting nicht zulässig — deshalb steht es auf der Startliste.
*Fundstelle: Art. 28 DSGVO. Stand: in Vorbereitung — Termin zugesagt für die Startwoche.*

**C10 · „Gehen Daten in die USA?“**
Nein. Kein Cloud-Dienst, kein Tracking-Anbieter, kein Drittland. Hosting und Datenbank liegen in
Deutschland bei ALL-INKL.

**C11 · „Was ist mit Cookies?“**
Es gibt keine Analyse- oder Werbe-Cookies. Technisch notwendige Speicherung im Browser
(Anmeldestatus, Design-Einstellung) ist nach § 25 Abs. 2 TDDDG einwilligungsfrei. Zusätzlich
zählen wir anonym Seitenaufrufe — **ohne IP-Adresse, ohne Drittanbieter**, direkt auf unserem
Server.

**C12 · „Und diese Statistik — ist die wirklich anonym?“**
Fast: Aufrufe zählen wir ohne IP-Adresse und ohne Gerätekennung. Bei **angemeldeten** Nutzern
speichern wir zusätzlich eine Zuordnung zum eigenen Konto, um zu sehen, wie viele verschiedene
Personen aktiv sind. Das ist pseudonym, nicht anonym — die Datenschutzerklärung sagt das jetzt
auch genau so, und die Daten werden nach 90 Tagen automatisch verworfen.
*Diese Frage ist die Faulstelle im Konzept. Wer sie offen beantwortet, ist glaubwürdig; wer sie
wegwischt, verliert das Gespräch, wenn ein kundiger Elternteil nachliest.*

**C13 · „Wie lange werden die Daten gespeichert?“**
Konto und Inhalte: solange der Account besteht. Nach Löschantrag: Profil, Anzeigen, Nachrichten
werden gelöscht oder anonymisiert, bestätigt binnen 14 Tagen. Moderationsprotokolle: 12 Monate.
Statistik: 90 Tage Detaildaten, danach nur noch aggregierte, personenunabhängige Zählwerte.
*Fundstelle: Art. 5 Abs. 1 lit. e, Art. 17 DSGVO.*

**C14 · „Und wenn ein Schüler abgeht? Was passiert mit seinem Konto?“**
Abgangs-Routine der SV: Auf Antrag oder bei bekanntem Abgang wird der Account gelöscht, Inhalte
entfernt, das Moderationsprotokoll bleibt anonymisiert. Wir prüfen das einmal jährlich
(Rundumschlag am Schuljahresanfang).

**C15 · „Können Eltern Auskunft verlangen?“**
Ja, jederzeit, und wir erfüllen sie binnen eines Monats. Der Weg steht in der
Datenschutzerklärung: Support-Ticket in der App oder E-Mail an info@nachhilfe-sv.de.
*Fundstelle: Art. 12, 15 DSGVO.*

**C16 · „Wer hat überhaupt Zugriff auf die Daten?“**
Nur das SV-Admin-Team (namentlich benannt und im Audit-Log geführt), und nur auf das, was zur
Aufgabe nötig ist: Moderation braucht keine Passwörter, kein Geburtsdatum, keine Eltern-E-Mail.
Passwörter werden als Hash gespeichert und sind auch für Admins nicht lesbar.
*Fundstelle: Art. 5 Abs. 1 lit. c, Art. 32 DSGVO; § 11 BASS 10-41 (Zugriffsregelungen).*

**C17 · „Kann man in der App eine Telefonnummer sehen?“**
Nur wenn sich zwei Nutzer gefunden haben und die Anfrage angenommen ist. Handynummer und
Moodle-Name sind zusätzlich einzeln abschaltbar. Das steht als Regel in den Nutzungsbedingungen
und wird beim Registrieren erklärt.

**C18 · „Was passiert bei einem Datenleck?“**
Dokumentiertes Verfahren: sofort sperren, Ursache prüfen, innerhalb 72 Stunden Meldung an die
Aufsichtsbehörde, wenn ein Risiko für Betroffene besteht; Information der Betroffenen bei hohem
Risiko. Das steht in der Verfahrensbeschreibung.

**C19 · „Dürfen wir die Daten auswerten — z. B. welche Jahrgänge Nachhilfe brauchen?“**
Nur aggregiert und ohne Personenbezug, und genau so ist es gebaut. Sobald eine Auswertung auf
einzelne Personen zurückführbar wäre, ist sie unzulässig.

**C20 · „Wäre die Börse nicht datenschutzfreundlicher, wenn alles über die Schule läuft?“**
Nein. Über die Schule heißt: Ihre Datenverarbeitung, Aktenführung im Schulverwaltungssystem,
Zugriff durch Verwaltungskräfte. Wir verarbeiten bewusst schlank: keine Noten, keine
Leistungsdaten, kein Kontakt zu Lehrkräften.

---

## D. Kinder- und Jugendschutz, Sicherheit

**D1 · „Wer garantiert, dass da keine Fremden drin sind?“**
Der SV-Raum. Jeder Account wird persönlich freigeschaltet, nicht per Code-E-Mail. Ohne
Verifizierung ist kein Kontakt, kein Chat, keine Anzeige möglich — serverseitig erzwungen, nicht
nur in der Oberfläche.

**D2 · „Was ist bei Mobbing oder Belästigung?“**
Dreistufig: (1) Der Wortfilter blockt Beleidigungen, Hassrede und sexuelle Inhalte schon vor dem
Absenden. (2) Jede Anzeige, jede Nachricht und jedes Profil hat einen Melde-Button. (3) Das
SV-Team sichtet werktags und entfernt, sanktioniert bis zur dauerhaften Sperre und dokumentiert
jeden Vorgang im Audit-Log. Bei Verdacht auf Straftaten gehen wir zu Verbindungslehrkräften und
Schulleitung.

**D3 · „Und wenn sich zwei verabreden und etwas passiert?“**
Dann ist es genau das, was es bei privater Nachhilfe auch wäre: eine Verabredung zwischen
Familien. Deshalb steht in den Nutzungsbedingungen und im Eltern-Leitfaden die Empfehlung,
erste Treffen in der Schule (Bibliothek, Mensa) oder an öffentlichen Orten zu machen — und
Vergütung und Umfang vorher mit den Eltern zu klären.

**D4 · „Können Eltern mitlesen? Ist das nicht ein Vertrauensbruch?“**
Eltern können **Status** sehen: Wer hat angefragt, welche Anzeige läuft, welche Matches gibt es.
Die Chat-Inhalte sehen sie nicht. Das ist eine bewusste Grenze — Information für die Eltern,
Privatsphäre für das Kind.

**D5 · „Können Nutzer Fotos hochladen? Was ist mit fremden Fotos?“**
Profilbilder ja, aber Fotos von dritten Personen sind ausdrücklich verboten und werden nach
Art. 17 (Recht am eigenen Bild) entfernt. Das ist eine Regel in den Nutzungsbedingungen,
und wir haben sie wegen eines EuGH-Urteils (Russmedia, 2.12.2025) bewusst streng formuliert:
Wer fremde Bilder einstellt, fliegt raus.
*Fundstelle: § 22, 23 KUG; EuGH C-492/23.*

**D6 · „Und Minderjährige, die Anzeigen mit Preisen einstellen — ist das nicht Werbung?“**
Es ist ein Gesuch/Angebot unter Schülern, keine Werbung und kein kommerzielles Angebot der Schule.
Fremdwerbung ist in den Nutzungsbedingungen verboten.

**D7 · „Was ist mit Suizid-/Kriseninhalten im Chat?“**
Bei Auffälligkeiten über die Moderations- oder Meldefunktion informiert das SV-Team unverzüglich
die Verbindungslehrkräfte bzw. die Schulleitung, damit die Schule ihre Schutzkonzepte
(Beratungslehrkräfte, Schulsozialarbeit) greifen lässt.

**D8 · „Gibt es eine Altersgrenze nach unten?“**
Nein, aber unter 16 nur mit Eltern-Einwilligung — und in der Praxis braucht man ein Handy, also
Klasse 5 aufwärts. Für die Klassen 5 und 6 ist vor allem das Coaching gedacht.

---

## E. Geld, Haftung, Versicherung

**E1 · „Wer haftet, wenn etwas passiert?“**
Zwei-Ebenen-Antwort: Für die Plattform haftet der Träger — bei eigener Verantwortung, und bei
fremden Inhalten erst nach Kenntnis (die klassische Haftungsprivilegierung für Hosting-Anbieter).
Für die Nachhilfe selbst haften die beteiligten Familien, wie bei jeder privaten Nachhilfe. Unsere
Prozesse — Verifizierung, Moderation, Audit-Log — senken das Restrisiko und sind dokumentiert.

**E2 · „Gilt das Haftungsprivileg wirklich?“**
Der EuGH hat am 2.12.2025 (C-492/23, Russmedia) entschieden, dass sich ein Plattformbetreiber
für Datenschutzverstöße in Nutzerinhalten nicht auf die Haftungsprivilegierung berufen kann. Der
Fall betraf ein kommerzielles Anzeigenportal mit weitreichenden Nutzungsrechten an Inhalten und
sensiblen Daten. Unser Projekt ist nicht-kommerziell und verarbeitet keine sensiblen Daten —
trotzdem handeln wir vorsorglich nach denselben Grundsätzen: Identitätsprüfung, Verbot von
Dritt-Daten, Wortfilter, Meldeweg, Vorbefassung.
*Das ist die ehrlichste und sicherste Antwort. Nicht behaupten: „Gilt für uns nicht.“*

**E3 · „Dürfen Minderjährige überhaupt Geld für Nachhilfe nehmen?“**
Ja. Das ist ein Taschengeldgeschäft nach § 110 BGB: Ein Minderjähriger darf mit eigenen Mitteln
bewirken, dass der Vertrag von Anfang an wirksam wird. Wir empfehlen in den
Nutzungsbedingungen ausdrücklich, Vergütung und Umfang vorher mit den Eltern zu besprechen.

**E4 · „Und das Finanzamt? Muss ein Schüler ein Gewerbe anmelden?“**
Nachhilfe ist eine unterrichtende, freiberufliche Tätigkeit (§ 18 EStG) — kein Gewerbe. Für
Schülerinnen und Schüler ist das praktisch relevant erst, wenn Einnahmen steuerlich ins Gewicht
fallen. Wir weisen in den Rechtstexten darauf hin, dass die Vergütung privat vereinbart wird und
die SV nicht Vertragspartei ist.

**E5 · „Was ist mit Versicherung — wenn in der Schule beim Nachhilfetermin etwas passiert?“**
Wichtige Unterscheidung, und wir sagen sie klar:
- Die **Plattform/Veranstaltung** der SV ist eine Schulveranstaltung — für ehrenamtliche
  SV-Tätigkeit besteht gesetzlicher Unfallversicherungsschutz.
- Die **private Nachhilfe** ist keine Schulveranstaltung. Nach der Rechtsprechung und der
  DGUV sind private Nachhilfe und Aufenthalt auf dem Schulgelände ohne Schulbezug **nicht**
  gesetzlich unfallversichert. Das Risiko liegt bei den Familien — wie bei jeder Nachhilfe
  zu Hause oder in einem Café.
*Empfehlung für das Protokoll: Eltern im Leitfaden darauf hinweisen, dass gesetzliche
Unfallversicherung hier nicht greift und eine private Absicherung sinnvoll ist.*

**E6 · „Übernimmt die Schule die Aufsicht über die Nachhilfetermine?“**
Nein, und das ist so gewollt. Die Schule hat die Aufsicht bei Schulveranstaltungen. Die
Nachhilfe ist ein privates Geschäft zwischen Familien. Wenn Lehrkräfte Aufsicht führen müssten,
würde aus einer Entlastung ein neues Personalproblem — deshalb ist die Trennung der zwei Ebenen
das Fundament des Konstrukts.

**E7 · „Was, wenn die Kinder sich in der Pause im Schulgebäude treffen?“
Sind sie während der Schulzeit im Gebäude, gilt wie immer die Hausordnung und die Aufsicht der
Schule — dafür braucht es kein neues Regelwerk.

**E8 · „Wird die Schule zur Vermittlungsagentur, wenn wir das genehmigen?“**
Rechtlich ist die SV keine Vermittlungsagentur: Sie veröffentlicht Anzeigen und schaltet Kontakte
frei — sie wird nicht Vertragspartei, verlangt kein Entgelt und schuldet keinen Erfolg. Das steht
in den Nutzungsbedingungen und im Impressum.

**E9 · „Und wenn jemand mit den 10–15 € pro 45 Minuten wuchert?“**
In den Nutzungsbedingungen stehen Richtwerte (ca. 10–12 € / 45–60 Min). Wucherpreise,
Lockangebote und versteckte Kosten sind unzulässig und werden gemeldet und entfernt.

**E10 · „Was ist, wenn Eltern sich beschweren?“**
Fester Weg: info@nachhilfe-sv.de → Prüfung durch das SV-Team → bei Bedarf Einbeziehung der
Verbindungslehrkräfte → Antwort binnen 14 Tagen. Jede Beschwerde wird protokolliert, und gegen
Moderationsmaßnahmen gibt es ausdrücklich einen Widerspruchsweg.

---

## F. Technik & Betrieb

**F1 · „Wo liegen die Daten? Wer betreibt das?“**
Auf Servern von ALL-INKL.COM in Deutschland, verschlüsselte Übertragung (HTTPS), tägliche Backups
durch den Hoster. Domain und Hosting zahlt die SV.

**F2 · „Was ist, wenn der Server ausfällt?“**
Dann ist die Plattform offline — es gibt keinen Notbetrieb, der Schule entstehen also keine
Folgekosten. Anmeldungen und Verifizierungen im SV-Raum funktionieren weiter wie bisher
(mündlich/Papier).

**F3 · „Ist das sicher gegen Hacker?“**
Ehrlich: Absolute Sicherheit gibt es nicht. Wir haben die wichtigsten Grundlagen umgesetzt:
gehashte Passwörter, signierte Sitzungstoken mit Ablaufdatum, serverseitige Rechteprüfung für
jede Aktion, Ratenbegrenzung gegen Automatenangriffe, Protokollierung aller Verwaltungsvorgänge,
Zugriffsrechte nach Rollen. Wenn jemand eine Schwachstelle findet: technik@nachhilfe-sv.de oder
GitHub-Issue.

**F4 · „Der Code ist öffentlich — ist das nicht gefährlich?“**
Open Source ist für uns ein Vorteil: Fehler werden gefunden, und das ist gewollt. Sicherheit darf
nicht davon abhängen, dass niemand den Code kennt („Security by Obscurity“). Passwörter und
Zugangsdaten sind ohnehin nicht im Repository.

**F5 · „Ist der Code von KI geschrieben — kann man dem trauen?“**
Er ist von der SV verantwortet. KI-gestützt heißt: hohe Geschwindigkeit, aber mögliche
Unschärfen. Deshalb ist der Quellcode öffentlich, es gibt ausführliche Tests und Fehlerlisten, und
wir korrigieren, was gemeldet wird. Diese Offenheit steht bewusst auf der Transparenzseite.
*Fundstelle: nachhilfe-sv.de/#/transparenz; GitHub-Repo mit FIXLIST/UX-Audit.*

**F6 · „Funktioniert das auch auf Handys und für Nicht-Technik-Fans?“**
Es ist eine Web-App, installierbar auf dem Startbildschirm. Dark Mode, große Schaltflächen,
Tastaturbedienung und Kontraste sind umgesetzt. Kein App-Store, kein Update-Zwang.

**F7 · „Was kostet der Betrieb im Jahr?“**
Domain (~10 €/Jahr) und Hosting (~80 €/Jahr). Keine Lizenzen, keine Drittdienste.
*Zahlen aus der SV-Kassenführung; auf Nachfrage mit Kassenbeleg nachweisbar.*

**F8 · „Gibt es einen Wartungsvertrag?“**
Nein — der Betrieb ist ehrenamtlich. Deshalb: schlanke Kernfunktionen, keine Abhängigkeit von
einzelnen Personen (Notfall-Umschlag, Übergabe-Dokumentation).

---

## G. Organisation & Personal

**G1 · „Ich habe keine Zeit dafür.“**
Sie brauchen keine. Der Betrieb ist Aufgabe des SV-Teams. Die Verbindungslehrkräfte sind
pädagogische Ansprechperson im Rahmen ihrer bestehenden Aufgabe (eine Wochenstunde
Ermäßigung steht ihnen ohnehin zu). Ihre Rolle: Zustimmung, Weiterleitung der Unterlagen an den
bDSB, Kenntnisnahme des Monatsberichts.

**G2 · „Wer prüft die Meldungen in den Ferien?“**
Ferien-Regel: Kenntnisnahme, aber reduzierte Reaktionszeit (Ziel 72 h), weil keine Nutzer
in der Schule sind. In den Wochen vor dem Abitur fährt die Moderation im Kernbetrieb weiter.

**G3 · „Wie stellen Sie sicher, dass das nicht einschläft?“**
Stellvertreter-Regel (mindestens zwei Personen mit Admin-Rechten), Übergabe-Checkliste,
Notfall-Umschlag bei den Verbindungslehrkräften und der Monatsbericht als sichtbarer Anker.

**G4 · „Brauchen Sie von uns eine Erlaubnis, um im SV-Raum zu arbeiten?“**
Nein — Zusammenkünfte von SV-Organen auf dem Schulgelände sind Schulveranstaltungen, und die
Schulleitung stellt der SV die erforderlichen Räume zur Verfügung. Für das Verifizierungsfenster
bitten wir trotzdem um eine feste Zeit, damit es verlässlich ist.
*Fundstelle: Nr. 6.1 und Nr. 6.6 SV-Erlass.*

**G5 · „Müssen wir aufsichtsführende Personen benennen?“**
Nein. Wir führen niemanden eigenständig herum. Die Börse ist kein Aufsichtsszenario: Es gibt
keine gemeinsamen Veranstaltungen, keine Fahrten, keine Gruppenarbeit mit Minderjährigen unter
Leitung Minderjähriger. Falls später einmal ein SV-Aktionstag dazu kommt, gilt Nr. 6.4 des
Erlasses (Betrauung durch die Schulleitung, schriftliche Zustimmung der Eltern bei Aufsicht durch
Minderjährige) — dann entscheiden Sie neu.

---

## H. Kritische Einwände

**H1 · „Dann sollen die Kinder doch in der Pause bei Älteren nachfragen.“**
Machen sie auch weiter. Die Börse macht nur sichtbar, wer helfen kann und will — und gibt den
Jüngeren einen Weg, der nicht von Mut oder Glück abhängt. Die Coaching AG bleibt unverändert.

**H2 · „Das verlagert Verantwortung auf Kinder.“**
Auf beiden Ebenen gibt es Erwachsene: Das SV-Team moderiert, die Verbindungslehrkräfte sind
Ansprechperson, die Eltern verknüpfen Konten und entscheiden über Vergütung. Kinder machen nur
das, was Kinder dürfen: Nachhilfe geben und nehmen.

**H3 · „Wir hatten das doch als WhatsApp-Gruppe — reicht das nicht?“**
Eine WhatsApp-Gruppe hat drei Probleme: niemand ist verifiziert, niemand moderiert, Meta ist
Auftragsverarbeiter in den USA. Unsere Börse löst genau diese drei Punkte.

**H4 · „Warum keine Kaufabwicklung über die Plattform?“**
Weil Geld zwischen Minderjährigen über eine schulische Plattform ein Minenfeld ist
(Rückbuchungen, Streit, Aufsicht) und wir keine Zahlungsdaten speichern wollen. Das Verhältnis
bleibt privat. Später denkbar: nur eine dokumentierte Empfehlung der Richtpreise — nicht mehr.

**H5 · „Und wenn ein Elternteil sagt: Mein Kind darf da nicht rein?“**
Dann bleibt es draußen. Kein Nachteil, keine Auffälligkeit. Die Nutzung ist freiwillig,
und wer unter 16 ist, braucht sowieso die elterliche Einwilligung. Für Eltern, die es wollen,
bleibt der Eltern-Leitfaden und das Eltern-Dashboard.

**H6 · „Was ist mit Schülern, die kein Handy oder kein Datenvolumen haben?“**
Jede Klasse hat Zugang zu Rechnern im Computerraum, und die Schulbibliothek ist der Ort für
Nachhilfe. Anzeigen können auch mit Hilfe der SV aufgegeben werden. Die Vermittlung ist damit
nicht an ein eigenes Gerät gebunden.

**H7 · „Ist das nicht Konkurrenz zu unserem Förderangebot?**
Nein, es ergänzt: Das schulische Förderangebot ist kostenlos und knapp. Die Börse ist
Nachhilfe unter Schülern, meist außerhalb der Unterrichtszeit, für Themen, die individuell sind.

---

## I. Fragen, die wir im Gespräch selbst aufwerfen (und warum)

Freiwillig benannte Punkte machen glaubwürdig — und sie nehmen dem Gegenüber die Chance, sie später
„zu entdecken“. Vorbereitete, kurze Sätze:

| Was wir sagen | Warum das gut ist |
|---|---|
| „Im Impressum fehlen noch Telefonnummer und die namentliche Angabe der verantwortlichen Person nach § 18 Abs. 2 MStV. Das stellen wir vor dem Start.“ | Ein Rechtsmangel, den ein aufmerksamer Blick auf die Website sofort sieht. Vorher einräumen = souverän. |
| „Bei Einwilligungen unter 16 Jahren prüfen wir eine zusätzliche Bestätigung durch die Eltern-Email; der bDSB soll entscheiden, ob das nötig ist. Wir halten es für angemessen.“ | Zeigt: Wir kennen die Schwachstelle (Art. 8 Abs. 2 DSGVO) und haben einen Plan. |
| „Die Statistiken zählen bei angemeldeten Nutzern eine Konto-Zuordnung. Wir haben die Texte angepasst und eine 90-Tage-Löschung eingebaut.“ | Datenschutz-Aufsicht würde genau da nachfragen. |
| „Wir nutzen eine KI-Werkstatt, um den Code zu schreiben. Das ist offengelegt — und es ist einer der Gründe, warum wir eine externe Prüfung anbieten.“ | Wer das verschweigt und später auffällt, verliert alles. |
| „Bei einem echten Zwischenfall rufen wir sofort an. Auch nachts gibt es eine Rufkette bis zu den Verbindungslehrkräften.“ | Beantwortet die unausgesprochene Sorge der Schulleitung. |

---

## J. Formulierungen, die wir vermeiden müssen

| ❌ Nicht sagen | ✅ Stattdessen |
|---|---|
| „Das ist rechtlich geprüft.“ | „Wir haben es selbst geprüft und die Unterlagen für den behördlichen Datenschutzbeauftragten vorbereitet.“ |
| „Wir haften für nichts.“ | „Für fremde Inhalte haften wir erst nach Kenntnis, und wir haben einen Weg, um sofort zu reagieren. Für den Unterricht selbst haften die Familien — wie bei jeder privaten Nachhilfe.“ |
| „Die Schule muss gar nichts tun.“ | „Die Schule muss nichts betreiben. Sie entscheidet und leitet die Unterlagen an den bDSB weiter — das sind zwei Stunden Aufwand, verteilt auf Wochen.“ |
| „Wir haben keine Sicherheitslücken.“ | „Uns ist keine bekannt. Wenn eine gefunden wird, ist die Reparatur unsere höchste Priorität — und wir haben einen Weg, sie zu melden.“ |
| „Das ist völlig anonym.“ | „Wir speichern so wenig wie möglich. Ein vollständig anonymes Konzept wäre mit Verifizierung nicht vereinbar — und die ist der Sicherheitskern.“ |
| „Das dürfen wir sowieso.“ | „Wir halten es für von § 74 Abs. 1 und dem SV-Erlass gedeckt. Wenn Sie es anders sehen, würden wir die Zustimmung nach Nr. 6.2 mit Bezug auf Ihr Ermessen dokumentieren.“ |
| „Kommt aus den USA / das ist doch egal.“ | Immer konkret: „ALL-INKL in Deutschland, kein Cloud-Dienst, kein Drittland.“ |
