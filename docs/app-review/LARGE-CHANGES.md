# Große Änderungsvorschläge (Schritt 5)

Diese Eingriffe wurden **nicht** umgesetzt: Sie ändern Informationsarchitektur, Datenmodell, Vertrauenslogik oder ganze Oberflächen und brauchen eine Produktentscheidung. Jeder Vorschlag nennt Problem, Belege, Optionen und Aufwand.

---

## L-1 — Mobile App-Shell ohne Identität

**Findings:** F-021  
**Problem:** Auf 375 px zeigt die Kopfzeile nur noch Menü und Glocke. Wortmarke und App-Name fehlen auf jeder geschützten Seite; beim ersten Öffnen ist nicht erkennbar, in welcher App man ist. Gleichzeitig konkurrieren Seiten-H1, schwebende Glocke und Bottom-Nav um die obere Aufmerksamkeit.  
**Belege:** `screens/feed-375.png`, `chats-375.png`, `settings-375.png`; Header-Komponente `src/components/Layout.tsx` (mobiler Kopf, `MobileQuickMenu`).  
**Vorschlag:** Eine ruhige mobile Kopfzeile, die Kontext und Marke verbindet: Wortmarke klein links, Seitenkontext als H1 darunter, Glocke rechts.  
**Optionen:**
1. **Markenzeile zurückholen** (Logo 20 px + „Nachhilfebörse“ 13 px, darunter H1). Ruhig, sofort verständlich; kostet 36 px Höhe.
2. **Kontextzeile statt Marke**: Breadcrumb-artiger Titel („Entdecken“) in der Pille, Marke nur auf `/welcome`. Kompakter; Marke bleibt auf dem Homescreen.
3. **Status-quo plus Onboarding-Hinweis** (einmalige Tour). Kein Layout-Risiko, löst das Wiedererkennen nur teilweise.

**Empfehlung:** Option 1, weil Eltern und jüngere Schüler:innen die Marke als Vertrauensanker brauchen.  
**Auswirkung:** Alle geschützten Seiten; ein Header, keine Datenänderung.  
**Aufwand:** S–M · `src/components/Layout.tsx`, `MobileQuickMenu.tsx`.  
**Risiken:** Höhe reduziert Inhaltsfläche; mit Safe-Area und Scroll-Offset abstimmen.  
**Priorität:** hoch.  
**Generate-Zeile:** `/impeccable generate 3 mobile header variants for the protected app shell`

---

## L-2 — Verifizierung als sichtbares Vertrauensmerkmal

**Findings:** F-022  
**Problem:** Auf Anzeigenkarten und in der Anzeige ist nicht mehr erkennbar, ob die anbietende Person verifiziert ist. Die Verifizierung ist das zentrale Versprechen der Plattform („Vertrauen vor Reichweite“), taucht aber nur im Profil auf.  
**Belege:** `screens/feed-375.png`, `screens/ad-details-375.png` (kein Badge); `src/pages/Feed.tsx`, `src/pages/AdDetails.tsx`; `VerifiedPill` existiert nur in Profil-Kontexten.  
**Vorschlag:** Ein einheitliches, ruhiges Vertrauensmerkmal direkt an der Person: kleines Häkchen-Symbol hinter dem Namen (mit `aria-label` „verifiziert“) statt einer weiteren Pille.  
**Optionen:**
1. **Häkchen hinter dem Namen** (16 px,`text-pastel-mint-foreground`), Tooltip/Screenreader-Text. Minimaler Platzbedarf, überall gleich.
2. **Pille „Verifiziert“** wie im Profil. Sichtbarer, aber visuell lauter und auf Karten platzraubend.
3. **Nur in der Anzeige und im Profil**, nicht auf Karten. Weniger Rauschen, aber die Karte bleibt blind.

**Empfehlung:** Option 1, zusätzlich in der Anzeige unter dem Namen.  
**Auswirkung:** Karten in Feed, Social, Merkliste, Anzeige, Chat-Kopf. Keine Datenänderung (`profiles.is_verified` existiert).  
**Aufwand:** S · `Feed.tsx`, `Favorites.tsx`, `AdDetails.tsx`, evtl. gemeinsame `PersonBadge`-Komponente.  
**Risiken:** Doppelung mit Coach-Pille; nur eine Zusatzinformation pro Name zeigen.  
**Priorität:** hoch (Vertrauen, Eltern).  
**Generate-Zeile:** `/impeccable generate 3 variants of a verified marker next to a person's name on an ad card`

---

## L-3 — Social-Hub: vier Tabs, zwei Navigationsebenen

**Findings:** F-023  
**Problem:** „Social“, „Anfragen“, „Vorschläge“ und „Merkliste“ sind vier Routen mit derselben Hülle und Tabs, die auf 375 px in zwei Reihen brechen; zusätzlich existieren globale Sidebar-Einträge und Bottom-Nav. Nutzer:innen müssen zwei Filtersysteme verstehen (Tabs + Typ-Pills).  
**Belege:** `screens/social-375.png`, `screens/favorites-375.png`; `src/pages/Social.tsx`.  
**Vorschlag:** Social als echte Übersicht mit drei gleichrangigen Abschnitten und Sprungmarken; die separaten Routen bleiben als Deep-Links, zeigen aber keinen eigenen Tab-Satz.  
**Optionen:**
1. **Eine Seite, drei Abschnitte** (Anfragen, Vorschläge, Merkliste) mit Sprungleiste und Zählern. Weniger Ebenen, mehr Scrollen.
2. **Tabs behalten, Typ-Pills entfernen.** Klarere Ordnung, aber Suche/Filter fehlen weiter.
3. **Zwei Ebenen beibehalten, Tabs horizontal scrollen.** Kleinster Eingriff, löst nur das Umbruchproblem.

**Empfehlung:** Option 1, wenn Analytics zeigt, dass die Tabs selten gewechselt werden; sonst Option 3 kurzfristig.  
**Auswirkung:** Navigation und eine Seite; Routen bleiben.  
**Aufwand:** M–L · `Social.tsx`, `stream.ts`, `SocialFilterPills`.  
**Risiken:** Scrolltiefe, Verlust der klaren Trennung; mit Schüler:innen testen.  
**Priorität:** mittel.  
**Generate-Zeile:** `/impeccable generate 3 layout variants for a social inbox with requests, matches and watchlist`

---

## L-4 — Chat als eigenes visuelles System

**Findings:** F-015 (teilweise umgesetzt), F-024  
**Problem:** Der Chat nutzt eine eigene Beige-/Doodle-Welt (#faf7ee, olive Doodles) und weicht damit vom Rest der App ab. Das war als „Schulheft“ gedacht, liest sich aber als anderes Produkt und widerspricht der Palette (kein Beige/Olive). Zusätzlich ist der Chat auf Desktop sehr breit, während die Liste (`/chats`) schmal bleibt.  
**Belege:** `src/components/chat/chat-theme.module.css`, `screens/chat-375.png`, `screens/chats-375.png`.  
**Vorschlag:** Den Chat auf die Design-Tokens stellen (Fläche `--background`, Karten `--card`, Gelb nur für eigene Blasen) und die Doodle-Ebene optional als sehr leise Textur behalten.  
**Optionen:**
1. **Tokens pur:** keine Textur, klare Flächen. Ruhig, systematisch, weniger eigenständig.
2. **Textur in Grau/Gelb:** Doodles bleiben, aber in `--foreground/5`; Wiedererkennung bleibt, Palette stimmt.
3. **Thema ganz entfernen.** Größter Eingriff, kein Chat-Charakter.

**Empfehlung:** Option 2 (der Beige-/Olive-Teil ist bereits ersetzt).  
**Auswirkung:** Chat und Chatliste.  
**Aufwand:** S–M · `chat-theme.module.css`, `Chat.tsx`, `Chats.tsx`.  
**Risiken:** Lesbarkeit der Blasen über Textur; Kontrast erneut prüfen.  
**Priorität:** mittel.  
**Generate-Zeile:** `/impeccable generate 3 chat surface variants within the FWG palette`

---

## L-5 — Coaching-Panel und SV-Bereich auf dem Handy

**Findings:** F-025  
**Problem:** Beide Verwaltungsbereiche sind Desktop-Oberflächen: SV-Tabs verschwinden in einer „…“-Schublade, Tabellen und Schnellzugriffe liegen unter der schwebenden Navigation, das Coaching-Panel stapelt fünf gleichrangige Buttons. Auf dem Handy (SV-Raum, Pause) ist das langsam.  
**Belege:** `screens/sv-panel-375.png`, `screens/coach-panel-375.png`.  
**Vorschlag:** Eigene mobile Verwaltungsnavigation (Liste statt Tabs) und Karten statt Tabellen unter 768 px.  
**Optionen:**
1. **Mobile Admin-Liste** als Startseite, Details als eigene Ansicht. Klar, aber neue Routen.
2. **Tabs horizontal scrollbar + Kartenansicht** für Tabellen. Kein Routing-Eingriff.
3. **Nur Tabellen in Karten umwandeln.** Kleinster Nutzen.

**Empfehlung:** Option 2 kurzfristig, Option 1 als Zielbild.  
**Auswirkung:** SV-Bereich, Coaching-Panel; keine API-Änderung.  
**Aufwand:** M–L.  
**Risiken:** Zwei Layouts pflegen; Admin-Zeit ist knapp.  
**Priorität:** mittel.  
**Generate-Zeile:** `/impeccable generate 3 mobile layouts for an admin dashboard with tabs and tables`

---

## L-6 — Stepper „Neue Anzeige“ auf kleinen Displays

**Findings:** F-013, F-026  
**Problem:** Sechs Schrittlabels kollidieren bei 343 px Innenbreite; „Entwurf verwerfen“ steht als destruktiver Link vor dem Formular; ein „Noch offen“-Hinweis erscheint, bevor etwas eingegeben wurde.  
**Belege:** `screens/create-ad-375.png`.  
**Vorschlag:** Vertikaler Fortschritt („Schritt 2 von 6“) mit Fortschrittsbalken auf dem Handy, Diskretes Verwerfen im Überlaufmenü, Hinweis erst nach Interaktion.  
**Optionen:**
1. **Nummer + Titel statt sechs Kreise** („Schritt 2 von 6 · Fächer“). Robust, wenig Code.
2. **Horizontal scrollbarer Stepper** mit sicheren Mindestbreiten. Näher am Ist, aber Scrollen im Formular.
3. **Stepper ganz entfernen**, nur Fortschrittsbalken. Am ruhigsten, verliert Orientierung.

**Empfehlung:** Option 1.  
**Auswirkung:** nur Erstellfluss.  
**Aufwand:** S–M · `CreateAd.tsx`.  
**Risiken:** Fokus-Scrolling und Validierung müssen mitspielen.  
**Priorität:** mittel.  
**Generate-Zeile:** `/impeccable generate 3 mobile step indicators for a six-step form`
