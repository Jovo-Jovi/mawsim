# MAWSIM — Design system

Precedence 8. The design contract of `docs/method/DESIGN_METHOD.md` §1, signed by OD-08. **Version 3** (OD-11,
issue #28): "The year turns". One twelve-month **year dial** is the spine of the site: the home page's scroll-driven
year story, the guide's month picker, every card's season ring and the produce page's season arc. The 3D hero scene
and three.js are removed. Versions 1 and 2 are in git history. Build tasks compose this contract. A gap goes back to
the reviewer as a design change and is never improvised in a feature task.

## 1. Direction — "Almanac in the sun"

**Character, in three words:** sun-warm · almanac-precise · unhurried. Version 3 keeps them. Every movement shows
something true, the year turning and what is fresh as it turns, and nothing moves for decoration alone.

**Draws from:** R1 (one oversized headline beside one bold visual; the pill active state), R2 (editorial pacing,
overlines, hairline rules, generous space), R3 (many produce colours side by side mean "in season"), R4 (deep
cabbage green as a ground), R5 (the brand line: sand, Nile green, terracotta; Inter and IBM Plex Sans Arabic;
rounded cards; subtle glass), R7 (earth-derived hues), R8 (calm, typographic motion) and R9 (a pinned section that
scroll scrubs). See `docs/design/REFERENCES.md`.

**Signature.** Each line is one deliberate choice that no reference has as a whole:

- **Layout: the year dial.** One geometry is the spine of the product: twelve equal cells in a ring, January at the
  top (12 o'clock), clockwise in English and counter-clockwise in Arabic. It is the home page's year story (§13), the
  guide's month picker, every card's season ring and the produce page's season arc. The year chart (`YearChart`, §6) unrolls the
  same twelve cells into a row, January to December from the inline start.
- **Type: the counter-name.** Every produce name is set large in the page's language with its name in the other
  language beneath it, smaller and muted (`Mango` / `مانجو`; `مانجو` / `Mango`): a bilingual market label, not a
  translation toggle. Headlines are Inter ExtraBold with tight tracking. Arabic headlines are IBM Plex Sans Arabic
  Bold at the same optical size and are never tracked. In the year story the headline's month changes like a page
  turning in an almanac, a quiet cross-fade in a slot of fixed size.
- **Colour: kind colours on sand.** A warm sand ground and Nile-green ink. Each `ProduceKind` owns one produce colour
  (fruit apricot, vegetable tomato, leafy herb), used only for season fills. Terracotta marks "this month" and nothing
  else. Lemon is the single highlight for the current-month tag. The dark theme is deep cabbage green, not grey.
- **Imagery: produce in a circle, held by its year.** Every produce image is a circle crop inside its own season
  ring, with the in-season months lit around it. Nothing sits on an image. The hero photograph, the wider market
  composition, is the year dial's centre disc. The produce circles orbit it and come forward in their months.
- **Ground: a market texture under the almanac.** A faint woven texture, like linen or a crate's grain, lies behind
  the hero and the section bands (§12) and never under body text. It is at most 8% opaque, so contrast holds.
- **Motion: the year turns as you scroll.** On the home page the scroll turns the dial one month per step, and that
  month's produce comes forward. On the guide the dial turns to the chosen month and the cards re-sort, sliding,
  fading and rising (§7). On a produce page the season arc draws its months in once. Scroll drives the motion and
  nothing loops or plays by itself. With reduced motion, or without JavaScript, every screen is its settled state.

Imagery is part of the identity (OD-09, OD-10, OD-11). Every photo frame has a fixed size and a designed fallback of
the same size: the kind-colour disc with the produce's names, shown until the image for that slot lands. Adding an
image changes no layout and no code.

## 2. Tokens (`src/styles/tokens.css`, the only file with raw values)

### Colour

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-bg` | `#F6EFE3` | `#12201A` | page ground (sand / cabbage) |
| `--color-surface` | `#FFF9F0` | `#1A2B23` | cards, panels |
| `--color-surface-glass` | `rgb(255 249 240 / 0.72)` | `rgb(26 43 35 / 0.72)` | sticky header (with blur) |
| `--color-ink` | `#1F2A22` | `#F3EBDD` | text |
| `--color-ink-muted` | `#4F5B52` | `#B9C2B5` | secondary text, counter-names |
| `--color-primary` | `#1E5B45` | `#7CC39A` | links, active chip, focus ring (Nile green) |
| `--color-on-primary` | `#FFFFFF` | `#12201A` | text on primary |
| `--color-accent` | `#A0461F` | `#E59466` | "this month" only (terracotta) |
| `--color-highlight` | `#F2C230` | `#F2C230` | the current-month tag ground (lemon); text on it is `--color-on-highlight` |
| `--color-on-highlight` | `#1F2A22` | `#12201A` | text on lemon |
| `--color-kind-fruit` | `#C96A12` | `#F0A04B` | season fill, fruit |
| `--color-kind-vegetable` | `#C8372D` | `#F07A6A` | season fill, vegetable |
| `--color-kind-leafy` | `#3F7D3A` | `#8BC77F` | season fill, leafy greens |
| `--color-track` | `#E6DCCB` | `#2A3D33` | empty season cell (with a 1px `--color-ink-muted` hairline) |
| `--color-hairline` | `rgb(31 42 34 / 0.14)` | `rgb(243 235 221 / 0.16)` | rules, card borders |

Contrast (computed from relative luminance, WCAG 2.2): ink on bg ≥ 12:1; muted on bg ≥ 6:1; primary on bg ≥ 6.5:1;
accent on bg ≥ 5:1; on-primary on primary ≥ 7:1; on-highlight on highlight ≥ 8:1; every kind fill ≥ 3:1 against
`--color-surface` in its theme (non-text contrast). Kind fills never carry text. The theme follows
`prefers-color-scheme`; `color-scheme: light dark` is set on `:root`. Version 3 adds no colour.

### Type

| Token | Value |
|---|---|
| `--font-latin` | Inter (variable, `next/font`), fallback system-ui |
| `--font-arabic` | IBM Plex Sans Arabic 400/600/700 (`next/font`), fallback system-ui |
| `--text-xs` / `--text-sm` / `--text-base` | `0.8125rem` / `0.9375rem` / `1.0625rem` (`ar`: base `1.125rem`) |
| `--text-lg` / `--text-xl` / `--text-2xl` | `1.25rem` / `1.5rem` / `clamp(1.75rem, 1.2rem + 2.4vw, 2.5rem)` |
| `--text-display` | `clamp(2.75rem, 1.6rem + 5.6vw, 5.5rem)` |
| `--leading-tight` / `--leading-body` | `1.04` (`ar`: `1.3`) / `1.55` (`ar`: `1.75`) |
| `--tracking-display` / `--tracking-overline` | `-0.03em` / `0.14em` (both `0` in `ar`) |

Overlines: Inter 600, `--text-xs`, uppercase, `--tracking-overline`; in Arabic: weight 600, primary colour, no case
change or tracking. Licences: Inter and IBM Plex Sans Arabic are SIL OFL 1.1. Both are loaded with `display: swap`
and `next/font`'s fallback metrics, so the swap causes no layout shift.

### Space, radius, elevation, layout

| Token | Value |
|---|---|
| `--space-1 … --space-12` | `0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6rem` |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-pill` | `0.5rem` / `1rem` / `1.5rem` / `999px` |
| `--shadow-1` | `0 1px 2px rgb(31 42 34 / 0.06), 0 4px 12px rgb(31 42 34 / 0.06)` |
| `--shadow-2` | `0 2px 4px rgb(31 42 34 / 0.08), 0 12px 28px rgb(31 42 34 / 0.10)` |
| `--blur-glass` | `12px` |
| `--container` | `72rem`; gutters `--space-5` (< 40rem), `--space-8` (≥ 64rem) |
| `--target-min` | `2.75rem` (44px) |

### Year dial (version 3)

| Token | Value | Role |
|---|---|---|
| `--dial-size` | `20rem` (< 40rem) · `28rem` (≥ 40rem) · `34rem` (≥ 64rem) | the home story's whole object: centre disc, ring, month labels and the produce orbit (§13) |
| `--dial-picker-size` | `18rem` (< 40rem) · `20rem` (≥ 40rem) | the guide's dial, month links included (§13) |
| `--dial-step` | `30deg` | one month of turn; its sign flips in `rtl` |
| `--ring-inset` | `var(--space-3)` | the gap between a card's season ring and its photo circle |
| `--arc-size` | `18rem` (< 40rem) · `24rem` (≥ 64rem) | the produce page's season arc, month labels included |

### Motion

| Token | Value |
|---|---|
| `--dur-1` / `--dur-2` / `--dur-3` / `--dur-dial` | `120ms` / `200ms` / `420ms` / `1200ms` (`--dur-dial`: the season arc's draw, version 3) |
| `--ease-out` / `--ease-in-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` / `cubic-bezier(0.6, 0, 0.3, 1)` |
| `--dur-reveal` / `--reveal-rise` / `--reveal-stagger` | `560ms` / `1rem` / `60ms` (the scroll reveal, §7) |
| `--pill-grow-from` | `0.92` (the selected chip pill grows in from this scale, §7) |
| `--zoom-photo` / `--tilt-card` | `1.05` / `1.5deg` (card hover and focus; the tilt's sign flips in `rtl`) |
| `--glow-ring-opacity` / `--glow-ring-spread` | `0.55` / `0.5rem` (the ring's glow, drawn in the card's kind colour) |
| `--story-step` | `60svh` (version 3: the scroll length of one month in the year story; eleven steps follow the first view) |
| `--story-scrub` | `0.4s` (version 3: the longest lag of the scrub; the dial is still within it after scrolling stops) |
| `--story-back-scale` / `--story-back-opacity` | `0.72` / `0.35` (version 3: a produce circle out of the shown month) |
| `--dur-flip` / `--flip-stagger` | `560ms` / `40ms` (version 3: the guide's cards re-sorting, at most 8 staggered) |
| `--zoom-scroll` | `1.08` (version 3: the produce page photograph at the end of its scroll zoom) |

Version 3 removes `--scene-turn` and `--scene-size` with the hero scene (OD-11 §6).

### Texture (version 2)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--texture-opacity` | `0.08` | `0.08` | the ceiling for the market texture over `--color-bg` (§12); never raised |
| `--texture-ink` | `#1F2A22` | `#F3EBDD` | the colour of the SVG pattern's strokes (it equals `--color-ink`) |
| `--texture-tile` | `12rem` | `12rem` | the SVG pattern's repeat size |

Computed worst case (relative luminance, WCAG 2.2) with a pure black or pure white texture pixel at 8% over
`--color-bg`: light, ink ≥ 10.9:1, muted ≥ 5.2:1, primary ≥ 5.8:1, accent ≥ 4.5:1; dark, ink ≥ 11.3:1, muted ≥ 7.2:1,
primary ≥ 6.4:1, accent ≥ 5.5:1. So no texture content can bring text below AA. The method was a node one-liner over
the token hex values, as written in the issue #17 intake.

## 3. Surfaces

Page ground `--color-bg`; cards and panels `--color-surface` with a `--color-hairline` border and `--radius-lg`; the
sticky header is glass (`--color-surface-glass` + `backdrop-filter: blur(var(--blur-glass))`, solid
`--color-surface` where unsupported); the sample-data notice is a quiet band in `--color-track`. Every circular frame
(card, story, produce page) has a 1px `--color-hairline` border.

## 4. Themes

Light and dark, from `prefers-color-scheme` only (R-3). No toggle, no stored choice. Every component is checked in
both.

## 5. Breakpoints and responsive rules

Arabic first: the `ar` layout (RTL) is the primary composition, designed and reviewed first. `en` (LTR) is its
adaptation with Inter's own scale, not a mirrored copy. Mobile-first, with breakpoints at `40rem` (640px) and `64rem`
(1024px).

- At 390: one column of content. The card grid has 2 columns. The home story has the headline above the dial. The
  guide's dial sits under the title with the kind chips and the view links below it. The year chart puts each
  produce's name above its full-width row of twelve cells.
- At 1280: a 72rem container and a card grid of 4 columns. The home story has the headline and the dial side by side.
  The guide's dial sits beside the title, chips and view links. The year chart puts the name in a column at the
  inline start of each row.

No horizontal page scroll at any width from 320, and nothing scrolls inline. Every image, ring, dial and chart
reserves its size (`aspect-ratio` or fixed block size) so nothing shifts.

## 6. Components and their states

| Component | Where | States |
|---|---|---|
| `SiteHeader` | every page | default · link hover · `focus-visible` · current page (`aria-current="page"`, pill in primary tint) · glass over scrolled content |
| `Wordmark` | header | "Mawsim" with "موسم" as its counter-name (order follows the locale) |
| `LanguageLink` | header, footer | default · hover · focus; label in the target language, `hreflang` and `lang` set, keeps path and query (`month`, `kind`, `view`) |
| `SampleDataNotice` | home, guide, produce, about, footer | one state; text from the catalogue (OD-06) |
| `SeasonRing` | cards (version 3: around the photo circle) | twelve arcs from 12 o'clock, clockwise in `ltr`, counter-clockwise in `rtl`; in-season arcs lit in the kind colour, others track + hairline; this month marked with an accent tick; `aria-hidden` with a text equivalent beside it ("In season: July – October") |
| `YearDial` (version 3) | home story, guide | the shared dial of §13: a ring of twelve cells with the twelve short month names around it, January at 12 o'clock, clockwise in `ltr` and counter-clockwise in `rtl`; the shown or selected month turned to the top; this month marked by an accent tick; the ring `aria-hidden`; month names as text (home) or links (guide) |
| `ProducePhoto` | card, produce page, home story | photo (the manifest's image, from any source, via `next/image`, `object-fit: cover`, focal point centred, alt text in the page's locale) · **fallback** (kind-colour disc with the produce's names, same frame); frames (version 3): card and produce page are **circles** (`aspect-ratio: 1`, `border-radius: 50%`) inside their ring or arc; the hero is the story's centre disc; the story's orbit circles are decorative (`alt=""`); size reserved before load |
| `ProduceCard` | guide grid, home list | default · hover and `focus-visible` alike: lift 2px, `--shadow-2`, the photo zooms to `--zoom-photo` inside its circle, the card tilts by `--tilt-card` toward the inline end (the sign flips in `rtl`), the ring glows in the kind colour; `focus-visible` keeps its 2px primary ring with 2px offset · active (pressed, no lift, no tilt); the whole card is one link to the produce page; a square frame holds the `SeasonRing` with the photo circle inset by `--ring-inset`, then name, counter-name, kind label and the season sentence. Nothing overlaps the photo |
| `KindChips` | guide | All · Fruit · Vegetables · Leafy greens; links keeping `month` and `view`; active `aria-current="true"` with a primary pill that grows in on arrival; hover; focus-visible; min target `--target-min` |
| `MonthPicker` (version 3) | guide | the `YearDial` with its twelve month links (`aria-current="true"` on the selected month, the visually hidden text "this month" on this month) and two links, previous month and next month, that turn it by one; each target at least `--target-min`; links keep `kind` and `view`; replaces the month scroller |
| `GuideViewLinks` (version 3) | guide | two links, "Cards" and "Year chart", keeping `month` and `kind`; the active one `aria-current="true"` with the pill of `KindChips` |
| `CardGrid` | guide, home | filled · **empty** ("Nothing of this kind is in season in {month}." with links to All and to this month); on the guide (version 3) the grid keeps each card keyed by its slug across months so the re-sort can animate (§7) |
| `YearChart` (version 3) | guide, `view=chart` | one row per produce (all ten with All, filtered by kind): its name (a link to its page) with the counter-name, and twelve cells, in-season cells filled with the kind colour, January to December from the inline start; a header row of short month names (`aria-hidden`); the selected month's column highlighted (primary tint band with its name in bold); this month marked with the accent tick; every row carries the season sentence as its text equivalent; a list (`ol`), not a table; empty state as `CardGrid` |
| `SeasonArc` (version 3) | produce | the `YearDial` ring of `--arc-size` around the produce's circular `ProducePhoto`, with the twelve short month names around it; in-season cells filled with the kind colour; this month marked by the accent tick and its label "This month"; the ring `aria-hidden`; the season sentence below it as the text equivalent; replaces the season bar |
| `StorageTipPanel` | produce | one state: overline "How to keep it", the tip in the page language |
| `YearStory` (version 3) | home | the hero of §13: the headline "What is fresh in Egypt in {month}" (the month in accent), the `YearDial` with the hero `ProducePhoto` as its centre disc (the only `priority` image), the ten produce circles in an orbit around the ring, the count sentence "In season in {month}: {count}", and a link to the guide for the month shown; the `MarketTexture` lies behind the band; states: settled (this month) · scrubbing (any month, from scroll) |
| `MarketTexture` | behind the home story and the section bands of home, guide and about | image (the manifest's `texture` row via `next/image`, `alt=""`) · pattern (the SVG pattern drawn in code); `aria-hidden`; opacity `--texture-opacity`; behind content, never above it, never under body paragraphs (§12) |
| `PhotoCredits` | about | one credit per manifest row with `credit_required`, by source: generated (subject, "Generated for Mawsim with {model}", a link to the provider's terms) · licensed (subject, author, source link, licence link) · own (subject, "Artwork by {author}"); a plain sentence when none is listed yet |
| `NotFound` | unknown slug or locale | localised message and links home and to the guide |
| `ErrorState` | error boundary | safe localised message and a link home (a button only to retry) |
| `SiteFooter` | every page | sample-data notice, "Mawsim collects nothing", about link, language link |

Icons: three inline SVGs (arrow, info, leaf) in one `Icon` component, mirrored in `rtl` where they point. The arrow
serves the previous and next month links.

Removed in version 3: `HeroScene`, `HeroSceneFrame`, `HeroScenePoster` (OD-11 §6), `MonthScroller` (replaced by
`MonthPicker`), `SeasonBar` (replaced by `SeasonArc`) and the static `SeasonDial` (replaced by `YearDial`).

## 7. Motion and reduced motion (version 3)

Calm and typographic, scroll-driven and pinned (R8, R9). Scroll or a link drives every movement: nothing plays on its
own, nothing loops, and nothing moves after the visitor stops (WCAG 2.2.2 needs no pause control).

- **Year story (home):** the section stays put (`position: sticky`) while the visitor scrolls `--story-step` per
  month, through this month and the next eleven. The scrub turns the dial by `--dial-step` per month, mirrored in
  `rtl`. The shown month's produce circles come forward to scale 1 and opacity 1, and the rest go back to
  `--story-back-scale` and `--story-back-opacity`. The headline's month and the count sentence change at the step's
  midpoint, cross-fading in their fixed slots. The scrub lags at most `--story-scrub`. There is no snap or inertia
  of GSAP's own and no autoplay. Lenis smooths the scroll on this page only.
- **Month picker (guide):** on arrival at a new month the dial turns from the previous month to the new one
  (`--dur-3`, `--ease-in-out`, the short way round, mirrored in `rtl`). The cards re-sort with GSAP Flip over
  `--dur-flip`: a card that stays slides to its new place, a card that leaves fades out, and a new card rises by
  `--reveal-rise` and fades in, staggered by `--flip-stagger` (at most 8). On first load the dial is already at the
  selected month and nothing animates.
- **Season arc (produce):** on entry, the in-season cells draw in once in calendar order (stroke reveal over
  `--dur-dial`, `--ease-out`), then this month's tick fades in (`--dur-3`). The photograph scales from 1 to
  `--zoom-scroll` inside its circle as the page scrolls past it (scrubbed, no lag beyond `--story-scrub`).
- **Reveal on scroll (guide):** each section band and each card below the first viewport rises by `--reveal-rise` and
  fades in over `--dur-reveal` (`--ease-out`, stagger `--reveal-stagger`, at most 8 in a row) the first time it
  enters the view, and never again on that page view. Content is visible without JavaScript: the hidden starting
  state is applied only by the script that will reveal it.
- **Chips and view links:** the active pill's background transitions (`--dur-2`); on arrival the selected pill grows
  in from `--pill-grow-from` to 1 with an opacity fade (`--dur-2`); links' colour (`--dur-1`).
- **Card hover and focus:** lift `translateY(-2px)` and shadow, photo zoom to `--zoom-photo` inside its circle, tilt
  `--tilt-card` (mirrored in `rtl`), ring glow fading in to `--glow-ring-opacity`; `--dur-3`, `--ease-out`; the same on
  `:focus-visible`.
- Only `transform` and `opacity` animate, plus the colour of links and pills and the arc's `stroke-dashoffset`.
  Nothing animates layout, so nothing shifts. The story's scroll length is reserved by CSS, never added by script
  (§13).
- **Reduced motion** (`prefers-reduced-motion: reduce`), and **without JavaScript**: no animation or transition beyond
  colour. The story is its settled state for this month at its natural height, with no scroll length and no Lenis.
  The guide's dial stands at the selected month and the cards are in place. The arc is drawn and the photograph is
  at scale 1. Hover and focus keep only the shadow and the focus ring.

## 8. Writing

Short, plain, warm. Sentence case. The sample-data notice in English: "Sample data for a test product — not farming
or nutrition advice." Arabic copy is written for Egyptian readers in Modern Standard Arabic, not translated word for
word; the reviewer reads both.

## 9. Accessibility floor (WCAG 2.2 AA)

- Contrast as in §2; focus always visible (2px `--color-primary` ring with 2px offset, never removed).
- Every control is a link (or a button for retry), reachable and operable by keyboard in visual order; a "Skip to
  content" link first. The dial's month links follow calendar order in the DOM, whatever the dial's turn.
- Targets at least `--target-min` (above WCAG 2.2's 24px minimum), the dial's month links included.
- One `h1` per page; landmarks `header`, `nav`, `main`, `footer`; `aria-current` on the current page, chip, view and
  month.
- Season information is never colour alone: the text equivalent sits beside every ring, arc, dial and chart row.
- `lang` and `dir` on `<html>`; the counter-name carries its own `lang`.
- Zoom to 200% and reflow at 320 without loss.
- The year story's headline is the page's `h1`; its accessible text always equals its visible text. The story's
  changing month is not announced (no live region): the "in season this month" grid below it carries the content.
  Its orbit circles are decorative (`alt=""`, `aria-hidden`).
- No motion starts by itself or runs longer than the visitor's scroll, so no pause control is needed (WCAG 2.2.2).
- The runner's `a11y` check (axe, WCAG 2.0–2.2 A/AA) is green on every captured state.

## 10. Resource decisions (DESIGN_METHOD §5.1, rows that fit the stack)

| Resource | Decision | Reason |
|---|---|---|
| CSS transitions, keyframes, `position: sticky` | **adopt** | hover, pills, the reveal and the story's hold need nothing more |
| CSS scroll-driven animations | reject | the story needs month steps, a mirrored turn and swapped text, which one GSAP timeline does in both directions; the reveal happens once (version 2) |
| GSAP (`gsap`: core, ScrollTrigger, Flip; GreenSock's Standard "no charge" licence) | **adopt** (version 3, OD-11 §5) | the story's scrubbed timeline (ScrollTrigger) and the guide's shared-layout re-sort (Flip); only in client components of the home, guide and produce modules; registered once per component; reverted on unmount; `gsap.matchMedia` keeps reduced motion settled |
| `@gsap/react` | reject | `gsap.context` and its `revert` in an effect do the clean-up; lean (PR-47) |
| Lenis (`lenis`, MIT) | **adopt, narrowly** (version 3) | smooth scroll for the home page's story only; created only with motion allowed, destroyed on leaving the page; never on the guide, produce or about pages |
| View Transitions API | reject | Next.js's integration is experimental; Flip covers the re-sort |
| Motion (`motion`) | reject | GSAP covers the story and the re-sort; one animation library (DESIGN_METHOD §5.1: never two on one element) |
| AutoAnimate | reject | Flip covers the re-sort |
| anime.js / React Spring | reject | GSAP is the one library |
| three.js + React Three Fiber, Drei | reject (version 3, OD-11 §6) | removed with the hero scene; the year dial is SVG and CSS |
| React Bits, Animate UI, Magic UI | reject | no copied effects; the signature is the product's own |
| shadcn/ui | reject | it assumes Tailwind (OD-04); the product has a dozen simple components |
| Radix / React Aria / Headless UI / Ark UI | reject | no dialogs, menus or popovers: every control is a link |
| Tailwind CSS | reject | CSS Modules + tokens (OD-04) |
| Radix Colors | reject | the palette comes from the brand line, checked in §2 |
| Lucide / Phosphor / Heroicons | reject | three inline glyphs |
| Fontsource | reject | `next/font` self-hosts the two families |
| Recharts / visx / ECharts / Tremor | reject | the dial, arc and year chart are SVG and CSS |
| Embla Carousel | reject | nothing scrolls inline |
| Rive, Lottie | reject | no designed animation files |
| Barba.js / Swup | reject | Next.js routes the pages |
| assistant-ui / AI Elements | reject | not an AI product |
| Storybook | reject | a small UI; states are captured by the runner |
| Theatre.js | reject | paused upstream |
| `next/image` (built into Next.js, not in §5.1) | **adopt** | responsive, optimised, size-reserved photographs (§11) with no dependency |

## 11. Imagery (OD-09, OD-10, OD-11)

- **Sources, in order** (OD-10 §2): generated with `grok-imagine-image-2.0` by the owner's run of
  `scripts/images/generate.mjs`; open photographs under the Unsplash License, the Pexels License, CC0 or CC BY
  (Wikimedia Commons, Openverse), never share-alike, non-commercial or unclear; Mawsim's own artwork. Each image has its
  row in `content/photos.json` (`docs/CONTENT_MODEL.md` §5). A Pinterest pin, a search result or a reference image is
  not a source.
- **Art direction (every source).** Fresh, appetising produce that reads as a natural photograph: real texture, no
  glossy, plastic or over-saturated look, no heavy retouching. Natural warm daylight from one side, soft shadows,
  consistent white balance across the set. One produce (or a small group of it) per image, close and generous, on
  sand, linen, wood or a market crate; no text, logos, hands or people (A-11). One angle per slot type: three-quarter
  from slightly above for the produce images (they serve the card, the story and the produce page), a wider market
  composition for the hero, and a flat, even, overhead close-up of linen or crate wood with no produce and no strong
  shadow for the texture. Mawsim's own artwork follows the same light and palette.
- **Generation.** The generator builds one prompt per slot from the produce's English name and kind plus the art
  direction above, and asks for the slot's aspect ratio: `4:3` for produce, `1:1` for the hero, `1:1` for the texture.
  The owner rejects and regenerates any image that breaks this section.
- **Crop (version 3).** At least 1600 px wide (hero), 1200 px (produce) or 1024 px (texture). Every frame is a circle
  cropped from the image's centre (`object-fit: cover`, `object-position: center`), so the subject must sit in the
  central square. Nothing is drawn over an image, so no badge can cover a subject.
- **Performance.** `next/image` with `sizes` per frame (card about `(min-width: 64rem) 20vw, 40vw`; story orbit about
  `6rem`), AVIF/WebP output, lazy loading except the hero and the produce page's photograph, width and height from the
  manifest; no image above the fold shifts.
- **Fallback.** Missing image → the fallback disc in the same frame; never a broken image or empty box.
- **Dark theme.** Images are not filtered; frames get the `--color-hairline` border so light images sit on the
  cabbage ground.

## 12. Market texture (version 2)

- **Where:** behind the home story band and the section bands (the heading band that opens a section: home's "in
  season this month", the guide's header with the dial and chips, the about page's header). Never behind a body
  paragraph, a card's text or the storage tip.
- **What:** the manifest's `texture` image (`next/image`, `alt=""`, covering the band, `object-fit: cover`), or, with
  no row, an SVG pattern drawn in code: a fine woven grid of hairline strokes in `--texture-ink`, repeating every
  `--texture-tile`.
- **How strong:** the layer's opacity is `--texture-opacity` (0.08) in both themes, never more; the band's ground stays
  `--color-bg`. The computed worst case in §2 keeps every text token at AA or better.
- **Behaviour:** decorative (`aria-hidden="true"`), not focusable, not animated, size reserved by its band (no shift),
  identical in both directions.

## 13. The year dial and the year story (version 3)

- **Geometry.** One module of pure functions draws every ring: twelve cells from 12 o'clock, each `--dial-step` wide
  with a small gap, an accent tick at this month's midpoint, and label positions on a circle outside the ring. The
  card's `SeasonRing`, the `YearDial` and the `SeasonArc` all use it. In `rtl` the order runs counter-clockwise. A ring with no
  text may be mirrored with `scaleX(-1)`, as the `SeasonRing` is today. A dial with month labels takes its label
  positions from the geometry for the page's direction, so no text is ever flipped.
- **The dial's turn.** The selected or shown month sits at 12 o'clock: the ring turns by `-(month − 1) × --dial-step`
  in `ltr` and by the opposite sign in `rtl`. Month labels counter-turn so they stay upright. The server renders the
  turned state, so the first paint is already correct.
- **Year story layout.** One band. At 390 the `h1` is above and the dial below it, at `--dial-size`. At 1280 the
  headline column (the `h1`, the count sentence and the guide link) sits at the inline start and the dial at the
  inline end. The dial's centre disc is the hero photograph (circle, `priority`). The ring and its twelve month
  labels go around it, and the ten produce circles sit on an orbit outside the ring, each at a fixed place, in catalogue
  order from 12 o'clock. Nothing overlaps an image.
- **Year story scroll.** With `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`, the band's
  block size is `100svh` plus eleven `--story-step`s, and its inner stage is `position: sticky` under the header. CSS
  alone reserves this length, so hydration adds no space and nothing shifts. A client component builds one GSAP
  timeline with eleven steps, scrubbed by ScrollTrigger over the band (no `pin`, no snap, `scrub` of `--story-scrub`).
  It is reverted on unmount and under `gsap.matchMedia`'s reduced-motion branch. Lenis runs while the story is
  mounted. Without the media query, the band is its natural height and shows this month, settled.
- **Year story content.** The headline's month, the count sentence and the guide link's month always name the month
  shown. The link goes to `/{locale}/guide?month=N` for that month. The server renders this month. The produce
  circles' forward set is computed from `content/produce.json` through the produce module, never typed by hand.
