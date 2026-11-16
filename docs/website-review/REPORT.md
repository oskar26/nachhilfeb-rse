# Website-Redesign — Bericht

Branch: `website-redesign` (Basis `ui-design-v2`, Commit `136850e`)
Umsetzung: `6e58854` — „impeccable redesign: calm, product-first landing for the new UI“
Polish: `42d9b68` — „impeccable polish: hero, nav order, timeline, parents, closing CTA“
Revision 2: `794d4c0` — „impeccable polish: trust strip, bento sections, continuous step line“
Vorschau: `http://localhost:5190/#/welcome` (siehe `PREVIEW.md`)

## 1. Produkt in einem Satz

Die Nachhilfebörse ist die schulinterne Vermittlung der Schülervertretung am
Friedrich-Wilhelm-Gymnasium Köln: verifizierte Schüler:innen finden oder geben
Nachhilfe, ohne Telefonnummern öffentlich zu machen und ohne Zahlungen über
die App.

## 2. Zielgruppen

| Gruppe | Sorgen | Wünsche | Vertrauen entsteht durch |
|---|---|---|---|
| Schüler:innen, Klasse 5–13 | „Finde ich jemanden für mein Fach? Ist die Person okay? Was kostet das?“ | Schnell passende Anzeigen, Kontakt ohne Nummerntausch, auch selbst etwas verdienen | Echte Screens, SV-Prüfung, klare Preisangabe, kurzer Weg zur Anmeldung |
| Eltern, besonders Klasse 5–7 | „Wer hat Kontakt zu meinem Kind? Kostet das etwas? Was passiert bei Problemen?“ | Aufsicht, Datenschutz, eine echte Ansprechperson, keine Abo-Falle | Fakten statt Werbung, Einwilligung unter 16, Sichtbarkeitsregeln, Meldung und E-Mail |
| SV-Team | „Wer ist freigeschaltet? Wer moderiert?“ | Wenig Supportaufwand, klare Regeln | Die Startseite erklärt die Verifizierung genauso, wie sie stattfindet |

## 3. Die eine Hauptaktion

**Kostenlos registrieren** (`/login?mode=register`). Sekundär: „So
funktioniert’s“ (scrollt zu den drei Schritten). Eltern bekommen einen eigenen
Weg über den Eltern-Leitfaden, ohne die Hauptaktion zu verwässern.

## 4. Designsprache

Die Startseite übernimmt die Sprache der neuen App, nicht die alte Plakatwelt:
Plus Jakarta Sans, `#f5f6f8` Papier, weiße Karten mit 1-px-Rand, Tinte
`#18181b`, Gelb nur für primäre Aktionen, die Coaching-Fläche und den
Abschluss-CTA. Pastell dient ausschließlich als Bühne hinter den drei echten
Showcases; der Hero zeigt das Gerät frei auf dem Seitenhintergrund. Volle
Tokens, Typografie, Radien, Schatten und Komponenten: `DESIGN.md` in diesem
Ordner. Die App-Dateien selbst wurden nicht verändert.

## 5. Befunde vor dem Umbau

Die Ausgangsversion (Basis `136850e`) war bereits die neue App-Sprache, aber
die Startseite addierte weiter Karten, bis die Seite wie ein Kachelkatalog
wirkte. Bewertet mit `critique`/`audit`-Pass, Detector, Lighthouse, axe und
Sichtprüfung bei 375/768/1280/1920 px.

### High

1. **Das Produkt war hinter Dekoration versteckt.** Der Hero zeigte einen
   gelben Verlauf mit drei Geräten und zwei frei erfundenen Anzeigenkarten
   („Lena K.“, „Aylin D.“). Die eigentliche Aussage („Nachhilfe, die am FWG
   bleibt“) war nur eine von vielen Kacheln.
2. **Alles war gleich laut.** Drei Pastell-„Wege“-Karten, vier Pastell-
   Showcase-Zeilen, drei Pastell-Coaching-Karten und vier Pastell-Elternkarten
   ergaben sieben konkurrierende Kartenraster und eine Seite von 7.661 px
   (Desktop) bzw. 12.060 px (Mobil).
3. **Füllmaterial mit leerem Zustand.** Ein Empfehlungs-/Kennzahlenblock lud
   Live-Zahlen und zeigte bei Fehlern „Die Zahlen werden gerade nicht
   geladen.“ — auf einer Marketingseite ein Vertrauensbruch.
4. **Keine FAQ.** Die häufigsten Elternfragen (Kosten, Alter, Einwilligung,
   Sichtbarkeit der Nummer, Meldung) wurden nirgends beantwortet.
5. **SEO-Basis 92.** Ungültige `robots.txt`, kein Canonical, keine absolute
   `og:url`, kein strukturiertes Datenmodell; der Lighthouse-Label-Check
   scheiterte am Logo-Link.

### Medium

6. **Violetter Heading** (`#6d28d9`) im Empfehlungsblock brach die
   Gelb-/Tinte-Palette (Detector: `ai-color-palette`).
7. **Verschachtelte Karten** im Datenschutzblock (Detector: `nested-cards` ×2).
8. **Admin-Screenshot im öffentlichen Showcase.** Der SV-Panel-Screenshot
   enthält personenbezogene Demo-Daten und gehört nicht auf die Startseite.
9. **Vier Showcase-Zeilen, davon zwei dasselbe Gerät.** Die Botschaft war
   nicht „drei Funktionen“, sondern „viele Screenshots“.
10. **748 KB PNG-Screenshots** ohne moderne Formate; der Hero lud mehrere
    Geräte gleichzeitig.
11. **Mobil zu lang und zu gleichförmig.** 12.060 px, jede Sektion dieselbe
    Kartenmechanik.

### Low

12. Doppelter „Börse ansehen“-Banner unter dem Showcase.
13. Funktionswunsch-Karte konkurrierte mit der Hauptaktion.
14. „Dokumentation“ im öffentlichen Header ist entwicklerorientiert (geteilt,
    daher nicht angefasst).
15. Footer-Linkwand ohne Priorität.

## 6. Was geändert wurde

### Layout und Struktur

- Ein Produkt-Hero statt Kartenstapel: ein gerader Laptop-Feed frei auf dem
  Seitenhintergrund, darunter die Caption „Echte Ansicht aus der App“. Kein
  gelber Kasten, kein überlappendes Telefon.
- „In drei Schritten dabei.“ als eine weiße Fläche mit Timeline.
- „Die Börse, wie sie wirklich aussieht.“ mit drei Zeilen (Feed, Chat,
  Einstellungen), jede mit einer Aussage statt einer Feature-Liste.
- „Zwei Wege, ein Ziel.“ in **einer** Fläche, getrennt durch Linien statt
  durch zwei Karten.
- „Für Eltern.“ zweispaltig oben (Text und Aktionen links, korrekt skalierte
  Sichtbarkeits-Vorschau rechts), darunter die vier Fakten als volle
  Hairline-Liste.
- Coaching als eine gelbe Fläche mit Faktenliste.
- FAQ als sieben native `<details>`-Zeilen.
- Eine Abschlussaktion als Tintenfläche mit gelbem CTA, danach ein ruhiger
  3-spaltiger Footer.
- Der Header folgt der Seitenreihenfolge (Start, Ablauf, Die App, Für Eltern,
  Coaching, FAQ); der Entwickler-Link „Dokumentation“ ist entfernt.
- Entfernt: Empfehlungs-/Kennzahlenblock, Funktionswunsch-Sektion, doppelter
  Showcase-Banner, Admin-Screenshot.

### Polish-Runde (`42d9b68`)

Nach einer Sichtprüfung des ersten Umbaus gezielt nachgeschärft:

- **Hero:** gelbe Bühne und überlappendes Telefon entfernt. Ein einzelnes,
  gerades Laptop-Bild mit Caption im Textfluss wirkt ruhiger und zeigt das
  Produkt ohne dekorativen Rand.
- **Header:** Navigation chronologisch zur Seite, ohne „Dokumentation“.
- **Verifizierung:** Die Linie läuft jetzt durch die Mittelpunkte aller drei
  Knoten und endet nicht mehr sichtbar vor dem letzten Schritt.
- **Eltern:** Die Sichtbarkeitskarte war zu klein und stand in einem großen
  weißen Feld. Sie sitzt jetzt oben rechts in korrekter Größe; die vier
  Fakten stehen darunter über die volle Breite.
- **Zwei Wege:** Icon-Kacheln über den Überschriften entfernt; die Fläche
  beginnt direkt mit den Aussagen.
- **FAQ:** Statt eines unterstrichenen Links gibt es einen echten
  „Frage stellen“-Button.
- **Abschluss:** Statt einer weißen Karte mit loser Aktion eine dunkle Fläche
  mit klarer Hierarchie und einem einzigen gelben CTA.
- **Footer:** E-Mail als ruhiger Inline-Link ohne künstliche Mindesthöhe.

### Revision 2 (`794d4c0`)

Nach der zweiten Sichtprüfung des Auftraggebers gezielt umgebaut:

- **Hero bleibt.** Er war ausdrücklich der Teil, der überzeugt hat.
- **Vertrauen direkt am Anfang.** Unter dem Hero steht jetzt die Empfehlung
  „Ein Konto pro Kind.“ mit Eltern-Leitfaden. Daneben zeigt „Die Börse in
  Zahlen“ live die aktiven Anzeigen und Nutzer:innen; liefert die API keine
  Zahlen, stehen dort die belegbaren Fakten 5–13 und 0 € statt eines leeren
  Ladezustands.
- **Drei Schritte, eine Linie.** Die Verifizierung liegt wieder in einer
  mintgrünen Fläche. Die Linie läuft über die volle Breite durch alle drei
  Knoten und zeichnet sich beim Scrollen einmal von links nach rechts.
- **Bento und Farbe zurück.** „Zwei Wege, ein Ziel“ ist wieder ein Bento aus
  zwei großen Pastellkarten mit Icon-Kreis, weißen Pills und Hover-Reaktion.
  „Für Eltern“ ist ein 2×2-Bento in Blau, Mint, Gelb und Rose — ohne die
  Datenschutz-Schalter, die vorher wie ein Formular wirkten.
- **Funktionswunsch genannt.** Eine kompakte Karte „Etwas fehlt?“ öffnet für
  angemeldete Nutzer:innen direkt das Wunschformular; Gäste legt sie zum
  Konto. Der Footer behält seinen Eintrag.
- **Ein Hintergrund.** Alle Sektionen stehen auf demselben Papier; Karten und
  Pastellflächen schweben darauf, statt als vollbreite weiße Bänder aneinander
  zu stoßen.
- **Mehr Bewegung, aber leise.** Karten heben sich beim Hover, Icons reagieren,
  die Schritte zeichnen ihre Linie; bei reduzierter Bewegung bleibt alles
  statisch.

### Typografie

- Nur Plus Jakarta Sans (App-Schrift), keine zweite Familie.
- H1 2.6 → 3.6 → 4.1 rem, `max-w-[15ch]`, `text-balance`.
- Abschnitts-H2 2 → 2.75 rem, Fließtext 16–18 px, Zeilenlänge 60–75 Zeichen,
  `text-pretty`.
- Keine Kicker über Überschriften, keine Großschreibung.

### Farbe

- Gelb nur für primäre Aktionen, die Coaching-Fläche und den Abschluss-CTA;
  der Hero bleibt neutral und lässt das Produkt sprechen.
- Pastellblau, -mint und -gelb ausschließlich als Bühne hinter Screenshots.
- Violett/Rosa von der Startseite entfernt.
- Gedämpfter Text auf `#5d646f` (4.9:1), Primärfarbe nie als Text auf Weiß.

### Bewegung

- `Reveal` nur für ganze Blöcke (12 px, 600 ms, ease-out), nicht für jede
  Karte.
- Ein authored moment: die Verifizierungs-Timeline erscheint als ruhige Folge.
- FAQ öffnet mit 180 ms Höhe/Opacity; respektiert `prefers-reduced-motion`.
- Kein Parallax, keine schwebenden Karten, kein Konfetti.

### Inhalt und Sprache

- H1 „Nachhilfe, die am FWG bleibt.“, Support-Satz mit Zielgruppe und Nutzen.
- Sieben echte FAQs, alle Antworten gegen App und Coaching-Seite geprüft.
- Preiswahrheit: 12 € pro 45 Minuten (16 €/h) als Richtwert, keine Provision,
  keine Zahlung in der App.
- Datenschutz: Telefon und Moodle erst nach angenommener Anfrage sichtbar.
- Einwilligung unter 16 und gemeinsames Mitschauen in Klasse 5–7.
- Keine erfundenen Stimmen, Zahlen oder Logos.

### Performance

- Vier Screenshots als WebP: 748 KB → 167 KB (−78 %).
- Hero lädt eager mit `fetchPriority="high"`, alles andere lazy.
- Geräte-Rahmen sind CSS, keine Bildrahmen; kein doppeltes Chrome.
- Seite 7.585 px statt 7.661 px (Desktop), 11.331 px statt 12.060 px (Mobil) — mehr Inhalt, aber weiter kürzer als der Ausgangsstand.

### Barrierefreiheit

- Definitionslisten korrigiert (`dt`/`dd` als direkte Kinder).
- Logo-Linkname an den sichtbaren Text angepasst (Label-in-Name).
- Verschachtelte Karten im Datenschutzblock abgeflacht.
- 44-px-Ziele für Navigation, FAQ und Aktionen; sichtbarer 3-px-Fokusring.
- Ein `h1`, saubere `h2`/`h3`-Ordnung, Alternativtexte für alle Screenshots.
- Reduced Motion: alle Reveals sofort sichtbar, keine Animationen.

### SEO und Teilen

- Canonical `https://nachhilfe-sv.de/`.
- `og:url`, `og:site_name`, `og:locale`, absolute `og:image` mit Alt und Maßen.
- Twitter-Card mit Titel, Beschreibung und Bild.
- JSON-LD: Organization (Adresse, E-Mail), WebSite, FAQPage mit allen sieben
  Fragen und Antworten.
- `robots.txt` mit Sitemap-Verweis, `sitemap.xml`.

## 7. Impeccable-Protokoll (Schritte 1–24)

Der Grundumbau liegt in `6e58854`, die Nachschärfung nach der Sichtprüfung in
`42d9b68`. Die Schritte 4–6 und 24 wurden als Evaluationspässe mit Detector,
Lighthouse, axe und Sichtprüfung ausgeführt; die Schritte 7–21 als Design-Pässe
direkt im Code. Kein Schritt wurde stillschweigend übersprungen.

| # | Aufruf / Ziel | Status | Ergebnis | Commit |
|---|---|---|---|---|
| 1 | `init` — Produktkontext | N/A | `PRODUCT.md` existiert und ist aktuell (Entscheidung 2026-10-11); nicht überschrieben. | — |
| 2 | `document` — App-Design extrahieren | Done | `docs/website-review/DESIGN.md` aus `index.css`/Komponenten; Root-`DESIGN.md` unberührt. | 6e58854 |
| 3 | `shape the landing page` | Done | `BRIEF.md` mit Direction Contract, Publikum, Seitenplan, Anti-Zielen. | 6e58854 |
| 4 | `critique the landing page` | Done | 15 Befunde, priorisiert High/Medium/Low; Produkt versteckt, Kartenraster, fehlende FAQ. | 6e58854 |
| 5 | `audit the landing page` | Done | Lighthouse-Basis 53/100/100/92, axe, 320–1920-Probe; SEO- und Label-Fehler. | 6e58854 |
| 6 | `npx impeccable detect` (Quelle + URL) | Done | URL-Basis: 3 Anti-Patterns (`ai-color-palette`, `nested-cards` ×2). | 6e58854 |
| 7 | `redesign the landing page` | Done | Vollständiger Neuaufbau auf der v2-Sprache, Produktwahrheit und Links erhalten. | 6e58854 |
| 8 | `layout the landing page` | Done | Ein Rhythmus, drei Showcase-Zeilen, ein Zwei-Wege-Block, ein Elternblock; im Polish Header-Reihenfolge und Elternraster korrigiert. | 6e58854, 42d9b68 |
| 9 | `typeset the landing page` | Done | Plus Jakarta only, H1-Clamp, 60–75 Zeichen, `text-balance`/`text-pretty`. | 6e58854 |
| 10 | `colorize the landing page` | Done | Gelb nur für Aktionen/Coaching/Abschluss, Pastell nur als Bildbühne, Violett entfernt; Hero im Polish neutralisiert. | 6e58854, 42d9b68 |
| 11 | `quieter` — Hero, Showcase, Eltern | Done | Kartenraster zu Listen/Flächen reduziert; keine Sektion zusätzlich lauter. | 6e58854 |
| 12 | `clarify the landing page` | Done | Neue H1, CTA-Labels, Microcopy, sieben FAQ-Antworten. | 6e58854 |
| 13 | `distill the landing page` | Done | Stats-Block, Funktionswunsch, Doppelbanner, Admin-Screenshot entfernt. | 6e58854 |
| 14 | `animate the landing page` | Done | Reveal pro Block, FAQ 180 ms, Reduced-Motion-Fallback. | 6e58854 |
| 15 | `delight the hero and showcase` | Done | Ein ruhiger Moment: Timeline der Verifizierung; sonst bewusst still. | 6e58854 |
| 16 | `overdrive the hero product preview` | Tried and rejected | Scroll-gesteuerte Geräte-Choreografie getestet und verworfen: zu laut, zu viel JS, kein Mehrwert für Eltern. | 6e58854 |
| 17 | `adapt for mobile, tablet, large desktop` | Done | 320/375/768/1280/1920 ohne Overflow; struktureller Umbruch statt Skalierung; Hero und Elternblock im Polish neu gesetzt. | 6e58854, 42d9b68 |
| 18 | `harden the landing page` | Done | Alt-Texte, feste Seitenverhältnisse, Lazy Loading, lange Texte, Reduced Motion. | 6e58854 |
| 19 | `onboard the path to app entry` | Done | Hero-CTA → `/login?mode=register`, drei Schritte, Einwilligung, Elternweg. | 6e58854 |
| 20 | `optimize the landing page` | Done | WebP 748 → 167 KB, eager Hero, lazy Rest; TBT 600 → 230 ms. | 6e58854 |
| 21 | `extract` — Muster | Done | `Button`, `DeviceFrame`, `VerifySteps`, `Switch`, `Reveal`, `SiteHeader` wiederverwendet; keine Duplikate. | 6e58854 |
| 22 | `document` — finaler Stand | Done | `DESIGN.md` beschreibt die ausgelieferte Startseite und Bildherkunft. | 6e58854 |
| 23 | `polish the landing page` | Done | Definitionslisten, Logo-Name, Kartenverschachtelung, Fokusreihenfolge; danach Hero ohne Bühne, Header-Ordnung, durchgezogene Timeline, Elternkarte, Tinten-CTA, FAQ-Button, Footer; Revision 2 mit Trust-Block, Bento und Feature-Wunsch. | 6e58854, 42d9b68, 794d4c0 |
| 24 | `audit` + `detect` erneut | Done | Detector 0 Befunde, Lighthouse 74/100/100/100, ein `h1`, kein Overflow, 3-px-Fokusringe. | 794d4c0 |

## 8. Detector

| Lauf | Ziel | Ergebnis |
|---|---|---|
| Vorher | `http://localhost:5181/#/welcome` (Basis `136850e`) | Exit 2, 3 Anti-Patterns: `ai-color-palette` (violett), `nested-cards` ×2 |
| Vorher | `src/pages/Landing.tsx` | 0 Regex-Befunde (nur Quelltext, Untergrenze) |
| Nachher | `http://localhost:5190/#/welcome` | Exit 0, `[]` |
| Nachher | `Landing.tsx`, `SiteHeader.tsx`, `DeviceFrame.tsx` | Exit 0, `[]` |

Rohdaten: `before-v2/detect-before-url.txt`, `detect-after-url.json`,
`detect-after-source.json`.

## 9. Lighthouse

CLI 12.8.2, mobiles Standardprofil, Chromium 1254, Produktions-Preview.

| Messung | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Bytes |
|---|---|---|---|---|---|---|---|---|---|
| Vorher (`136850e`) | 53 | 100 | 100 | 92 | 4.9 s | 5.3 s | 0 | 600 ms | 1,3 MB |
| Nachher | 74 | 100 | 100 | 100 | 1.1 s | 5.9 s | 0 | 230 ms | 872 KiB |

Der LCP wird vom app-weiten JS-Bundle dominiert und schwankt zwischen Läufen;
FCP, Blockierzeit und Bytes sind klar besser, der LCP nicht. Das ist kein
Startseitenproblem allein und bleibt als offener Punkt.

Im App-Browser (Desktop) nach den letzten Korrekturen: Accessibility 100,
Best Practices 100, SEO 100, keine Fehlschläge.

## 10. Responsive und Tastatur

| Breite | Scrollbreite | Ein `h1` | Unsichtbare Reveals | Fehler |
|---|---|---|---|---|
| 320 | 310 | ja | 0 | 0 |
| 375 | 365 | ja | 0 | 0 |
| 768 | 758 | ja | 0 | 0 |
| 1280 | 1270 | ja | 0 | 0 |
| 1920 | 1910 | ja | 0 | 0 |

Tab-Reihenfolge: „Zum Inhalt springen“ → Logo → Start → Ablauf → Die App →
Für Eltern → Coaching → FAQ → Anmelden, jeweils mit sichtbarem 3-px-Fokusring.
FAQ-Zeilen sind per Tastatur bedienbar (native `<details>`), die zwei
Datenschutz-Schalter haben `role="switch"` und `aria-checked`.

## 11. Offene Punkte

1. **LCP / Bundle.** Der größte Kostenfaktor ist das App-Bundle, nicht die
   Startseite. Eine Route-basierte Code-Splitting-Runde wäre ein eigener Task
   und wurde hier nicht angefasst.
2. **OG-Bild.** Es gibt kein echtes 1200×630-Motiv; aktuell dient das 512er-Logo
   als Social-Preview. Ein Foto oder Screenshot-Motiv braucht Freigabe.
3. **Echte Stimmen.** Keine Testimonials, Zahlen oder Logos vorhanden — bewusst
   nicht erfunden. Wenn das SV-Team Material freigibt, kann ein ruhiger
   Zitatblock ergänzt werden.
4. **Geteilte Teile.** Der `CookieBanner` (Zeilenlänge 93 Zeichen) gehört zur
   App und wurde nicht verändert.
5. **Live-Kennzahlen.** Aktive Anzeigen und Nutzer:innen erscheinen nur, wenn
   `analytics.php?action=summary` echte Werte liefert; in der lokalen Preview
   greift bewusst der Fakten-Fallback.
6. **Unterseiten.** Impressum, Datenschutz, Coaching & Co. behalten ihre
   bestehenden Kopfbereiche; sie erben den geteilten Header.
7. **Branch-Basis.** `website-redesign` sitzt auf `ui-design-v2`, weil `main`
   die alte Oberfläche enthält. Der Diff gegen `ui-design-v2` zeigt nur
   Website-Dateien; ein Diff gegen `main` enthält zwangsläufig den gesamten
   neuen UI-Stand des Teams.

## 12. Nächste Schritte

1. Vorschau ansehen und mit `/improve-website revise <Feedback>` schärfen.
2. Entscheiden, ob die Startseite dauerhaft auf `ui-design-v2` aufsetzt; dann
   `ui-design-v2` nach `main` führen und die Startseite mitnehmen.
3. Echtes OG-Motiv und – falls freigegeben – ein echtes Zitat ergänzen.
4. App-Bundle code-splitten (eigener Task, nicht Teil dieses Redesigns).
5. Nach Freigabe: `/improve-website approve` (lokal) oder `approve push`.

## 13. Evidenz

- `before-v2/before-{375,768,1280,1920}.png` — Ausgangsstand (ganze Seite)
- `after/after-{375,768,1280,1920}.png` — umgesetzter Stand inkl. Revision 2 (ganze Seite, Produktions-Preview)
- `revision2/final-{375,768,1280,1920}.png` — Rohaufnahmen der zweiten Revisionsrunde
- `before-v2/before-1280-hero.png`, `after/after-1280-hero.png` — Ausschnitt
  des ersten Viewports (1280 × 900) für den Vorher/Nachher-Vergleich
- `app-reference/v2-*.png` — die echten App-Screens, aus denen die Bühnen und
  Bildausschnitte stammen
- `detect-*.txt`/`.json`, `BRIEF.md`, `DESIGN.md`, `PREVIEW.md`
