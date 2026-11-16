# Vorschau — Website-Redesign

Die Vorschau ersetzt **nicht** die aktuelle Seite. Sie läuft lokal aus dem
Produktions-Build auf einem eigenen Port, damit parallele Sessions nichts
stören.

## Öffnen

```bash
cd /home/oskar/antigravity/nachhilfev2-website-redesign
npm ci                     # nur beim ersten Mal
npm run build
npm run preview -- --port 5190 --strictPort
```

Danach: **http://localhost:5190/#/welcome**

Der Server läuft bereits. Prüfen:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5190/
```

## Was anders ist

- Ruhiger, produktgeführter Hero: ein echter Laptop-Feed frei auf dem
  Seitenhintergrund, ohne gelben Kasten und ohne überlappendes Telefon.
- Chronologische Navigation (Start, Ablauf, Die App, Für Eltern, Coaching,
  FAQ) ohne Entwickler-Link.
- Drei echte Screens statt vier Showcase-Zeilen und ohne Admin-Screenshot.
- „Zwei Wege, ein Ziel“ in einer Fläche statt drei Pastellkarten.
- Elternblock mit korrekt skalierter Sichtbarkeits-Vorschau und vier Fakten.
- Verifizierungs-Timeline, deren Linie durch alle drei Punkte läuft.
- Eine Coaching-Fläche statt drei verschachtelter Karten.
- Sieben echte FAQs (Kosten, Alter, Einwilligung, Sichtbarkeit, Meldung).
- Abschluss als dunkle Fläche mit einem klaren CTA statt loser weißer Karte.
- Deutlich kürzer: 7.069 px statt 7.661 px (Desktop), 10.365 px statt
  12.060 px (Mobil).
- Screenshots als WebP: 748 KB → 167 KB.
- Neue Meta-Daten (Canonical, OG/Twitter, JSON-LD), `robots.txt`, `sitemap.xml`.

Details und Messwerte: `REPORT.md`. Designsystem: `DESIGN.md`.

## Screenshots

- Vorher: `docs/website-review/before-v2/before-{375,768,1280,1920}.png`
- Nachher: `docs/website-review/after/after-{375,768,1280,1920}.png`
- Erster Viewport: `before-v2/before-1280-hero.png` und
  `after/after-1280-hero.png`
- App-Referenz: `docs/website-review/app-reference/v2-*.png`

## Entscheiden

- **Übernehmen und Standard machen:** `/improve-website approve`
- **Feedback geben:** `/improve-website revise <dein Feedback>`
- **Verwerfen:** auf den Standard-Branch zurückwechseln und
  `website-redesign` ungemergt lassen.

## Hinweise

- Der Branch `website-redesign` sitzt bewusst auf `ui-design-v2` (der neuen
  Oberfläche). `main` enthält noch die alte App. Ein Merge würde daher den
  neuen UI-Stand mitbringen; das ist eine Entscheidung für das Team.
- Es gibt in diesem Repo **keine** Branch-Preview-Deployments. Der
  GitHub-Action-Deploy läuft ausschließlich bei Pushes auf `main` per FTPS zu
  ALL-INKL. Ein Push dieses Branches würde keine Vorschau-URL erzeugen und
  wurde nicht ausgeführt.
- Der Preview-Port 5190 gehört dieser Session. Nicht andere laufende Server
  (5173, 5180, 5183) beenden.
