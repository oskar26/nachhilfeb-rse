# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primäre Nutzer: Schüler:innen der Klassen 5–13 des Friedrich-Wilhelm-Gymnasiums Köln. Zwei Rollen in einer Person möglich: Suchende (v.a. Klassen 5–7, Klausurvorbereitung) und Bietende (v.a. Oberstufe ab Klasse 8, inkl. Schüler-Coaching AG). Sekundär: Eltern (Kontrolle, Anzeigen für Kinder, Vertrauen/Sicherheit), SV (Verifikation, Moderation, Codes). Alle Gruppen sollen sich auf der Welcome-Seite wiederfinden; wichtigste Aktion: Registrieren / Login → zur Plattform.

## Product Purpose

Schulinterne Nachhilfebörse des FWG Köln (PWA, mobile-first, Light+Dark): Nachhilfe suchen und anbieten, direkt unter Schülern, ohne externe kommerzielle Plattform. Erfolg = Matches (Anfrage → Termin → Lernfortschritt), verifizierte Accounts, aktive Anbieter, Vertrauen bei Eltern.

## Positioning

Exklusiv für das FWG, von der SV moderiert und verifiziert (SV-Code / Vor-Ort-Verifikation im SV-Raum). Kein anonymer Marktplatz: echte Mitschüler, Coaching-AG mit Badge, Privatsphäre-Kontrolle, DSGVO-Hosting in Deutschland. Das kann kein Nachhilfe-Portal kopieren.

## Operating Context

Alltag: Pause, SV-Raum/Glaskasten (Verifikation, Codes/QR), Unterricht/Klausuren, Zuhause (Eltern). Flows: SV-Code oder Self-Signup → Profil-Onboarding → Anzeige erstellen (Stepper) → Feed suchen/filtern → Merkliste → Anfrage → Chat/Termin + ICS → Bewertung → Report an SV. PWA installierbar (Homescreen), Bottom-Nav mobil / Sidebar Desktop.

## Capabilities and Constraints

Bestätigt: Anzeigen (biete/suche, Fächer farbcodiert, Klassen, Ort, Format, Preis, Verfügbarkeit, Bilder), Feed + Filter (Fach, Klasse, Preis-Slider, Zeit, verifiziert), Merkliste, Anfragen + Chat, Profile + Rich-Bio, Bewertungen (nur nach Kontakt), Reports + SV-Panel (Verifikation, Codes/QR/PDF, Moderation, Analytics), Eltern-Dashboard + Leitfaden, Coaching-Seite/AG, Live-Stats (Summary-Endpoint), News-Widget, Dark Mode, PWA. Constraints: keine Zahlung im MVP, Telefon/Moodle nur nach Freigabe, keine Fake-Counts (0 Reviews = keine Anzeige), Verifikation Pflicht-Hinweis. Stack vorhanden: React 19 + Vite + Tailwind + Supabase (nicht ändern). Welcome-Inhalt soll gleich bleiben (kompakter erlaubt), Unterseiten (Eltern-Leitfaden, Coaching, Rechtliches) bleiben aus Vertrauensgründen erhalten.

## Brand Commitments

Name: FWG Nachhilfebörse / Nachhilfebörse. Träger: Schülervertretung Friedrich-Wilhelm-Gymnasium Köln. Primary: Gelb #FACC15 (CTA), Sekundär-Blau, Fach-Farb-Tokens (Briefing). Logo: FWG-SVG (Logo.tsx) — bindend, darf neu inszeniert werden. User-Entscheid: mutige Neuinszenierung Gelb/Schwarz erlaubt, weg vom generischen SaaS-Look, kompakter + animiert + responsive. Ton: direkt, schülernah, seriös bei Eltern/Sicherheit.

## Evidence on Hand

Live-Stats via `api.analytics.summary()` (active_ads, users, page_views); echte Anzeigen/Profile erst nach Login. Keine erfundenen Testimonials, Preise als Richtwerte (10–15 €/45 Min Coaching) ok, keine Fake-Benchmarks. Assets: `logo.svg`, `src/components/ui/Logo.tsx`, Fach-Farben in `tailwind.config.js`, Screenshots aktuell nur CSS-Mockups (Platzhalter ok, echte Screenshots erwünscht).

## Product Principles

1. Vertrauen vor Reichweite — Verifikation und Moderation sind sichtbar, nicht Kleingedrucktes.
2. Eine Plattform, zwei Jobs — Suchen und Bieten sind gleichwertig und in einem CTA erreichbar.
3. Schülernah, elternsicher — jugendliche Energie + belegbare Sicherheit (SV, Datenschutz, Leitfäden).
4. Kompakt überzeugen, Tiefe verlinken — Welcome ist kurz, Unterseiten tragen Beweise.
5. Mobil zuerst, für alle lesbar — PWA-Tempo, große Targets, Kontraste, Dark Mode.

## Accessibility & Inclusion

Klassen 5–13 inkl. Minderjährige + Eltern: große Tap-Targets, ausreichende Kontraste (Gelb auf Schwarz statt Gelb auf Weiß für Text), Screenreader-Labels, `prefers-reduced-motion` respektieren, Tastatur-Fokus sichtbar (bestehendes Focus-System behalten).
