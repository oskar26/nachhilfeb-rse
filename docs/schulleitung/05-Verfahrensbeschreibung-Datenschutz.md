# Verfahrensbeschreibung / Eintrag für das Verzeichnis der Verarbeitungstätigkeiten

**Verfahren:** FWG Nachhilfebörse (nachhilfe-sv.de) — schulinterne Vermittlungsplattform der
Schülervertretung
**Zur Vorlage:** behördliche/r Datenschutzbeauftragte/r der Schule (Vorabkontrolle nach
BASS 10-41 Nr. 4)
**Erstellt von:** SV-Team Nachhilfebörse · **Stand:** September 2026 · **Fassung:** 1.0

> **Hinweis für die Schulleitung:** Dieses Dokument ist als **fertiger Eintrag** für das Verzeichnis
> der Verarbeitungstätigkeiten (Art. 30 DSGVO) formuliert. Bitte unverändert oder mit Ihren
> Ergänzungen an den behördlichen Datenschutzbeauftragten weiterleiten. Wir übernehmen die
> Nachbesserung und berichten das Ergebnis im monatlichen Gespräch.

---

## 1. Eckdaten

| | |
|---|---|
| **Bezeichnung** | FWG Nachhilfebörse |
| **Art des Verfahrens** | Webanwendung (PWA), serverseitige Verarbeitung, kein automatisierter Einzelentscheid |
| **Zweck** | Vermittlung von Nachhilfe unter Schülerinnen und Schülern des FWG Köln; Verifizierung, Moderation und Jugendschutz |
| **Betroffene** | Schülerinnen und Schüler (Klassen 5–13, teils unter 16), Eltern, SV-Betriebsteam |
| **Verantwortliche Stelle** | Schule (Friedrich-Wilhelm-Gymnasium Köln); Verantwortlich: Schulleitung (BASS 10-41 Nr. 4) |
| **Betrieb / Durchführung** | SV-Team Nachhilfebörse (ehrenamtlich); pädagogische Ansprechpersonen: Verbindungslehrkräfte |
| **Hosting** | ALL-INKL.COM – Neue Medien Münnich, Hauptstraße 68, 02742 Friedersdorf, Deutschland |
| **Drittlandübermittlung** | keine |
| **Externe Analysedienste** | keine |
| **Vorabkontrolle durch bDSB** | beantragt über die Schulleitung |

---

## 2. Zweck der Verarbeitung im Detail

1. **Anbahnung von Nachhilfe:** Sichtbarmachen von Angeboten und Gesuchen innerhalb der Schule.
2. **Vertrauensschutz:** Verifizierung der Nutzer, damit nur FWG-Angehörige teilnehmen.
3. **Jugendschutz:** Inhaltsfilter, Meldungen, Moderation, Sanktionen.
4. **Kontakt nur nach Zustimmung:** Kontaktdaten werden erst nach Annahme einer Anfrage sichtbar.
5. **Elterninformation:** Einblick der Eltern in Aktivitäten des Kindes (Status), ohne Einblick in
   den Chat.
6. **Betriebsstatistik:** aggregierte Kennzahlen ohne IP-Adressen zur Verbesserung des Angebots.

**Nicht-Zwecke (ausdrücklich ausgeschlossen):** Leistungsbewertung, Notengebung,
Erziehungsmaßnahmen, Profilbildung, Werbung, Weitergabe an Dritte, kommerzielle Nutzung.

---

## 3. Datenkategorien

| Datenfeld / Datensatz | Betroffene | Pflicht? | Zweck | Löschfrist |
|---|---|---|---|---|
| E-Mail-Adresse (Konto) | alle | ja | Anmeldung, Kontosicherheit, Einwilligungsnachweis | mit Kontolöschung |
| Name (Vor-/Nachname, Anzeigename) | alle | ja | Identifikation, Anzeige | mit Kontolöschung |
| Rolle (Schüler/Elternteil/SV-Admin) | alle | ja | Rechtevergabe | mit Kontolöschung |
| Klassenstufe und Klassenbuchstabe | Schüler | ja | Filterung, Zuordnung | mit Kontolöschung |
| Geburtsdatum | Schüler | ja | Altersprüfung (U16-Regel) — **nicht sichtbar für andere Nutzer** | mit Kontolöschung |
| Einwilligungsstatus Eltern (Ja/Nein + Datum) | Schüler unter 16 | ja | Nachweis Art. 8 DSGVO | mit Kontolöschung |
| Passwort-Hash (bcrypt) | alle | ja | Anmeldung — Passwort im Klartext ist nicht rekonstruierbar | mit Kontolöschung |
| Profilangaben (Bio, Fächer, Profilbild, Bannerfarbe) | Schüler | freiwillig | Darstellung | mit Kontolöschung |
| Kontaktdaten (Handynummer, Moodle-Name, Sonstiges) | Schüler | freiwillig, standardmäßig versteckt | Kontaktaufnahme nach Annahme | mit Kontolöschung, einzeln löschbar |
| Anzeigen (Fächer, Klassen, Ort, Format, Preis, Beschreibung, Bilder) | Schüler | freiwillig | Kern des Dienstes | durch Nutzer oder mit Kontolöschung |
| Anfragen und Chat-Nachrichten | Schüler | ja (bei Nutzung) | Terminabsprache | mit Kontolöschung |
| Bewertungen (nur nach Kontakt) | Schüler | freiwillig | Reputation | mit Kontolöschung |
| Merkliste, gespeicherte Suchen | Schüler | freiwillig | Bedienkomfort | mit Kontolöschung |
| Meldungen (Melder, Gemeldeter, Grund, Beweismittel) | Schüler | ja (bei Meldung) | Moderation | 12 Monate nach Abschluss |
| Moderationsprotokoll (Sperren, Verwarnungen, Begründung) | Schüler | ja | Nachweis, Widerspruch, Schutz der Community | 12 Monate nach Ablauf der Maßnahme |
| Audit-Log (SV-Admin-Aktionen) | SV-Team | ja | Kontrolle, Nachvollziehbarkeit | 12 Monate |
| Eltern-Verknüpfung (Code, Status, Rechte) | Eltern + Kind | ja | Eltern-Einblick | mit Aufhebung/Kontolöschung (Code wird rotiert) |
| Einwilligungsnachweis Eltern (Dokumentation der Verknüpfung) | Eltern + Kind | ja | Nachweis Art. 8 | mit Kontolöschung |
| Supportanfragen und -antworten | alle | ja (bei Nutzung) | Hilfe | 12 Monate nach Abschluss |
| Statistik: Seitenpfad, Gerätetyp, Browser, Zeitstempel | alle Besucher | – | Verbesserung des Angebots | **90 Tage** für Detaildaten, danach aggregiert und ohne Personenbezug |
| Statistik: Konto-Zuordnung bei angemeldeten Nutzern | angemeldete Nutzer | – | Ermittlung der Zahl aktiver Nutzer (pseudonym) | **90 Tage** |
| Statistik: Fächerklicks | Besucher | – | Reihenfolge der „Beliebt“-Fächer | 90 Tage |
| E-Mail-Bestätigungscodes (Hash, Ablauf, Fehlversuche) | alle | ja | Missbrauchsschutz bei Registrierung | 30 Minuten Ablauf, danach Verfall |

**Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO):** werden nicht verarbeitet.
**IP-Adressen:** werden nicht gespeichert (siehe Abschnitt 8).

---

## 4. Rechtsgrundlagen

| Verarbeitung | Rechtsgrundlage |
|---|---|
| Konto, Profil, Anzeigen, Anfragen, Chat (Kernnutzung) | Art. 6 Abs. 1 lit. b DSGVO (Vertrag / Nutzungsverhältnis) |
| Verifizierung, Moderation, Meldungen, Sperren, Audit-Log | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: Schutz Minderjähriger, Missbrauchsabwehr, Nachweisbarkeit) |
| Nutzer unter 16 Jahren | Art. 6 Abs. 1 lit. a i. V. m. Art. 8 DSGVO (Einwilligung der Erziehungsberechtigten) |
| Technisch notwendige Speicherung im Browser (Anmeldestatus, Darstellung) | § 25 Abs. 2 TDDDG (einwilligungsfrei) |
| Nutzungsstatistik | Art. 6 Abs. 1 lit. f DSGVO (Interesse an der Verbesserung des Angebots); Widerspruchsmöglichkeit nach Art. 21 wird in der Datenschutzerklärung benannt |

**Abgrenzung zu schulischer Verarbeitung:** Die Verarbeitung ist keine Aufgabe nach VO-DV I / VO-DV
II und wird deshalb **nicht** auf § 45 SchulG NRW gestützt, sondern auf die vorgenannten
Rechtsgrundlagen.

---

## 5. Empfänger

| Empfänger | Art | Grundlage |
|---|---|---|
| ALL-INKL.COM (Hoster, Deutschland) | Auftragsverarbeiter | Art. 28 DSGVO — **Vertrag zur Auftragsverarbeitung abzuschließen** |
| SV-Administratoren der Plattform | intern zugriffsberechtigt | Rollenkonzept, Zweckbindung, Audit-Log |
| andere angemeldete Nutzer | Einsicht in veröffentlichte Inhalte | Nutzungsverhältnis; Kontaktdaten erst nach Annahme |
| Verbindungslehrkräfte und Schulleitung | nur bei Vorfällen und im Monatsbericht | Art. 6 Abs. 1 lit. c/f |
| Strafverfolgungsbehörden | nur bei Rechtsgrundlage | Art. 6 Abs. 1 lit. c i. V. m. § 7 Abs. 1 DDG / Art. 18 DSA |

Keine Übermittlung an Dritte zu Werbe- oder Analysezwecken. Kein Verkauf. Kein Drittland.

---

## 6. Löschkonzept

| Vorgang | Frist | Wer |
|---|---|---|
| Konto- und Datenlöschung auf Antrag | Bestätigung binnen 14 Tagen | SV-Admin |
| Löschung bei Abgang von der Schule | im Rahmen der jährlichen Prüfung; auf Antrag jederzeit | SV-Admin |
| Anzeigen: Deaktivierung durch Nutzer | sofort selbst möglich | Nutzer |
| Meldungen und Moderationsakten | 12 Monate nach Abschluss | automatische bzw. jährliche Prüfung |
| Audit-Log | 12 Monate | jährliche Prüfung |
| Detail-Statistik | 90 Tage | technisch (automatische Bereinigung) |
| Bestätigungscodes | 30 Minuten | technisch |
| Inaktive unbestätigte Konten | Prüfung und Löschung durch SV-Admin (keine automatische Löschung) | SV-Admin, jährlich |

**Anonymisierung statt Löschung** erfolgt nur, soweit Aufbewahrungsgründe bestehen
(Nachweis von Missbrauch, Widerspruchsverfahren); dabei werden Bezüge zu Personen entfernt.

---

## 7. Betroffenenrechte und Verfahren

| Recht | Weg | Reaktionszeit |
|---|---|---|
| Auskunft (Art. 15) | Support-Ticket in der App oder info@nachhilfe-sv.de | 1 Monat |
| Berichtigung (Art. 16) | selbst im Profil / über Unterstützung durch die SV | unverzüglich |
| Löschung (Art. 17) | Support-Ticket oder E-Mail | Bestätigung binnen 14 Tagen |
| Einschränkung (Art. 18) | Support-Ticket | 1 Monat |
| Datenübertragbarkeit (Art. 20) | Support-Ticket | 1 Monat |
| Widerspruch (Art. 21) gegen Statistik/berechtigte Interessen | Support-Ticket oder E-Mail | unverzüglich |
| Widerruf der Einwilligung (Art. 7 Abs. 3) | Elternteil per E-Mail; Account des Kindes wird deaktiviert | unverzüglich |
| Beschwerde | LDI NRW, Kavalleriestr. 2–4, 40213 Düsseldorf | – |

Alle Anträge werden protokolliert (Eingang, Bearbeiter, Ergebnis). Die Anträge laufen über die
Schulleitung, wenn ein Fall rechtliche Bedeutung hat.

---

## 8. Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

**Vertraulichkeit**
- verschlüsselte Übertragung (HTTPS/TLS)
- Passwörter ausschließlich als Hash (bcrypt), keine Klartextspeicherung, kein Passwortversand
- Sitzungstoken signiert (HMAC-SHA256) mit Ablaufzeit; starkes, nicht im Repository liegendes
  Schlüsselgeheimnis
- Serverseitige Rechteprüfung für **jede** Aktion; Oberflächen-Beschränkungen sind nur Komfort,
  nicht die Sicherheitsgrenze
- Rollenkonzept: Schüler, Eltern, Coach, SV-Admin; Eltern nur auf verknüpfte Kinder
- Kein Zugriff auf Geburtsdatum, E-Mail oder Eltern-Kontaktdaten im Moderationsalltag

**Integrität**
- Protokollierung aller Moderations- und Admin-Aktionen (Audit-Log, nicht durch Nutzer löschbar)
- Nachvollziehbarkeit von Sperren und Löschungen mit Begründung

**Verfügbarkeit**
- tägliche Sicherungen durch den Hoster, Wiederherstellung dokumentiert
- Ausfall führt zu keiner Abhängigkeit der Schule (mündliche/analoge Wege bleiben offen)

**Belastbarkeit**
- Ratenbegrenzung gegen Massenanfragen und Passwortraten
- serverseitiger Inhaltsfilter vor der Veröffentlichung
- Melde- und Abhilfeverfahren mit Frist und Dokumentation

**Datensparsamkeit**
- keine IP-Speicherung, kein Tracking, keine Drittanbieter-Skripte, kein CDN
- Kontaktdaten standardmäßig versteckt und einzeln freigebbar
- Detailstatistik nach 90 Tagen automatisch bereinigt

**Organisation**
- Betriebsteam mit mindestens zwei Admin-Zugängen (Stellvertretung)
- Übergabe-Checkliste und Notfall-Umschlag mit Zugangsdaten bei den Verbindungslehrkräften
- jährliche Prüfung: Rechte, Texte, Zugänge, Löschläufe
- Meldung von Sicherheitsvorfällen an technik@nachhilfe-sv.de

---

## 9. Datenschutz-Folgenabschätzung (Art. 35 DSGVO) — Vorprüfung

| Prüffrage | Antwort |
|---|---|
| Systematische umfassende Bewertung persönlicher Aspekte / Profiling? | nein |
| Automatisierte Entscheidung mit rechtlicher Wirkung? | nein |
| Systematische umfangreiche Überwachung öffentlich zugänglicher Bereiche? | nein |
| Besondere Kategorien (Art. 9) oder Daten über Straftaten? | nein |
| Umfangreiche Verarbeitung von Daten schutzbedürftiger Personen? | Kinder sind betroffen, jedoch **begrenzter Nutzerkreis einer Schule**, keine Weitergabe, keine Profilbildung, enge Zwecke, kurze Speicherfristen |
| Datenmenge | klar begrenzter Kreis (Schulgemeinde), überschaubare Fallzahlen |
| Neue Technologien? | nein (Standard-Webanwendung) |

**Selbsteinschätzung:** Eine DSFA ist nach unserer Einschätzung nicht erforderlich; das MSB NRW geht
für schulische Verarbeitungen von Schülerdaten in der Regel von keiner DSFA-Pflicht aus.
**Die abschließende Bewertung liegt beim behördlichen Datenschutzbeauftragten.**

---

## 10. Verfahren bei einer Verletzung des Schutzes personenbezogener Daten

1. **Sofort (durch die entdeckende Person):** Vorfall an technik@nachhilfe-sv.de und an die
   Verbindungslehrkräfte melden; Plattform vorsorglich in den Wartungsmodus setzen, wenn der
   Vorfall andauert.
2. **Binnen 24 Stunden:** Ersteinschätzung durch SV-Team und Schulleitung; betroffene Konten
   sperren; Zugangsdaten wechseln; Spuren sichern; Ablauf dokumentieren.
3. **Binnen 72 Stunden:** Meldung durch die Schulleitung an die LDI NRW, wenn ein Risiko für
   Rechte und Freiheiten besteht (Art. 33 DSGVO). Bei hohem Risiko zusätzlich Information der
   Betroffenen (Art. 34 DSGVO).
4. **Danach:** Ursachenanalyse, Maßnahmen umsetzen, Informationen an den bDSB,
   Dokumentation im Verzeichnis (Verletzungen sind zu dokumentieren, auch wenn nicht gemeldet wird).

**Erreichbarkeit außerhalb der Schulzeit:** Rufkette Schülersprecher/in → Verbindungslehrkräfte →
Schulleitung; Kontaktdaten werden im Schuljahresplan hinterlegt.

---

## 11. Checkliste Auftragsverarbeitung (Hoster)

- [ ] AVV/ADV mit ALL-INKL.COM abschließen (Kundenbereich → Datenschutz/Auftragsverarbeitung)
- [ ] Unterzeichnetes Dokument im SV-Ordner ablegen, Kopie an die Schulleitung
- [ ] Prüfen: Serverstandort Deutschland im Vertrag bestätigt
- [ ] Prüfen: Backup-Regelung und Löschung bei Vertragsende benannt
- [ ] Gültigkeit dokumentieren und jährlich prüfen

*Der AVV ist die einzige noch fehlende formale Voraussetzung für den Start.*

---

## 12. Informationspflichten (Art. 13/14 DSGVO)

Umgesetzt auf https://nachhilfe-sv.de:
- **Datenschutzerklärung** (`#/datenschutz`): Verantwortlicher, Zwecke, Rechtsgrundlagen,
  Empfänger, Speicherdauer, Rechte, Beschwerdestelle
- **Cookie-/Speicherhinweise** (`#/cookies`): ausschließlich technisch notwendige Speicherung und
  Statistik ohne IP-Adressen
- **Nutzungsbedingungen** (`#/nutzungsbedingungen`): Regeln, Sanktionen, Haftung, Minderjährige
- **Transparenzhinweis** (`#/transparenz`): KI-gestützte Entwicklung, Open Source, Grenzen
- **Eltern-Leitfaden** (`#/eltern-leitfaden`): Sicherheit, Verifizierung, Grenzen des Einblicks

**Verbindlichkeit:** Die Datenschutzerklärung wird in der Startwoche als Ausdruck/PDF über den
Pflegschaftsverteiler informiert, damit sie auch ohne App zur Kenntnis genommen werden kann.

---

## 13. Was wir vom behördlichen Datenschutzbeauftragten brauchen

1. Bestätigung des Verzeichnis-Eintrags (Abschnitt 1–6) oder Hinweise zur Anpassung.
2. Auskunft, ob Auflagen zur Einwilligung unter 16 Jahren bestehen (Abschnitt 4 / Art. 8 Abs. 2
   DSGVO) — insbesondere, ob eine Bestätigung über eine Eltern-E-Mail-Adresse verlangt wird.
3. Bewertung der Selbsteinschätzung zur DSFA (Abschnitt 9).
4. Hinweise zu Löschfristen, insbesondere zur Aufbewahrung von Meldungen und Moderationsakten
   (Abschnitt 6; aktuell 12 Monate).
5. Auskunft über Meldewege im Fall einer Datenpanne (Abschnitt 10).

**Ansprechpartner:** SV-Team Nachhilfebörse, info@nachhilfe-sv.de · technik@nachhilfe-sv.de
