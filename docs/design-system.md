# Design-System

Verbindliche Referenz für Website, App und SV-Panel. Gültig ab 12. November 2026.

## Grundregeln

- Neutrales shadcn/zinc-Theme, ein gelber Akzent.
- Eine Schrift: Inter. Keine Display-, Mono- oder Poster-Schrift.
- Radius: 8 px für Controls, 12 px für Karten und Dialoge, rund nur für Avatare.
- Eine Karten-Ebene. Keine Karte in einer Karte.
- Ein gelber Primärbutton pro Ansicht. Alle anderen Aktionen sind `outline`, `ghost`, `secondary` oder `link`.
- Ausgewählte Zustände sind neutral (`bg-muted`, `text-foreground`), nie gelb.
- Keine Verläufe, Glows, farbigen Schatten, Rotationen, Klebestreifen, Stempel, Punktraster, Laufbänder oder dekorative Großbuchstaben.
- Bewegung nur für Zustandswechsel: 150–200 ms, `ease-out`, `prefers-reduced-motion` respektiert.
- Jede Liste und Karte hat Lade-, Leer- und Fehlerzustand.
- Ein Sonner-Toaster: Desktop unten rechts, mobil oben mittig.

## Farben

### Hell

| Token | Wert |
|---|---|
| `--background` | `#FFFFFF` |
| `--foreground` | `#18181B` |
| `--card` / `--popover` | `#FFFFFF` |
| `--card-foreground` / `--popover-foreground` | `#18181B` |
| `--primary` | `#FACC15` |
| `--primary-hover` | `#EAB308` |
| `--primary-foreground` | `#18181B` |
| `--secondary` | `#F4F4F5` |
| `--secondary-foreground` | `#18181B` |
| `--muted` | `#F4F4F5` |
| `--muted-foreground` | `#52525B` |
| `--accent` | `#F4F4F5` |
| `--accent-foreground` | `#18181B` |
| `--destructive` | `#DC2626` |
| `--destructive-foreground` | `#FFFFFF` |
| `--border` | `#E4E4E7` |
| `--input` | `#D4D4D8` |
| `--ring` | `#A16207` |
| `--sidebar` | `#FAFAFA` |
| `--sidebar-foreground` | `#18181B` |
| `--sidebar-accent` | `#F4F4F5` |
| `--sidebar-border` | `#E4E4E7` |
| `--sidebar-ring` | `#A16207` |
| `--chart-1` | `#CA8A04` |
| `--chart-2` | `#71717A` |
| `--chart-3` | `#A1A1AA` |
| `--chart-4` | `#D4D4D8` |
| `--chart-5` | `#52525B` |

### Dunkel

| Token | Wert |
|---|---|
| `--background` | `#09090B` |
| `--foreground` | `#FAFAFA` |
| `--card` / `--popover` | `#18181B` |
| `--card-foreground` / `--popover-foreground` | `#FAFAFA` |
| `--primary` | `#FACC15` |
| `--primary-hover` | `#EAB308` |
| `--primary-foreground` | `#18181B` |
| `--secondary` | `#27272A` |
| `--secondary-foreground` | `#FAFAFA` |
| `--muted` | `#27272A` |
| `--muted-foreground` | `#A1A1AA` |
| `--accent` | `#27272A` |
| `--accent-foreground` | `#FAFAFA` |
| `--destructive` | `#F87171` |
| `--destructive-foreground` | `#18181B` |
| `--border` | `#3F3F46` |
| `--input` | `#3F3F46` |
| `--ring` | `#FACC15` |
| `--sidebar` | `#09090B` |
| `--sidebar-foreground` | `#FAFAFA` |
| `--sidebar-accent` | `#27272A` |
| `--sidebar-border` | `#3F3F46` |
| `--sidebar-ring` | `#FACC15` |
| `--chart-1` | `#FACC15` |
| `--chart-2` | `#A1A1AA` |
| `--chart-3` | `#71717A` |
| `--chart-4` | `#52525B` |
| `--chart-5` | `#3F3F46` |

Gelb ist nur Fläche, Fokus oder kleiner Akzent. Gelb nie als Fließtext auf hellem Grund. Keine festen Hex-Werte in Komponenten.

## Typografie

| Rolle | Größe | Zeilenhöhe | Gewicht |
|---|---|---|---|
| H1 Website | 30 px, ab `sm` 36 px | 1.15 | 600 |
| H1 App | 24 px | 1.25 | 600 |
| H2 | 24 px, ab `sm` 28 px | 1.25 | 600 |
| H3 | 18 px | 1.4 | 600 |
| Body | 16 px | 1.6 | 400 |
| Small | 14 px | 1.5 | 400/500 |
| Caption | 12 px | 1.4 | 500 |
| Button | 14 px | 1.2 | 500 |

- Ausschließlich Inter (`--font-sans`, `--font-heading`).
- Normale Groß- und Kleinschreibung. Kein `uppercase`, kein weites Tracking.
- Zahlen mit `tabular-nums`.
- Keine Unterstreichungsbalken oder Markerflächen hinter Wörtern.

## Form und Tiefe

| Ebene | Radius |
|---|---|
| Buttons, Inputs, Selects, Textareas | 8 px (`rounded-lg`) |
| Badges | 6 px (`rounded-md`) |
| Karten, Dialoge, Sheets, Panels | 12 px (`rounded-xl`) |
| Avatare | rund |

- `--shadow-soft`: `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)`
- `--shadow-card`: `0 1px 2px rgb(0 0 0 / 0.05), 0 12px 32px rgb(0 0 0 / 0.08)`
- `--shadow-overlay`: `0 24px 64px rgb(0 0 0 / 0.16)`

## Fokus und Zustände

- Genau ein Fokusring: `outline: 2px solid var(--ring); outline-offset: 2px`.
- Keine zusätzlichen `ring-3`, `ring-ring/50` oder `focus-visible:border-ring` in Komponenten.
- Der Fokus verändert keinen Radius.
- Hover nur über Farbe/Fläche. Kein `hover:scale`, keine Rotation, kein `transition-all`.
- Primär, Sekundär, Outline, Ghost, Destructive und Disabled sind Pflicht.
- Formularfehler über `aria-invalid`, Fehlertext unter dem Feld.
- Toasts: ein Sonner-Toaster. Desktop `bottom-right`, mobil `top-center`, mindestens 72 px Abstand zum Header. Beim Routenwechsel leeren.

## Komponenten

- Basis: shadcn/ui auf Base UI unter `src/components/ui/*`.
- Keine className-Overrides, die Radius, Höhe, Farbe oder Schatten einzelner shadcn-Komponenten ändern.
- App- und SV-Navigation: shadcn `Sidebar` (`variant="inset"`).
- Im SV-Panel wird die App-Sidebar auf Icons eingeklappt (`collapsible="icon"`).
- Tabellen: shadcn `Table`. Aktionen in `DropdownMenu` mit sichtbaren Textlabels.
- Diagramme: shadcn `Chart` mit Achsen, Tooltip und dezenten Gitterlinien.
- Filter: `ToggleGroup`; Fächer: neutrales `Badge`.
- Leerzustände: `Empty`; Laden: `Skeleton`; Fehler: `Alert`.
- Dialoge und Sheets: shadcn `Dialog`/`Sheet`/`AlertDialog`, 12 px Radius.
- Chat: eigene Nachricht `bg-foreground text-background`, fremde `bg-muted text-foreground`.

## Seiten

- Website: Sektionen abwechselnd `bg-background` und `bg-muted/40`. Keine dunkle oder gelbe Sektion.
- Hero: zweispaltig, H1 Inter 600, Text, zwei Buttons, rechts ein gerader Screenshot oder eine ruhige Beispielkarte.
- Screenshots: 1 px Rand, 12 px Radius, leichter neutraler Schatten. Keine Klebestreifen, keine Rotation.
- Galerie: `Tabs` mit einem großen Bild statt Miniaturwand.
- Login: links `bg-muted`, rechts weiße Formkarte.
- Coaching-AG: weiße Karte mit Rand.
- Öffentliche Kennzahlen: aktive Anzeigen und Nutzer, keine Seitenaufrufe.
- Keine echten Namen, E-Mails, Klassendaten oder Admin-Ansichten in öffentlichen Screenshots. Fiktive `@example.org`-Daten und Badge „Beispiel“.

## Technische Basis

- Tailwind 4 mit `@tailwindcss/vite`; Token-Quelle ist `src/index.css` (`@theme inline`, `:root`, `.dark`).
- Semantische Tokens verwenden (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`).
- `cn` aus `src/lib/utils.ts` (clsx + tailwind-merge).
- Keine neuen Hex-Werte, keine neue Icon-Bibliothek, keine zweite Toast- oder Overlay-Implementierung.
