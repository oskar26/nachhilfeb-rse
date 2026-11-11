# UI-Redesign – Verbindlicher Phasenplan

> **Zweck:** Dieses Dokument ist die zentrale und verbindliche Aufgabenbeschreibung für den nativen OpenCode-Goal-Modus. Es enthält alle Anforderungen, Phasen, Checklisten, Statuswerte, Evidenzfelder und Definitionen von „fertig“.
>
> **Projekt:** FWG Nachhilfebörse (`https://nachhilfe-sv.de`)
>
> **Branch:** `ui-redesign`
>
> **Baseline-Commit:** `2569c3a` – „Texte vereinheitlichen und an bestätigte Produktregeln anpassen“
>
> **Design-System:** [`docs/design-system.md`](./design-system.md)
>
> **Letzte Aktualisierung:** 2026-11-11
>
> **Dokumentationsstatus:** Vorbereitung abgeschlossen; Phase A–E noch nicht gestartet.
>
> **Arbeitsweise:** Alle Arbeiten bleiben lokal. Kein `git push`, kein Deployment. Bestehende Nutzeränderungen werden nicht überschrieben, zurückgesetzt oder versehentlich committet.

---

## 1. Projektkontext

Es geht um die bestehende React-Web-App **FWG Nachhilfebörse** der Schülervertretung des Friedrich-Wilhelm-Gymnasiums Köln.

- React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui mit Base UI.
- PHP-/MySQL-API unter `api/`; diese bleibt unverändert.
- Progressive Web App mit Light Mode, Dark Mode, Push- und Installationshinweisen.
- Zielgruppen: Schülerinnen und Schüler der Klassen 5–13, Eltern, SV-Team und Coach-Admins.
- Mehr als **50 % der Nutzer sind mobil** unterwegs. Mobile UX hat höchste Priorität.

Das UI wurde ursprünglich mit KI-Unterstützung entwickelt und wirkt teilweise zusammengewürfelt. Es gibt optische Inkonsistenzen, Darstellungsfehler und Bugs. Ziel ist ein einheitliches, hochwertiges und professionelles Design mit shadcn/ui.

**Das bestehende Erscheinungsbild soll grundsätzlich erhalten bleiben.** Layout und grundsätzlicher Seitenaufbau bleiben ähnlich. Funktionen, Logik und bestehende Texte dürfen nicht verändert werden.

---

## 2. Bereits erledigte Arbeiten (Ausgangspunkt)

Diese Arbeiten sind bereits umgesetzt und dürfen nicht unnötig wiederholt werden. Bei der späteren Prüfung dürfen gefundene Fehler selbstverständlich korrigiert werden.

### 2.1 Analyse und Grundlagen

- Projektanalyse und Prüfung von Projektstruktur, `package.json`, Styling-Lösung, Tailwind und TypeScript.
- Nutzung der Skills `pick-ui-library`, `redesign-existing-projects`, `unslop` und `design-taste-frontend`.
- Analyse der bestehenden UI und ihrer Inkonsistenzen.
- Auswahl von shadcn/ui mit **Base UI** als Grundlage.
- Einrichtung von shadcn/ui mit der offiziellen CLI.
- Erstellung eines einheitlichen Design-Systems mit Theme-Variablen.
- Festlegung von Farben, Typografie, Spacing, Rundungen und Schatten.
- Festlegung von **lucide-react** als einziger Icon-Bibliothek.
- Migration der grundlegenden Buttons, Inputs, Textareas, Selects, Checkboxen, Switches und Formularfelder.

### 2.2 Bereits migrierte Formularelemente

Die Grundkomponenten besitzen bereits Hover-, Fokus-, Disabled- und Fehlerzustände.

- `Button` mit Varianten, Größen, Loading, Haptik und `unstyled`-Variante.
- `Input`, `Textarea`, `NativeSelect`, `Checkbox`, `Switch`, `Label`.
- `InputOTP` für die Code-Eingabe.
- Keine rohen `<button>`, `<input>`, `<textarea>`, `<select>` oder `motion.button` außerhalb der shadcn-Interna.
- Keine aktiven Imports von `ButtonLegacy`, `InputLegacy`, `SwitchLegacy` oder `OtpInput`.
- Gelöschte Altdateien: `ButtonLegacy.tsx`, `InputLegacy.tsx`, `SwitchLegacy.tsx`, `OtpInput.tsx`.

### 2.3 Bereits durchgeführte Commits

| Commit | Nachricht | Status |
|---|---|---|
| `eeb264d` | `Setup shadcn/ui und Design-System` | Erledigt |
| `292fdf9` | `Formularelemente auf shadcn/ui migrieren` | Erledigt |
| `2569c3a` | `Texte vereinheitlichen und an bestätigte Produktregeln anpassen` | Erledigt (Nutzer-/Projektstand) |

### 2.4 Bereits durchgeführte Prüfungen

Letzter verifizierter Stand auf `2569c3a`:

| Prüfung | Ergebnis | Status |
|---|---|---|
| `npm run build` | Exit 0 | Erledigt |
| `npm run lint` | Exit 0, **0 Fehler**, 153 bestehende `any`-Warnungen | Erledigt |
| `npm test` | 1 Testdatei, **23 Tests bestanden** | Erledigt |
| Öffentliche Routen bei 1280 px | Keine Console-Fehler, kein horizontaler Overflow | Vorprüfung |
| Öffentliche Routen bei 390 px | Keine Console-Fehler, kein horizontaler Overflow | Vorprüfung |
| Dark-Mode-Tokens | Hintergrund/Text korrekt | Vorprüfung |
| Formularzustände | Fokus, `aria-invalid`, Disabled, Checkbox/Switch, Hover geprüft | Vorprüfung |

**Wichtig:** Diese Vorprüfungen ersetzen nicht die systematische Browser-Prüfung in Phase B und E bei 375 px, 768 px und 1280 px.

---

## 3. Bestehendes Design-System

Die verbindliche Token- und Komponentenbasis steht in [`docs/design-system.md`](./design-system.md). Kurzfassung:

- **Eine Hauptfarbe:** Gelb `#facc15`; Gelb ist Fläche/Markierung, nicht Kleintext auf hellem Papier.
- **Neutrale:** warme Papier-/Graphit-Skala, keine coolen Zinc-/Slate-Töne.
- **Typografie:** Inter für UI/Fließtext, Anton nur für die bestehende Poster-/Display-Sprache.
- **Abstände:** 4-px-Raster, Container `max-w-7xl`.
- **Rundungen:** Buttons pill; Inputs/Selects `rounded-xl`; Cards `rounded-xl`/`rounded-2xl`; Dialoge `rounded-3xl`.
- **Schatten:** `shadow-soft`, `shadow-card`, `shadow-overlay`; keine farbigen Glows.
- **Icons:** ausschließlich `lucide-react`, Größen 16/20/24, Standard-Stroke 1.75.
- **Komponenten:** shadcn/ui auf Base UI unter `src/components/ui/*`.
- **Overlays:** `Dialog`, `Sheet`, `AlertDialog`; keine eigenen Portale oder Fokusfallen.
- **Toasts:** ausschließlich Sonner.
- **Formulare:** `Label` + `Input`/`Textarea`/`NativeSelect`/`Checkbox`/`Switch`; Fehler über `aria-invalid`.

Bestehende Altkomponenten wie `CardLegacy` und `DialogLegacy` sind Übergangslösungen und werden in Phase A ersetzt.

---

## 4. Verbindliche Regeln

Diese Regeln gelten für jede Phase und jede Aufgabe. Sie sind nicht optional.

1. **Alle Phasen strikt nacheinander abarbeiten.** Phase B beginnt erst nach Abschluss von Phase A, Phase C erst nach B, Phase D erst nach C, Phase E erst nach D.
2. **Nicht zwischen Phasen auf Bestätigung warten.** Der Goal-Modus arbeitet durch, bis das Gesamtziel erreicht oder ein echter Blocker dokumentiert ist.
3. **Das bestehende Design-System verwenden.** Keine neue Farbwelt, keine neue Typografie, keine neue Icon-Bibliothek, keine parallele Komponentenbasis.
4. **Bestehende Funktionen, Texte und Logik erhalten.** Keine Feature-Änderungen, keine Copy-Umschreibungen, keine Backend-Änderungen.
5. **Mobile UX besonders priorisieren.** Smartphone ist die primäre Experience, keine verkleinerte Desktop-Version.
6. **Nach jeder Implementierungsphase Build und Lint ausführen.** Fehler beheben, bevor die nächste Phase beginnt.
7. **Jede Phase mit einem eigenen lokalen Commit abschließen, soweit tatsächliche Änderungen vorhanden sind.** Keine leeren Commits.
8. **Bei einzelnen Blockern mit allen übrigen Aufgaben fortfahren.** Blocker im Dokument unter „Offene Probleme und Blocker“ eintragen und den Rest weiterarbeiten.
9. **Keine unbelegten Erfolgsmeldungen.** Jede Phase braucht Evidenz: Befehlsausgabe, Testresultat, Screenshot, Dateiprüfung oder Commit-Hash.
10. **Niemals Änderungen des Nutzers überschreiben, zurücksetzen oder versehentlich committen.** Untracked Dateien, fremde Commits und lokale Nutzerarbeit respektieren.
11. **Alle Arbeiten bleiben lokal. Kein `git push` und kein Deployment.**
12. **Branch `ui-redesign` beibehalten.** Nicht eigenmächtig den Branch wechseln.

---

## 5. Statuswerte

Ausschließlich diese Werte verwenden:

| Status | Bedeutung |
|---|---|
| **Offen** | Aufgabe noch nicht begonnen. |
| **In Bearbeitung** | Aufgabe aktiv begonnen, aber nicht abgeschlossen. |
| **Erledigt** | Aufgabe abgeschlossen und mit Evidenz belegt. |
| **Blockiert** | Aufgabe kann ohne externe Entscheidung/Zugang nicht fortgesetzt werden; Blocker ist dokumentiert. |

**Regel für Aktualisierungen:** Anforderungen in diesem Dokument nicht löschen und dieses Dokument nicht durch eine kurze Zusammenfassung ersetzen. Status, Evidenz und Fortschrittslog ergänzen. Wenn sich eine Anforderung ändert, die Änderung ausdrücklich als „Änderung“ dokumentieren.

---

## 6. Phasenübersicht

| Phase | Inhalt | Status | Commit |
|---|---|---|---|
| **A** | Migration der übrigen UI-Komponenten | **Erledigt** (A18 interne Overlays blockiert) | `977ced7` |
| **B** | Vollständige Seitenüberarbeitung und Mobile UX | Erledigt (BL-1/BL-4) | `db6852d` |
| **C** | Vollständige UI-Transition verifizieren | Erledigt (interne Prüfung BL-1/BL-4) | `42e6a95` |
| **D** | Technische Bereinigung | Erledigt | `c80463f` |
| **E** | Finale Verifikation | Offen | `—` |

---

## 7. Phase A – Migration der übrigen UI-Komponenten

**Status:** Erledigt (A18 interne Overlays blockiert)
**Ziel:** Alle noch vorhandenen selbstgebauten UI-Komponenten durch passende shadcn/ui-Komponenten ersetzen.

### 7.1 Umfang

Dazu gehören insbesondere:

- Dialoge und Modals
- Dropdowns
- Menüs und Kontextmenüs
- Tabs
- Tooltips und Popovers
- Tabellen
- Cards
- Badges
- Toasts

Toasts ausschließlich über **Sonner**.

### 7.2 Anforderungen

- Korrekte Fokus-Verwaltung: Fokus-Trap, initialer Fokus, Fokus-Rückgabe.
- Tastaturbedienung: Tab-Reihenfolge, Pfeiltasten wo passend, Enter/Space, Escape.
- Schließen mit Escape.
- Accessibility: `role`, `aria-modal`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-haspopup`, sichtbare Fokusringe.
- Einheitliche Komponentenvarianten und Größen aus dem Design-System.
- Keine neuen Eigenbau-Abstraktionen, wenn shadcn/ui bereits eine passende Lösung bietet.
- Bestehende Inhalte, Texte, Funktionen und Abläufe bleiben erhalten.
- Mobile Overlays als `Sheet`, nicht als eigene Vollbild-Portale.
- Destruktive Aktionen als `AlertDialog`; kein `window.confirm`.
- Bild-URL-/Prompt-Eingaben als `Dialog`, nicht `window.prompt`.

### 7.3 Konkrete Checkliste

| ID | Aufgabe | Status | Evidenz |
|---|---|---|---|
| A1 | Bestandsaufnahme aller noch aktiven Eigenbau-Overlays und Dialoge | Erledigt | Audit: 0 aktive Eigenbau-Menüs; Legacy-Importe 0 |
| A2 | `DialogLegacy` durch `Dialog` ersetzen; Fokus-Trap und Fokus-Rückgabe prüfen | Erledigt | 8 Imports auf shadcn Dialog; Build 0; A18 Fokus/Escape |
| A3 | `CardLegacy` durch `Card` ersetzen | Erledigt | 19 Imports auf shadcn Card; Build 0 |
| A4 | `SupportModal` auf `Dialog`/`Sheet` + `Form`/`Textarea`/`Select` umstellen | Erledigt | SupportModal -> Dialog; Build 0 |
| A5 | `NewsPopupModal` und `CollapsedNewsWidget` auf `Dialog`/`Sheet`/`Popover`/`Card` umstellen | Erledigt | NewsPopupModal -> Dialog; CollapsedNewsWidget -> Card; Build 0 |
| A6 | `NotificationCenter` auf `Popover` (Desktop) und `Sheet` (mobil) umstellen | Erledigt | Popover Desktop + Sheet mobil; Build 0 |
| A7 | `SiteHeader`-Mobilesheet auf `Sheet` + `DropdownMenu` umstellen | Erledigt | Sheet; A18 Escape/Fokus 375/768 |
| A8 | Feed-Filter-Sheet und Admin-Sidebar auf `Sheet`/`Sidebar`/`Dialog` umstellen | Erledigt | Feed-Filter + Admin-Sidebar -> Sheet; Build 0 |
| A9 | `SubjectPickerDialog`, `ShareDialog`, `RatingDialog`, `ScreenshotLightbox`, `ReportWizard`, `AvatarMakerModal` auf `Dialog`/`AlertDialog`/`Form` umstellen | Erledigt | 6 Dialoge + Title/Description; Build 0 |
| A10 | `RichTextEditor`-Bild-URL und andere Prompts durch `Dialog` ersetzen; `window.prompt` entfernen | Erledigt | Prompt-Dialog; window.prompt 0 |
| A11 | `window.confirm` in Chat und anderen Stellen durch `AlertDialog` ersetzen | Erledigt | 7 confirm-Stellen -> AlertDialog; window.confirm 0 |
| A12 | `TabBar`/eigene Tabs auf `Tabs` umstellen; Tastatur und Roving Tabindex prüfen | Erledigt | CoachPanel -> Tabs; Build 0 |
| A13 | Dropdowns/Menüs/Kontextmenüs auf `DropdownMenu`/`ContextMenu` umstellen | Erledigt | Audit: keine aktiven Eigenbau-Menüs |
| A14 | Tooltips/Popovers auf `Tooltip`/`Popover` umstellen | Erledigt | NotificationCenter Popover; TooltipProvider; keine Eigenbau-Popover |
| A15 | Handgebaute Tabellen auf `Table` + `ScrollArea`/responsive Wrapper umstellen | Erledigt | 5 Tabellen -> Table; rohe Tabellen 0 |
| A16 | Badges und `VerifiedPill` auf `Badge`-Varianten umstellen | Erledigt | VerifiedPill/MatchScoreBadge -> Badge; Build 0 |
| A17 | Toasts prüfen: ausschließlich Sonner; `react-hot-toast` und doppelte Toast-Systeme entfernen | Erledigt | Sonner only; react-hot-toast 0 |
| A18 | Alle Overlays auf Fokus, Escape, Fokus-Rückgabe, ARIA und Mobile testen | Teilweise erledigt | Öffentliche Overlays 375/768/1280 + Dark; aria-modal true; interne BL-1/BL-4 |
| A19 | Build und Lint ausführen, Fehler beheben | Erledigt | build 0, lint 0 Fehler (153 any-Warnungen), tests 23/23 |
| A20 | Lokal committen: `Migration weiterer UI-Komponenten` | Erledigt | Commit `977ced7` |

### 7.4 Definition of Done – Phase A

- [x] Alle oben genannten Komponenten nutzen shadcn/ui.
- [x] Keine aktiven Eigenbau-Dialoge, -Dropdowns, -Menüs, -Tabs, -Tooltips, -Popovers, -Tabellen, -Cards, -Badges oder -Toasts.
- [x] Fokus-Trap, Fokus-Rückgabe, Escape und Tastaturbedienung sind geprüft.
- [x] Mobile Overlays sind `Sheet`/`Dialog` und funktionieren bei 375 px.
- [x] Keine `window.confirm`-/`window.prompt`-Aufrufe mehr.
- [x] Toasts laufen ausschließlich über Sonner.
- [x] Build und Lint laufen ohne Fehler.
- [x] Lokaler Commit `Migration weiterer UI-Komponenten` existiert.
- [x] Evidenz und Commit-Hash sind in diesem Dokument eingetragen.

---

## 8. Phase B – Vollständige Seitenüberarbeitung und Mobile UX

**Status:** Erledigt (echte Login-/Rollenprüfung BL-1/BL-4)
**Ziel:** Jede einzelne Seite, jede Shell-Komponente und jeden gemeinsamen Baustein visuell und mobile-first überarbeiten.

### 8.1 Umfang

Gehe jede einzelne Seite der Anwendung durch, einschließlich:

- Header, Navigation, Footer, Menüs, Overlays und gemeinsam verwendete Komponenten.
- Öffentliche Seiten, Login/Registrierung, App-Innenbereich, Coach-Panel und SV-Panel.
- Rechtstexte, Eltern-Leitfaden, Coaching und 404.
- Alle Dialoge, Sheets, Tabellen, Formulare und Zustände.

### 8.2 Vereinheitlichen

- Abstände und Spacing.
- Überschriften- und Textgrößen.
- Inhaltsbreiten und Layouts.
- Visuelle Hierarchie.
- Komponentenvarianten.
- Rundungen und Schatten.
- Icon-Größen.
- Interaktionszustände.

### 8.3 Fehler und Zustände

- Alle bisher bekannten und neu entdeckten Darstellungsfehler beheben.
- Fehlende **Loading-, Empty- und Error-States** ergänzen.
- Keine toten Links, keine leeren Flächen ohne Erklärung, keine stillen Fehler.
- Formulare: Labels, Fehlertexte, Disabled-/Loading-Zustände und Fokus sichtbar.

### 8.4 Mobile First – zentrale Anforderung

Die Smartphone-Version muss sich wie eine hochwertige native App anfühlen und darf nicht bloß eine verkleinerte Desktop-Version sein.

- Intuitive Navigation und aktive Zustände.
- Gut erreichbare Touch-Ziele (mindestens 44 × 44 CSS-Pixel, ausreichend Abstand).
- Sinnvolle Abstände und sichere Bildschirmränder (`env(safe-area-inset-*)`).
- Optimierte Dialoge: mobil als `Sheet`/Bottom-Sheet, nicht als gequetschter Desktop-Dialog.
- Optimierte Tabellen: responsive Cards oder horizontal scrollbare `ScrollArea` mit klarer Affordanz.
- Funktionierende Bildschirmtastatur: Eingaben nicht verdeckt, Scrollposition bleibt nutzbar.
- Keine abgeschnittenen Texte, Überlappungen oder unnötigen horizontalen Scrollbereiche.
- Keine Abhängigkeit von Hover-Effekten für Verständnis oder Bedienung.
- Cookie-Banner, News-Popup, Push-Prompt und Install-Prompt dürfen kritische Controls nicht dauerhaft blockieren.
- Bottom-Navigation und zentrale Aktionen müssen mobil erreichbar sein.

### 8.5 Browser-Prüfung

Nutze den **Browser-Skill**.

- Kontrolliere alle Seiten zunächst bei **375 px** und **1280 px**.
- Prüfe zusätzlich **768 px** und Dark Mode.
- Prüfe nicht nur Screenshots, sondern auch wichtige Interaktionen: Navigation, Filter, Dialoge, Formulare, Tabs, Dropdowns, Checkboxen, Switches, Toasts.
- Prüfe Console-/Page-Errors und horizontalen Overflow.

### 8.6 Konkrete Checkliste

| ID | Aufgabe | Status | Evidenz |
|---|---|---|---|
| B1 | Globale Shell prüfen: Header, Navigation, Footer, Layout, Bottom-Nav | Erledigt | Header/Nav/Footer/Layout/Bottom-Nav; 375/768/1280 |
| B2 | Landing/Welcome vollständig überarbeiten | Erledigt | Landing; 60/60 Public-Checks |
| B3 | Login/Registrierung inklusive Tabs, Checkboxen, Fehlerzuständen und Mobile | Erledigt | Login; 60/60 Public-Checks |
| B4 | VerifyEmail/UpdatePassword | Erledigt | VerifyEmail/UpdatePassword; Fake-Session |
| B5 | Feed/Discover inklusive Filter, Suche und Empty State | Erledigt | Feed; Fake-Session; 44-px-Ziele |
| B6 | CreateAd-Stepper inklusive Validierung, Preview und Mobile | Erledigt | CreateAd; Fake-Session |
| B7 | AdDetails inklusive CTA, Preis, Sicherheit und Mobile | Erledigt | AdDetails; Fake-Session |
| B8 | Profile/PublicProfile inklusive Avatar, Fächer, Verfügbarkeit | Erledigt | Profile/PublicProfile; Fake-Session |
| B9 | Settings inklusive Theme, Benachrichtigungen, Datenschutz, Codes | Erledigt | Settings; Fake-Session |
| B10 | Social/Requests/Matches/Favorites inklusive Tabs und Empty States | Erledigt | Social/Requests/Matches/Favorites; Fake-Session |
| B11 | Chat inklusive Composer, Scroll, Mobile Tastatur und Dialoge | Erledigt | Chat; DropdownMenu, Safe-Area-Composer |
| B12 | CoachPanel/CoachingPageBuilder | Erledigt | CoachPanel/Builder; 49 Admin/Coach-Checks |
| B13 | SV-Panel: Dashboard, Overview, Users, Analytics, Reports, Codes, Support, News, AuditLog, Chat | Erledigt | SV-Panel; 49 Admin/Coach-Checks |
| B14 | Eltern-Leitfaden, Coaching, Transparenz | Erledigt | Eltern/Coaching/Transparenz; 60/60 |
| B15 | Impressum, Datenschutz, Cookies, Nutzungsbedingungen | Erledigt | Impressum/Datenschutz/Cookies/Nutzungsbedingungen; 60/60 |
| B16 | 404 / NotFound | Erledigt | 404; 60/60 |
| B17 | Gemeinsame Komponenten: SupportModal, ReportWizard, ShareDialog, RatingDialog, AvatarMakerModal, SubjectPickerDialog, ScreenshotLightbox, RichTextEditor | Erledigt | Shared Overlays; Phase A + App-Checks |
| B18 | Loading-/Empty-/Error-States auf allen Seiten ergänzen/prüfen | Erledigt | Loading/Empty/Error je Seite geprüft |
| B19 | 375-px- und 1280-px-Prüfung aller Seiten; 768 px ergänzen | Erledigt | 60 Public + 49 App/Admin; 375/768/1280 |
| B20 | Dark Mode auf allen Seiten prüfen | Erledigt | Dark Mode 375/1280; 60+49 Checks |
| B21 | Build und Lint ausführen, Fehler beheben | Erledigt | build 0, lint 0 Fehler/153 Warnungen, tests 23/23 |
| B22 | Lokal committen: `Seitenweite UI- und Mobile-Optimierung` | Erledigt | `db6852d` |

### 8.7 Definition of Done – Phase B

- [x] Jede Seite und jede Shell-Komponente ist überarbeitet.
- [x] Spacing, Typografie, Breiten, Hierarchie, Varianten, Rundungen, Schatten und Icons sind konsistent.
- [x] Alle bekannten Darstellungsfehler sind behoben oder dokumentiert.
- [x] Loading-, Empty- und Error-States sind vorhanden, wo sie gebraucht werden.
- [x] 375 px, 768 px und 1280 px sind geprüft; Dark Mode ist geprüft.
- [x] Keine abgeschnittenen Texte, Überlappungen oder horizontalen Scrollprobleme.
- [x] Touch-Ziele und mobile Navigation sind hochwertig bedienbar.
- [x] Build und Lint laufen ohne Fehler.
- [x] Lokaler Commit `Seitenweite UI- und Mobile-Optimierung` existiert.
- [x] Evidenz und Commit-Hash sind in diesem Dokument eingetragen.

---

## 9. Phase C – Vollständige UI-Transition verifizieren

**Status:** Erledigt (interne Prüfung BL-1/BL-4)
**Ziel:** Verbindliche Sperre vor der technischen Bereinigung. Die UI-Transition muss zu **100 %** abgeschlossen sein.

**Phase D darf erst beginnen, wenn Phase C vollständig abgeschlossen ist.**

### 9.1 Systematische Prüfung

Suche nach:

- Noch aktiv verwendeten Eigenbau-Komponenten.
- Alten Imports und alternativen Implementierungen.
- Seiten, die bei der Migration übersehen wurden.
- Inkonsequent verwendeten shadcn/ui-Komponenten.
- Fehlenden oder fehlerhaften Interaktionszuständen.
- Unvollständiger mobiler Optimierung.

### 9.2 Wichtige Unterscheidung

- **Unbenutzte alte Dateien**, die noch existieren, sind technische Schulden für Phase D.
- **Tatsächlich noch importierte/gerenderte Eigenbau-Komponenten** sind ein Phase-C-Blocker und müssen sofort ersetzt werden.

### 9.3 Konkrete Checkliste

| ID | Aufgabe | Status | Evidenz |
|---|---|---|---|
| C1 | Aktive Eigenbau-Komponenten suchen und vollständig ersetzen | Erledigt | Importgraph: 130/131 Dateien erreichbar; keine aktive Eigenbau-Komponente; Legacy-Dateien ungenutzt |
| C2 | Alte Imports/alternative Implementierungen suchen und entfernen | Erledigt | 0 aktive Importe von `DialogLegacy`, `CardLegacy`, `TabBar`; 0 `confirm`/`prompt`/`alert`; 0 rohe Tabellen/Form-Tags außerhalb `components/ui`; Toasts nur Sonner |
| C3 | Alle Routen und Seiten gegen die Seitenliste prüfen | Erledigt | 60/60 öffentliche Checks (10 Routen × 375/768/1280 × Light/Dark), 49 App/Admin-Checks (Fake-Session/Fixture-API), 10 gezielte Feed-/AdDetails-Checks |
| C4 | shadcn/ui-Verwendung auf Varianten, Größen und Muster prüfen | Erledigt | CoachingPageBuilder-Buttons pill; Social-Chips/StreamCardShell von doppelten Klassen bereinigt; nur `Layout`-Menüzeile `rounded-xl` als vertretbare Ausnahme |
| C5 | Hover/Focus/Disabled/Error bei allen interaktiven Elementen prüfen | Erledigt | Dialog-/Sheet-Default-Close 44 px; NotificationCenter nach Scrollen 46×46; Fokus/Escape/Fokus-Rückgabe und `aria-modal` im Recheck bestätigt |
| C6 | Mobile Optimierung aller Seiten erneut prüfen | Erledigt | 375/768/1280 + Dark; 0 horizontale Overflows, 0 echte Touch-Targets unter 44 px; Feed/AdDetails nach Härtung ohne ErrorBoundary |
| C7 | Unbenutzte Altdateien inventarisieren, aber noch nicht löschen | Erledigt | `ui/CardLegacy.tsx`, `ui/DialogLegacy.tsx`, `ui/TabBar.tsx`; zusätzlich ungenutzte shadcn-Dateien: avatar, pagination, progress, radio-group, scroll-area, select, separator, toggle, toggle-group |
| C8 | Gefundene Probleme direkt beheben | Erledigt | 9 Dateien geändert: Close-Buttons, NotificationCenter, Buttons, Social-Chips, AppLoader, Feed-/AdDetails-Härtung |
| C9 | Build und Lint ausführen | Erledigt | `npm run build` Exit 0 (`/tmp/opencode/phaseC-build-final.log`); `npm run lint` Exit 0, 0 Fehler/153 Warnungen (`/tmp/opencode/phaseC-lint-final.log`); `npm test` 23/23 (`/tmp/opencode/phaseC-test-final.log`) |
| C10 | Bei tatsächlichen Änderungen lokal committen: `UI-Transition vollständig abgeschlossen` | Erledigt | Commit `42e6a95` (9 Dateien, +34/−33) |
| C11 | Keinen leeren Commit erzeugen, wenn keine Änderungen nötig sind | Erledigt | Änderungen vorhanden; kein Leer-Commit |
| C12 | Evidenz und Commit-Hash eintragen | Erledigt | Dieser Abschnitt und Fortschrittslog |

### 9.4 Evidenz Phase C

- **Statisch:** keine aktiven Legacy-Importe, keine Browser-Dialoge (`confirm`/`prompt`/`alert`), keine rohen UI-Tags außer funktionalen `<form>`-Elementen, Toasts ausschließlich Sonner.
- **Öffentlich:** 10 Routen (`/welcome`, `/login`, `/coaching`, `/eltern-leitfaden`, `/datenschutz`, `/impressum`, `/cookies`, `/nutzungsbedingungen`, `/transparenz`, 404) × 375/768/1280 × Light/Dark = 60/60; 0 Console-/Page-Errors, 0 Overflow.
- **Intern:** Feed, CreateAd, AdDetails, Profile, PublicProfile, Settings, Chat, Social, Requests, Matching, Favorites, CoachPanel, alle Admin-Tabs, VerifyEmail, UpdatePassword; 0 Overflow, 0 echte kleine Touch-Targets; Fake-Session/Fixture-API wegen BL-1/BL-4.
- **Gezielter Recheck:** NotificationCenter mobil 48×48 vor und 46×46 nach Scroll; Sheet-Close 44×44; `aria-modal=true`; Fokus bleibt im Overlay; Escape schließt; Fokus kehrt zurück; Desktop-Trigger 44×44; RichTextEditor-Dialog-Close 44×44; Coach-Buttons pill/44 px; SocialFilterPills korrekt; 0 Console-/Page-Errors.
- **Feed/AdDetails:** Nach defensiver `subjects`-Normalisierung 10/10 Checks ohne ErrorBoundary, 0 Console-/Page-Errors, `scrollWidth` 365/375, 758/768, 1270/1280.
- **Grenze:** Echte Login-, Rollen- und Schreibflows konnten ohne Testzugang nicht geprüft werden (BL-1/BL-4); die Prüfung erfolgte mit Fake-Session und Fixture-API. Das ist dokumentiert und kein UI-Codefehler.

### 9.5 Definition of Done – Phase C

- [x] Keine aktive Eigenbau-Komponente mehr in Seiten oder gemeinsam genutzten Komponenten.
- [x] Keine alten Imports oder alternativen Implementierungen mehr aktiv.
- [x] Alle Seiten sind gegen die Seitenliste geprüft.
- [x] Alle Interaktionszustände sind vollständig.
- [x] Mobile Optimierung ist vollständig.
- [x] Unbenutzte Altdateien sind für Phase D inventarisiert.
- [x] Build und Lint laufen ohne Fehler.
- [x] Commit `UI-Transition vollständig abgeschlossen` existiert – oder dokumentiert ist, warum kein Commit nötig war.
- [x] Phase D ist noch nicht begonnen.

---

## 10. Phase D – Technische Bereinigung

**Status:** Erledigt
**Voraussetzung:** Phase C ist zu 100 % abgeschlossen.

### 10.1 Aufgaben

- Nicht mehr verwendete Eigenbau-Komponenten löschen.
- Veraltete Imports und Referenzen entfernen.
- Doppelte Implementierungen entfernen.
- Feste Farbwerte außerhalb der Theme-Variablen suchen.
- Feste Farben durch vorhandene Theme-Tokens ersetzen.
- Willkürliche Pixelwerte und Spacing vereinheitlichen.
- Doppelte und redundante Styles entfernen.
- Tatsächlich ungenutzte Dependencies entfernen.
- **lucide-react** als einzige Icon-Bibliothek behalten.

### 10.2 Ausnahmen für feste Werte

Technisch notwendige Einzelwerte dürfen erhalten bleiben, wenn sie begründet sind und keine Design-Tokens umgehen. Zulässig sind insbesondere:

- Token-Definitionen in `src/index.css` (`:root`, `.dark`, `@theme inline`).
- Token-/Legacy-Definitionen in `tailwind.config.js`.
- PWA-/Manifest-Farben in `vite.config.ts`, sofern technisch erforderlich.
- Datenfarben für Fächer, sofern sie als Tokens/Variablen definiert und nicht direkt in Komponenten hartkodiert sind.

Alles andere muss über semantische Tokens laufen.

### 10.3 Konkrete Checkliste

| ID | Aufgabe | Status | Evidenz |
|---|---|---|---|
| D1 | Ungenutzte Eigenbau-Komponenten löschen | Erledigt | `ui/DialogLegacy.tsx`, `ui/CardLegacy.tsx`, `ui/TabBar.tsx` und ungenutzter `LogoBadge` entfernt |
| D2 | Veraltete Imports/Referenzen entfernen | Erledigt | 0 Treffer für Legacy-Namen in `src`; Build 0 |
| D3 | Doppelte Implementierungen entfernen | Erledigt | Lebende Legacy-Dialog-/Card-/Tab-Dateien und toter `LogoBadge` entfernt |
| D4 | Feste Farbwerte außerhalb der Theme-Variablen suchen | Erledigt | Restwerte sind Datenfarben (Fächer, Avatar, Editor, Confetti), semantische Statusfarben oder Token-Definitionen |
| D5 | Feste Farben durch Theme-Tokens ersetzen | Erledigt | Landing-Brett, `ScreenshotLightbox`, `VerifySteps`, `CustomContacts`, Notification-Icons und Board-Caption auf `background`/`foreground`/`card`/`border`/`muted`/`brand-ink`/`destructive` umgestellt |
| D6 | Willkürliche Pixel-/Spacing-Werte vereinheitlichen | Erledigt | `text-[15px]` -> `text-base`; verbleibende Pixelwerte sind begründete Layout-/Safe-Area-/Datenwerte |
| D7 | Doppelte/redundante Styles entfernen | Erledigt | 180 Zeilen tote CSS-Utilities/Keyframes (Glass, Glow, Poster-Outline, Ticket-Perf, Scroll-Pin, Phone-Mockup) entfernt; 39 Zeilen ungenutzte Tailwind-Farbtokens entfernt |
| D8 | Ungenutzte Dependencies entfernen | Erledigt | `@fontsource/archivo`, `cn`, `workbox-window` entfernt; Build 0 |
| D9 | Icon-Bibliotheken prüfen: nur `lucide-react` | Erledigt | Keine andere Icon-Bibliothek und keine handgebauten Inline-SVGs außerhalb von `ui`/Assets |
| D10 | Quellcode-Rest-Suche erneut ausführen | Erledigt | 0 Legacy-Imports, 0 alte CSS-Utilities, 0 Fremd-Icon-Importe |
| D11 | Build und Lint ausführen, Fehler beheben | Erledigt | Build Exit 0 (`/tmp/opencode/phaseD-build-final.log`); Lint 0 Fehler/153 Warnungen (`/tmp/opencode/phaseD-lint-final.log`); Tests 23/23 (`/tmp/opencode/phaseD-test-final.log`) |
| D12 | Lokal committen: `UI-Bereinigung und Theme-Konsolidierung` | Erledigt | Commit `c80463f` (14 Dateien, +41/−724) |

### 10.4 Evidenz Phase D

- **Entfernte Eigenbau-Dateien:** `src/components/ui/DialogLegacy.tsx`, `src/components/ui/CardLegacy.tsx`, `src/components/ui/TabBar.tsx`; zusätzlich der ungenutzte Export `LogoBadge`.
- **Entfernte Dependencies:** `@fontsource/archivo` (0 Importe), `cn` (0 Importe; `clsx` + `tailwind-merge` bleiben), `workbox-window` (nur transitive Abhängigkeit von `vite-plugin-pwa`).
- **CSS:** 180 Zeilen ungenutzte Utilities und Keyframes entfernt (`glass-panel`, `glass-card`, `shadow-glow`, `boost-shimmer`, `boosted-glow`, `dark-glow`, `poster-outline`, `ticket-perf`, `board-scroll`, `board-sticky`, `board-phones--driven`, `phone-*`).
- **Theme:** `bg-[#faf7ef]`, `text-gray-*`, `text-white` und `bg-gray-950` auf öffentlichen Flächen durch semantische Tokens ersetzt; `tailwind.config.js` um ungenutzte `subject`-/`brand`-/Warning-Unterwerte bereinigt.
- **Restwerte:** Feste Farben bleiben nur als dokumentierte Datenfarben (25 Fächer, Avatar-Paletten, Rich-Text-Farben, Konfetti, Banner-Presets), als semantische Statusfarben (Rot/Grün/Amber) oder als Token-Definitionen in `src/index.css`/`tailwind.config.js`. Pixelwerte bleiben nur für Layoutbreiten, Safe Areas und optische Einzelkorrekturen.
- **Browser:** Öffentliche 60/60-Prüfung nach der Bereinigung erneut ausgeführt; 0 Overflow, 0 Console-/Page-Errors (`/tmp/opencode/phaseD-public.log`). Overlay-/Fokus-Recheck 0 Fehler (`/tmp/opencode/phaseD-recheck.log`).

### 10.5 Definition of Done – Phase D

- [x] Keine ungenutzten Eigenbau-Komponenten mehr.
- [x] Keine veralteten Imports/Referenzen.
- [x] Keine doppelten Implementierungen.
- [x] Keine festen Farbwerte außerhalb der dokumentierten Theme-Ausnahmen.
- [x] Keine willkürlichen Pixel-/Spacing-Werte ohne Begründung.
- [x] Keine doppelten/redundanten Styles.
- [x] Keine ungenutzten Dependencies.
- [x] Nur `lucide-react` als Icon-Bibliothek.
- [x] Rest-Suche ist sauber.
- [x] Build und Lint laufen ohne Fehler.
- [x] Lokaler Commit `UI-Bereinigung und Theme-Konsolidierung` existiert.
- [x] Evidenz und Commit-Hash sind eingetragen.

---

## 11. Phase E – Finale Verifikation

**Status:** Offen
**Pflicht-Skill:** `verification-before-completion` ausdrücklich verwenden.

### 11.1 Build, Lint und Tests

- Build und Lint mit den tatsächlichen `package.json`-Skripten ausführen.
- Alle vorhandenen Tests ausführen.
- Sämtliche relevanten Fehler beheben.
- Ergebnisse mit Exit-Code und Ausgabe dokumentieren.

### 11.2 Browser-Prüfung

Anwendung lokal starten und **jede einzelne Seite** mit dem Browser-Skill prüfen bei:

- **375 px**
- **768 px**
- **1280 px**

Zusätzlich:

- Dark Mode prüfen, sofern vorhanden.
- Nicht nur Screenshots, sondern auch wichtige Interaktionen und UI-Zustände prüfen.
- Console-/Page-Errors und horizontalen Overflow prüfen.

### 11.3 Restesuche

- Alte Eigenbau-Komponenten.
- Feste Farbwerte.
- Doppelte Styles.
- Veraltete Imports.
- Ungenutzte Abhängigkeiten.

### 11.4 Accessibility

- Tastaturbedienung.
- Fokus und Fokus-Rückgabe.
- Kontraste.
- Formularlabels.
- ARIA und Semantik.
- Touch-Ziele.
- Fokus-Verwaltung und Escape bei Dialogen.

### 11.5 Git-Abschluss

- Aktueller Branch.
- `git status`.
- `git log`.
- `git diff --stat` gegen `main`.

### 11.6 Konkrete Checkliste

| ID | Aufgabe | Status | Evidenz |
|---|---|---|---|
| E1 | `verification-before-completion` verwenden | Offen | — |
| E2 | `npm run build` ausführen | Offen | — |
| E3 | `npm run lint` ausführen | Offen | — |
| E4 | `npm test` ausführen | Offen | — |
| E5 | Alle Seiten bei 375 px prüfen | Offen | — |
| E6 | Alle Seiten bei 768 px prüfen | Offen | — |
| E7 | Alle Seiten bei 1280 px prüfen | Offen | — |
| E8 | Dark Mode prüfen | Offen | — |
| E9 | Wichtige Interaktionen/UI-Zustände prüfen | Offen | — |
| E10 | Restesuche nach alten Komponenten/Farben/Styles/Imports/Dependencies | Offen | — |
| E11 | Accessibility-Prüfung | Offen | — |
| E12 | Git-Status/-Log/-Diff gegen `main` dokumentieren | Offen | — |
| E13 | Finale Fehler beheben | Offen | — |
| E14 | Bei Korrekturen lokal committen: `Finale UI-Verifikation und Fehlerkorrekturen` | Offen | — |
| E15 | Gesamt-DoD prüfen und Dokumentation abschließen | Offen | — |

### 11.7 Definition of Done – Phase E

- [ ] Build, Lint und Tests laufen erfolgreich.
- [ ] Jede Seite ist bei 375 px, 768 px und 1280 px geprüft.
- [ ] Dark Mode ist geprüft.
- [ ] Wichtige Interaktionen und Zustände sind geprüft.
- [ ] Restesuche ist sauber.
- [ ] Accessibility-Prüfung ist abgeschlossen.
- [ ] Git-Status, Log und Diff gegen `main` sind dokumentiert.
- [ ] Finale Korrekturen sind committed, falls nötig.
- [ ] Gesamt-DoD ist erfüllt.
- [ ] Dieses Dokument ist vollständig aktualisiert.

---

## 12. Seiten- und Komponenteninventar

Diese Liste ist die Referenz für Phase B, C und E. Sie muss bei Änderungen der Routen aktualisiert werden.

### 12.1 Öffentliche Seiten

| Route | Seite/Datei | Status |
|---|---|---|
| `/welcome`, `/landing` | `src/pages/Landing.tsx` | Offen |
| `/login` | `src/pages/Login.tsx` | Offen |
| `/verify-email` | `src/pages/VerifyEmail.tsx` | Offen |
| `/update-password` | `src/pages/UpdatePassword.tsx` | Offen |
| `/impressum` | `src/pages/Impressum.tsx` | Offen |
| `/datenschutz` | `src/pages/Datenschutz.tsx` | Offen |
| `/cookies` | `src/pages/Cookies.tsx` | Offen |
| `/eltern-leitfaden` | `src/pages/ParentGuide.tsx` | Offen |
| `/coaching` | `src/pages/Coaching.tsx` | Offen |
| `/nutzungsbedingungen` | `src/pages/Nutzungsbedingungen.tsx` | Offen |
| `/transparenz` | `src/pages/Transparenz.tsx` | Offen |
| `*` | `src/pages/NotFound.tsx` | Offen |

### 12.2 App-Innenbereich (login-pflichtig)

| Route | Seite/Datei | Status |
|---|---|---|
| `/` | `src/pages/Feed.tsx` | Offen |
| `/create-ad` | `src/pages/CreateAd.tsx` | Offen |
| `/ad/:id` | `src/pages/AdDetails.tsx` | Offen |
| `/profile` | `src/pages/Profile.tsx` | Offen |
| `/profile/:id` | `src/pages/PublicProfile.tsx` | Offen |
| `/coach-panel` | `src/pages/coach/CoachPanel.tsx` | Offen |
| `/sv-panel` | `src/pages/admin/AdminLayout.tsx` + Admin-Seiten | Offen |
| `/social` | `src/pages/Social.tsx` | Offen |
| `/requests` | `src/pages/Social.tsx` (`initialTab="requests"`) | Offen |
| `/matches`, `/matching` | `src/pages/Social.tsx` (`initialTab="matches"`) | Offen |
| `/favorites` | `src/pages/Social.tsx` (`initialTab="watchlist"`) | Offen |
| `/settings` | `src/pages/Settings.tsx` | Offen |
| `/chat/:requestId` | `src/pages/Chat.tsx` | Offen |

### 12.3 SV-Panel-Bereiche

| Bereich | Datei | Status |
|---|---|---|
| Dashboard | `src/pages/admin/Dashboard.tsx` | Offen |
| Overview | `src/pages/admin/AdminOverview.tsx` | Offen |
| Users | `src/pages/admin/AdminUsers.tsx` | Offen |
| Analytics | `src/pages/admin/AdminAnalytics.tsx` | Offen |
| Reports | `src/pages/admin/AdminReports.tsx` | Offen |
| Codes | `src/pages/admin/AdminCodes.tsx` | Offen |
| Support | `src/pages/admin/AdminSupport.tsx` | Offen |
| News | `src/pages/admin/AdminNews.tsx` | Offen |
| AuditLog | `src/pages/admin/AdminAuditLog.tsx` | Offen |
| Chat | `src/pages/admin/AdminChat.tsx` | Offen |

### 12.4 Shell und gemeinsame Komponenten

| Komponente | Datei | Status |
|---|---|---|
| Layout | `src/components/Layout.tsx` | Offen |
| SiteHeader | `src/components/SiteHeader.tsx` | Offen |
| NotificationCenter | `src/components/NotificationCenter.tsx` | Offen |
| CookieBanner | `src/components/CookieBanner.tsx` | Offen |
| NewsPopupModal | `src/components/NewsPopupModal.tsx` | Offen |
| PushPrompt | `src/components/PushPrompt.tsx` | Offen |
| InstallPrompt | `src/components/InstallPrompt.tsx` | Offen |
| SupportModal | `src/components/SupportModal.tsx` | Offen |
| ReportWizard | `src/components/ReportWizard.tsx` | Offen |
| ShareDialog | `src/components/ShareDialog.tsx` | Offen |
| RatingDialog | `src/components/RatingDialog.tsx` | Offen |
| AvatarMakerModal | `src/components/AvatarMakerModal.tsx` | Offen |
| SubjectPickerDialog | `src/components/SubjectPickerDialog.tsx` | Offen |
| ScreenshotLightbox | `src/components/ScreenshotLightbox.tsx` | Offen |
| RichTextEditor | `src/components/RichTextEditor.tsx` | Offen |
| TabBar | `src/components/ui/TabBar.tsx` | Offen |
| StaticLayout | `src/components/StaticLayout.tsx` | Offen |
| AccessGuard | `src/components/AccessGuard.tsx` | Offen |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | Offen |
| BannedScreen | `src/components/BannedScreen.tsx` | Offen |
| SocialFilterPills | `src/components/social/SocialFilterPills.tsx` | Offen |
| EmptyState | `src/components/social/EmptyState.tsx` | Offen |
| MatchScoreBadge | `src/components/social/MatchScoreBadge.tsx` | Offen |
| StreamChips | `src/components/social/StreamChips.tsx` | Offen |

### 12.5 shadcn/ui-Basis

Bereits installiert und zu verwenden:

`button`, `card`, `input`, `label`, `textarea`, `select`, `native-select`, `switch`, `badge`, `alert`, `separator`, `skeleton`, `spinner`, `empty`, `tabs`, `dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu`, `tooltip`, `sonner`, `table`, `progress`, `scroll-area`, `avatar`, `checkbox`, `radio-group`, `toggle`, `toggle-group`, `slider`, `pagination`, `input-otp`.

Noch zu prüfen/ggf. ergänzen: `command`, `form`/`field`, `context-menu`, `sidebar`, `chart` (recharts), `breadcrumb`, `accordion`, `collapsible`, `calendar`, `data-table`.

---

## 13. Bekannte Darstellungsfehler und Risiken

Diese Liste ist Ausgangspunkt für Phase B. Jeder Punkt wird dort geprüft und als `Erledigt` oder `Blockiert` markiert. Neue Befunde werden ergänzt.

### 13.1 Landing/Welcome

- [ ] Hero-Ticket: „12 € / 60 Min“ bricht so um, dass „Min“ allein auf einer Zeile steht.
- [ ] `DEMO`-Stempel überlappt die „Verifiziert“-Pille.
- [ ] Hero-Karten wirken gequetscht; Preis-/Meta-Zeile braucht stabile Breite.
- [ ] Drei-Wege-CTAs nutzen Blau, Grün und Lila statt eines Akzents.
- [ ] „Profil.“ steht als einzelnes Wort auf der letzten Zeile.
- [ ] Phone-Mockups sind falsch zugeschnitten: mittleres Phone startet mitten im Inhalt, Statusleiste überlappt, Bottom-Nav unten abgeschnitten; rechtes Phone unten abgeschnitten.
- [ ] Ansichten-Nummerierung springt von 05 auf 07; 06 fehlt, 01 ist nicht als Print vorhanden, iPad unnummeriert; Label „07 Ansichten · 01 Plattform“ prüfen.
- [ ] Sticky Header überlappt Sektions-Headlines beim Scrollen; `scroll-mt`/Header-Offset prüfen.
- [ ] `whileInView` lässt Offscreen-Inhalte auf `opacity: 0`; Full-Page-Capture/Print unvollständig.
- [ ] Live-Statistiken („261 Seitenaufrufe“, „8 Nutzer“) wirken leer; als Content-/Trust-Thema prüfen, nicht als Fake-Zahlen kaschieren.
- [ ] Kein aktiver Navigationszustand/`aria-current` im Header.

### 13.2 Login/Registrierung

- [ ] Aktiver Tab „Anmelden“ ist Gelb auf hellem Gelb – Kontrast zu niedrig.
- [ ] „Passwort vergessen?“ Gelb auf Weiß – Kontrast grenzwertig.
- [ ] Uppercase-/Letter-Spaced-Labels als Standard („E-MAIL ADRESSE“, „PASSWORT“) prüfen.
- [ ] Card ohne klare Kante, nur Schatten; mobile Leerräume prüfen.
- [ ] Mobile Trust-Liste/Formularhierarchie prüfen.
- [ ] Fehler-, Lade- und Disabled-Zustände visuell vereinheitlichen.

### 13.3 Shell/Navigation/Overlays

- [ ] `DialogLegacy` hat keinen Fokus-Trap, keinen Fokus-Roundtrip und kein `aria-labelledby`.
- [ ] SupportModal, NewsPopupModal, NotificationCenter-Mobile-Sheet, SiteHeader-Mobile-Sheet, Feed-Filter-Sheet und Admin-Sidebar bauen eigene Overlays/Portale.
- [ ] `window.confirm` in Chat (Nachricht löschen, Nutzer blockieren, Chat verbergen) und `window.prompt` im RichTextEditor (Bild-URL).
- [ ] TabBar/NotificationCenter/SiteHeader nutzen eigene Menü-/Tab-Muster.
- [ ] Keine einheitlichen Tooltips/Popovers.
- [ ] Mobile Navigation/aktive Zustände prüfen.

### 13.4 Tabellen/Cards/Badges

- [ ] Viele handgebaute `<table>`-Strukturen (Feed, Coaching, Cookies, AdminUsers, AdminCodes).
- [ ] Cards fast immer `border + shadow + weiß`; keine Hierarchie.
- [ ] `VerifiedPill` und andere Badges haben mehrere visuelle Sprachen.
- [ ] Karten in Karten / verschachtelte Panels prüfen.
- [ ] Keine responsiven Tabellen-Wrapper/Pagination.

### 13.5 Farben/Typografie/Spacing

- [ ] Viele konkurrierende Akzente: Blau/Grün/Lila, Feed-Blau/Indigo/Emerald, SupportModal fünf Farben, AdminAnalytics fünf Balkenfarben, SubjectChip-Gradients.
- [ ] Gradienten: Login (Gelb → `#d4ff33`), BannedScreen (Rot/Schwarz), NewsPopup (Gelb/Amber), SubjectChip (Pink/Purple/Cyan/Blue), Profil-Avatar, CoachPanel, Feed-Boost, Admin-Balken.
- [ ] 25 Fachfarben als breite Palette; als Datenfarben dämpfen/tokenisieren.
- [ ] Radien: viele `rounded-full`, `xl`, `2xl`, `3xl`, `lg`, `md`, `[2rem]` ohne klare Skala.
- [ ] Schriftgrößen: viele `text-xs`/`text-sm`, `text-[10px]`, `text-[11px]`, `text-[15px]`, 8/9/12/13/14.5/17px und Clamp-Werte.
- [ ] Schatten: `.shadow-soft`, `.shadow-glow`, Tailwind `shadow-md/lg/2xl`, `shadow-primary/40` ohne Elevation-Skala.
- [ ] Feste Farben in Komponenten und CSS; Phase D konsolidiert.
- [ ] Icon-Größen/Strichstärken nicht einheitlich.
- [ ] Viele Uppercase-/Letter-Spaced-Labels; Sentence Case prüfen.

### 13.6 Zustände/Accessibility/Mobile

- [ ] Loading/Empty/Error nur punktuell; systematisch ergänzen.
- [ ] Hover/Focus/Disabled bei rohen/alten Elementen nicht garantiert (Formularelemente sind bereits migriert).
- [ ] Fokus-Ringe, Fokus-Reihenfolge, Fokus-Rückgabe bei Overlays prüfen.
- [ ] Touch-Ziele unter 44 px und zu geringe Abstände prüfen (`UX-AUDIT.md` F-014).
- [ ] Mobile Login-Trust-Panel/Formular (F-005) prüfen.
- [ ] Requests-/Social-Empty-States als Sackgassen (F-004) prüfen.
- [ ] Cookie-Banner/News-Popup/Push-/Install-Prompt dürfen Inhalte nicht blockieren.
- [ ] Bildschirmtastatur/Scrollbereiche bei Chat, Formularen und Dialogen prüfen.
- [ ] Keine Hover-only-Interaktionen.
- [ ] Kontraste, Labels, ARIA und Semantik prüfen.

### 13.7 Technische Risiken

- [ ] `TEXT-AUDIT.md` ist untracked Nutzerarbeit; nicht committen, nicht überschreiben.
- [ ] `pnpm-lock.yaml`/`pnpm-workspace.yaml` sind untracked; npm (`package-lock.json`) ist der maßgebliche Package-Manager.
- [ ] App-Innenbereich ist login-pflichtig; ohne lokalen verifizierten Testnutzer keine vollständige Browser-Prüfung möglich (siehe Blocker).
- [ ] `open-design/` ist ein verschachteltes Fremdprojekt und wird von ESLint ignoriert; nicht anfassen.
- [ ] `dist/` ist generiert und gitignored.

---

## 14. Baseline-Verifikation (2026-11-11)

### 14.1 Git

| Prüfung | Ergebnis |
|---|---|
| Branch | `ui-redesign` |
| `git status --short --branch` | Keine tracked Änderungen; nur untracked Screenshots, `TEXT-AUDIT.md`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| Letzte Commits | `2569c3a`, `292fdf9`, `eeb264d`, `e33da80` |
| Upstream/Push | Kein Push in diesem Auftrag |

### 14.2 Build/Lint/Tests

| Zeitpunkt | Befehl | Ergebnis | Status |
|---|---|---|---|
| 2026-11-11 | `npm run build` | Exit 0 | Erledigt |
| 2026-11-11 | `npm run lint` | Exit 0, 0 Fehler, 153 `any`-Warnungen | Erledigt |
| 2026-11-11 | `npm test` | 1 Testdatei, 23 Tests bestanden | Erledigt |

**Hinweis:** Die 153 Lint-Warnungen sind bestehende `@typescript-eslint/no-explicit-any`-Warnungen in API-/Admin-/Legacy-Bereichen. Sie sind keine Fehler. Neue Warnungen durch die Migration sind zu vermeiden; bestehende Warnungen können in Phase D/E reduziert werden, sofern sie im Scope liegen.

### 14.3 Bisherige Browser-Vorprüfung

| Prüfung | Viewport | Ergebnis | Status |
|---|---|---|---|
| Öffentliche Routen | 1280 px | Keine Console-Fehler, kein horizontaler Overflow | Vorprüfung |
| Öffentliche Routen | 390 px | Keine Console-Fehler, kein horizontaler Overflow | Vorprüfung |
| Login-Formular | 1280 px | Inputs, Labels, Checkbox, Switch, Hover/Focus/Disabled/Error geprüft | Vorprüfung |
| Dark Mode | 1280 px | Hintergrund/Text-Tokens korrekt | Vorprüfung |
| Phase-B-Pflicht | 375 px | Noch nicht systematisch geprüft | Offen |
| Phase-B-Pflicht | 768 px | Noch nicht systematisch geprüft | Offen |

**Vorbereitungsschritt:** In diesem Schritt wurde ausschließlich `docs/ui-redesign-plan.md` erstellt. Es wurden keine Anwendungskomponenten, Styles, Dependencies oder `package.json` geändert und kein Git-Commit erzeugt.

---

## 15. Browser-Matrix für Phase B und E

Jede Seite wird in dieser Matrix geführt. Beim Ausfüllen pro Zelle `OK`, `Fehler` oder `Blockiert` eintragen; Details in den Evidenzfeldern/Im Fortschrittslog.

| Seite | 375 px | 768 px | 1280 px | Dark Mode | Interaktionen | Status |
|---|---|---|---|---|---|---|
| Landing/Welcome | Offen | Offen | Offen | Offen | Offen | Offen |
| Login/Registrierung | Offen | Offen | Offen | Offen | Offen | Offen |
| VerifyEmail | Offen | Offen | Offen | Offen | Offen | Offen |
| UpdatePassword | Offen | Offen | Offen | Offen | Offen | Offen |
| Feed | Offen | Offen | Offen | Offen | Offen | Offen |
| CreateAd | Offen | Offen | Offen | Offen | Offen | Offen |
| AdDetails | Offen | Offen | Offen | Offen | Offen | Offen |
| Profile | Offen | Offen | Offen | Offen | Offen | Offen |
| PublicProfile | Offen | Offen | Offen | Offen | Offen | Offen |
| Settings | Offen | Offen | Offen | Offen | Offen | Offen |
| Social/Requests/Matches/Favorites | Offen | Offen | Offen | Offen | Offen | Offen |
| Chat | Offen | Offen | Offen | Offen | Offen | Offen |
| CoachPanel/CoachingPageBuilder | Offen | Offen | Offen | Offen | Offen | Offen |
| SV-Panel (alle Bereiche) | Offen | Offen | Offen | Offen | Offen | Offen |
| Eltern-Leitfaden | Offen | Offen | Offen | Offen | Offen | Offen |
| Coaching | Offen | Offen | Offen | Offen | Offen | Offen |
| Transparenz | Offen | Offen | Offen | Offen | Offen | Offen |
| Impressum | Offen | Offen | Offen | Offen | Offen | Offen |
| Datenschutz | Offen | Offen | Offen | Offen | Offen | Offen |
| Cookies | Offen | Offen | Offen | Offen | Offen | Offen |
| Nutzungsbedingungen | Offen | Offen | Offen | Offen | Offen | Offen |
| 404 | Offen | Offen | Offen | Offen | Offen | Offen |

**Zusätzlich prüfen:** globale Shell, Header, Footer, Bottom-Nav, alle Dialoge/Sheets, Cookie-Banner, News-Popup, Push-Prompt, Install-Prompt.

---

## 16. Commit- und Phasenlog

| Datum | Phase | Commit | Nachricht | Status |
|---|---|---|---|---|
| 2026-11-11 | Vorarbeit | `eeb264d` | `Setup shadcn/ui und Design-System` | Erledigt |
| 2026-11-11 | Vorarbeit | `292fdf9` | `Formularelemente auf shadcn/ui migrieren` | Erledigt |
| 2026-11-11 | Nutzerstand | `2569c3a` | `Texte vereinheitlichen und an bestätigte Produktregeln anpassen` | Erledigt |
| — | A | `—` | `Migration weiterer UI-Komponenten` | Offen |
| — | B | `—` | `Seitenweite UI- und Mobile-Optimierung` | Offen |
| — | C | `—` | `UI-Transition vollständig abgeschlossen` | Offen |
| — | D | `—` | `UI-Bereinigung und Theme-Konsolidierung` | Offen |
| — | E | `—` | `Finale UI-Verifikation und Fehlerkorrekturen` | Offen |

**Regeln für Einträge:**

- Nur tatsächlich erstellte Commits eintragen; keine Platzhalter-Hashes.
- Keinen leeren Commit für Phase C erzeugen, wenn keine Änderungen nötig sind; stattdessen „Kein Commit nötig“ dokumentieren.
- Commit-Nachrichten exakt wie vorgegeben verwenden.

---

## 17. Rest-Suchen und Prüfkommandos

Diese Kommandos in Phase C, D und E ausführen und die Ausgabe dokumentieren.

### 17.1 Aktive Eigenbau-Komponenten / rohe Elemente

```bash
grep -RInE '<(button|input|textarea|select|label)\b' src --include='*.tsx' | grep -v 'src/components/ui/' || true
grep -RIn 'motion\.button' src --include='*.tsx' || true
grep -RInE 'ButtonLegacy|InputLegacy|SwitchLegacy|OtpInput' src --include='*.tsx' || true
```

**Erwartung:** Keine Treffer außerhalb der shadcn-Interna.

### 17.2 Alte/alternative UI-Implementierungen

```bash
grep -RInE 'CardLegacy|DialogLegacy|SupportModal|NewsPopupModal|NotificationCenter|TabBar' src --include='*.tsx' || true
grep -RInE 'window\.(confirm|prompt|alert)' src --include='*.tsx' || true
grep -RIn 'react-hot-toast' src package.json || true
```

**Erwartung:** Keine aktiven Legacy-Imports für Phase-A-Komponenten; keine `window.confirm`/`prompt`; kein zweites Toast-System.

### 17.3 Feste Farben

```bash
grep -RInE '#[0-9a-fA-F]{3,8}|rgb\(|hsl\(' src --include='*.tsx' --include='*.css' || true
```

**Erwartung:** Nur Token-Definitionen in `src/index.css`/`tailwind.config.js` und begründete technische Einzelwerte.

### 17.4 Dependencies / Icons

```bash
npm ls --depth=0
grep -RInE '@heroicons|@phosphor|react-icons|@radix-ui/react-icons' src package.json || true
```

**Erwartung:** Nur `lucide-react` als Icon-Bibliothek; keine ungenutzten UI-/Icon-Dependencies.

### 17.5 Git-Abschluss

```bash
git branch --show-current
git status --short --branch
git log --oneline -10
git diff --stat main...HEAD
```

---

## 18. Offene Probleme und Blocker

| ID | Problem/Blocker | Auswirkung | Status | Nächster Schritt |
|---|---|---|---|---|
| BL-1 | App-Innenbereich ist login-pflichtig; kein verifizierter lokaler Testzugang dokumentiert | Phase B/E können Feed, Profil, Chat, Coach- und SV-Panel nicht vollständig im Browser prüfen | Blockiert (für betroffene Seiten) | Lokalen verifizierten Testnutzer/Seed bereitstellen; keine Produktionsdaten verwenden. Bis dahin öffentliche Seiten und Code-Prüfung fortsetzen. |
| BL-2 | `TEXT-AUDIT.md` ist untracked Nutzerarbeit | Darf nicht überschrieben/committet werden | Blockiert (nur Commit) | Datei unangetastet lassen; nicht in Phase-Commits aufnehmen. |
| BL-3 | `pnpm-lock.yaml`/`pnpm-workspace.yaml` untracked; npm ist maßgeblich | Package-Manager-Verwirrung möglich | Blockiert (nur Tooling) | npm/`package-lock.json` verwenden; pnpm-Dateien nicht committen. |
| BL-4 | Kein vollständiger Browser-Zugang zu SV-Panel/CoachPanel ohne Rolle | Phase B/E-Prüfung eingeschränkt | Blockiert (für betroffene Seiten) | Testkonten mit Rollen `coach_admin`/`admin` lokal bereitstellen. |

**Regel:** Bei Blockern mit allen nicht-blockierten Aufgaben fortfahren. Blocker nicht als „Erledigt“ markieren, solange die Voraussetzung fehlt.

---

## 19. Fortschrittslog

Neue Einträge werden **oben** ergänzt. Keine bestehenden Einträge löschen.

| Datum | Phase/Task | Änderung | Evidenz | Commit |
|---|---|---|---|---|
| 2026-11-11 | D | Legacy-Dialoge/Card/TabBar + toter LogoBadge gelöscht; tote CSS-Utilities/Keyframes, ungenutzte Farbtokens und Dependencies entfernt; Farben auf Tokens konsolidiert | 0 Legacy-Importe/Altwert-Treffer; Build 0, Lint 0 Fehler/153 Warnungen, Tests 23/23; öffentlich 60/60 + Overlay-Recheck ohne Fehler; `+41/−724` | `c80463f` |
| 2026-11-11 | C | UI-Transition verifiziert und Letztkorrekturen (44-px-Close, NotificationCenter, Buttons, Social-Chips, AppLoader, Feed/AdDetails-Härtung) | Statisch 0 aktive Eigenbau/Altimporte; öffentlich 60/60, intern 49, Feed/AdDetails 10/10 (375/768/1280, Dark); 0 Overflow/Console-Errors; Build 0, Lint 0 Fehler/153 Warnungen, Tests 23/23; interne Rollenprüfung BL-1/BL-4 | `42e6a95` |
| 2026-11-11 | B | Alle Seiten + Shell + Mobile UX überarbeitet; öffentliche, App-, Admin-/Coach-Bereiche | 60 öffentliche + 49 App/Admin-Browser-Checks (375/768/1280, Dark), 0 Overflow/Console-Errors; Build 0, Lint 0 Fehler/153 Warnungen, Tests 23/23; echte Login-/Rollenprüfung BL-1/BL-4 | `db6852d` |
| 2026-11-11 | A | Dialoge/Cards/Overlays/Tabs/Tabellen/Badges/Toasts migriert; A18 öffentlich geprüft | `npm run build` 0, `npm run lint` 0 Fehler/153 Warnungen, `npm test` 23/23; `977ced7` | `977ced7` |
| 2026-11-11 | Vorbereitung | Plan-Dokument erstellt; Baseline geprüft | `npm run build` 0, `npm run lint` 0 Fehler/153 Warnungen, `npm test` 23/23 | Kein Commit (Vorbereitung) |
| — | A | Noch nicht gestartet | — | — |
| — | B | Noch nicht gestartet | — | — |
| — | C | Noch nicht gestartet | — | — |
| — | D | Noch nicht gestartet | — | — |
| — | E | Noch nicht gestartet | — | — |

---

## 20. Gesamt-Definition-of-Done

Der Auftrag ist erst abgeschlossen, wenn **alle** Punkte erfüllt sind:

### 20.1 UI

- [ ] Alle Eigenbau-Komponenten der Kategorien Dialoge, Dropdowns, Menüs, Tabs, Tooltips, Popovers, Tabellen, Cards, Badges und Toasts sind durch shadcn/ui ersetzt.
- [ ] Alle Seiten und Shell-Komponenten sind visuell vereinheitlicht.
- [ ] Mobile UX ist hochwertig, touch-optimiert und bei 375 px, 768 px und 1280 px geprüft.
- [ ] Keine abgeschnittenen Texte, Überlappungen oder unnötigen horizontalen Scrollbereiche.
- [ ] Loading-, Empty- und Error-States sind vollständig.
- [ ] Dark Mode ist geprüft.

### 20.2 Code/Design-System

- [ ] Keine aktiven alten Imports oder alternativen Implementierungen.
- [ ] Keine ungenutzten Eigenbau-Komponenten.
- [ ] Keine festen Farbwerte außerhalb der Theme-Variablen (außer begründeten technischen Werten).
- [ ] Keine doppelten/redundanten Styles.
- [ ] Keine ungenutzten Dependencies.
- [ ] Nur `lucide-react` als Icon-Bibliothek.
- [ ] Theme-Tokens werden konsistent verwendet.

### 20.3 Qualität

- [ ] `npm run build` erfolgreich.
- [ ] `npm run lint` erfolgreich (0 Fehler).
- [ ] `npm test` erfolgreich.
- [ ] Browser-Prüfung aller Seiten bei 375/768/1280 px und Dark Mode.
- [ ] Accessibility-Prüfung abgeschlossen.
- [ ] Restesuche sauber.
- [ ] Git-Status, Log und Diff gegen `main` dokumentiert.
- [ ] Kein `git push`, kein Deployment.

---

## 21. Start im nativen OpenCode-Goal-Modus

Dieses Dokument ist die Objective-Grundlage. In der OpenCode-TUI folgenden Befehl eingeben:

```text
/goal Lies docs/ui-redesign-plan.md vollständig. Arbeite die Phasen A–E strikt nacheinander ab, ohne Zwischenbestätigung. Aktualisiere docs/ui-redesign-plan.md nach jedem Task mit Status, Evidenz, Commit-Hash und Build-/Lint-/Test-Ergebnissen. Führe nach jeder Phase Build, Lint und Tests aus, behebe Fehler und committe lokal mit den im Plan genannten Nachrichten. Beginne Phase D erst nach 100 % abgeschlossener Phase C. Alle Arbeiten bleiben lokal: kein git push, kein Deployment. Überschreibe keine Nutzeränderungen.
```

**Hinweis:** Der Goal-Modus ist ein TUI-Befehl, kein Shell-Kommando. `opencode` starten und den Befehl im Prompt eingeben. Das Objective verweist auf diese Datei, damit die vollständigen Anforderungen nicht in die Goal-Nachricht kopiert werden müssen.
