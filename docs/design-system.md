# Design-System 2026

Verbindliche Grundlage für den UI-Redesign. Die bestehende Plakatwelt bleibt:
Papier, Tinte, ein Gelb, Anton nur als Display-Schrift. Alles andere wird
vereinheitlicht.

## Design-Read

Nachhilfe-Plattform des FWG Köln für Schüler, Eltern und die SV. Die Sprache ist
direkt, warm und schulhof-nah: Papier statt sterilem Dashboard, Tinte statt
Grauflächen, Gelb als eine klare Markierung. Kein SaaS-Template, keine
dekorativen Verläufe, keine zweite Markenfarbe.

## Farben

Eine Hauptfarbe: Gelb. Gelb ist **Fläche und Markierung**, nicht Kleintext auf
hellem Papier. Für gelbe Schrift/Icons auf Papier `text-brand-ink` verwenden.

| Token | Light | Dark | Verwendung |
|---|---|---|---|
| `background` | `#faf7ef` | `#12100e` | Seitenhintergrund |
| `foreground` | `#1c1917` | `#f5f0e7` | Primärtext |
| `card` | `#fffdf8` | `#1c1917` | Karten, Panels |
| `primary` | `#facc15` | `#facc15` | Primäraktion, aktive Fläche |
| `primary-foreground` | `#1c1917` | `#1c1917` | Text auf Gelb |
| `brand-ink` | `#7c5a00` | `#facc15` | Gelbe Schrift/Icons auf hell |
| `secondary` | `#f1ece1` | `#29251f` | Sekundärflächen |
| `muted` | `#f3efe6` | `#29251f` | Ruheflächen |
| `muted-foreground` | `#6b6358` | `#b8afa1` | Sekundärtext |
| `border` | `#e5dfd2` | `#332d25` | Haarlinien |
| `input` | `#d9d2c4` | `#3a342b` | Formularrahmen |
| `ring` | `#8a5a00` | `#facc15` | Fokusring |
| `destructive` | `#b91c1c` | `#f87171` | Fehler, destruktive Aktion |

Neutrale Grautöne kommen ausschließlich aus der warmen `gray`-Skala in
`tailwind.config.js` (Papier → Graphit). Keine coolen Zinc-/Slate-Töne
mischen. Fachfarben (`subject.*`) sind **Datenfarben** für Fächer, keine
UI-Akzente; sie werden nur in Chips/Badges verwendet und gedämpft.

Verboten in Komponenten: Hex-Werte, `rgb()`/`hsl()`-Literale, Farbverläufe
zwischen zwei Hue-Familien, farbige Glows, Gradient-Text, mehr als ein
Akzent pro Fläche. Semantische Farben (Rot/Grün/Amber) nur für Bedeutung.

## Typografie

- UI und Fließtext: **Inter** (`font-sans`).
- Display/Poster: **Anton** (`font-display`), nur für die bestehende
  Plakatsprache auf öffentlichen Seiten. Keine dritte Familie.
- Skala: `text-xs` 12, `text-sm` 14, `text-base` 16, `text-lg` 18,
  `text-xl` 20, `text-2xl` 24, `text-3xl` 30, `text-4xl` 36.
- Gewichte: 400, 500, 600. Keine 700–900-Headlines als Default.
- Große Headlines: `text-wrap: balance`, negatives Tracking nur ab `text-3xl`.
- Kleine Labels: Sentence case, kein Uppercase + Letter-Spacing als Standard.
- Zahlen: `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`).

## Abstände

4-px-Raster: `--spacing: 0.25rem`. Alle Margins, Paddings und Gaps sind
Vielfache von 4. Übliche Werte:

- Seite: 24–32 px mobil, 48–64 px Desktop.
- Karten: 20–24 px Innenabstand.
- Listenzeilen: 32–36 px hoch, 2–4 px Abstand.
- Gruppen: innen kleiner als zwischen Gruppen.

Keine `mt-[13px]`-/`py-[11px]`-Einzelwerte. Container: `max-w-7xl` (80 rem)
mit Auto-Margins.

## Rundungen

Eine Skala, vier Ebenen:

| Ebene | Wert | Verwendung |
|---|---|---|
| `radius-sm` | 8 px | kleine Controls, Chips |
| `radius-md` | 10 px | Inputs, Selects, kleine Buttons |
| `radius-lg` | 12 px | Standard-Buttons |
| `radius-xl` | 16 px | Cards |
| `radius-2xl` | 20 px | große Cards/Panels |
| `radius-3xl` | 24 px | Dialoge/Sheets |
| `radius-4xl` | 32 px | besondere Posterflächen |

Pillen (`rounded-full`) sind die Button-Form der bestehenden Marke und gelten
für alle Buttons, Filter-Chips und Avatare. Inputs/Selects bleiben bei
`rounded-xl`, Cards bei `rounded-xl`/`rounded-2xl`, Dialoge bei
`rounded-3xl`.

## Schatten

Drei neutrale, warm getönte Stufen. Keine farbigen Glows, keine
`shadow-2xl`-Sammlung:

- `shadow-soft`: Standardkarten.
- `shadow-card`: hervorgehobene Karten/Popover.
- `shadow-overlay`: Dialoge/Sheets.

Auf dunklen Flächen kommt Tiefe aus Flächenstufen und Haarlinien, nicht aus
Schatten.

## Icons

- Eine Bibliothek: **lucide-react**.
- Größen: 16, 20, 24 px. Standard `strokeWidth={1.75}`.
- Icons erben die Textfarbe (`currentColor`), nie eigene Buntfarben.
- Keine Emojis als Icons oder Dekoration in Labels.
- Icon + Label: 8 px Abstand, Icon-Spalte bleibt aligned.

## Komponenten

- Basis: shadcn/ui auf **Base UI**, Dateien unter `src/components/ui/*`.
- Bestehende Altkomponenten liegen übergangsweise als `*Legacy.tsx` daneben.
  Neuer Code importiert ausschließlich die shadcn-Versionen.
- Links, die wie Buttons aussehen: `buttonVariants` + `<a>`, nicht
  `<Button render={<a/>}>`.
- Overlays: `Dialog`, `Sheet` oder `AlertDialog`. Keine eigenen Portale,
  Fokusfallen oder `window.confirm`/`window.prompt`.
- Formulare: `Label` über dem Feld, Fehler darunter, `Field`/`Form` für
  komplexe Formulare; kein Placeholder als Label.
- Karten nur, wenn Höhe/Hierarchie sie rechtfertigt. Keine Karten in Karten.
- Toasts: Sonner (`@/components/ui/sonner`), keine zweite Toast-Bibliothek.
- Buttons: primär Gelb mit Tinte, sekundär neutrale Fläche, destruktiv nur
  für echte Lösch-/Sperraktionen. Ein Primary pro Gruppe. Größen: `sm` 32 px,
  `default`/`md` 44 px, `lg` 56 px, `icon` 40 px. Alle Buttons sind pill.
- Formularfelder: `Label` + `Input`/`Textarea`/`NativeSelect`/`Checkbox`/
  `Switch`. Jedes Feld hat Hover-, Fokus-, Disabled- und
  `aria-invalid`-Fehlerzustand. Fehlertext steht unter dem Feld.
- Hover/Focus/Disabled/Active sind Pflicht. Fokusring: 2 px `--ring`,
  2 px Offset. `prefers-reduced-motion` wird respektiert.

## Motion

- Eine Easing-Kurve, kurze Dauer (150–250 ms).
- Keine Loops, kein `hover:scale` auf Karten, kein `transition-all`.
- Reveals nur als Enhancement: Inhalt ist ohne JS und bei reduzierter
  Bewegung sofort sichtbar.
- Bevorzugt `transform` und `opacity`.

## Tailwind / technische Basis

- Tailwind **4.3** mit `@tailwindcss/vite`; `src/index.css` ist die
  Token-Quelle (`@theme inline` + `:root`/`.dark`).
- Der Legacy-`tailwind.config.js` bleibt vorübergehend für bestehende
  `gray`-/`subject`-/`font-display`-Klassen per `@config` angebunden.
- Neue Komponenten nutzen semantische Tokens (`bg-background`,
  `text-foreground`, `border-border`, `text-muted-foreground`, …), keine
  direkten Hex-Werte.
- `cn` kommt aus `src/lib/utils.ts` (clsx + tailwind-merge).

## Migrationsregel

Bestehende Seiten dürfen noch ihre vorhandenen Layout-Klassen enthalten. Jede
Seite, die als Nächstes angefasst wird, wird auf diese Tokens und die
shadcn-Primitives umgestellt. Neue UI darf keine neuen Hex-Werte, keine neue
Icon-Bibliothek und keine neue Overlay-/Toast-Implementierung einführen.

### Formularelemente (migriert)

- Buttons: `Button` aus `@/components/ui/button`; bestehende Sonder-Buttons
  nutzen `variant="unstyled" size="unstyled"` und behalten ihre Klassen.
- Textfelder: `Input`; mehrzeilig: `Textarea`.
- Auswahl: `NativeSelect` (native Semantik, shadcn-Styling) oder `Select`.
- Checkboxen: `Checkbox`; Schalter: `Switch`; Labels: `Label`.
- OTP: `InputOTP` + `InputOTPGroup`/`InputOTPSlot`.
- Fehler: `aria-invalid` setzen; die Komponenten liefern Border-/Ring-Styles.
- Keine rohen `<button>`, `<input>`, `<textarea>`, `<select>` oder
  `motion.button` in Seiten/Komponenten. Ausnahme sind nur die shadcn-Interna.
