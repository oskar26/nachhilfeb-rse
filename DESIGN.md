# DESIGN.md — Welcome-Redesign „Abi-Plakat / Schulhof-Siebdruck“

Seed: `fbf6d820` · Direction-Index: **#5** · Stand: 2026-09-21

## Konzept
Die Welcome-Page ist als **geklebte Plakatwand auf dem Schulhof** inszeniert:
Schwarzes Brett (Hero, Live-Brett, Verifikation) im Wechsel mit Papier-Sektionen
(Wege, Vertretungsplan-Tabelle), dazu ein gelbes Coaching-Feld und ein blaues
Eltern-Feld. Eine Motion-Signatur: geneigte Tickets mit Klebeband + Fach-Tickerband.

## Typografie & Farbe
- Display: **Anton** (`font-display`, uppercase, tight leading), Fließtext: Inter.
- Gelb `#FACC15` (bindend), Schwarz `#09090b`, Papier `#faf7ef`, Blau `#1d4ed8`,
  Grün `#16a34a`, Lila `#9333ae`. Keine Verläufe, kein Gradient-Text.
- Outline-Headline via `.poster-outline` (Webkit-Text-Stroke), Körnung via
  `.poster-grain` / `.poster-grain-dark`, Klebeband via `.tape`,
  Abrisskante via `.ticket-perf`, Ticker via `.ticker-track` (32 s Marquee).

## Sektionen (`src/pages/Landing.tsx`, Route `#/welcome`)
1. **Dienstleiste** (gelb): „SV-geprüft · Nur FWG Köln“ + Eltern/Coaching/Anmelden.
2. **Sticky Nav**: Logo, Anker (Live-Brett, Wege), Unterseiten (Coaching, Eltern), CTA.
3. **Hero**: Anton-Riesen-Headline, 2 geneigte Demo-Tickets mit Tape + Stempel,
   Fach-Ticker, **Live-Stats** (`api.analytics.summary()`, Fallback „—“), News-Widget.
4. **Wege** (`#wege`): 3 Abriss-Streifen (Suchen = blau, Anbieten = grün, Eltern = lila)
   mit Perforation + Checklisten, CTAs in die App.
5. **Live-Brett** (`#brett`): funktionierende **Demo-Filter** (Echtzeitsuche, 6
   Fach-Chips, Preis-Slider 0–15 €, „Nur verifiziert“), 6 Demo-Anzeigen mit
   Fachfarben + `data-testid="demo-card"`, Empty-State („Nichts klebt hier.“) mit Reset.
6. **Specs** (`#plan`): Vertretungsplan-Tabelle, 6 Module, Zähler „06 MODULE · 01 PLATTFORM“.
7. **Privatsphäre** (`#sicher`): Privacy-Demo mit 2 working Switches
   (REVEAL-Prinzip) + 3-Schritte-Verifikations-Strip.
8. **Coaching-AG** (`#coaching`): gelbes Feld, 3 schwarze Blöcke, „Jetzt mitmachen“-Callout.
9. **Eltern** (`#eltern`): blaues Feld, CTA zum Eltern-Leitfaden.
10. **Footer** (schwarz): Claim, Link-Spalten, SV-Copyright, Hosting-Zeile.

## Ehrlichkeit (keine Fake-Claims)
- Alle Demo-Inhalte sind als **DEMO** gestempelt; Copy sagt „erfundene Beispiele“.
- Live-Stats nur aus echter API, sonst „—“. Keine Nutzerzahlen/Prozent-Claims.

## Barrierefreiheit & Motion
- `prefers-reduced-motion`: Marquee/Tape/Float aus, Framer-Initials deaktiviert.
- `aria-live` auf Feed-Grid, `role="switch"` + `aria-pressed` auf Filtern,
  Labels auf allen Inputs, Fokus-Ringe, Kontraste (Gelb auf Schwarz, Papierkarten).
- Responsiv: Hero-Headline `clamp`, Tickets mobil versteckt, Filter stapeln sich.

## Verifiziert (Playwright, Chromium, Preview :4173)
- Desktop + Mobil Screenshots aller Sektionen: ok.
- Filter-Tests: initial 6 · Physik 1 · Suche „Analysis“ 1 · „xyznichts“ → Empty-State →
  Reset 6 · Preis=0 → 1 (gratis) · Nur-verifiziert → 5. Privacy-Switches togglen.
- Keine `pageerror`s (Desktop + Mobil). `tsc + vite build`: fehlerfrei.

## Nachtrag 2026-09-21 — Dead-Link-Fix + Info-Seiten auf Plakat-Standard
- **Ursache 404 bei TOC-Ankern:** Die App nutzt einen `HashRouter` (Routen wie
  `#/datenschutz`). Klassische Anker-Links (`href="#d1"`) ersetzen den Hash und
  zerstören damit die Route → `NotFound`. Fix in `Datenschutz.tsx` (`d1–d7`) und
  `Nutzungsbedingungen.tsx` (`p1–p11`): Inhaltsverzeichnisse sind jetzt
  `<button>` + `scrollIntoView` (smooth, `scroll-mt-24` bleibt). Kein toter Link
  mehr auf beiden Seiten; übrige Links (`mailto:`, `<Link to>` auf existierende
  Routen) verifiziert.
- **Nicht angefasst (bewusst):** baugleiche `href="#…"`-Anker in
  `StaticLayout.tsx` (Skip-Link `#inhalt`), `Landing.tsx` (`#inhalt`, `#brett`,
  `#wege`) und `NotFound.tsx` (`#inhalt`) leiden unter demselben HashRouter-Problem,
  dürfen laut Auftrag aber nicht geändert werden.
- **Plakat-Standard hell-abgemildert** für `Coaching.tsx`, `Nutzungsbedingungen.tsx`,
  `ParentGuide.tsx` (nur Content, Layout/Header/Footer aus `StaticLayout`): helle
  Karten, schwarze Chips, gelbe Akzent-Streifen (`h-1 w-10 bg-primary`), Anton-
  `font-display`-Headlines (uppercase), `font-mono tabular-nums` für Zeiten/Räume/
  Preise/Nummern, nummerierte Spec-Tabellen statt Listen, nummerierte 3-Schritte-
  Karten, dezente `whileInView`-Reveals mit `useReducedMotion` (Landing-`anim()`-
  Muster). Links auf hell: `text-amber-700 dark:text-primary`. Copy/Fakten
  unverändert (einzige Ausnahme: Coaching-Kontakt, siehe unten).
- **Verifizierung überall als 3 Schritte ohne Code:** 1. Anmelden, 2. im SV-Raum
  melden („Ich möchte mich verifizieren lassen“), 3. freigeschaltet = verifiziert
  (Coaching-, Nutzungsbedingungen- und Eltern-Seite).
- **Coaching-Faktencheck** gegen fwg-koeln.de (Coaching-Seite, Beratungskonzept,
  Kollegium 2025/26): bestätigt — Frau Balistreri (Leitung), dienstags
  13:45–14:30, Raum H310, Coaches aus Klasse 8 für Klassen 5+6, Schulung vor den
  Herbstferien, ehrenamtlich. Einzige Änderung: `contact_text`
  („SV-Lehrer: Herr Schulz, Herr Steinberg“ → „SV-Team: persönlich im SV-Raum“),
  da die Namen auf der offiziellen Seite nicht belegbar sind (dort: Frau Stojanov /
  Herr Wandel) — als „unverifiziert“ neutralisiert, nichts erfunden.
- `npx tsc --noEmit`: fehlerfrei.

## Nachtrag 2026-09-21 — Einheitlicher Header, Endlos-Ticker, iPhone-Mockups, Verifizierung ohne Code
- **Header:** neue Komponente `src/components/SiteHeader.tsx` (gelbe Dienstleiste „SV-geprüft · Nur FWG Köln" + sticky schwarzer Header, Logo → `/welcome`, Nav: Start, Live-Brett, Wege, Coaching-AG, Eltern, genau ein CTA „Jetzt loslegen" → `user ? '/' : '/login'` via `useAuth`); eingebunden in `Landing.tsx` und `StaticLayout.tsx` (Inline-Header dort ersetzt), überall exakt gleich. Sektions-Links HashRouter-sicher: auf `/welcome` smooth zu `#brett`/`#wege` scrollen, sonst `navigate('/welcome')` + Scroll nach 150 ms Timeout (reduced-motion: instant). Nur echte `<Link>`/`<a>`, kein Button-Navigate; doppelter „Anmelden"-Ghost-Button gestrichen. Ankerziele mit `scroll-mt-16` gegen den sticky Header.
- **Ticker:** rendert jetzt alle 25 Fächer der App-Quelle (`SUBJECT_CATEGORIES` aus `SubjectChip.tsx`, Labels 1:1 aus `subjectLabelMap`): Deutsch, Englisch, Französisch, Kunst, Griechisch, Latein, Musik, Literatur, Kultur, Geschichte, Pädagogik, Erdkunde, Philosophie, Sozialwiss., Wi & Gesell., Wi & Politik, Biologie, Chemie, Informatik, Mathematik, Physik, Blauer Planet, Prakt. Philo, Religion, Sport. Nahtlos-Endlos bleibt: Track-Inhalt exakt 2× (zweite Hälfte `aria-hidden`), CSS `translateX(0 → -50%)`, `w-max`, Abstände als inneres Padding (`px-5`); `prefers-reduced-motion` schaltet die Animation aus (`.ticker-track` in `index.css`, unverändert).
- **Mockups:** Filter-Demo-Sektion (`#brett`, „Brett lebt / probier die Filter") ersetzt durch „So sieht's in der App aus": 3 CSS-iPhone-Frames (abgerundet, Dynamic Island, Rahmen + Seitentasten), mobil horizontaler Scroll-Snap, Desktop 3-spaltig; lädt `/mockups/app-feed.png`, `/mockups/app-chat.png`, `/mockups/app-profil.png`, je mit `onError`-Fallback-Card („Screenshot ablegen unter: public/mockups/…"). Toter Filter-State (`DEMO_ADS`, Query/Fach/Preis/Verifiziert) entfernt; Hero-Demo-Tickets mit DEMO-Badge bleiben. Neu: `public/mockups/README.md` (1170×2532 PNG empfohlen).
- **Verifizierung:** Strip ohne Codes, genau 3 Schritte im Schulhof-Ton: 1. „Melde dich an" 2. „Komm in den SV-Raum" („Hey, ich habe mich angemeldet, ich möchte mich verifizieren lassen.") 3. „Wir schalten dich frei — du bist verifiziert." Keine erfundenen Details.
- **Motion mit Maß:** Hero-Tickets floaten sanft (`y [0,-10,0]`, 7 s Loop, nur ohne reduced-motion), Hero-Text und neue Sektions-Headline mit `whileInView`-Reveal (`anim()`-Muster). Weiterhin genau 1 Marquee pro Page (Ticker). Kein `scroll`-Listener.
- `npx tsc --noEmit`: fehlerfrei.

## Nachtrag 2026-09-22 — Header-Härtung: HashRouter-safe Links, Skip-Buttons, ein CTA
- **Sektions-Links ohne Raute-Anker:** `Live-Brett`/`Wege` in `SiteHeader.tsx` sind jetzt `<Link to="/welcome" onClick={…}>` — Fallback-`href` zeigt auf `/#/welcome` (gültige Route), `onClick` fängt ab und scrollt per `scrollIntoView` zu `#brett`/`#wege` (auf `/welcome` direkt, sonst `navigate('/welcome')` + Scroll nach 150 ms; reduced-motion → instant). Kein `href="#brett"`/`href="#wege"` mehr im Header.
- **Genau ein CTA:** „Anmelden“-Link aus der gelben Dienstleiste entfernt — einziger CTA im Header bleibt „Jetzt loslegen“ (`user ? '/' : '/login'`).
- **Skip-Links als Scroll-Buttons:** `Landing.tsx` und `StaticLayout.tsx` nutzen `<button type="button">` + `scrollIntoView` statt `<a href="#inhalt">` (HashRouter-sicher, reduced-motion respektiert). `NotFound.tsx` unangetastet.
- **Hero:** DEMO-Stempel jetzt auf beiden Demo-Tickets (zweites Ticket hatte keinen).
- `npx tsc --noEmit`: fehlerfrei.

## Nachtrag 2026-09-22 - Coaching Seiten-Builder mit Live-Preview
- `Coaching.tsx` exportiert jetzt `CoachingView`, `DesignConfig`, `DEFAULT_DESIGN`, `FALLBACK` plus `parseCoachingDesign` (try/catch auf `layout_json`). Design: Sektionsreihenfolge plus Sichtbarkeit (plakat, ablauf, nutzen, regeln, kontakt), `posterBg` (gelb, schwarz, blau mit geprüften Kontrasten), `regelnStil` (liste, aufklappbar per details/summary).
- Neuer CoachPanel Tab `Seite` (`CoachingPageBuilder.tsx`): Editor links (Kopf/Kontakt, 7 Regeln, Layout), sticky Preview rechts mit `<CoachingView>` und deaktivierten Links per Toast. Speichern via `updateCoachingPage` mit `layout_json`, Reset nur lokal, Dirty Hinweis, Labels und 44px Targets.
- Risiko: falls das Backend `layout_json` als unbekannten Key ablehnt, zeigt der Builder die Fehler-Toast Meldung und behält den Entwurf lokal. Die öffentliche Seite fällt per try/catch auf `DEFAULT_DESIGN` zurück.
- `npx tsc --noEmit`: fehlerfrei.

## Nachtrag 2026-09-22 - Dienstleiste raus, SV-Zeile, Brett als Tafel
- **Header (`SiteHeader.tsx`):** gelbe Dienstleiste ersatzlos gestrichen, SV-Herkunft als dezente Zeile unter dem Logo (reiner Text, mobil nur Text), genau ein CTA bleibt. Nav chronologisch: Start, Wege, Schwarzes Brett, Coaching-AG, Eltern, `goSection` Logik unveraendert.
- **Brett (`Landing.tsx`, `#brett`):** gerahmte Tafel mit `border-[#2a2118]`, Filz via `poster-grain`, innere Pinn-Kante gestrichelt, Mockups auf Karten mit `.board-pin` (`index.css`) und leichter Neigung, Karussell mit Dots und `scroll-mt` unveraendert.
- `npx tsc --noEmit`: fehlerfrei.

## Nachtrag 2026-09-22 - Critique-Fixes (21/40 → Nacharbeit, 4 Subagenten sequentiell)
- **Verifikation single-source (P1):** neue Komponente `src/components/VerifySteps.tsx` (`tone: du|sie`, `variant: spotlight|chips|rows|rows-dark`, `parentNote`) — einzige Quelle, 3 Schritte ohne Code im Schulhof-Ton. Verwendet in `Landing.tsx`, `Coaching.tsx` (VERIFY_STEPS-Konstante gelöscht), `Nutzungsbedingungen.tsx` (dto.), `ParentGuide.tsx` (SpecRowDark-Text ohne Code; `PARENT_STEPS` mit SV-Einladungs-/Freigabe-Code bleiben, exakt gescopt auf Eltern-Verknüpfung via `parentNote`). Bekannter Vereinheitlichungs-Verlust: Schritt-3 nennt überall Anzeigen/Kontakt, Badge-Fakt bleibt auf Landing anderweitig sichtbar.
- **Wege-CTAs getrennt (P2):** `Landing.tsx`: „Ich suche" → „Anzeigen stöbern" → `user ? '/' : '/login'`; „Ich biete" → „Anzeige erstellen" → `user ? '/create-ad' : '/login'` (Routen real aus `App.tsx`). Kein `?intent`, da keine Zielseite Query-Params auswertet. CTAs mit `aria-describedby` auf Punkte-Listen, `h-11` (44px), Tinte Weiß auf `#1D4ED8`/`#15803D`.
- **Touch-Targets + Nav-Label (P2):** `SiteHeader.tsx`: Desktop-CTA `h-8` → `h-11`, Menü-Button `w-9 h-9` → `w-11 h-11`, Nav „Wege" → „Suchen & Anbieten" (Desktop + Mobil, Anker `#wege`/`goSection` unverändert). `Landing.tsx`: Dots als 44px-Hit-Area (`p-3`-Wrapper, Optik unverändert), Skip-Button fokussiert `#inhalt` nach Scroll. `StaticLayout.tsx`: dto. `Datenschutz.tsx`: TOC respektiert jetzt `prefers-reduced-motion` wie Nutzung.
- **Posterwelt auf Unterseiten (P2, Empfehlung: voll ausweiten, Legal-Body ruhig):** `StaticLayout.tsx`: `eyebrow`-Prop + schwarze Pill ersatzlos gestrichen (Craft-Floor-Ban: kein Kicker), Header jetzt Poster-Zone (`bg-gray-950`, `poster-grain`, Anton-H1, `h-1 w-10 bg-primary`). `eyebrow`-Props entfernt in `Coaching.tsx`, `ParentGuide.tsx` (+ 3 Body-Pills/Kicker), `Datenschutz.tsx`, `Nutzungsbedingungen.tsx`, `Impressum.tsx`, `Cookies.tsx`. `ParentDashboard.tsx`: Avatar-Gradient → `bg-gray-950 text-primary`, Du- → Sie-Form durchgehend.
- **Geparkt:** `#brett`-Mockups — User liefert PNGs (`public/mockups/`), bis dahin Fallback-Card unverändert.
- `npx tsc --noEmit`: fehlerfrei. `detect.mjs --json` über alle 9 geänderten Targets: `[]` (exit 0).

## Nachtrag 2026-09-22 - Spacing-/Header-/Brett-Runde (3 Durchgänge sequentiell)
- **Layout (Spacing/Rhythmus):** Spatial-Thesis: Poster → überlappende Lead-Card → gruppierte Leseeinheit (eng `gap-4/5`) → Detail-Kapitel → CTA; Trennung über großzügige Sektions-Gaps. Scale dokumentiert in `StaticLayout.tsx:16-22` (innen 12/16, Kapitel 24/32, Sektionen 40/48). Overlap-Muster (`pb-16/24` + `-mt-8/12`) als Standard aller StaticLayout-Seiten. Klein-Fixes: Coaching-Kicker entfernt (Fakt in Meta-Zeile erhalten), ParentGuide-Akzent-Ausrichtung, Nutzung/Datenschutz `space-y` → `flex flex-col gap` (wertgleich). `detect --scope layout`: `[]`.
- **Polish (Schwarz-Header + Nutzung):** `StaticLayout.tsx:33-46`: Headline `5xl/7xl` → `4xl/6xl` (< 6rem-Max), `text-balance`, Padding `pt-12 pb-14` (weniger Leerfläche), Kante `border-b border-white/10` + `poster-grain` statt Flach-Schwarz, Stripe `w-12`, Intro `text-white/70` + `tabular-nums`. `Nutzungsbedingungen.tsx`: TOC amber → `gray-800/gray-100` (16:1/14:1), Accordion-Chips kleiner (`h-8 w-8`, Token kept), TL;DR-Card `border-black/10`, §7 Nested-Cards → `divide-y`-Stapelliste. Backlog-Input: Snapshot 21/40 (P1 Brett geparkt, P1 VerifySteps erledigt). Datenschutz-TOC bleibt amber (Follow-up).
- **Delight (Brett-Material):** Thesis: „Filz unter den Fingern spüren — wie die Pinnwand im SV-Raum." CSS-only in `index.css`: `.board-pin` mit Glanzlicht + Schlagschatten-Ellipse, `#brett .poster-grain` zweistufiges Filz-Korn, `.board-frame` Holzmaserung (einziger Braun-Einsatz), `.board-vignette` (achromatisch, pointer-events-none), `.board-caption` Papierzettel + Tape-Lippe. `Landing.tsx:352-376` verdrahtet; IPhoneFrame/Karussell/CTA/Copy unberührt.
- **Detector-Bewertung (3 pre-existing, als intentional dokumentiert):** `side-tab` = `.prose blockquote`-Stil des RichTextEditors (semantisches Zitat, kein Card-Deko); `overused-font` = Inter als Produkt-Bodyfont (bewusst, Anton trägt die Persönlichkeit); `codex-grid` advisory = `.poster-grain`-Punktraster (Plakat-Textur, kein Grid-Background). Keine neuen Findings durch diese Runde.
- `npx tsc --noEmit`: fehlerfrei.

## Nachtrag 2026-09-22 - Mobiles Menü, Poster-Header mobil, Motion-Runde „Frisch geklebt"
- **Mobiles Menü (`SiteHeader.tsx`):** Full-Height-Sheet von rechts (max-w-md, bg-black + poster-grain, 1px white/10 links), als Geschwister nach dem Header (dessen backdrop-filter kapert fixed Descendants sonst). Nav als große Anton-Zeilen (text-2xl, min-h-14) mit Mono-Nummerierung 01–05 + gestrichelte Trenner (Vertretungsplan-Stil); genau ein CTA „Jetzt loslegen“ fix unten im Daumenbereich mit Safe-Area. Schließen: X 44px + Esc + Backdrop; role=dialog/aria-modal, Fokus-Roundtrip (öffnen → X, schließen → Burger), Tab-Falle + Scroll-Lock, Route-Wechsel/Md-Resize schließen. Motion: Framer AnimatePresence, Slide 320/Exit 200 ms, cubic-bezier(0.16,1,0.3,1); reduced-motion → initial={false}, sofort. Header-Fläche `bg-black/90`.
- **Poster-Header mobil nicht mehr grau (`StaticLayout.tsx:33-50`):** `bg-gray-950` → `bg-black` + `board-vignette`-Overlay; Intro `text-gray-100` (statt blass white/70); Stripe `h-1.5 w-16 sm:w-20`; H1 mobil `clamp(2.5rem,10vw,3.5rem)` (< 6rem-Max), `sm:text-6xl` bleibt. Overlap-Scale/Copy unverändert.
- **Motion-Runde „Frisch geklebt“ (2 Materialien, überall dieselbe Geste):** (1) **Tape-up** — Hero staffelt schräg→gerade, Demo-Tickets kleben versatzweise ein, DEMO-Stempel poppen nach dem Aufkleben, Wege-Streifen kippen ±1.4°→0, Brett-Pins squashen beim In-View. (2) **Line-Wipe** — Gelb-Balken unter jeder Anton-Headline zieht per clip-path origin-links durch (Landing, StaticLayout-Poster, alle Subpages). Dazu: `.press`-Utility (hover:hover, 100–150 ms) auf CTAs/Nav/Dots/TOC/Switches, Accordion-Chevron-Rotation + `accordion-unfurl`, VerifySteps-Stagger `i*0.09`, Sticky-Header-Scroll-State via IO-Sentinel (Border/Shadow/Subline-Fade), Burger→X-Morph. Read-Modus (Coaching/ParentGuide) bewusst leiser (y18/0.55s) als Landing. Keyframes: `.press`, `accordion-unfurl`, RM-Kills in `index.css:324-351` neben globalem Kill-Switch :97.
- **Verify-Fix:** `wipeLine` initial scaleX(0)+margin:-80px ließ Chromium-IO degenerierte Rects erzeugen → Wipe auf clip-path + nur vertikalem margin in 13 Viewports umgestellt; alle Bars revealed.
- Keine neuen Dependencies, genau 1 Marquee/Page, kein scroll-Listener, Sound/Haptik/loops: nein. Reduced-motion: sofort/opacity ohne räumliche Bewegung, Feedback-Muster bleiben.
- `npx tsc --noEmit` + `vite build`: fehlerfrei. Playwright-Smoke Desktop/Mobile/RM: 0 pageerrors. `detect.mjs --json`: nur Baseline (`overused-font`, `codex-grid`) — keine neuen Findings.
