---
target: landing + coaching/parents sites
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-22T15-03-23Z
slug: src-pages-landing-tsx
---
Method: dual-agent (A: ses_f365ec145ffeqccS1S8PeyA7b5 · B: ses_f365ec139ffeTPVuHIJyZdznc2)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Live-stats loading/error/0 all render identical "—", silent API fail |
| 2 | Match System / Real World | 3 | Strong Schulhof language; deductions for "Wege", "06 MODULE", "Specs" jargon |
| 3 | User Control and Freedom | 2 | goSection navigate+150ms timeout no cancel/focus-move; carousel hijacks scroll |
| 4 | Consistency and Standards | 1 | Verifikation ohne Code (Landing/Coaching) vs mit Code (ParentGuide); dual "Jetzt loslegen" |
| 5 | Error Prevention | 2 | Missing /mockups PNGs ship as feature; mailto with no confirm |
| 6 | Recognition Rather Than Recall | 2 | Must memorize SV-Raum sentence; 25-Fach ticker with no filter link |
| 7 | Flexibility and Efficiency | 2 | No deep-linkable anchors, no skip to #sicher/#eltern for returners |
| 8 | Aesthetic and Minimalist Design | 3 | Tight poster world; 10-section page + empty Kennzahlen grid after filter removal |
| 9 | Error Recovery | 1 | statsFailed silent, mockup onError loops to dev-path card with no action |
| 10 | Help and Documentation | 3 | Eltern-Leitfaden + TL;DR boxes solid; hero trust chips non-clickable |
| **Total** | | **21/40** | **Acceptable (52.5%)** |

## Design Specificity Verdict

**LLM assessment:** Landing shell is authored for FWG — black board + paper alternation, Anton uppercase, tape/pins/grain, 25-Fach ticker from SUBJECT_CATEGORIES, DEMO-stamped tickets. Cannot be mistaken for SaaS. But Coaching, ParentGuide, Datenschutz, Nutzung collapse into identical white rounded-3xl card stacks any school could use; ParentDashboard breaks world entirely with blue-indigo gradient (violates DESIGN.md no-gradient). Brett section leaks dev path "Screenshot ablegen unter: public/mockups/..." — Plakatwand with empty frames. Tone split Du/Sie has no visual code-switch.

**Deterministic scan:** `detect.mjs --json` on 4 targets = 0 findings (exit 0), verified per-file and with --no-config/--no-design-system. Full-tree `src/` = 23 findings, NONE in targets (App.tsx 1, Layout.tsx 1, index.css 3, Feed.tsx 4, Impressum.tsx 2, AdminAnalytics 3, AdminNews 1, AdminOverview 1, AdminReports 4, AdminUsers 2, CoachPanel 1; rules: gray-on-color x14, ai-color-palette x5, bounce-easing x1, side-tab x1, overused-font x1, codex-grid-background advisory x1). Detector agrees targets are mechanically clean — issues are IA/copy/trust-level, which the detector cannot see. No false positives to dismiss (zero findings on targets).

**Visual overlays:** No live injection performed in this run (cheap read-only checks only; dev :5173 + previews :4174/:4175 responsive but no DOM pass). No user-visible overlay exists. Fallback signal is static evidence below + missing-asset proof.

**Static evidence:** h1 x1 Landing + h2 x7 sequential; Coaching/ParentGuide h1 via StaticLayout wrapper; aria-live x0 on all three; Landing role=switch x1 native button; ticker 32s linear + reduced-motion kill-switch + ticker-specific off; focus-visible yellow override; CTAs h-14 (good) vs header CTA h-8 (32px) vs dots h-2.5 (10px); public/mockups/ contains ONLY README.md — all 3 PNGs missing, IPhoneFrame fallback renders dev path as UI copy.

## Overall Impression

Poster world is real and likable on the landing — then it betrays trust at the highest-intent moment (empty phones), contradicts itself on verification (code vs no-code), and dissolves into generic SaaS on every subpage. Biggest opportunity: make Brett provable (coded UI mock, not empty frames) and make verification single-source.

## What's Working

1. **Ehrlichkeit operationalized:** Dual DEMO stamps, live-only stats with "—" fallback, Coaching FALLBACK + parse try/catch, Richtwert pricing. Serves Product Principle 1 directly.
2. **HashRouter-safe navigation done right:** goSection preventDefault + scrollIntoView + 150ms post-navigate, skip-buttons not anchors, TOC buttons on legal pages. Real 404 class fixed without breaking reduced-motion.
3. **Privacy as interaction:** Two working role=switch toggles demonstrating REVEAL + adjacent 3-step SV-Raum strip with exact wörtliche Rede; mono tabular-nums for times/rooms/prices speaks Vertretungsplan.

## Priority Issues

**[P1] Brett shows missing build, kills conversion**
What: #brett promises "So sieht's in der App aus", renders 3x identical "Noch kein Screenshot da. Screenshot ablegen unter: public/mockups/...".
Why it matters: Highest intent section before CTA; placeholder = proof product isn't ready; dev path leaked to Schüler.
Fix: Until PNGs exist, replace IPhoneFrame img with coded UI mock (static Feed/Chat/Profil JSX, Fachfarben + verifiziert Badge). Delete file-path from UI.
Suggested command: /impeccable polish

**[P1] Verifikation widerspricht sich, zerstört Eltern-Vertrauen**
What: Landing/Coaching/Nutzung = ohne Code; ParentGuide = per Schülerausweis oder SV-Code + SV-Einladungscode / 6-stelligen Code.
Why it matters: Trust moment for Minderjährige; Code on one page, No-Code on next reads as lie; SV-Moderation unglaubwürdig.
Fix: Single-source VERIFY_STEPS component everywhere; decide one truth (Nachtrag: ohne Codes) and purge or scope codes explicitly.
Suggested command: /impeccable clarify

**[P2] Suchen vs Bieten ununterscheidbar**
What: Wege "Ich suche / Ich biete" both CTA "Jetzt loslegen" to same ziel.
Why it matters: Violates Principle 2 (zwei Jobs); 5.Klasse klickt blind.
Fix: Distinct labels "Anzeigen stöbern / Anzeige erstellen" + intent deep-link (?intent=suchen/bieten).
Suggested command: /impeccable clarify

**[P2] Header CTA + Dots fail touch, IA label "Wege" leer**
What: Desktop CTA h-8 (32px), dots h-2.5 (10px), nav "Wege" meaningless to 5.Klässler.
Why it matters: PWA mobile-first + A11y große Targets; Casey can't hit, Jordan doesn't know Wege.
Fix: Header CTA h-11, dots 44px hit area with inner visual, rename Wege → "Suchen & Anbieten" / "So geht's".
Suggested command: /impeccable adapt

**[P2] Subpages lose poster world + dark-mode split**
What: StaticLayout white cards on all trust pages; Landing forced dark, subpages dual; ParentDashboard gradient violates no-gradient.
Why it matters: After click user leaves Abi-Plakat, lands in SaaS — coherence break, elternsicher wirkt generisch.
Fix: Extend poster-grain-dark + yellow stripe + black spec cards to legal headers; remove Dashboard gradient → bg-black text-primary.
Suggested command: /impeccable layout

## Persona Red Flags

**Jordan (11, 5.Klasse, first-timer):** H1 outline line reads as decoration; "Wege" nav unknown; Wege bullets "Filter für Fach & Klasse / Direkter Kontakt in der App" assumes app knowledge; must memorize SV-Raum sentence with no copy button; 25-Fach ticker wall overwhelm; "DSGVO aus DE" chip adds fear at 11.

**Casey (16, distracted mobile, thumb, sun):** Header CTA h-8 unhittable on bus; hamburger w-9 borderline; Brett snap carousel no peek hint + dots unhittable + scrollIntoView fights swipe; mockup mono path unreadable in sun; Datenschutz TOC smooth ignores reduced-motion (Nutzung respects — inconsistent); skip-button scrolls but doesn't focus #inhalt, TalkBack lost.

**Riley (stress tester):** Live-stats "—" identical for loading/0/error reads as broken; IPhoneFrame opacity-0 img + alt="" confusion; COACH_MAIL harvestable mailto with no disclosure; code/no-code contradiction screenshot-able; Coaching aufklappbar only first open vs Nutzung auto-open inconsistent; ticker SR verbose trap (25 subjects, no list semantics).

**Frau Demir (besorgte Mutter, 42, Android):** Eltern-Leitfaden secondary equal to Jetzt-loslegen, trust chips non-clickable no link to #sicher; Treffen-Regel vague (Bibliothek/Mensa) vs Coaching strict rule — which binds?; price + Taschengeld §110 + "SV vermittelt nur Kontakt" scattered, no cost summary; Eltern-CTA → same /login with no role preselect + circular Code requirement (needs child account first, unexplained); info@ 5x with no SLA; Hosting/DSGVO proof buried in tiny footer mono.

## Minor Observations

- Kennzahlen dl order-2/order-1 flips dt/dd visually vs DOM — SR reads label after value.
- poster-outline on "Direkt am FWG." may fail WCAG 1.4.3; add solid fallback.
- Fach badge hardcoded #D62728 not from tailwind Fach-Tokens — drift.
- Brand subline text-[10px] gray-400 fails readability, truncates mobile.
- StaticLayout eyebrow black pill on gray-50 harsh.
- Coaching linkify only fwg-koeln.de, email in FALLBACK body plain text.
- Coaching NUTZEN/SCHRITTE hard-coded, not CMS-editable though builder implies editing.
- Datenschutz Section missing poster styling vs Coaching/ParentGuide — legal pages second-class.
- ParentDashboard "Du musst als Elternteil..." Du-form vs ParentGuide Sie — tone break.
- DESIGN.md still documents removed Demo-Filter behavior — stale spec.

## Questions to Consider

- Wenn SV-Verifizierung euer unkopierbares Asset ist, warum ist sie ein nicht-klickbarer Chip statt sticky Proof mit SV-Raum-Foto/Zeit?
- Wo ist der Ausschluss-Beweis "Nur FWG" vor Dateneingabe, nicht erst in §2?
- Was passiert wenn Frau Balistreri krank / H310 belegt — fällt Vertrauen auf eine mailto an Klarnamen zurück?
- Wie unterscheidet ein Erstbesucher "ehrlich leer" (—) von "kaputt" — und warum sollte er dann Kontaktdaten anvertrauen?
