# UX Audit - FWG Nachhilfebörse

**Date:** 2026-09-23 · **Audited screens:** Landing, Login, Profile, Feed, CreateAd, AdDetails, PublicProfile, Social/Requests/Matching/Favorites, Chat, Layout chrome · **App type:** Marketplace / onboarding-heavy (school tutoring exchange; conversion = first Anfrage + first ad, no paywall)
**Funnel:** first touch (Landing) -> onboarding (Login/Profile) -> first value (Feed browse / CreateAd) -> conversion moment (Anfrage senden / Anzeige veröffentlichen) -> retention (Chat, Termin, Bewertung, Merkliste)

## Executive summary
- **24 findings: 6 P0, 9 P1, 7 P2, 2 P3**
- **Top 3 impact:** (1) AdDetails sticky CTA + safety-net line at the request button; (2) one price format + honest hourly math everywhere; (3) Requests empty states with next-step CTAs + mobile-visible trust on signup.
- **Biggest bottleneck:** `AdDetails` — the only conversion moment in the product. Price is secondary-styled and unit-inconsistent, the CTA scrolls away, the canned message has no “unverbindlich” reassurance, and duration meta contradicts itself. That screen currently asks a hard question (“What am I committing to?”) at the exact tap.

## Screen-by-screen: the question map

### Landing (`#/welcome`)
| Element | Question it asks | Verdict |
|---|---|---|
| H1 „Finde Nachhilfe.“ | „Is this for my school?“ | EASY - keep |
| Trust chips SV-verifiziert / Nur FWG / DSGVO | „Can I trust this?“ | EASY - keep |
| CTA „Jetzt loslegen“ | „Do I need an account first? / What happens?“ | Mildly hard - add free + step specificity |
| Live stats | „Is anyone actually here?“ | EASY - keep |
| Price chip (Demo 12 € / 45 Min) | „What does it cost?“ | Inconsistent with app formats |

### Login / Signup
| Element | Question it asks | Verdict |
|---|---|---|
| Tabs Anmelden / Registrieren | „Which do I need?“ | EASY - keep |
| Trust panel (desktop only) | „Is this safe / school-run?“ | **HARD on mobile** - hidden → replace |
| Long blank register form | „How much work is this?“ | HARD - need smart defaults + step framing |
| SV-Einmalcode | „Do I need a code right now?“ | HARD - ambiguity with footer text |
| Button „Registrieren & Beitreten“ | „What am I joining?“ | Medium - lighten with start language |
| Birth date | „Why my birthday?“ | Answered only for <16 |

### Profile (post-signup)
| Element | Question it asks | Verdict |
|---|---|---|
| No progress meter | „How far am I?“ | Missing - goal gradient never starts |
| Banner „Account eingeschränkt“ | „Why can't I post?“ | Hard - no CTA next to it |
| Empty bio | „What should I write?“ | Hard - no prompts |
| Bearbeiten/Speichern | „Did it work?“ | EASY - keep |

### Feed
| Element | Question it asks | Verdict |
|---|---|---|
| Card price `12€/h` | „Is this fair?“ | EASY if consistent elsewhere - **isn't** |
| Quick chips raw keys | „What does 'Franzoesisch' mean?“ | Craft fail |
| Coach/Boosted badges ×2 | „Why is this repeated?“ | Noise - hard trust question |
| Empty state + CTAs | „What do I do?“ | EASY - good pattern |

### CreateAd (6 steps)
| Element | Question it asks | Verdict |
|---|---|---|
| Schritt 1 von 6 + bar | „How much left?“ | EASY - good |
| Auto own grade | „Do I pick my class?“ | EASY - smart default |
| Price benchmark | „Is my price okay?“ | EASY-ish - numbers do work |
| Green „Jetzt veröffentlichen“ | „Is this different from the rest of the app?“ | Confusing color language |
| Footer actions not sticky | „Where is Weiter?“ | HARD - scroll friction |

### AdDetails (conversion moment)
| Element | Question it asks | Verdict |
|---|---|---|
| Price top-right `12€ / 45min` | „What's the unit? Is that fair?“ | HARD - format + placement |
| Meta „Flexibel“ next to listed durations | „Is anything true here?“ | **Contradiction - trust break** |
| CTA „Anfrage senden“ | „What happens next? Am I locked in?“ | HARD - no safety net, scrolls away |
| Canned request message | „Can I say something myself?“ | Surprise - mild hard |
| Safety box (only after accept) | „Is meeting safe?“ | Too late for pre-decision |

### PublicProfile
| Element | Question it asks | Verdict |
|---|---|---|
| Rating in stats sidebar | „Are they good?“ | HARD - not next to name (M9) |
| `12€/h` always | „What do they charge?“ | **Wrong math for 45-min ads** |
| No contact CTA | „How do I reach them?“ | HARD - extra hop |
| Double verification visuals | „Are they verified twice?“ | Noise |

### Requests / Social
| Element | Question it asks | Verdict |
|---|---|---|
| Empty inbox, no button | „Is the app dead?“ | HARD - dead end |
| Empty outbox, no button | „What now?“ | HARD - dead end |
| Akzeptieren / Ablehnen | „Which is safe?“ | EASY - keep contact-reveal model |

### Chat
| Element | Question it asks | Verdict |
|---|---|---|
| WhatsApp-green bubbles | „Is this WhatsApp?“ | Brand doubt (M4) - note only this pass |
| Termin modal defaults | „What do I pick?“ | EASY - good defaults (Fach/14:00) |

## Findings

### F-001 - AdDetails CTA not sticky, no safety net  [P0]  (Lens A M15/I2 + Lens C Test 3)
- **Screen/element:** AdDetails / `Anfrage senden` (`src/pages/AdDetails.tsx:244-246`, page `pb-24`)
- **Observed:** Full-width primary button only inside the interaction card; long descriptions push it off-screen; no line under it answering objection #1.
- **Why it fails:** Sticky bottom action area (I2) + total/trust-at-decision (Test 3: „Free cancellation…“). Users who scroll lose the conversion action; absence of a safety line leaves the hard question „What am I committing to?“ unanswered (transparency bias).
- **Question asked:** „What happens if I press this?“ (hard)
- **Fix:** Sticky bottom bar (above bottom nav) with price + CTA + trust line. Under button: **„Unverbindlich · Kontakte erst nach Annahme der Anfrage sichtbar“**.
- **Effort:** M
- **Files:** `src/pages/AdDetails.tsx`

### F-002 - Five price formats across the product  [P0]  (Lens C - evaluative ease / anchoring)
- **Screen/element:** Feed `12€/h`, AdDetails `12€ / 45min`, PublicProfile `12€/h` (no unit conversion), Favorites `12€ / Std`, Landing `12 € / 45 Min`, CreateAd preview `12€ / 45min`
- **Observed:** No shared formatter; PublicProfile claims `/h` without converting 45-min units (misleading).
- **Why it fails:** Evaluative ease — brain needs ~2s comparable numbers; five dialects create doubt. Isolated wrong `/h` is an honesty bug (ethics-adjacent P0).
- **Question asked:** „What do I actually pay per hour?“ (hard)
- **Fix:** One `formatAdPrice()` + `formatHourlyRate()` in `src/lib/utils.ts`. Display pattern: **`12 € / 45 Min`** (German spacing) with optional second line `≈ 16 €/h` on detail screens; never label non-hourly values as `/h`.
- **Effort:** M
- **Files:** `src/lib/utils.ts`, Feed, AdDetails, PublicProfile, Favorites, CreateAd, Landing demo tickets

### F-003 - AdDetails duration meta contradicts itself  [P0]  (Lens C - specificity / trust)
- **Screen/element:** AdDetails meta chip `Clock · Flexibel` (`AdDetails.tsx:174-176`) vs durations under price (`:162`)
- **Observed:** Hardcoded „Flexibel“ always; real `duration_minutes` shown elsewhere on same screen.
- **Why it fails:** Observed fact contradiction destroys specificity trust; user reads UI as unreliable.
- **Question asked:** „Is any detail on this page true?“ (hard)
- **Fix:** Chip shows actual durations (`45 Min · nach Absprache` if mix of 0 + values) or omit chip; never hardcode opposite of data.
- **Effort:** S
- **Files:** `src/pages/AdDetails.tsx`

### F-004 - Requests empty states are dead ends  [P0]  (Lens B - reciprocity / goal gradient adjacent)
- **Screen/element:** Requests empty in/out (`Requests.tsx:106-113`, `:182-189`)
- **Observed:** Copy only; no buttons (unlike Feed/Favorites/Matching empties).
- **Why it fails:** Goal gradient / next-step pattern used elsewhere; dead end asks „What now?“ and drops retention loops (accept loop never starts without ads/requests).
- **Question asked:** „Is anyone using this?“ (hard)
- **Fix:** Incoming empty → CTA **„Anzeige erstellen“** (`/create-ad`). Outgoing empty → **„Anzeigen stöbern“** (`/`). Keep existing copy.
- **Effort:** S
- **Files:** `src/pages/Requests.tsx`

### F-005 - Login trust panel hidden on mobile  [P0]  (Lens B - safety net; product principle „Mobil zuerst“)
- **Screen/element:** Login brand panel `hidden lg:flex` (`Login.tsx:345-394`)
- **Observed:** „Von der SV organisiert / Sicher und verifiziert / Elternverknüpfung“ only on desktop.
- **Why it fails:** Majority of students sign up on phones; primary trust answers never appear at signup (safety net missing where risk is felt).
- **Question asked:** „Who runs this? Is it safe?“ (hard, unanswered)
- **Fix:** Render the three trust lines under the form heading on mobile (`lg:hidden` compact check list), same wording.
- **Effort:** S
- **Files:** `src/pages/Login.tsx`

### F-006 - PublicProfile: wrong hourly price + rating not at decision point  [P0]  (Lens A M9/M14 + Lens B P6)
- **Screen/element:** `PublicProfile.tsx:263-265` (`${value}€/h` ignoring unit); rating only in stats (`:193-197`); no contact CTA (`:135` only „Profil teilen“)
- **Observed:** 12€/45min shown as 12€/h; star buried; conversion path requires opening an ad.
- **Why it fails:** Wrong math = false cost claim (ethics). Rating placement M9: trust must sit next to identity. Missing CTA adds funnel hop.
- **Question asked:** „Are they good and what do they cost?“ (hard + partly wrong answer)
- **Fix:** Same shared price formatter with true conversion; star + `(n)` directly under name; secondary button **„Anzeige öffnen“** on first active ad / header hint when ads exist.
- **Effort:** M
- **Files:** `src/pages/PublicProfile.tsx`

### F-007 - Profile never shows progress after signup  [P1]  (Lens B - goal gradient)
- **Screen/element:** Profile whole screen; `onboarding_complete: true` at register (`Login.tsx:277`); no meter
- **Observed:** No % / checklist; verification banner has no CTA (`Profile.tsx:451-452`).
- **Why it fails:** Goal gradient — never start at zero; signup already earned name+grade (head start). Banner without action is a wall.
- **Question asked:** „How complete am I / what's missing?“ (hard)
- **Fix:** Profile strength meter starting **≥20%** counting name+grade from signup; checklist rows: Bio, Zeiten, Verifizierung, erste Anzeige. Verification banner → button **„Verifizierung schrittweise ansehen“** → `/welcome#sicher` (or keep text + „So geht's“ linking guide).
- **Effort:** M
- **Files:** `src/pages/Profile.tsx`

### F-008 - CreateAd footer actions not sticky; publish is green  [P1]  (Lens A M15/I2)
- **Screen/element:** `CreateAd.tsx:1119-1141` (`bg-green-600` publish)
- **Observed:** Zurück/Weiter/Veröffentlichen in normal flow; long steps require scroll; green vs app yellow primary.
- **Why it fails:** I2 sticky action area; M15 single primary CTA language. Green implies a different product language (two funnels, two colors).
- **Question asked:** „Where do I continue?“ (friction)
- **Fix:** Sticky action row (bottom of content, above nav spacer): Zurück ghost + Weiter/publish primary **yellow**; keep green success toast only.
- **Effort:** M
- **Files:** `src/pages/CreateAd.tsx`

### F-009 - Register form is one long blank wall  [P1]  (Lens B - smart defaults / decision fatigue)
- **Screen/element:** Login register mode (`Login.tsx:404-646`)
- **Observed:** ~9 inputs empty (except role=`student`); no step count; submit „Registrieren & Beitreten“.
- **Why it fails:** Decision fatigue (jam study); defaults feel like recommendations; button carries commitment weight (Test 1 „Subscribe“ analog).
- **Question asked:** „How long is this form?“ (hard)
- **Fix:** Under H2 add **„Schritt 1 von 2 · dauert ca. 2 Minuten“**; button → **„Konto erstellen“** (or „Jetzt starten“); keep SV optional framing **„SV-Code optional – vor Ort im SV-Raum verifizieren“** as helper next to field (not only footer).
- **Effort:** S
- **Files:** `src/pages/Login.tsx`

### F-010 - Landing never answers „Is it free?“  [P1]  (Lens C - easy question / transparency)
- **Screen/element:** Landing hero + trust chips (`Landing.tsx:394-397`)
- **Observed:** SV/DSGVO/school chips; no free/no-fees line; catch anxiety unaddressed.
- **Why it fails:** Hardest free-product question; easy answer exists (no payment in MVP) — withhold creates doubt („kostenlos“ is a real fact).
- **Question asked:** „What's the catch?“ (hard)
- **Fix:** Add chip **„Kostenlos fürs FWG“** next to existing trust chips; one sentence in subline optional: „Ohne Gebühren – von der SV betrieben.“
- **Effort:** S
- **Files:** `src/pages/Landing.tsx`

### F-011 - Feed quick chips show raw subject keys  [P1]  (Lens A M6)
- **Screen/element:** Feed Beliebt chips (`Feed.tsx:505`)
- **Observed:** `{subj}` + capitalize → „Franzoesisch“ instead of „Französisch“.
- **Why it fails:** Label craft / scanability; inconsistent with SubjectChip map used everywhere else.
- **Question asked:** „What am I filtering by?“ (micro-friction)
- **Fix:** Render `subjectLabelMap[subj]` (import or local map from SubjectChip).
- **Effort:** S
- **Files:** `src/pages/Feed.tsx`

### F-012 - Feed card badge redundancy (Coach ×2, Boosted ×2)  [P1]  (Lens A M6)
- **Screen/element:** Feed card (`Feed.tsx:836-840`, `:854-859`, `:903-912`)
- **Observed:** Boosted ribbon + footer pill; Coach pill + footer pill.
- **Why it fails:** Badges must be instantly scannable; repeats steal attention from price/title (M6).
- **Question asked:** „Why is this said twice?“
- **Fix:** Keep header ribbon (boosted) + one coach pill next to name; drop footer duplicates.
- **Effort:** S
- **Files:** `src/pages/Feed.tsx`

### F-013 - AdDetails price weak / early enough?  [P1]  (Lens A M14)
- **Screen/element:** Price top-right in muted header (`AdDetails.tsx:160-163`)
- **Observed:** Present early (good) but right-aligned secondary styling; unit token `45min`; not adjacent to CTA.
- **Why it fails:** M14 price should read as primary fact; M15 total/price belongs with the action.
- **Question asked:** „What does this cost?“
- **Fix:** German format under shared formatter; mirror price inside sticky CTA bar („Anfrage senden · 12 € / 45 Min“ pattern once sticky exists).
- **Effort:** S (with F-001)
- **Files:** `src/pages/AdDetails.tsx`

### F-014 - Touch targets & low-contrast meta under 44px  [P1]  (Product principle + Lens A)
- **Screen/element:** Feed pills `py-1`/`text-xs` (`Feed.tsx:435,499,533`); Favorites `text-[9px]` (`Favorites.tsx:135`); inactive nav `text-gray-400` (`Layout.tsx:236`); meta `text-gray-400` + size 12 icons (`Feed.tsx:890`)
- **Observed:** Multiple controls under 44px height; meta near contrast floor.
- **Why it fails:** Klassen 5–13 + PWA on phones — PRODUCT.md requires large targets and contrast.
- **Question asked:** „Can I hit this?“
- **Fix:** Chips/filters `min-h-[44px]` or `py-2`; footer meta `text-gray-500`; inactive nav `text-gray-500`.
- **Effort:** M
- **Files:** `src/pages/Feed.tsx`, `src/pages/Favorites.tsx`, `src/components/Layout.tsx`

### F-015 - CreateAd preview price uses unit token  [P1]  (Lens A M13/M14)
- **Screen/element:** Preview `12€ / 45min` (`CreateAd.tsx:1084`)
- **Observed:** Machine unit in user-facing preview.
- **Why it fails:** Craft + evaluative clarity; user publishes what they'll be judged on.
- **Question asked:** „Will people understand my price?“
- **Fix:** Same `formatAdPrice` → `12 € / 45 Min`.
- **Effort:** S
- **Files:** `src/pages/CreateAd.tsx`

### F-016 - Invalid Tailwind classes (silent no-ops)  [P2]  (Lens A craft)
- **Screen/element:** `bg-gray-55/50` (`AdDetails.tsx:282`); `border-gray-150` (`Favorites.tsx:180`); `dark:border-green-905` (`Requests.tsx:148,157`); `text-gray-550` (`Requests.tsx:218,227`)
- **Observed:** Tokens not in config ramp → styles dropped.
- **Why it fails:** Borders/backgrounds vanish or fall back; visual hierarchy breaks subtly.
- **Question asked:** n/a (integrity)
- **Fix:** → `bg-gray-100/70`, `border-gray-200`, `dark:border-green-900`, `text-gray-500`.
- **Effort:** S
- **Files:** listed above

### F-017 - Verification badge: four visual languages  [P2]  (Lens A M6 consistency)
- **Screen/element:** Feed yellow stamp, AdDetails green pill, PublicProfile blue icon + green pill, Matching Award icon (= verified), Profile stamp
- **Observed:** Same fact, four looks; Award icon collides with coach semantics.
- **Why it fails:** Product-system design; inconsistent trust marks make each less credible.
- **Question asked:** „What does verified look like?“
- **Fix:** Standardize on one compact pill: `✓ Verifiziert` (green soft / dark green text) everywhere for user-level verification; keep stamp only as poster decoration on Landing/Profile if brand wants it — but feed/detail/profile use pill.
- **Effort:** M
- **Files:** Feed, AdDetails, PublicProfile, Matching, Profile

### F-018 - Harsh dividers on dark cards / card headers  [P2]  (Lens A M11)
- **Screen/element:** `border-b border-white/10` (`Feed.tsx:846`, `Profile.tsx:459`), `border-b` gray headers, `border-t border-gray-100` section cuts inside cards
- **Observed:** High-contrast lines segment content blocks.
- **Why it fails:** Soft dividers feel premium; heavy lines create harsh blocks.
- **Question asked:** n/a
- **Fix:** Prefer `border-white/5` on black; inside light cards keep `border-gray-100` but avoid stacking double `border-b` + `border-t` within 24px.
- **Effort:** S
- **Files:** Feed, Profile, AdDetails headers

### F-019 - CTA weight overrides on buttons (font-black/text-lg scattered)  [P2]  (Lens A M15)
- **Screen/element:** AdDetails `text-lg font-bold`, Matching `font-black`, Landing overrides, CreateAd green
- **Observed:** Pages shout past `Button` component defaults.
- **Why it fails:** One CTA system; shouting fights refined tone rules.
- **Question asked:** n/a
- **Fix:** Prefer Button `size` variants (`lg` for hero CTAs); drop ad-hoc `font-black` on primary actions.
- **Effort:** S
- **Files:** AdDetails, Matching, Landing (optional polish)

### F-020 - Chat UI off-brand WhatsApp palette  [P2]  (Lens A M4)
- **Screen/element:** Chat raw hexes `#00a884`, `#d9fdd3`, `#efeae2` (`Chat.tsx`)
- **Observed:** Entire chat surface cloned from WhatsApp green.
- **Why it fails:** Color should support product system; primary yellow/neutral zinc unused → feels like a different app inside ours.
- **Question asked:** „Whose product is this?“
- **Fix:** Map bubbles to neutral zinc + primary accents for send button; keep density/behavior.
- **Effort:** L
- **Files:** `src/pages/Chat.tsx`

### F-021 - English leftovers in German chrome  [P2]  (copy consistency)
- **Screen/element:** Sidebar „Menu“ (`Layout.tsx:101`), „Admin Area“ (`:157`); Social H1 „Social Hub“ (`Social.tsx:73`)
- **Observed:** Mixed language labels.
- **Why it fails:** School product voice (direkt, schülernah); English reads template-y.
- **Question asked:** n/a
- **Fix:** „Menü“, „SV-Bereich“, H1 „Anfragen & Matches“ / „Dein Überblick“.
- **Effort:** S
- **Files:** Layout, Social

### F-022 - Feed per-card `h2` breaks heading hierarchy  [P3]  (a11y craft)
- **Screen/element:** Card name as `h2` under page `h1` + filter `h2` (`Feed.tsx:850`, `:598`)
- **Observed:** Multiple h2s as non-section labels.
- **Why it fails:** Screenreader outline; cards should be h3 or div.
- **Fix:** Card title → `h3`; filter categories → `h3` inside panel.
- **Effort:** S
- **Files:** `src/pages/Feed.tsx`

### F-023 - Rating count nearly invisible on PublicProfile  [P3]  (Lens A M9)
- **Screen/element:** `(reviewCount)` at `text-[10px]` (`PublicProfile.tsx:195-196`)
- **Observed:** Count too small to scan; sources may disagree with average.
- **Fix:** `text-sm` count next to score under name (with F-006).
- **Effort:** S
- **Files:** `src/pages/PublicProfile.tsx`

### F-024 - CreateAd benchmark numbers disagree across surfaces  [P3]  (Lens C - one number)
- **Screen/element:** CreateAd `ca. 12 €/h` vs `10–12 € / 45–60 Min` (`CreateAd.tsx:963,1002`) vs Landing coaching `10–15 € / 45 Min` (`Landing.tsx:697`)
- **Observed:** Three anchors for „fair price“.
- **Why it fails:** First number is the anchor; conflicting anchors create negotiation doubt. (Coaching range is a different product - document or align wording as „Coaching-AG“ vs „Börse-Richtwert“.)
- **Fix:** Unify Börse copy to **„ca. 10–12 € pro 45–60 Min“** everywhere; keep coaching-specific range only on Coaching page with explicit label.
- **Effort:** S
- **Files:** CreateAd, Landing (wording label)

## Priority roadmap
1. **P0:** F-001 AdDetails sticky CTA+trust · F-002 price system · F-003 duration truth · F-004 empty CTAs · F-005 mobile trust · F-006 PublicProfile price/rating
2. **Design tokens:** shared price formatters, micro-label letter-spacing helper, softer dark dividers (F-018)
3. **Components:** sticky action bar pattern (AdDetails, CreateAd), verified pill, empty-state CTA slot
4. **Flows:** Profile goal-gradient meter (F-007), register step framing (F-009)
5. **Copy:** free chip (F-010), safety line (F-001), German units (F-015), DE chrome (F-021)

## Funnel impact view
| Funnel step | Screen | Findings | Expected effect of fixes |
|---|---|---|---|
| First touch | Landing | F-010, F-002 | less catch-anxiety, coherent price story |
| Onboarding | Login | F-005, F-009 | mobile trust + lighter perceived form length |
| Onboarding | Profile | F-007 | head-start progress → more complete profiles → better matches |
| First value | Feed | F-011, F-012, F-014, F-022 | faster scan, fewer mis-taps |
| First value | CreateAd | F-008, F-015, F-024 | fewer drop-offs between steps; publish confidence |
| **Conversion** | **AdDetails** | **F-001, F-003, F-013** | **primary lift: always-visible CTA + answered objections** |
| Conversion | PublicProfile | F-006, F-023 | trust at identity; honest price; shorter path |
| Retention | Requests | F-004 | empty inbox → next action instead of churn |
| Retention | Chat | F-020 | coherent product feel (follow-up) |

## Ethics gate
- No fake urgency/scarcity/progress invented. Profile meter counts **real** completed fields (incl. real head-start from signup data).
- „Kostenlos fürs FWG“ — real (no payment MVP).
- Benchmark copy aligns to **existing** stated Richtwerte; no new fake numbers.
- CreateAd high-price warning keeps factual Richtwert framing (not shame-only opt-out).
