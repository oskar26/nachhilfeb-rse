# Design-System

Verbindliche Referenz für Website, App und SV-Panel. Gültig ab 12. November 2026.

## Grundregeln

- Ruhige, kühle Hellgrau-Fläche, weiße Karten, ein gelber Akzent.
- Eine Schrift: Plus Jakarta Sans Variable.
- Pillen für Buttons, Chips, Tabs, Badges und Suchfelder. Felder 16 px, Karten und Dialoge 24 px, Chatblasen 20 px.
- Eine Karten-Ebene. Keine Karte in einer Karte.
- Ein gelber Primärbutton pro Ansicht. Alle anderen Aktionen sind `outline`, `ghost`, `secondary` oder `link`.
- Aktive Navigation ist gelb. Ausgewählte Filter dürfen gelb sein. Ausgewählte Karten bleiben neutral.
- Keine Verläufe, Glows, farbigen Schatten, Rotationen, Klebestreifen, Stempel, Punktraster, Laufbänder oder dekorative Großbuchstaben.
- Bewegung nur für Zustandswechsel: 150 ms, `ease-out`, `prefers-reduced-motion` respektiert.
- Jede Liste und Karte hat Lade-, Leer- und Fehlerzustand.
- Ein Sonner-Toaster: Desktop unten rechts, mobil oben mittig.

## Farben

### Hell

| Token | Wert |
|---|---|
| `--background` | `#F5F6F8` |
| `--foreground` | `#18181B` |
| `--card` / `--popover` | `#FFFFFF` |
| `--card-foreground` / `--popover-foreground` | `#18181B` |
| `--primary` | `#FACC15` |
| `--primary-hover` | `#EAB308` |
| `--primary-foreground` | `#18181B` |
| `--secondary` | `#F1F2F5` |
| `--secondary-foreground` | `#18181B` |
| `--muted` | `#F1F2F5` |
| `--muted-foreground` | `#5F636B` |
| `--accent` | `#F1F2F5` |
| `--accent-foreground` | `#18181B` |
| `--destructive` | `#DC2626` |
| `--destructive-foreground` | `#FFFFFF` |
| `--border` | `#E6E8EC` |
| `--input` | `#DDE0E5` |
| `--ring` | `#A16207` |
| `--sidebar` | `#FFFFFF` |
| `--sidebar-foreground` | `#18181B` |
| `--sidebar-accent` | `#F4F4F5` |
| `--sidebar-border` | `#E6E8EC` |
| `--sidebar-ring` | `#A16207` |
| `--chart-1` | `#EAB308` |
| `--chart-2` | `#8B5CF6` |
| `--chart-3` | `#0EA5E9` |
| `--chart-4` | `#10B981` |
| `--chart-5` | `#F43F5E` |

### Dunkel

| Token | Wert |
|---|---|
| `--background` | `#0B0C0F` |
| `--foreground` | `#F5F5F7` |
| `--card` | `#141519` |
| `--popover` | `#17181D` |
| `--card-foreground` / `--popover-foreground` | `#F5F5F7` |
| `--primary` | `#FACC15` |
| `--primary-hover` | `#EAB308` |
| `--primary-foreground` | `#18181B` |
| `--secondary` | `#1D1F24` |
| `--secondary-foreground` | `#F5F5F7` |
| `--muted` | `#1D1F24` |
| `--muted-foreground` | `#A1A1AA` |
| `--accent` | `#1D1F24` |
| `--accent-foreground` | `#F5F5F7` |
| `--destructive` | `#F87171` |
| `--destructive-foreground` | `#18181B` |
| `--border` | `#2A2D34` |
| `--input` | `#343841` |
| `--ring` | `#FACC15` |
| `--sidebar` | `#111217` |
| `--sidebar-foreground` | `#F5F5F7` |
| `--sidebar-accent` | `#1D1F24` |
| `--sidebar-border` | `#2A2D34` |
| `--sidebar-ring` | `#FACC15` |
| `--chart-1` | `#FACC15` |
| `--chart-2` | `#A78BFA` |
| `--chart-3` | `#38BDF8` |
| `--chart-4` | `#34D399` |
| `--chart-5` | `#FB7185` |

Gelb ist nur Fläche, Fokus oder kleiner Akzent. Gelb nie als Fließtext auf hellem Grund. Keine festen Hex-Werte in Komponenten.

### Fachfarben

Weiche Rose-, Blau-, Violett-, Teal-, Emerald-, Grün-, Cyan-, Orange-, Lime-, Slate- und Zinc-Töne. Text in dunklerer Stufe derselben Farbe, Dark Mode mit dunkler Fläche und hellem Text. Fachfarben nur am Fachchip.

## Typografie

| Rolle | Größe | Zeilenhöhe | Gewicht |
|---|---|---|---|
| H1 Website | 36 px, ab `sm` 48 px | 1.1 | 700 |
| H1 App | 24 px | 1.25 | 700 |
| H2 | 24 px, ab `sm` 30 px | 1.2 | 700 |
| H3 | 18 px | 1.4 | 700 |
| Body | 16 px | 1.6 | 400 |
| Small | 15 px | 1.5 | 400/500 |
| Caption | 12–13 px | 1.4 | 500 |
| Button | 15 px | 1.2 | 600 |

- Ausschließlich Plus Jakarta Sans Variable (`--font-sans`, `--font-heading`).
- Normale Groß- und Kleinschreibung. Kein `uppercase`, kein weites Tracking.
- Zahlen mit `tabular-nums`.
- Keine Unterstreichungsbalken oder Markerflächen hinter Wörtern.

## Form und Tiefe

| Ebene | Radius |
|---|---|
| Buttons, Chips, Tabs, Badges, Switch, Suche | voll |
| Inputs, Selects, Dropdowns | 16 px (`rounded-field`) |
| Karten, Dialoge, Sheets, Panels | 24 px (`rounded-card`) |
| Chatblasen | 20 px (`rounded-chat`) |
| Hero-Panel | 32 px (`rounded-panel`) |
| Avatare, Statuspunkte | rund |

- `--shadow-soft`: weich, neutral, für Karten.
- `--shadow-card`: stärker, für Hover und hervorgehobene Flächen.
- `--shadow-overlay`: für Dialoge, Sheets und schwebende Navigation.
- Hover hebt Karten um 2 px. Active skaliert auf 0,98.

## Fokus und Zustände

- Genau ein Fokusring: `outline: 2px solid var(--ring); outline-offset: 2px`.
- Keine zusätzlichen `ring-3`, `ring-ring/50` oder `focus-visible:border-ring` in Komponenten.
- Der Fokus verändert keinen Radius.
- Hover über Farbe, Fläche oder 2 px Transform. Kein `transition-all`.
- Primär, Sekundär, Outline, Ghost, Destructive und Disabled sind Pflicht.
- Formularfehler über `aria-invalid`, Fehlertext unter dem Feld.
- Toasts: ein Sonner-Toaster. Desktop `bottom-right`, mobil `top-center`, mindestens 80 px Abstand zum Header. Beim Routenwechsel leeren.

## Komponenten

- Basis: shadcn/ui auf Base UI unter `src/components/ui/*`.
- Keine className-Overrides, die Radius, Höhe, Farbe oder Schatten einzelner shadcn-Komponenten ändern.
- App- und SV-Navigation: shadcn `Sidebar` (`variant="inset"`). Aktive Einträge als gelbe Pillen.
- Sidebar-Fuß: Profilkarte mit Avatar, Name und Konto-Menü; Abmelden im Menü.
- Im SV-Panel wird die App-Sidebar auf Icons eingeklappt (`collapsible="icon"`).
- Mobile Navigation: schwebende Pill-Leiste mit fünf Zielen und gelbem Plus-Button.
- Tabellen: shadcn `Table`. Aktionen in `DropdownMenu` mit sichtbaren Textlabels.
- Diagramme: shadcn `Chart` mit Achsen, Tooltip und dezenten Gitterlinien.
- Filter: Pillen; Fächer: farbige `SubjectChip`-Pillen.
- Leerzustände: `Empty`; Laden: `Skeleton`; Fehler: `Alert`.
- Dialoge und Sheets: shadcn `Dialog`/`Sheet`/`AlertDialog`, 24 px Radius.
- Chat: eigene Nachricht gelb mit dunklem Text, fremde weiß mit Hairline, 20 px Radius. Zeit in der Blase.
- Anzeigenkarte: farbiger Avatar, Name, Badges, Preis rechts, Fachchips, Metadaten als kleine Pillen, eine Fläche ohne Trennlinien.

## Seiten

- Website: Container `max-w-site` (1200 px), Sektionen abwechselnd `bg-background` und `bg-muted/40`.
- Hero: zweispaltig, H1 700, Text, zwei Pill-Buttons, rechts ein gelbes 32-px-Panel mit Produktbild und zwei überlappenden Beispielkarten.
- Screenshots: 1 px Rand, 16 px Radius, leichter neutraler Schatten.
- Galerie: `Tabs` als umbrechende Pillen mit einem großen Bild statt Miniaturwand.
- Login: links `bg-muted`, rechts weiße Formkarte.
- Coaching-AG: weiße Karte mit Rand.
- Öffentliche Kennzahlen: aktive Anzeigen und Nutzer, keine Seitenaufrufe.
- Keine echten Namen, E-Mails, Klassendaten oder Admin-Ansichten in öffentlichen Screenshots. Fiktive `@example.org`-Daten und Badge „Beispiel“.

## Technische Basis

- Tailwind 4 mit `@tailwindcss/vite`; Token-Quelle ist `src/index.css` (`@theme inline`, `:root`, `.dark`).
- Semantische Tokens verwenden (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`).
- `cn` aus `src/lib/utils.ts` (clsx + tailwind-merge).
- Keine neuen Hex-Werte, keine neue Icon-Bibliothek, keine zweite Toast- oder Overlay-Implementierung.
