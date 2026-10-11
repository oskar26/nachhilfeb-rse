## Nachtrag (11.10.2026) — Entscheidung revidiert

Die in dieser Vorlage empfohlene Variante („Hybrid B+“, Eltern-Accounts mit Kind-Verknüpfung) wurde **revidiert**. Entscheidung des Betreibers: **Das komplette Eltern-Konto- und Verknüpfungssystem wird entfernt.**

- **Kein eigener Eltern-Account** und **kein Verknüpfungscode** mehr: Eltern betreuen die Nachhilfe **gemeinsam mit ihrem Kind** über dessen Schüler-Account (schauen und unterstützen mit).
- Entfernt wurden: Eltern-Dashboard, Verknüpfungs-Flows/Modals, Eltern-Rollen bei der Registrierung, die Verknüpfungs-Endpunkte und Eltern-Benachrichtigungen im Backend.
- Die **Website-Elterninfos** (`/eltern-leitfaden`) wurden auf die gemeinsame Account-Betreuung umgeschrieben (Sie-Form); Sicherheitsinhalte (öffentliche Treffen, keine Zahlungen über die App, Meldefunktion) bleiben erhalten.
- **Keine SQL-Drops:** Die Tabellen `parent_links` und die Spalte `profiles.parent_link_code` bleiben in der Datenbank bestehen (Alt-Daten); es wurde keine neue Migration angelegt.
- **Der bisherige Inhalt dieses Dokuments bleibt als historische Analyse vollständig stehen** und ist nicht mehr die geltende Beschlusslage.

---

# Eltern-Mitbetreuung und U16-Einwilligung: Entscheidungsvorlage

**Projekt:** FWG Nachhilfebörse (nachhilfe-sv.de) – schulinterne SV-Plattform des Friedrich-Wilhelm-Gymnasiums Köln
**Entscheidungsfrage:** Soll das bestehende Eltern-Feature gestrichen, unverändert weiterbetrieben oder ausgebaut werden – und wie sieht ein realistischer Betrieb aus?
**Ergebnis dieser Vorlage:** Empfehlung **Variante E („Hybrid B+“)** – digital-minimaler Status quo plus abgestufte Mitbetreuung für die Stufen 5/6 (Abschnitt 6).
**Stand:** Oktober 2026 · **Verfasser:** SV-Team Nachhilfebörse
**Bezug:** `docs/Schulleitungsgespraech.md` (Abschnitte 4, 5, 6, 8), `PRODUCT.md`, `DEVELOPER_BRIEFING.md`

**Rechtlicher Hinweis:** Dieses Dokument ist eine interne Entscheidungshilfe der SV und **keine Rechtsberatung**. Die endgültige Ausgestaltung ist mit den Verbindungslehrkräften und – bei Fragen zu Einwilligung und Minderjährigenschutz – mit dem behördlichen Datenschutzbeauftragten der Schule abzustimmen. Alle Rechtsbezüge stammen aus den im Repo bereits verwendeten Quellen (`docs/Schulleitungsgespraech.md`, `src/pages/Datenschutz.tsx`, `src/pages/Nutzungsbedingungen.tsx`). Zahlen ohne amtliche Quelle sind ausdrücklich als Erfahrungswert gekennzeichnet.

---

## 0. Leseanleitung und Entscheidungsauftrag

- **Abschnitt 1–3** beschreiben Ausgangslage, Ist-Stand und Zielkonflikte.
- **Abschnitt 4** legt fünf Varianten (A–E) mit Vor-/Nachteilen, Aufwand, Rechtsbild und Wirkung auf das Vertrauen dar.
- **Abschnitt 5** verdichtet die Varianten in einer Bewertungsmatrix.
- **Abschnitt 6** entscheidet: Empfehlung, Begründung, Restarbeiten, klare Ausschlüsse.
- **Abschnitt 7–9** beschreiben Betrieb, Umsetzungsfahrplan und Erfolgsmessung.
- **Abschnitt 10** ist die Checkliste für die erste Sitzung mit Schulleitung und Verbindungslehrkräften.

Die Entscheidung ist **keine reine IT-Frage**: Sie berührt Einwilligung nach Art. 8 DSGVO, das Persönlichkeitsrecht der Kinder, das Ehrenamt der SV und die Außenwirkung gegenüber Eltern und Schulleitung. Deshalb entscheidet dieses Dokument am Ende ausdrücklich – es sammelt nicht nur.

---

## 1. Ausgangslage und Problem

### 1.1 Plattform und Zielgruppe

Die Nachhilfebörse ist eine schulinterne Vermittlungsplattform der SV für die Stufen 5–13 des FWG. Schülerinnen und Schüler suchen und bieten Nachhilfe, die SV verifiziert und moderiert, Betreuung und Zustimmung liegen bei den Verbindungslehrkräften bzw. der Schulleitung (§ 74 Abs. 5 SchulG NRW; `docs/Schulleitungsgespraech.md`, `PRODUCT.md`). Die Jüngsten – insbesondere die **Stufen 5 und 6** – sind 10 bis 12 Jahre alt, also deutlich unter 16 und damit nach der im Projekt etablierten Linie einwilligungsbedürftig über die Eltern (Art. 8 DSGVO; `docs/Schulleitungsgespraech.md` Abschnitt 5, `src/pages/Datenschutz.tsx`).

### 1.2 Warum die Eltern-Frage jetzt entschieden werden muss

1. Das Eltern-Feature ist gebaut und beworben (u. a. `src/pages/ParentGuide.tsx`, `src/pages/Landing.tsx` „Für Eltern“, `PRODUCT.md`). Ein stilles Weiterlaufen ohne Entscheidung führt zu widersprüchlichen Texten, unklaren Erwartungen und Supportfällen.
2. Die **U16-Einwilligung** ist im Projekt etabliert, der **Eltern-Account ist davon formal getrennt**: Bei der Registrierung wird eine Einwilligung erfasst (`api/auth.php`), die Verknüpfung mit einem Elternkonto ist dagegen freiwillig. Diese Lücke muss bewusst geschlossen oder bewusst offengelassen werden.
3. Das Produkt ändert sich gerade: **Gesuche werden privat gestellt** und im Feed nur noch passenden Anbietern bzw. Nutzern angezeigt, die die Fächer laut Profil anbieten; **Angebote von Stufen 5/6 werden im Matching gedrosselt**. Eltern können das Gesuch ihres eigenen Kindes über die Verknüpfung sehen. Damit steigt die Bedeutung der Frage, was Eltern einsehen – und was nicht.
4. Die Plattform wird **ehrenamtlich von 2–3 SV-Admins** betrieben (Ziel: Reaktion < 24 h; `docs/Schulleitungsgespraech.md` Abschnitt 4). Jede neue Eltern-Funktion ist zuerst eine Frage zusätzlicher Betreuung.

### 1.3 Elternvertrauen als Erfolgsfaktor

- Eltern entscheiden bei U16 mit, ob ihr Kind teilnimmt. Ohne nachvollziehbare Sicherheit sinkt die Teilnahmebereitschaft der Stufen 5/6 – genau der Gruppe, für die die Börse als Ergänzung zur Coaching-AG gedacht ist.
- Das Eltern-Dashboard ist ein sichtbarer Vertrauensbeweis (Verifizierung, Moderation, Datenschutz) und in `PRODUCT.md` als Produktprinzip „Schülernah, elternsicher“ verankert.
- Vertrauen entsteht durch **Transparenz und Begrenzung**: Eltern sollen wissen, was sie sehen – und was ausdrücklich nicht.

### 1.4 Ehrenamt als Aufwandsgrenze

Jede Variante muss ohne Hauptamt, ohne eigene Lehrstunden und ohne externe Moderation funktionieren. Neue Pflichten (Einzelfreigaben, Chat-Kontrolle, Genehmigungsschleifen) sind nur tragfähig, wenn sie selten, dokumentierbar und delegierbar sind. Der Ist-Betrieb ist bewusst schlank; die Verbindungslehrkräfte decken pädagogische Fälle im Rahmen ihrer ohnehin bestehenden Aufgabe ab (`docs/Schulleitungsgespraech.md` Abschnitte 3, 4).

---

## 2. Ist-Stand des Eltern-Systems (implementiert)

### 2.1 Rollen und Zugänge

| Element | Ist-Stand | Fundstelle |
|---|---|---|
| Rolle `parent` | Selbst-Registrierung als `student` oder `parent`; Admins nur per Einladung | `api/auth.php` |
| Verifizierung | Eltern mit erster **aktiver** Kind-Verknüpfung automatisch verifiziert; ohne Verknüpfung bleibt das Konto eingeschränkt | `api/profiles.php` (Auto-Verify), `api/middleware.php` (`require_verified`) |
| Zugangsbeschränkung | Eltern nur auf `/parent-dashboard`, `/profile`, `/settings`; sonst Access-Guard | `src/components/AccessGuard.tsx` |
| Frontend-Signale | `isParent`, `parentLinkReady` (aktiv verknüpft: ja/nein/unbekannt) | `src/context/AuthContext.tsx` |
| SV-Ausnahme | SV-/Coach-Admins dürfen Eltern-Sichten zu Moderationszwecken immer lesen | `api/middleware.php` (`fwg_assert_parent_of`) |

### 2.2 Datenmodell

| Objekt | Inhalt | Fundstelle |
|---|---|---|
| `parent_links` | `parent_id`, `child_id`, `status` (`pending`/`active`/`revoked`), `permissions` (JSON), `created_at`, `linked_at`; eindeutig je Eltern-Kind-Paar, Kaskadenlöschung | `api/profiles.php` (Auto-Migration), `sql-updates/012_parent_autoverify.sql` |
| `profiles.parent_link_code` | 6-stelliger, eindeutiger Verknüpfungscode je Schülerkonto (keine Codes für Eltern), wird bei Bedarf serverseitig erzeugt/nachgetragen | `api/profiles.php` (`ensure_parent_code`, Backfill) |
| `permissions` | vier Schalter, Standard jeweils an: `can_view_ads`, `can_view_ratings`, `can_view_activity`, `can_receive_notifications` | `api/profiles.php`, `src/components/parent/types.ts` |
| Einwilligungsnachweis | druckbare Erklärung „Einverständniserklärung der Erziehungsberechtigten“ | `src/components/ParentConsentModal.tsx` |

### 2.3 Abläufe

1. **Verknüpfung:** Das Kind zeigt seinen Code unter „Einstellungen → Eltern-Verknüpfung“ (`src/components/ChildLinkModal.tsx`). Der Elternteil gibt den Code ein oder sucht das Kind über Name/Klasse/Geburtsdatum (`src/components/ParentLinkFlow.tsx`, `api/profiles.php` `lookup_code`/`search_children`). Die Verknüpfung wird **sofort aktiv**; ein Bestätigungsschritt des Kindes findet im technischen Ablauf nicht statt.
2. **Auto-Verifizierung:** Mit der ersten aktiven Verknüpfung wird der Eltern-Account auf `is_verified = 1` gesetzt (Migration `sql-updates/012_parent_autoverify.sql`).
3. **Benachrichtigungen:** `fwg_notify_parents()` informiert verknüpfte Eltern über Anzeigen, Anfragen, Nachrichten und Bewertungen des Kindes; der Schalter `can_receive_notifications` wird respektiert, der handelnde Elternteil selbst übersprungen (`api/middleware.php`; Aufrufer u. a. `api/ads.php`, `api/requests.php`, `api/messages.php`, `api/reviews.php`).
4. **Eltern-Dashboard:** sieben Bereiche – Überblick, Anzeigen, Anfragen, Matches, Merkliste, Bewertungen, Kind-Einstellungen (`src/pages/ParentDashboard.tsx`, `src/components/parent/`).
5. **Leitfaden und Modal:** Eltern-Leitfaden mit Sicherheits-, Preis- und Kontaktinformationen (`src/pages/ParentGuide.tsx`); Einwilligungsnachweis als Druck/PDF (`src/components/ParentConsentModal.tsx`).

### 2.4 Was Eltern dürfen

| Funktion | Detail | Fundstelle |
|---|---|---|
| Anzeigen des Kindes einsehen | inklusive pausierter Anzeigen | `src/components/parent/AdsTab.tsx` |
| Anzeigen für das Kind anlegen | Anzeige wird dem Kind zugeordnet (Attribution über `user_id`) | `src/components/parent/AdsTab.tsx`, `api/ads.php` |
| Anzeigen pausieren/aktivieren | Online-Status umschalten | `src/components/parent/AdsTab.tsx` |
| Anfragen einsehen | Status, Gegenstelle, Anfragetext – **nicht** der Chatverlauf | `src/components/parent/RequestsTab.tsx` |
| Matches einsehen | gleiche Match-Engine wie im Schüler-Matching | `src/components/parent/MatchesTab.tsx`, `src/lib/matching.ts` |
| Merkliste und Bewertungen einsehen | gemäß Berechtigungsschalter | `src/components/parent/FavoritesTab.tsx`, `ReviewsTab.tsx` |
| Kind-Profil begrenzt pflegen | Name, Anzeigename, Klasse, Fächer, Bio, Verfügbarkeit, Avatar; **kein** Geburtsdatum, **keine** Kontaktdaten | `api/profiles.php` (Eltern-Whitelist) |
| Sichtbarkeit steuern | E-Mail-, Telefon- und Zusatzkontakt-Sichtbarkeit des Kindes | `src/components/parent/ChildSettingsTab.tsx` |
| Eigene Rechte verwalten | die vier Schalter selbst umstellen | `ChildSettingsTab.tsx`, `api/profiles.php` (PATCH) |
| Verknüpfung aufheben | Link löschen; Kind kann den Status ebenfalls auf `revoked` setzen | `api/profiles.php` (PATCH/DELETE) |

### 2.5 Was ausdrücklich nicht möglich ist

- **Kein Chat-Einblick:** Eltern sehen Status und Gegenstelle von Anfragen, aber keine Nachrichten (`src/components/parent/RequestsTab.tsx`; ausdrücklich auch so kommuniziert in `src/pages/ParentGuide.tsx` und `Landing.tsx`).
- **Keine Freigabe einzelner Anzeigen oder Anfragen:** Es gibt keinen Genehmigungsschritt; Eltern bestätigen nichts vor der Veröffentlichung.
- **Keine vollständige Verwaltung im Namen des Kindes:** Anfragen annehmen/ablehnen, Nachrichten senden, Bewertungen abgeben und ähnliche Aktionen bleiben dem Kind vorbehalten.
- **Kein Zugriff auf Geburtsdatum oder Kontaktdaten des Kindes** über die Eltern-Whitelist.

### 2.6 Lücken des Ist-Stands

1. Die Verknüpfung ist in allen Stufen **freiwillig** – gerade in 5/6 droht eine niedrige Quote.
2. **Einwilligung und Verknüpfung sind getrennt:** Das U16-Flag aus der Registrierung beweist nicht, dass tatsächlich ein Elternteil digital angebunden ist.
3. Es gibt **keine jährliche Überprüfung** von Links, Rechten und Datenständen.
4. Es gibt **keine Kennzahlen** zur Verknüpfungsquote oder zu Eltern-Supportfällen.
5. Das **kindliche Gesuch** (Typ `search`) ist im Eltern-Dashboard über die Anzeigenliste sichtbar; dieser Punkt ist mit der neuen „privaten Gesuchen“-Logik ausdrücklich zu testen und zu dokumentieren.
6. Die Eltern-Sichtbarkeit ist **nicht stufenabhängig** – ein 5.-Klässler hat dieselben Schalter wie ein 13.-Klässler.

---

## 3. Zielkonflikte

| Konflikt | Spannung | Praktische Folge |
|---|---|---|
| Kontrolle vs. Selbstständigkeit | Eltern wollen Sicherheit; ältere Schüler brauchen Privatsphäre und eigene Verantwortung | Ein „Mehr“ an Elternrechten kostet Akzeptanz bei Schülern – besonders ab Klasse 8/EF |
| Datenschutz des Kindes vs. Informationsbedürfnis | Das Kind hat ein eigenes Persönlichkeitsrecht; Eltern tragen bei U16 die Verantwortung | Eltern dürfen nicht alles sehen; der Chat bleibt tabu, Statusinfos sind zulässig |
| Aufwand vs. Nutzen | Jede Freigabe-/Genehmigungsfunktion erzeugt Tickets und Rückfragen | Ehrenamt verträgt keine Einzelfall-Genehmigungsschleifen |
| Missbrauchs-/Mobbingrisiko | Fehlende Aufsicht ist ein Risiko; Überwachung ist ebenfalls ein Risiko (Gesprächsklima) | Meldewege und Moderation bleiben wichtiger als elterliche Kontrolle |
| Einheitlichkeit vs. Ausnahmen | Pflichtverknüpfung trifft Familien ohne Internet, mit getrenntem Sorgerecht oder Konflikten | Ausnahmeprozess nötig, sonst werden Betroffene ausgeschlossen |
| Papier vs. Digital | Papier ist niedrigschwellig, aber nicht nachweisbar aktuell; digital ist nachweisbar, aber voraussetzungsreich | Hybrid: digital als Regel, Papier als dokumentierte Ausnahme |

---

## 4. Varianten

### Variante A — Eltern-Feature streichen (Einwilligung nur auf Papier/PDF)

**Idee:** Die Rolle `parent`, Verknüpfung und Dashboard werden zurückgebaut. U16-Einwilligung erfolgt ausschließlich über das Papierformular bzw. PDF; der Eltern-Leitfaden bleibt als Information erhalten.

| Kriterium | Einschätzung |
|---|---|
| Funktionsumfang | Kein Eltern-Account, keine Verknüpfung, kein Dashboard, keine Eltern-Benachrichtigungen |
| Vorteile | Kleinste Angriffsfläche und Datensparsamkeit; kein Pflegeaufwand; Chat-Privatsphäre trivial; weniger Support |
| Nachteile | Verliert ein beworbenes Vertrauensmerkmal; Papiernachweis ist nicht aktuell; Eltern verlieren Einblick in Anzeigen/Status; Rückbau von Code und vielen Texten |
| Aufwand SV | Niedrig nach dem Rückbau, aber **einmaliger** Umstellungsaufwand und Erklärungsbedarf |
| Aufwand Code | Mittel (Rückbau, Migration, Textkorrekturen) – Erfahrungswert ca. 10–20 h |
| Rechtlich | Papier-Einwilligung ist zulässig (Art. 8 DSGVO verlangt kein digitales Verfahren); Datensparsamkeit spricht dafür. Kein Rechtshindernis, aber auch kein Vorteil gegenüber B |
| Vertrauen/Akzeptanz | Eltern verlieren ein sichtbares Angebot; Schulleitung könnte das Streichen eines zugesagten Features hinterfragen |

### Variante B — Digital-minimal (Status quo)

**Idee:** Alles bleibt wie in Abschnitt 2: Verknüpfung freiwillig, Read-only-Dashboard, Benachrichtigungen, Auto-Verifizierung, kein Chat-Einblick.

| Kriterium | Einschätzung |
|---|---|
| Funktionsumfang | Vollständig implementiert (Abschnitt 2) |
| Vorteile | Bewährt, kostenlos für die SV, stärkt Vertrauen und Aufsicht; Kind kann Link widerrufen; keine neuen Pflichten |
| Nachteile | Verknüpfungsquote bleibt ungesteuert (gerade in 5/6 schwach); U16-Nachweis und Verknüpfung bleiben getrennt; keine Jahresprüfung; keine Kennzahlen |
| Aufwand SV | Niedrig (Bestand) – Erfahrungswert ca. +15–30 Min./Woche inkl. Support |
| Aufwand Code | Null (Bestand) |
| Rechtlich | Solide: aktive Verknüpfung + Berechtigungsschalter als Zugriffsschwelle, Chat ausgenommen. Die freiwillige Verknüpfung belegt die Einwilligung nur mittelbar |
| Vertrauen/Akzeptanz | Gute Außenwirkung, aber begrenzte Wirkung genau bei der Zielgruppe 5/6 |

### Variante C — Pflichtverknüpfung für Stufen 5/6, optional 7–10, frei ab EF/16

**Idee:** Für Stufen 5/6 ist eine aktive Elternverknüpfung Voraussetzung für die volle Freischaltung (Anlegen von Anzeigen, Feed-Nutzung); Stufen 7–10 erhalten eine deutliche Empfehlung, EF/Q2 und Nutzer ab 16 entscheiden frei.

| Kriterium | Einschätzung |
|---|---|
| Funktionsumfang | Onboarding-Hinweis, Sperrlogik für 5/6 ohne Link, Kulanzfrist, Ausnahmeprozess |
| Vorteile | Schließt die U16-Lücke sichtbar; Einwilligung wird überprüfbar; höchster Schutz der Jüngsten; passt zur Coaching-AG-Klammer |
| Nachteile | Ausschlussrisiko für Familien ohne Internet/mit Konflikten; mehr SV-Support und Ausnahmen; möglicher Widerstand in 5/6 („Kontrolle“); wichtiger Eingriff in die Freiwilligkeit |
| Aufwand SV | Mittel – Onboarding und Ausnahmen, Erfahrungswert ca. +30–60 Min./Woche in der Startphase |
| Aufwand Code | Mittel (Stufenlogik, Gate, Kulanz, Ausnahmevermerk) – Erfahrungswert ca. 15–30 h |
| Rechtlich | Vertretbar, wenn die Sperre an die **erforderliche elterliche Einwilligung** anknüpft und Ausnahmen vorgesehen sind; keine Rechtsberatung, mit DSB/Verbindungslehrkräften abstimmen |
| Vertrauen/Akzeptanz | Eltern: hoch; Schüler 5/6: geteilt; ältere Stufen bleiben freiwillig und unberührt |

### Variante D — Vollausbau (Eltern verwalten Anzeigen, bestätigen Anfragen, Chat-/Status-Einblick)

**Idee:** Eltern erhalten umfassende Rechte: Anzeigen freigeben/ablehnen, Anfragen bestätigen, Status- und Chatverläufe einsehen, ggf. im Namen des Kindes handeln.

| Kriterium | Einschätzung |
|---|---|
| Funktionsumfang | Genehmigungsworkflows, Chat-Einblick, erweiterte Elternrollen, umfangreiche Audit- und Supportprozesse |
| Vorteile | Maximale Kontrolle und Transparenz für Eltern in schwierigen Einzelfällen |
| Nachteile | Unverhältnismäßig: Chat-Einblick verletzt die Privatsphäre des Kindes; viele Berechtigungsstufen und Fehlkonfigurationen; hoher Moderations- und Supportaufwand; Konflikte wandern zur SV |
| Aufwand SV | Hoch – nicht ehrenamtlich tragfähig |
| Aufwand Code | Hoch – Erfahrungswert deutlich über 60 h plus laufende Wartung |
| Rechtlich | **Kritisch:** Chat-Einblick und Generalvollmachten überschreiten das Informationsbedürfnis der Eltern; Datensparsamkeit und Persönlichkeitsrecht des Kindes sprechen dagegen. Für eine Ausnahme (z. B. gerichtlich angeordnete Fälle) ist die SV nicht zuständig |
| Vertrauen/Akzeptanz | Schüler: Vertrauensverlust und Ausweichverhalten; Eltern: nur für eine Minderheit relevant. Für die breite Einführung abzulehnen |

### Variante E — Hybrid B+ (Empfehlung)

**Idee:** Der digital-minimale Status quo (B) bleibt technische Basis und Standard für 7–13. Ergänzt wird er um eine **abgestufte Mitbetreuung für die Stufen 5/6** und um Transparenz- und Überprüfungspflichten – ohne Chat-Einblick, ohne Genehmigungsschleifen.

Bausteine:

1. **Regelvermutung 5/6:** Beim Onboarding wird die Elternverknüpfung verpflichtend angezeigt und angestrebt; volle Funktion erst mit aktiver Verknüpfung, mit Kulanzfrist (Erfahrungswert 4 Wochen) und dokumentierter Ausnahme.
2. **Eltern sehen das Gesuch des Kindes:** Die Anzeigenansicht umfasst auch Suchanzeigen (`search`), damit Eltern bei privaten Gesuchen wissen, was ihr Kind sucht.
3. **Kein Chat-Einblick:** bleibt unverändert; Status und Gegenstelle ja, Nachrichten nein.
4. **Benachrichtigungen stufenabhängig:** für 5/6 standardmäßig aktiv, ab 7 transparent und abwählbar.
5. **Jährliche Überprüfung:** Link-, Rechte- und Datencheck mit Erinnerung an Eltern und Kind.
6. **Kind-Transparenz:** Das Kind sieht, welche Rechte seine Eltern haben, und kann die Verknüpfung widerrufen – mit klarer Erklärung der Folgen.

| Kriterium | Einschätzung |
|---|---|
| Funktionsumfang | B plus Mitbetreuungslogik 5/6, Gesuchs-Transparenz, Jahrescheck |
| Vorteile | Schließt die U16-Lücke pragmatisch; begrenzt neue Elternmacht; Ausnahmen möglich; vertretbarer Aufwand |
| Nachteile | Etwas mehr Onboarding-Aufwand; Ausnahmefälle brauchen Betreuung; Abgrenzung 5/6 zu 7+ muss klar kommuniziert werden |
| Aufwand SV | Startphase mittel, danach niedrig – Erfahrungswert ca. +20–40 Min./Woche |
| Aufwand Code | Mittel – Erfahrungswert ca. 15–25 h (Onboarding-Hinweis, Stufenlogik, Ausnahmevermerk, Kennzahlen) |
| Rechtlich | Tragfähig, weil an die ohnehin nötige Einwilligung gekoppelt und mit Ausnahmen versehen. Kein Chat-Einblick, kein Genehmigungsworkflow |
| Vertrauen/Akzeptanz | Eltern: hoch; 5/6-Schüler: akzeptabel, wenn sie wissen, was Eltern sehen; ältere Stufen bleiben freiwillig |

---

## 5. Bewertungsmatrix

Bewertung: **++** sehr gut · **+** gut · **o** neutral · **–** schwach · **––** kritisch. Einschätzungen aus SV-Sicht.

| Kriterium | A Streichen | B Status quo | C Pflicht 5/6 | D Vollausbau | E Hybrid B+ |
|---|---|---|---|---|---|
| Rechtskonformität (Art. 8, Datensparsamkeit) | + | + | + (mit Ausnahmen) | –– | + |
| Aufwand SV-Betrieb (dauerhaft) | ++ | ++ | – (Startphase) | –– | + |
| Aufwand Entwicklung (einmalig) | – | ++ | – | –– | – |
| Akzeptanz Schüler 5/6 | + | + | o | –– | + |
| Akzeptanz Schüler ab 8/EF | + | + | + (unberührt) | –– | + |
| Akzeptanz Eltern | – | o | ++ | + (kleine Gruppe) | ++ |
| Vertrauen nach außen (Schulleitung, Eltern) | – (Rückbau eines Angebots) | + | ++ | o | ++ |
| Missbrauchs-/Mobbingrisiko | o (kein Kanal) | + | + | –– (Chat-Einblick) | + |
| Skalierung/Wartbarkeit | ++ | + | o | – | + |
| Vereinbarkeit mit Ehrenamt | ++ | ++ | o | –– | + |

**Kurzlesart:** A und D sind die Extreme. A beseitigt ein beworbenes Vertrauensmerkmal und lässt die U16-Lücke offen; D schafft Überwachung und Betriebslast. B ist solide, steuert die Zielgruppe aber nicht. C löst das Kernproblem, ist aber als harte Pflicht mit Ausschlussrisiko verbunden. E verbindet die Stärken von B und C und begrenzt deren Nachteile.

---

## 6. Entschluss und Empfehlung

### 6.1 Entscheidung

**Die SV betreibt das Eltern-Feature weiter (kein Streichen) und baut es gezielt und begrenzt aus – Variante E („Hybrid B+“).** Der Status quo (B) bleibt Basis für alle Stufen. Für die Stufen 5/6 gilt eine **abgestufte Mitbetreuung mit Regelvermutung** der Elternverknüpfung, Kulanzfrist und dokumentierter Ausnahme. Ein Chat-Einblick, Genehmigungsschleifen und eine vollständige Verwaltung im Namen des Kindes werden ausdrücklich **nicht** umgesetzt.

### 6.2 Begründung

1. **Rechtlich schlüssig:** Die Verknüpfung wird an die für U16 ohnehin erforderliche Eltern-Einwilligung gekoppelt (Art. 8 DSGVO; `docs/Schulleitungsgespraech.md` Abschnitt 5). Damit wird aus einem Registrierungs-Flag ein überprüfbarer Nachweis. Datensparsamkeit bleibt gewahrt, weil keine zusätzlichen sensiblen Daten verarbeitet werden. Unberührt bleibt die bestehende Identitätsprüfung (persönliche Verifizierung im SV-Raum) als Vorsorge im Sinne der aus C-492/23 abgeleiteten Anforderungen (vgl. `docs/Schulleitungsgespraech.md` Abschnitt 5).
2. **Pädagogisch richtig:** Jüngere Kinder brauchen Begleitung, ältere brauchen Freiraum. Die 5/6-Regel trifft die Zielgruppe, ohne ältere Stufen zu bevormunden.
3. **Ehrenamtlich tragfähig:** Es entstehen keine Einzelfall-Genehmigungen und keine Chat-Prüfpflichten. Die zusätzliche Arbeit ist einmalig im Onboarding und danach gering.
4. **Vertrauensbildend:** Das Angebot bleibt sichtbar, die Schulleitung sieht eine klare Linie, Eltern erhalten den erwarteten Einblick – begrenzt auf Status-, Anzeigen- und Gesuchsinformationen.
5. **Anschlussfähig:** Die bestehende Architektur (Rolle `parent`, `parent_links`, Berechtigungsschalter, Autoverify, Benachrichtigungs-Fan-out) wird genutzt, nicht ersetzt.

### 6.3 Restarbeiten (mit der Empfehlung verbunden)

| Nr. | Restarbeit | Warum | Priorität |
|---|---|---|---|
| 1 | Eltern sehen das Gesuch des Kindes ausdrücklich und getestet (Typ `search` in der Anzeigenansicht, auch bei privaten Gesuchen) | Genau das ist der neue, sensible Fall | P0 |
| 2 | Regelvermutung/Pflichtverknüpfung für 5/6 mit Kulanzfrist und Ausnahmevermerk | Schließt die U16-Lücke, ohne Familien ohne Internet auszuschließen | P0 |
| 3 | Kein Chat-Einblick: bleibt technisch und in allen Texten garantiert | Vertrauen der Kinder, Rechtssicherheit | P0 (Bestand sichern) |
| 4 | Stufenabhängige Benachrichtigungs-Standards (5/6 an, ab 7 abwählbar) | Schutz der Jüngsten ohne Gängelung Älterer | P1 |
| 5 | Jährliche Überprüfung von Links, Rechten und Datenständen | Verhindert „Karteileichen“ und falsche Berechtigungen | P1 |
| 6 | Kind-Transparenz: Anzeige „Was sehen meine Eltern?“ im Eltern-Verknüpfungsdialog | Kinder müssen wissen, was geteilt wird | P1 |
| 7 | Dokumentierter Ausnahmeprozess (Papier-Einwilligung, Fallnotiz, Audit-Eintrag) | Rechts- und Verfahrenssicherheit | P1 |
| 8 | Kennzahlen (Verknüpfungsquote, Tickets, Beschwerden) im Admin-Bereich | Steuerung und Erfolgsmessung | P2 |
| 9 | Mehr-Eltern-/Mehr-Kind-Fälle und Abgangsroutine testen | Skalierung und Datenhygiene | P2 |

### 6.4 Was bewusst nicht umgesetzt wird

- Kein Chat-Einblick für Eltern (kein Text, keine Verläufe).
- Keine Freigabe-/Genehmigungsschleife für einzelne Anzeigen oder Anfragen.
- Keine Verwaltung im Namen des Kindes jenseits des heutigen Umfangs (kein Nachrichten senden, kein Anfragen bestätigen, kein Bewerten).
- Keine Kontrolle durch die SV im Sinne einer Generalüberwachung privater Inhalte (`docs/Schulleitungsgespraech.md` Abschnitt 6).

### 6.5 Wann neu entschieden wird

- **Nach einem Schulhalbjahr** Auswertung von Kennzahlen und Supportfällen (Abschnitt 9).
- **Sofortige Neubewertung** bei schwerwiegenden Vorfällen (Mobbing, Datenpanne, Missbrauchsverdacht) oder wenn die Ausnahmefälle die Kapazität der SV übersteigen.
- **Spätestens jährlich** als Teil des Mini-Checks aus `docs/Schulleitungsgespraech.md` (Abschnitt 9, Nr. 10).

---

## 7. Realistischer Betrieb

### 7.1 Wer macht was

| Rolle | Aufgabe | Zeitbudget (Erfahrungswert) |
|---|---|---|
| SV-Team (2–3 Admins) | Verknüpfungen prüfen und bei Problemen helfen, Ausnahmen dokumentieren, Meldungen bearbeiten, Monatsbericht | Startphase ca. 1–2 h/Woche, danach ca. +15–30 Min./Woche zum Bestand |
| Verbindungslehrkräfte | Pädagogische Ansprache bei Konflikten Eltern/Kind, Freigabe von Ausnahmen, Eskalation an die Schulleitung | anlassbezogen, im Rahmen der bestehenden SV-Begleitung |
| Eltern | Kind verknüpfen, Daten aktuell halten, Abgang oder Änderungen melden | einmalig pro Familie, danach selten |
| Schulleitung | Zustimmung, Information bei schwerwiegenden Vorfällen, Not-Aus | einmalig plus anlassbezogen |
| Datenschutzbeauftragter (behördlich) | Freiwillige Rücksprache bei neuen Einwilligungs- und Ausnahmefragen | anlassbezogen |

### 7.2 Zeitbudget in der Startphase

- Einweisung der Verbindungslehrkräfte und Abstimmung: eine Sitzung, ca. 45–60 Min. (Erfahrungswert).
- Erstverteilung der Elterninfo und Erklärung der Verknüpfung: einmalig, ca. 2–3 h SV-Arbeit (Erfahrungswert).
- Bearbeitung der ersten Ausnahmen und Rückfragen: erfahrungsgemäß wenige Fälle pro Schuljahr, jeweils unter 30 Min.

### 7.3 Eskalation

| Stufe | Fall | Weg | Zielzeit |
|---|---|---|---|
| 1 | Verknüpfungscode funktioniert nicht, Frage zur Ansicht | SV-Support (`info@nachhilfe-sv.de`) | < 24 h |
| 2 | Elternteil und Kind sind uneinig über Sichtbarkeit/Rechte | Vermittlung durch Verbindungslehrkräfte | wenige Tage |
| 3 | Verdacht auf Mobbing, Belästigung oder Straftat | Verbindungslehrkräfte, Information Schulleitung, ggf. Meldung an die Polizei | unverzüglich |
| 4 | Datenpanne oder schwerwiegender Datenschutzvorfall | Schulleitung + behördlicher DSB; Meldung nach Art. 33 DSGVO, wenn erforderlich | unverzüglich |

### 7.4 Beschwerdeweg

- Erste Anlaufstelle ist der bestehende Kanal `info@nachhilfe-sv.de` (auch für Eltern).
- Jede Beschwerde wird schriftlich dokumentiert (Datum, Anlass, Maßnahme, Ergebnis), ohne unnötige sensible Details.
- Widerspruchs- und Sanktionswege bleiben wie in `docs/Schulleitungsgespraech.md` Abschnitt 6 beschrieben; bei Meinungsverschiedenheiten über Sorgerecht oder Erziehungsfragen entscheidet die SV nicht selbst, sondern übergibt an die Verbindungslehrkräfte.
- Beschwerden über die Plattform selbst gehen denselben Weg; die Schulleitung wird bei schwerwiegenden Fällen informiert.

### 7.5 Audit-Log und Nachvollziehbarkeit

- Änderungen an Verknüpfungen (Anlegen, Aufheben, Rechteänderung) und Ausnahmen werden protokolliert, damit Vorgänge für Verbindungslehrkräfte und Betroffene nachvollziehbar sind (`admin_audit_log` ist vorhanden).
- Das Protokoll enthält Vorgang, Zeitpunkt und handelnde Rolle – keine Chat-Inhalte.
- Aufräum- und Löschroutinen folgen dem bestehenden Löschkonzept (`docs/Schulleitungsgespraech.md` Abschnitt 5: Löschung auf Antrag binnen 14 Tagen).

### 7.6 Ausnahmen

| Fall | Vorgehen |
|---|---|
| Eltern ohne Internet/ohne Gerät | Papier-Einwilligung, dokumentierte Ausnahme, Account bleibt mit reduziertem Funktionsumfang nutzbar |
| Getrennte Sorgeberechtigte | Nur der Elternteil erhält Zugriff, den das Kind einlädt bzw. der die Einwilligung erteilt; Konflikte gehen an die Verbindungslehrkräfte, keine Entscheidung durch die SV |
| Kind widerruft die Verknüpfung | Widerruf möglich; Folgen werden erklärt (reduzierter Modus bei U16); pädagogische Vermittlung |
| Kind verlässt die Schule | Accountlöschung nach Abgangsroutine; Verknüpfungen werden kaskadierend entfernt |
| Mehrere Kinder/mehrere Eltern | gleiche Regeln je Verknüpfung; Rechte werden pro Kind getrennt gesetzt |
| Dringender Schutzfall | Sofortige Sperre/Entzug durch SV-Admin, Information der Verbindungslehrkräfte |

---

## 8. Umsetzungsfahrplan (priorisiert, ohne Umsetzung)

**P0 – vor dem Start der Mitbetreuung**

1. **Entscheidung formalisieren:** Zustimmung von Schulleitung und Verbindungslehrkräften zur abgestuften Mitbetreuung, Rücksprache mit dem DSB. Ergebnis in `docs/Schulleitungsgespraech.md` ergänzen.
2. **5/6-Onboarding:** Stufenabhängiger Hinweis und Gate im Anmelde-/Onboarding-Flow; Kulanzfrist und reduzierter Modus ohne Verknüpfung. Betroffen: `src/pages/Login.tsx`, `src/context/AuthContext.tsx`, `src/components/AccessGuard.tsx`, `api/profiles.php`.
3. **Gesuch des Kindes:** Sicherstellen, dass Eltern Suchanzeigen (`type = 'search'`) ihres Kindes auch dann sehen, wenn Gesuche nach der neuen Produktlogik im Feed nur passenden Anbietern angezeigt werden. Betroffen: `api/ads.php` (Listenabfrage), `src/components/parent/AdsTab.tsx`, `src/components/parent/MatchesTab.tsx`.
4. **Text- und Vertrauensabgleich:** Eltern-Leitfaden, Datenschutz, Nutzungsbedingungen und Landing konsistent zur Entscheidung. Betroffen: `src/pages/ParentGuide.tsx`, `src/pages/Datenschutz.tsx`, `src/pages/Nutzungsbedingungen.tsx`, `src/pages/Landing.tsx`, `PRODUCT.md`, `DEVELOPER_BRIEFING.md`.

**P1 – im ersten Schulhalbjahr**

5. **Ausnahmeprozess:** Papierweg, Fallnotiz und Audit-Eintrag standardisieren. Betroffen: `api/admin.php`, `api/profiles.php`.
6. **Jahrescheck:** Erinnerungs- und Prüfprozess für Links, Rechte und Datenstände. Betroffen: `api/admin.php`, Admin-Oberfläche.
7. **Kind-Transparenz:** Abschnitt „Was sehen meine Eltern?“ im Verknüpfungsdialog. Betroffen: `src/components/ChildLinkModal.tsx`, `src/components/parent/ChildSettingsTab.tsx`.
8. **Stufenabhängige Benachrichtigungs-Standards:** Defaults bei der Verknüpfung je Stufe. Betroffen: `api/profiles.php`, `src/components/ParentLinkFlow.tsx`.

**P2 – danach**

9. **Kennzahlen:** Verknüpfungsquote, Ausnahmen, Tickets und Beschwerden erfassen. Betroffen: `api/analytics.php`, `src/pages/admin/`.
10. **Härtetest:** Mehr-Eltern-/Mehr-Kind-Fälle, Abgang, Löschkaskade, Jahrescheck-Probelauf.

---

## 9. Kennzahlen zur Erfolgsmessung

| Kennzahl | Zielwert (Erfahrungswert) | Quelle | Rhythmus |
|---|---|---|---|
| Verknüpfungsquote Stufen 5/6 | ≥ 80 % nach der Startphase | Datenbankauswertung über Adminbereich | monatlich |
| Verknüpfungsquote Stufen 7–10 | ≥ 50 % (freiwillig) | dieselbe Auswertung | halbjährlich |
| Support-Tickets von Eltern | < 5 pro Monat, überwiegend Verknüpfungsfragen | Postfach/Ticketsystem | monatlich |
| Beschwerden (Plattform/Eltern-Feature) | 0–1 pro Schulhalbjahr | Beschwerdeprotokoll | halbjährlich |
| Ausnahmen pro Schulhalbjahr | vollständig dokumentiert, Tendenz stabil | Ausnahmeverzeichnis | halbjährlich |
| Anteil abgeschalteter Benachrichtigungen (7–13) | Beobachtungswert, kein Zielwert | Datenbankauswertung | halbjährlich |
| Reaktionszeit Support | < 24 h | Ticketzeiten | monatlich |
| Datenpannen/schwerwiegende Vorfälle | 0 | Vorfallprotokoll | laufend |

---

## 10. Anhang: Entscheidungs-Checkliste für die erste Sitzung

**Teilnehmende:** SV-Team, Verbindungslehrkräfte, Schulleitung (auf Wunsch behördlicher DSB). Dauer ca. 45 Minuten.

**Vor der Sitzung zu klären**

- [ ] Aktuelle Verknüpfungszahlen aus dem Adminbereich (falls vorhanden) zusammenstellen.
- [ ] Diese Vorlage und `docs/Schulleitungsgespraech.md` (Abschnitte 4, 5, 8) verteilen.
- [ ] Offene Supportfälle von Eltern sammeln.

**Zu entscheiden**

- [ ] Grundsatz: Bleibt das Eltern-Feature? (Empfehlung: ja, Variante E)
- [ ] Gilt für Stufen 5/6 eine Regelvermutung/Pflichtverknüpfung mit Kulanzfrist? (Empfehlung: ja)
- [ ] Bleiben Stufen 7–10 freiwillig und EF/Q2 frei? (Empfehlung: ja)
- [ ] Chat-Einblick bleibt ausgeschlossen? (Empfehlung: ja, festhalten)
- [ ] Eltern sehen das Gesuch des Kindes? (Empfehlung: ja, ausdrücklich)
- [ ] Jährliche Überprüfung und Ausnahmeprozess werden eingerichtet? (Empfehlung: ja)
- [ ] Wer gibt Ausnahmen frei (SV oder Verbindungslehrkräfte)? (Empfehlung: Verbindungslehrkräfte, dokumentiert durch SV)

**Nach der Sitzung**

- [ ] Ergebnis und Abweichungen in `docs/Schulleitungsgespraech.md` nachtragen.
- [ ] Verantwortliche und Termine für die P0-Punkte aus Abschnitt 8 benennen.
- [ ] Elterninfo und Leitfaden an die Entscheidung anpassen.
- [ ] Termin für die erste Kennzahlen-Auswertung festlegen (Empfehlung: nach einem Schulhalbjahr).

**Offene Punkte, die nicht in der SV entschieden werden**

- [ ] Sorgerechtsfragen im Einzelfall (Zuständigkeit: Eltern/Schule, nicht SV).
- [ ] Datenschutzrechtliche Feinfragen (Zuständigkeit: behördlicher DSB, keine Rechtsberatung durch die SV).

---

*Ende des Dokuments. Diese Vorlage entscheidet bewusst: Variante E – weiterbetreiben, für 5/6 verbindlich begleiten, ältere Stufen freiwillig lassen, Chat und Genehmigungsschleifen ausschließen.*
