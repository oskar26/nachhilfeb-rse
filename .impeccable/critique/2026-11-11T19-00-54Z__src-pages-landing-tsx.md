---
target: Welcome page (src/pages/Landing.tsx)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-11-11T19-00-54Z
slug: src-pages-landing-tsx
---
Method: dual-agent (A: ses_e342224c1ffe4kIjhgo9AaaDWi · B: ses_e342224c1ffdOQHBB90upuSsMR)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nav, switches and lightbox confirm state; "Keine Angabe" reads as a status failure in the first viewport |
| 2 | Match System / Real World | 4 | School vocabulary throughout: SV-Raum, Q1/Q2, Moodle-Name, 12 €/45 Min, Coaching-AG |
| 3 | User Control and Freedom | 3 | Native swipe, Esc/arrow lightbox, skip link; cookie layer offers only "Verstanden"; demo switches have no reset |
| 4 | Consistency and Standards | 3 | Visual system consistent; policy copy contradicts itself (5–6 vs 5–7, browse gating, du/Sie) |
| 5 | Error Prevention | 2 | "Anzeigen ansehen" implies browsing but lands on login; verification gate unexplained before the click |
| 6 | Recognition Rather Than Recall | 4 | Labels, icons, numbered steps, anchors and captions are strong |
| 7 | Flexibility and Efficiency | 3 | Skip link, anchors, keyboard lightbox; no back-to-top on an 11k page and no offering path in the hero |
| 8 | Aesthetic and Minimalist Design | 3 | Strong poster craft; 11 screenshots, ticker, stamps and repeated counters overload the middle |
| 9 | Error Recovery | 2 | API absence renders as "Keine Angabe"; news silently disappears; no recovery path on the page |
| 10 | Help and Documentation | 3 | Eltern-Leitfaden, Coaching, Transparenz and legal pages present; no on-page registration/verification help at the CTA |
| **Total** | | **30/40** | **Good (75%)** |

## Design Specificity Verdict

**LLM assessment:** Overall coherence is high. The paper/ink/yellow poster world is sustained from the header through the Wege tear-off strips, the subject ticker, the coaching yellow field, the parents block and the footer; the single dark island is deliberate, and dark mode preserves the language rather than becoming a second design. It does not read as generic SaaS at first glance.

The skeleton is still the standard long-form funnel: hero with two CTAs and proof chips → recommendation bar → subject ticker → stats → three audience paths → screenshot gallery → feature table → privacy → program → parents → legal footer. The hero tickets and "Drei Wege" rows feel authored; the six-module table, parent cards and eight-tile gallery are assembled blocks.

Specificity lives in the details, not the evidence. The 25-subject ticker ("Blauer Planet", "Prakt. Philo", "Wi & Gesell."), the ticket copy ("Lena K. · Q1 · SV-Raum · 12 € / 45 Min"), "Frau Balistreri", "ab Klasse 8" and the footer's full school name could only belong to a German Gymnasium. But the proof layer is generic: only DEMO tickets and screenshots of test accounts — no real listing, no face, no room. The strongest differentiators, the SV-Raum verification ritual and the Coaching-AG, are text-only; the page never shows the room, the team, or a single student. The physical Brett metaphor was replaced by a conventional screenshot carousel. There is no "Ich biete" path in the hero despite the two-jobs principle. The page is 8,179 px on desktop and 11,290 px on mobile (about 13 screens), against "kompakt überzeugen".

**Verdict:** Not a generic tutoring template — an authored school poster. But it is a product landing page about a school, not the school's noticeboard. Surface specificity passes; the proof layer fails.

**Deterministic scan:** `detect.mjs --json` on `src/pages/Landing.tsx`, `src/components/SiteHeader.tsx`, `src/components/VerifySteps.tsx` returned `[]` (exit 0). The CLI is regex-based for TSX and does not evaluate computed layout, so zero findings is not evidence of visual cleanliness.

In-browser detector (via injected `detect.js`) found 25 anti-pattern groups on desktop and 23 on mobile. Most are intentional brand system and false positives: `all-caps-body` (labels such as "EIN PRODUKT DER SCHÜLERVERTRETUNG"), `icon-tile-stack` (deliberate card pattern), `nested-cards` (no visible card-in-card), `cream-palette`, `overused-font` (Inter body, Anton display), `kicker-above-heading`, `repeating-stripes`, `codex-grid` (poster grain). Real detector hits: the mobile `text-overflow` is the collapsed recommendation strip; `marquee` without a pause control is a genuine WCAG 2.2.2 failure; `undersized-ui-text` is the 10px "Verifiziert" badge; `layout-transition` is a minor performance nit on the sticky header. Detector cannot see the privacy, copy-contradiction, or IA issues.

**Visual overlays:** Injection succeeded in the headless Chromium session (mutation preflight passed, live-server on port 8400, stopped afterwards). Console reported `[impeccable] 25 anti-patterns found` desktop / `23` mobile, with orange outlines and a banner. No overlay is visible in the user's own browser because the in-app browser is disconnected; the console counts and screenshots are the fallback signal.

## Overall Impression

The poster world is real and likable, and the page has improved sharply since the last critique (21 → 30). The gap is no longer identity; it is proof. The mobile recommendation strip is broken, the "real screenshots" publish test data and personal email addresses, and the showcase spends 2,400 px proving less than one readable screen would. The page proves craft better than it proves the product.

## What's Working

1. **The first screen does its job.** One place-based promise, one primary CTA, one parent path, four proof chips and two realistic demo tickets. The tickets are the best content on the page: Lena K., Q1, SV-Raum, 12 €/45 Min; Aylin D., "mit alten Klausuren", 12 €/60 Min; both stamped DEMO. Five-second explanation without fake testimonials.
2. **Verification is a ritual, not a badge.** The three-step SV-Raum process is jargon-free, includes the literal thing to say to the SV team, and explains why an unverified account cannot contact anyone. Paired with the Handynummer/Moodle-Name switches, it answers a parent's real question instead of showing a compliance icon.
3. **The poster world is authored end-to-end.** Anton, paper, ink, yellow, tape, perforation, ticker, mono counters and the "Drei Wege" tear-offs carry from header to footer; the mobile menu (Anton rows, 01–05, bottom CTA) extends the same language. It avoids the purple-gradient SaaS category and feels like a school's Abi poster.

## Priority Issues

**[P0] Public screenshots leak personal data and undercut the DEMO-honesty promise**
- **What:** `docs/screenshots/07-sv-panel.png`, used in the "Echte Screenshots aus der App" gallery and openable in the lightbox, shows `ossigh26@gmail.com`, `spam.von.oskar@gmail.com`, `spam.vob.oskar@gmail.com` and `oin26.email@gmail.com`, plus an ADMIN badge. `05-profil.png` shows "Oskar H.", Klasse 10, the gibberish test ad "Fdrgf hjklöv", and a verified profile. The SV panel also shows 4 users / 2 ads while the live-stat band says "Keine Angabe".
- **Why it matters:** A public page for a school with minors is publishing personal email addresses and test data presented as real. A parent who opens the lightbox sees it; a student may recognise the person. It also violates the product's own "keine Fake-Claims / DEMO" principle.
- **Fix:** Regenerate every showcase image from a purpose-built fictional dataset (`beispiel@example.org`, invented names), blur or remove names/avatars/emails, add a visible "Demo-Ansicht" stamp to each screen, and remove the SV-Panel from the public gallery until cleaned. Purge the raw PNGs containing real addresses from the build.
- **Suggested command:** `/impeccable harden`

**[P1] Mobile recommendation strip collapses into a one-word column**
- **What:** At 390 px the paragraph is 31.2 px wide and 380 px tall; the strip is 413 px tall. At 360 px the paragraph drops to about 11 px. The "EMPFEHLUNG" badge sits left and "Eltern-Leitfaden" floats right around a narrow vertical text column. The container is a single flex row with `flex-1 min-w-0` and no mobile breakpoint (`Landing.tsx:303`).
- **Why it matters:** This is the first trust moment after the hero on the primary device, and exactly where a parent is meant to be caught. It looks like a rendering accident and contradicts "mobil zuerst" and "für alle lesbar".
- **Fix:** At `<sm`, stack: badge row, then full-width paragraph, then the guide link (`flex-col items-start sm:flex-row sm:items-center`; `w-full flex-none` on the paragraph). Test 320, 360, 390 and 414 px.
- **Suggested command:** `/impeccable layout`

**[P1] The app showcase is the longest section and the weakest proof**
- **What:** 2,439 px tall on desktop. Three phones at roughly 280 px wide, an iPad at 760 px, seven desktop thumbnails at roughly 250 px — text unreadable at rest. The "groß öffnen" lightbox measures 512 px wide because `sm:max-w-lg` overrides `max-w-5xl`; the image inside is 464 px. The section includes "DAS ist ein TEST", "oder auch nicht", an empty inbox and white-looking desktop prints.
- **Why it matters:** The product's whole promise is a trustworthy, verified marketplace; the proof layer is the one place that must be legible. Instead it consumes about 30% of the desktop page and a third of the mobile journey, and the lightbox makes "groß" false. This section actively reduces trust.
- **Fix:** Reduce to two or three pieces of evidence: one large readable phone screen, one large desktop screen, 3–4 curated crops instead of seven full-page thumbnails. Drop the iPad or make it a small detail. Fix the dialog to `sm:max-w-5xl` / `max-h-[80vh]` and let the image fill it. Replace test and empty screens with curated data.
- **Suggested command:** `/impeccable shape`

**[P1] The trust story contradicts itself on the two things parents check**
- **What:** "In den Klassen 5 und 6 betreuen viele Eltern mit" (hero strip) vs "In den Klassen 5 bis 7 empfehlen wir die gemeinsame Betreuung" (Wege and parents block). "Nur verifizierte Konten können Anzeigen erstellen, Kontakt aufnehmen oder Anzeigen ansehen" (parents card) vs "Erst dann kannst du Anzeigen erstellen und Kontakt aufnehmen" (VerifySteps) — the first says browsing is gated, the second does not. The Wege block also switches from "Wähle den Weg, der zu dir passt" to "Betreuen Sie das Konto" inside the same section.
- **Why it matters:** These are the safety rules a parent uses to decide whether the platform is safe and whether their child can browse before verification. Contradictory rules read as carelessness or policy ambiguity, and the primary CTA "Anzeigen ansehen" is itself gated by the unclear rule.
- **Fix:** Write one truth table for age band and verification scope, then align the hero strip, Wege, VerifySteps, parents cards and CTA microcopy. Pick 5–7 or 5–6 everywhere. Add one line under the hero CTA: "Anmeldung nötig — Verifizierung im SV-Raum." Keep "Für Eltern" as a scoped Sie block or rewrite it in du.
- **Suggested command:** `/impeccable clarify`

**[P2] The header collides at 1024 px**
- **What:** At 1024 px the logo's right edge is 256 px and the "Start" link begins at 248 px — an 8 px overlap; the wordmark reads "FWGStart" and the active underline appears under the logo. The "Ein Produkt der Schülervertretung" subline plus "Anmelden" crowd the same row. At 1100 px it is fine. The hero headline also jumps to `lg:text-8xl` too early and wraps to four 96 px lines.
- **Why it matters:** 1024 px is iPad mini/landscape and a common tablet breakpoint in schools; the header is the trust frame, and an overlap looks broken before a word is read.
- **Fix:** Hide the subline until `xl`, add `lg:gap-6`, and either shorten the nav or keep the burger through 1024–1279. Tune the headline scale between 1024 and 1279. Test 1024, 1080 and 1180.
- **Suggested command:** `/impeccable adapt`

## Persona Red Flags

**Jordan (first-timer, Klasse 8, iPhone):** The hero promises "Anzeigen ansehen", but the tap lands on a login screen with no explanation of verification. He sees only DEMO tickets, no real listings, and a stat row that says "Keine Angabe" — he may conclude the app is empty. The broken recommendation strip appears immediately after the hero, the "Ich biete" path is two screens down, and he has no way to judge whether the marketplace has supply before registering.

**Riley (stress tester):** At 1024 px the header overlaps. The lightbox opens a desktop screenshot at 512 px, so "groß ansehen" is false. The privacy switches toggle helper text but have no account context or reset. Age band and verification gating contradict each other. "Jetzt mitmachen" goes to login, not the Coaching page. The DEMO stamp is 3.2:1 at 12 px, and the switches are 44×24 px. Positives: heading order, alt text and keyboard dismissal are sound.

**Casey (FWG parent of a Klasse 6 child, mobile):** The recommendation strip — the one element designed to catch her — is the most broken thing on the page. The parents block is roughly 11 screens down, the hero's primary CTA goes to login rather than the parent guide, the cookie banner covers the trust chips on first visit, and the showcase shows a named student and test copy. "Unter 16 Jahren brauchen wir Ihre Einwilligung" is stated without an immediate next step. "SV-Team" remains an abstraction: no faces, no names, no room, and the email is plain text rather than a `mailto:` link.

## Minor Observations

- The first-visit cookie panel is 348×231 px at y=525–756 on mobile; it overlaps the bottom 7 px of the secondary hero CTA and covers the trust badges and demo tickets. It offers only "Verstanden". Since no external providers are used, a slimmer, delayed or footer-based notice would be less intrusive.
- The infinite ticker has no pause/stop control; it pauses only on hover and with reduced motion. Keyboard and touch users have no mechanism — a real WCAG 2.2.2 failure.
- "Keine Angabe" and "Keine Angabe zu Seitenaufrufen (letzte 30 Tage)" appear in the first viewport when analytics fail. Hide the band when data is absent; page views are a vanity metric. The SV-Panel screenshot showing 4 users / 2 ads makes the empty stats look more broken, not less.
- There is no closing student CTA after the parents block; the page ends in legal links, and the mobile header has no persistent primary action. Peak-end is "compliance", not "join your school's community".
- "Jetzt mitmachen" in the Coaching section routes to login/feed rather than `/coaching`. Relabel it "Coaching-AG ansehen" or route it to the page.
- Privacy switches are 44×24 px; make the whole row a label/hit area of at least 44 px.
- The DEMO stamp on the yellow ticket is `text-primary-foreground/70` at 12 px, about 3.2:1. Use full opacity; the honesty label should not be the lowest-contrast text on the card.
- The four trust chips are static `<li>` elements but look like tappable pills. Either link them to proof or restyle them as plain facts. "Nutzung kostenlos" also reuses the BadgeCheck icon used for "SV-verifiziert", which muddles the meaning.
- The numbering motif (01–05 menu, 01–04 devices, 06 Module, 07 Ansichten) is repeated enough to become a tic rather than a system.
- The contact email `info@nachhilfe-sv.de` is plain text; make it a `mailto:` link.
- In dark mode the "dark island" inverts to a full-width cream band (`bg-foreground`), creating a 2.4k px flashbang. Decide whether the island stays dark in dark mode.
- Button focus rings composite to about 2.1:1 against paper, versus 5.9:1 for links. The ring is visible but weak; unify the focus treatment.
- No back-to-top control on an 11k mobile page; the footer is the only way to reorient.
- The "Verifiziert" badge text is 10 px; a small but real legibility cost.
- The recommendation copy is one 131-character line; it is long but low impact once the mobile layout is stacked.

## Questions to Consider

1. If you removed the word "FWG" and the yellow, which sections would still be unmistakably this school? The ticker, the tickets and the Coaching facts would survive; the Wege, the six functions and the parent cards would not.
2. The strongest trust asset is the SV-Raum ritual, but the page never shows the room or the people. What would a consent-safe photo or one-line statement from the SV team do to the parent journey — and why is the product gallery given more space than the humans who run it?
3. If the product currently has four users and two ads, is a 2,439 px screenshot tour the right persuasion strategy? Should the page instead lead with the verification/community promise and invite the first cohort, rather than showing an empty marketplace as "echt"?
