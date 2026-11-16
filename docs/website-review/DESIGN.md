# Design system — Nachhilfebörse FWG (Stand ui-design-v2)

Abgeleitet aus `src/index.css`, `tailwind.config.js` und den Komponenten in
`src/components/ui` sowie den App-Screens. Das ist die Quelle für die
Startseite; die App selbst bleibt unverändert.

## Farben

| Rolle | Token | Wert |
|---|---|---|
| Papier / Canvas | `--background` | `#f5f6f8` |
| Karte | `--card` | `#ffffff` |
| Tinte | `--foreground` | `#18181b` |
| Sekundärfläche | `--secondary`, `--muted` | `#f1f3f6` |
| Gedämpfter Text | `--muted-foreground` | `#5d646f` |
| Linie | `--border` | `#e6e8ec` |
| Primär | `--primary` | `#facc15` |
| Primär Hover | `--primary-hover` | `#eab308` |
| Primär weich | `--primary-soft` | `#fef9c3` |
| Fokus | `--ring` | `#facc15` (Ringe zeichnen mit `--foreground`) |
| Fehler | `--destructive` | `#dc2626` |

Pastellbühnen (nur hinter Produktbildern, nicht als Inhaltsfarbe):
`--pastel-blue #eaf2ff / #1d4ed8`, `--pastel-mint #ddf7ec / #047857`,
`--pastel-yellow #fef9c3 / #18181b`, außerdem rose, violet, orange, teal, gray
für die App. Violett und Rosa kommen auf der Startseite nicht vor.

Dunkelmodus der App: `#0b0c0f` Papier, `#141519` Karte, gleiche Primärfarbe.
Die Startseite ist bewusst nur hell; die App bleibt im Systemmodus.

## Typografie

- Eine Familie: **Plus Jakarta Sans Variable**, Fallback Plus Jakarta Sans,
  system-ui. `--font-sans` = `--font-heading`.
- Überschriften: 700, `letter-spacing: -0.02em`, `text-wrap: balance`, keine
  Großschreibung.
- Fließtext: `text-wrap: pretty`, Zeilenlänge 60–75 Zeichen.
- Skala: `xs .8125rem`, `sm .9375rem`, `base 1rem`, `lg 1.125rem`,
  `xl 1.25rem`, `2xl 1.75rem`, `3xl 2rem`, `4xl 2.25rem`, `5xl 3rem`,
  `6xl 3.5rem`. Startseiten-H1: 2.6 → 3.6 → 4.1 rem.

## Raum, Form, Tiefe

- Abstandsskala 0.25 rem; Rhythmus 4/8/12/16/24/32/48/64/96 px.
- Container: Website 75 rem, App 47.5 rem.
- Radien: Feld 1.25 rem, Karte 1.75 rem, Dialog 2 rem, Panel 2.25 rem,
  Pill unendlich.
- Schatten: `--shadow-soft` (Karten), `--shadow-card`, `--shadow-overlay`,
  `--shadow-float`. Keine harten Offset-Schatten.
- Trennung erfolgt über 1-px-`--border` und Abstand, nicht über Farbe oder
  zusätzliche Karten.

## Komponenten

- **Button** (`src/components/ui/button.tsx`): Pill, Höhen 36/40/44 px,
  primär gelb mit Tinte, sekundär weiß mit Rand, Ghost ohne Füllung, immer
  3-px-Fokusring mit 2 px Offset.
- **Karte**: weiß, `rounded-card`, 1-px-Rand, `shadow-soft`, Padding 24–40 px.
- **Chip/Pill**: `rounded-full`, 1-px-Rand, 13 px, nie als einziger
  Informationsträger.
- **Input**: `rounded-field`, 1-px-Rand, Fokus 3 px Tinte.
- **Icons**: lucide-react, 16–20 px, Strich 1.75–2, dekorativ `aria-hidden`.
- **DeviceFrame**: CSS-Laptop (16:10), Tablet (820:1180), Telefon (390:844),
  randloser Screenshot, `object-top`, kein Neigungswinkel.
- **VerifySteps**: drei Schritte, Varianten `timeline`, `rows`, `chips`;
  auf der Startseite `timeline`, Ton „du“.
- **Reveal**: 12 px Anheben + Fade, 600 ms ease-out, nur ganze Blöcke,
  `prefers-reduced-motion` statisch.
- **Switch**: echte Einstellung mit `role="switch"`; auf der Startseite als
  nicht speichernde Vorschau gekennzeichnet.

## Bewegung

- Nur `opacity` und `transform`; 150–600 ms; ease-out.
- Ein authored moment: die Timeline der Verifizierung erscheint als ruhige
  Folge. Kein Konfetti, keine Schleifen, keine schwebenden Karten.
- Globale Notbremse: `prefers-reduced-motion` setzt Animationen und Transitionen
  auf 0.01 ms und schaltet Smooth Scrolling ab.

## Fokus und Lesbarkeit

- Ein Fokussystem: 3 px `var(--foreground)`, 2 px Offset (Inputs 1 px).
- Mindestens 44 px Trefferfläche für Navigation, FAQ-Zeilen und Aktionen.
- Kontrast AA: Tinte auf Papier 16:1, gedämpfter Text 4.9:1, Primärfarbe nur
  mit Tinte, nie als Textfarbe auf Weiß.
- Ein `h1`, danach `h2` je Abschnitt, `h3` in den Showcase-Zeilen.

## Anwendung auf die Startseite

- Papier `#f5f6f8`; Abschnitte wechseln zwischen Papier und Weiß, damit die
  Seite atmet, ohne zusätzliche Rahmen.
- Gelb nur für primäre Aktionen, die Coaching-Fläche und den Abschluss-CTA.
  Keine gelben Textstellen auf Weiß; der Hero bleibt neutral.
- Die drei Showcase-Bilder bekommen eine Pastellbühne (blau, mint, gelb) und
  einen echten Geräterahmen; nie einen zweiten Rahmen um einen Screenshot mit
  eingebautem Rahmen. Der Hero zeigt das Laptop-Bild ohne Bühne.
- Der Header ist geteilt. Seine Navigation folgt jetzt der Seitenreihenfolge
  (Start, Ablauf, Die App, Für Eltern, Coaching, FAQ); alle Unterseiten erben
  diese Reihenfolge. Form, Fokus und mobile Ausführung bleiben unverändert.

## Herkunft der Bilder

`src/assets/screens/v2-laptop-feed.webp`, `v2-phone-feed.webp`,
`v2-phone-chat.webp`, `v2-tablet-settings.webp` sind verlustbehaftete
WebP-Ableitungen der vorhandenen App-Screenshots
`docs/screenshots/v2-*.png` (echte App, Demo-Daten). Keine Retusche an
Inhalten, nur Skalierung/Komprimierung. `07-sv-panel.png` wird auf der
öffentlichen Startseite nicht verwendet (personenbezogene Demo-Daten).
