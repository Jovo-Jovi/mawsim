# MAWSIM — Design system

Precedence 8. The design contract of `docs/method/DESIGN_METHOD.md` §1, signed by OD-08. Build tasks compose it; a
gap goes back to the reviewer as a design change, never improvised in a feature task.

## 1. Direction — "Almanac in the sun"

**Character, in three words:** sun-warm · almanac-precise · unhurried.

**Draws from:** R1 (one oversized headline beside one bold visual; the pill active state), R2 (editorial pacing,
overlines, hairline rules, generous space), R3 (many produce colours side by side mean "in season"), R4 (deep
cabbage green as a ground), R5 (the brand line: sand, Nile green, terracotta; Inter and IBM Plex Sans Arabic;
rounded cards; subtle glass), R7 (earth-derived hues). See `docs/design/REFERENCES.md`.

**Signature** — one deliberate choice each, which no reference has as a whole:

- **Layout — the twelve-cell almanac.** One geometry is the spine of the product: twelve equal cells, January to
  December from the inline start. It is the hero's sun-dial ring, every card's season ring, the guide's month
  scroller and the produce page's season bar. Right to left in Arabic, left to right in English.
- **Type — the counter-name.** Every produce name is set large in the page's language with its name in the other
  language beneath it, smaller and muted (`Mango` / `مانجو`; `مانجو` / `Mango`): a bilingual market label, not a
  translation toggle. Headlines are Inter ExtraBold with tight tracking; Arabic headlines are IBM Plex Sans Arabic
  Bold at the same optical size and never tracked.
- **Colour — kind colours on sand.** A warm sand ground and Nile-green ink; each `ProduceKind` owns one produce
  colour (fruit apricot, vegetable tomato, leafy herb) used only for season fills; terracotta marks "this month"
  and nothing else; lemon is the single highlight for the current-month tag. The dark theme is deep cabbage green,
  not grey.
- **Photography — produce in warm daylight, framed by the almanac.** Licensed photographs of single, fresh produce
  in natural warm light on sand, linen or wood (§11) fill rounded frames; each card's season ring sits on its photo
  as a badge, so the photograph says "fresh" and the ring says "when". The hero pairs one large photograph with the
  sun dial.
- **Motion — the dial turns once.** On the home page the sun-dial's twelve segments draw in once, in calendar
  order, and this month's segment settles with a soft glow; elsewhere motion only confirms state (a chip's pill
  slides, a card lifts 2px). Nothing loops. With reduced motion everything is in its final state.

Licensed photography is part of the identity (OD-09). Every photo frame has a fixed ratio and a designed fallback in
the same size — the kind-colour tile with the season ring and the produce's names — shown until the licensed image
for that slot lands. Adding a photograph changes no layout and no code.

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
`prefers-color-scheme`; `color-scheme: light dark` is set on `:root`.

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

### Motion

| Token | Value |
|---|---|
| `--dur-1` / `--dur-2` / `--dur-3` / `--dur-dial` | `120ms` / `200ms` / `420ms` / `1200ms` |
| `--ease-out` / `--ease-in-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` / `cubic-bezier(0.6, 0, 0.3, 1)` |

## 3. Surfaces

Page ground `--color-bg`; cards and panels `--color-surface` with a `--color-hairline` border and `--radius-lg`; the
sticky header is glass (`--color-surface-glass` + `backdrop-filter: blur(var(--blur-glass))`, solid
`--color-surface` where unsupported); the sample-data notice is a quiet band in `--color-track`.

## 4. Themes

Light and dark, from `prefers-color-scheme` only (R-3). No toggle, no stored choice. Every component is checked in
both.

## 5. Breakpoints and responsive rules

Arabic first: the `ar` layout (RTL) is the primary composition, designed and reviewed first; `en` (LTR) is its
adaptation with Inter's own scale, not a mirrored copy. Mobile-first. `40rem` (640px) and `64rem` (1024px). At 390: one column of content, card grid in 2 columns, month
scroller scrolls inline with snap, hero dial below the headline. At 1280: container 72rem, card grid in 4 columns,
all twelve months visible without scrolling, hero headline and dial side by side. No horizontal page scroll at any
width from 320. Every image or ring reserves its size (`aspect-ratio` or fixed block size) so nothing shifts.

## 6. Components and their states

| Component | Where | States |
|---|---|---|
| `SiteHeader` | every page | default · link hover · `focus-visible` · current page (`aria-current="page"`, pill in primary tint) · glass over scrolled content |
| `Wordmark` | header | "Mawsim" with "موسم" as its counter-name (order follows the locale) |
| `LanguageLink` | header, footer | default · hover · focus; label in the target language, `hreflang` and `lang` set, keeps path and query |
| `SampleDataNotice` | home, guide, produce, about, footer | one state; text from the catalogue (OD-06) |
| `SeasonRing` | cards, hero (large) | twelve arcs from 12 o'clock, clockwise in `ltr`, counter-clockwise in `rtl`; in-season arcs in the kind colour, others track + hairline; this month marked with an accent tick; `aria-hidden` with a text equivalent beside it ("In season: July – October") |
| `ProducePhoto` | card, produce page, hero | photo (licensed image via `next/image`, `object-fit: cover`, focal point centred, alt text in the page's locale) · **fallback** (kind-colour tile with the season ring and names, same frame); frames: card `4:3`, produce page `3:2` (`4:3` at 390), hero `4:5` at 390 and `5:4` at 1280; radius `--radius-lg`; size reserved before load |
| `ProduceCard` | guide grid, home list | default · hover (lift 2px, `--shadow-2`) · `focus-visible` (2px primary ring, 2px offset) · active (pressed, no lift); whole card is one link to the produce page; `ProducePhoto` with the `SeasonRing` as a badge in its inline-end corner, name, counter-name, kind label |
| `KindChips` | guide | All · Fruit · Vegetables · Leafy greens; links; active `aria-current="true"` with primary pill; hover; focus-visible; min target `--target-min` |
| `MonthScroller` | guide | twelve month links; selected `aria-current="true"` (primary pill); this month marked by a lemon dot and the visually hidden text "this month"; hover; focus-visible; inline scroll with snap at 390, all visible at 1280 |
| `CardGrid` | guide, home | filled · **empty** ("Nothing of this kind is in season in {month}." with links to All and to this month) |
| `SeasonBar` | produce | twelve cells with short month names beneath; in-season cells filled with the kind colour; this month outlined in accent with its label; a text list of the season below |
| `StorageTipPanel` | produce | one state: overline "How to keep it", the tip in the page language |
| `Hero` | home | the hero `ProducePhoto` (the only `priority` image), headline "What's fresh in Egypt this {month}" (month in accent), the `SeasonRing` dial overlapping the photo's inline-start edge with the count of produce in season in its centre, a link to the guide |
| `PhotoCredits` | about | a list of author, source link and licence link per photograph; a plain sentence when none is listed yet |
| `NotFound` | unknown slug or locale | localised message and links home and to the guide |
| `ErrorState` | error boundary | safe localised message and a link home (a button only to retry) |
| `SiteFooter` | every page | sample-data notice, "Mawsim collects nothing", about link, language link |

Icons: three inline SVGs (arrow, info, leaf) in one `Icon` component, mirrored in `rtl` where they point.

## 7. Motion and reduced motion

- **Dial (home hero):** on first paint the twelve segments draw in sequence (stroke reveal, `--dur-dial` total,
  `--ease-out`), then this month's segment brightens once (`--dur-3`). CSS keyframes only; the final state is the
  rendered state, so nothing shifts.
- **Cards:** appear with a 6px rise and fade (`--dur-3`, stagger 40ms, at most 8 cards) on page load only.
- **Chips and months:** the active pill's background transitions (`--dur-2`); links' colour (`--dur-1`).
- **Card hover:** `transform: translateY(-2px)` and shadow (`--dur-2`). Only `transform` and `opacity` animate.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no animation or transition beyond colour; the dial and cards
  render in their final state at once.
- Nothing loops, autoplays or moves on scroll.

## 8. Writing

Short, plain, warm. Sentence case. The sample-data notice in English: "Sample data for a test product — not farming
or nutrition advice." Arabic copy is written for Egyptian readers in Modern Standard Arabic, not translated word for
word; the reviewer reads both.

## 9. Accessibility floor (WCAG 2.2 AA)

- Contrast as in §2; focus always visible (2px `--color-primary` ring with 2px offset, never removed).
- Every control is a link (or a button for retry), reachable and operable by keyboard in visual order; a "Skip to
  content" link first.
- Targets at least `--target-min` (above WCAG 2.2's 24px minimum).
- One `h1` per page; landmarks `header`, `nav`, `main`, `footer`; `aria-current` on the current page, chip and month.
- Season information is never colour alone: the text equivalent sits beside every ring and bar.
- `lang` and `dir` on `<html>`; the counter-name carries its own `lang`.
- Zoom to 200% and reflow at 320 without loss.
- The runner's `a11y` check (axe, WCAG 2.0–2.2 A/AA) is green on every captured state.

## 10. Resource decisions (DESIGN_METHOD §5.1, rows that fit the stack)

| Resource | Decision | Reason |
|---|---|---|
| CSS transitions, keyframes | **adopt** | all of §7 needs nothing more; no dependency |
| CSS scroll-driven animations | reject | nothing moves on scroll (§7) |
| View Transitions API | reject | Next.js's integration is experimental; the motion brief needs none |
| Motion (`motion`) | reject | CSS covers calm, state-only motion; lean (PR-47) |
| AutoAnimate | reject | filtering is a navigation, not an in-place list change |
| GSAP / anime.js / React Spring | reject | no timelines or physics needed |
| Lenis | reject | no scroll story; never with reduced motion |
| React Bits, Animate UI, Magic UI | reject | no copied effects; the signature is the product's own |
| shadcn/ui | reject | it assumes Tailwind (OD-04); the product has a dozen simple components |
| Radix / React Aria / Headless UI / Ark UI | reject | no dialogs, menus or popovers: every control is a link |
| Tailwind CSS | reject | CSS Modules + tokens (OD-04) |
| Radix Colors | reject | the palette comes from the brand line, checked in §2 |
| Lucide / Phosphor / Heroicons | reject | three inline glyphs |
| Fontsource | reject | `next/font` self-hosts the two families |
| Recharts / visx / ECharts / Tremor | reject | the season bar and ring are CSS/SVG |
| Embla Carousel | reject | the month scroller is CSS scroll-snap |
| three.js / R3F, Rive, Lottie | reject | no 3D or designed animation files |
| Barba.js / Swup | reject | Next.js routes the pages |
| assistant-ui / AI Elements | reject | not an AI product |
| Storybook | reject | a small UI; states are captured by the runner |
| Theatre.js | reject | paused upstream |
| `next/image` (built into Next.js, not in §5.1) | **adopt** | responsive, optimised, size-reserved photographs (§11) with no dependency |

## 11. Photography (OD-09)

- **Licence first.** Only images whose licence allows commercial use, or with the rights holder's written permission,
  each recorded in `content/photos.json`. A Pinterest pin, a search result or a reference image is not a licence.
- **Art direction.** Authentic, fresh, appetising produce — real texture, no heavy retouching, no illustrations or
  AI-looking renders. Natural warm daylight from one side, soft shadows, consistent white balance across the set.
  One produce (or a small group of it) per image, close and generous, on sand, linen, wood or a market crate; no
  text, logos, hands or people (A-11). A consistent camera angle per slot type: overhead or three-quarter for cards,
  three-quarter for the produce page, a wider market composition for the hero.
- **Crop.** Supplied at least 1600 px wide (hero) or 1200 px (produce), with the subject centred so the frames of
  §6 crop it cleanly at every width; the subject keeps a margin so the season-ring badge never covers it.
- **Performance.** `next/image` with `sizes` per frame (card about `(min-width: 64rem) 25vw, 50vw`), AVIF/WebP
  output, lazy loading except the hero, width and height from the manifest; no image above the fold shifts.
- **Fallback.** Missing image → the fallback tile in the same frame; never a broken image or empty box.
- **Dark theme.** Photographs are not filtered; frames get the `--color-hairline` border so light images sit on the
  cabbage ground.
