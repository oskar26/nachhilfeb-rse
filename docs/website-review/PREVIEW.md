# Vorschau — Website-Redesign

Die Vorschau ersetzt **nicht** die aktuelle Seite. Sie läuft lokal aus dem
Produktions-Build auf einem eigenen Port, damit parallele Sessions nichts
stören.

## Öffnen

```bash
cd /home/oskar/antigravity/nachhilfev2-website-redesign
npm ci                     # nur beim ersten Mal
npm run build
node docs/website-review/preview-server.mjs 5190
```

Danach: **http://localhost:5190/#/welcome**

Der kleine Server liefert den Produktions-Build aus und proxyt `/api` an
nachhilfe-sv.de. Nur so zeigt die lokale Vorschau dieselben Live-Kennzahlen
wie die echte Seite (die API sendet keinen CORS-Header). Der Server läuft
bereits. Prüfen:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5190/
```

## Was anders ist

- **Revision 3 (Feedback vom 17.11.2026):** Der Hero behält die ruhige
  Gerätebühne, verwendet aber wieder die alten Texte („Finde Nachhilfe. Direkt
  am FWG.“). Die Kennzahlenkarte hat keinen Titel mehr: Sie zeigt live
  „X registrierte Nutzer:innen“ und „Y aktive Anzeigen“ und darunter die drei beliebtesten
  Fächer als kleine Pillen. Die Schritte verbindet eine Linie, die an der Mitte
  des ersten Kreises beginnt und an der Mitte des dritten endet; die Kreise
  reagieren auf Hover. Der App-Rundgang nutzt wieder die alten Überschriften
  („Entdecken & Filtern“, „Chat“, „Profil und Einstellungen“). Eltern-Kacheln,
  Trust-Icons und Piktogramme animieren beim Hover.
- Ruhiger, produktgeführter Hero: ein echter Laptop-Feed frei auf dem
  Seitenhintergrund, ohne gelben Kasten und ohne überlappendes Telefon.
- Direkt darunter Vertrauen: „Ein Konto pro Kind“ mit Eltern-Leitfaden und
  eine Karte mit aktiven Anzeigen und Nutzer:innen (live, sonst Fakten).
- Chronologische Navigation (Start, Ablauf, Die App, Für Eltern, Coaching,
  FAQ) ohne Entwickler-Link.
- Drei echte Screens statt vier Showcase-Zeilen und ohne Admin-Screenshot.
- „Zwei Wege, ein Ziel“ als Bento aus zwei großen Pastellkarten.
- Elternbereich als 2×2-Bento in Blau, Mint, Gelb und Rose – ohne
  Datenschutz-Schalter.
- Verifizierung in einer mintgrünen Fläche; die Linie läuft über die ganze
  Breite durch alle drei Punkte und zeichnet sich beim Scrollen.
- Eine Coaching-Fläche statt drei verschachtelter Karten.
- Sieben echte FAQs (Kosten, Alter, Einwilligung, Sichtbarkeit, Meldung).
- Kompakte Funktionswunsch-Karte „Etwas fehlt?“ vor den FAQs.
- Abschluss als dunkle Fläche mit einem klaren CTA statt loser weißer Karte.
- Ein durchgehender Seitenhintergrund; Karten und Pastellflächen schweben
  darauf, statt als weiße Bänder aneinanderzustoßen.
- Länge: 7.585 px (Desktop) und 11.331 px (Mobil) – mehr Inhalt als im ersten
  Umbau, aber weiter unter dem Ausgangsstand (7.661 / 12.060).
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
