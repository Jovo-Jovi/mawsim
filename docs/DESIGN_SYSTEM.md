# MAWSIM — Design system

Precedence 8. The design contract of `docs/method/DESIGN_METHOD.md` §1, signed by OD-08. **Version 2** (OD-10,
issue #17): the showcase visual layer. It adds real imagery in every frame, the market texture, the turning 3D hero
scene, and richer state and scroll motion. Version 1 is in git history. Build tasks compose it; a gap goes back to the
reviewer as a design change, never improvised in a feature task.

## 1. Direction — "Almanac in the sun"

**Character, in three words:** sun-warm · almanac-precise · unhurried. Version 2 keeps them: the showcase layer
adds richness, never speed or noise.

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
- **Imagery — produce in warm daylight, framed by the almanac.** One fresh produce in natural warm light on sand,
  linen or wood (§11) fills each rounded frame, in one consistent style across the set (generated first, then open
  licensed photographs, then Mawsim's own artwork, OD-10 §2). Each card's season ring sits on its image as a badge,
  so the image says "fresh" and the ring says "when". The hero pairs one large image with the sun dial.
- **Ground — a market texture under the almanac.** A faint woven texture, like linen or a crate's grain, lies behind
  the hero and the section bands (§12) and never under body text. It is at most 8% opaque, so contrast holds.
- **Motion — the dial turns once, the market turns slowly.** On the home page the sun dial's twelve segments draw
  in once, in calendar order, and this month's segment settles with a soft glow. Beside it a small 3D scene of
  stylised produce turns slowly, one turn in `--scene-turn`, with a pause button (§13). Elsewhere motion confirms
  state or arrival. A card's image zooms gently, the card tilts slightly toward the reading direction and its ring
  glows on hover and focus. The guide's sections rise in once as they scroll into view, and the selected month and
  chip pills grow in. Only the scene loops, and it can be paused. With reduced motion everything is in its final
  state and the scene is a still poster.

Imagery is part of the identity (OD-09, OD-10). Every photo frame has a fixed ratio and a designed fallback in the
same size: the kind-colour tile with the season ring and the produce's names, shown until the image for that slot
lands. Adding an image changes no layout and no code.

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
| `--dur-reveal` / `--reveal-rise` / `--reveal-stagger` | `560ms` / `1rem` / `60ms` (version 2: the scroll reveal, §7) |
| `--zoom-photo` / `--tilt-card` | `1.05` / `1.5deg` (version 2: card hover and focus; the tilt's sign flips in `rtl`) |
| `--glow-ring-opacity` / `--glow-ring-spread` | `0.55` / `0.5rem` (version 2: the ring's glow, drawn in the card's kind colour) |
| `--scene-turn` | `48s` (version 2: one full turn of the hero scene) |

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
| `ProducePhoto` | card, produce page, hero | photo (the manifest's image, from any source, via `next/image`, `object-fit: cover`, focal point centred, alt text in the page's locale) · **fallback** (kind-colour tile with the season ring and names, same frame); frames: card `4:3`, produce page `3:2` (`4:3` at 390), hero `4:5` at 390 and `5:4` at 1280; radius `--radius-lg`; size reserved before load |
| `ProduceCard` | guide grid, home list | default · hover and `focus-visible` alike (version 2): lift 2px, `--shadow-2`, the image zooms to `--zoom-photo` inside its frame, the card tilts by `--tilt-card` about its block axis toward the inline end (the sign flips in `rtl`), the `SeasonRing` badge glows in the kind colour; `focus-visible` keeps its 2px primary ring with 2px offset · active (pressed, no lift, no tilt); whole card is one link to the produce page; `ProducePhoto` with the `SeasonRing` as a badge in its inline-end corner, name, counter-name, kind label |
| `KindChips` | guide | All · Fruit · Vegetables · Leafy greens; links; active `aria-current="true"` with primary pill that grows in on arrival (version 2, §7); hover; focus-visible; min target `--target-min` |
| `MonthScroller` | guide | twelve month links; selected `aria-current="true"` (primary pill that grows in on arrival, version 2); this month marked by a lemon dot and the visually hidden text "this month"; hover; focus-visible; inline scroll with snap at 390, all visible at 1280 |
| `CardGrid` | guide, home | filled · **empty** ("Nothing of this kind is in season in {month}." with links to All and to this month) |
| `SeasonBar` | produce | twelve cells with short month names beneath; in-season cells filled with the kind colour; this month outlined in accent with its label; a text list of the season below |
| `StorageTipPanel` | produce | one state: overline "How to keep it", the tip in the page language |
| `Hero` | home | the hero `ProducePhoto` (the only `priority` image), headline "What's fresh in Egypt this {month}" (month in accent), the `SeasonRing` dial overlapping the photo's inline-start edge with the count of produce in season in its centre, the `HeroScene` beside the dial (version 2), a link to the guide; the `MarketTexture` lies behind the whole hero band |
| `HeroScene` | home hero (version 2) | turning · paused (by its button, off-screen or tab hidden) · poster (`HeroScenePoster`: reduced motion, no WebGL, viewport under 22.5rem, low power); one reserved square frame, size identical in every state; decorative (`aria-hidden` on the canvas and poster); the pause/play button is a real `<button>` with `aria-pressed` and a catalogue label, at least `--target-min`, shown only while the scene can turn (§13) |
| `MarketTexture` | behind the home hero and the section bands of home, guide and about (version 2) | image (the manifest's `texture` row via `next/image`, `alt=""`) · pattern (the SVG pattern drawn in code); `aria-hidden`; opacity `--texture-opacity`; behind content, never above it, never under body paragraphs (§12) |
| `PhotoCredits` | about | one credit per manifest row with `credit_required`, by source (version 2): generated (subject, "Generated for Mawsim with {model}", a link to the provider's terms) · licensed (subject, author, source link, licence link) · own (subject, "Artwork by {author}"); a plain sentence when none is listed yet |
| `NotFound` | unknown slug or locale | localised message and links home and to the guide |
| `ErrorState` | error boundary | safe localised message and a link home (a button only to retry) |
| `SiteFooter` | every page | sample-data notice, "Mawsim collects nothing", about link, language link |

Icons: three inline SVGs (arrow, info, leaf) in one `Icon` component, mirrored in `rtl` where they point.

## 7. Motion and reduced motion (version 2)

- **Dial (home hero):** on first paint the twelve segments draw in sequence (stroke reveal, `--dur-dial` total,
  `--ease-out`), then this month's segment brightens once (`--dur-3`). CSS keyframes only; the final state is the
  rendered state, so nothing shifts.
- **Hero scene:** one full turn every `--scene-turn` about the vertical axis, with a gentle bob of under 2% of its
  frame. It starts only after the page is usable (§13), stops off-screen and when the tab is hidden, and pauses with
  its button. It is the only looping motion in the product.
- **Cards:** appear with a 6px rise and fade (`--dur-3`, stagger 40ms, at most 8 cards) on page load, for the cards
  in the first viewport.
- **Reveal on scroll (guide):** each section band and each card below the first viewport rises by `--reveal-rise` and
  fades in over `--dur-reveal` (`--ease-out`, stagger `--reveal-stagger`, at most 8 in a row) the first time it
  enters the view, and never again on that page view. Content is visible without JavaScript: the hidden starting
  state is applied only by the script that will reveal it.
- **Chips and months:** the active pill's background transitions (`--dur-2`); on arrival the selected pill grows in
  from 0.92 to 1 with an opacity fade (`--dur-2`); links' colour (`--dur-1`).
- **Card hover and focus:** lift `translateY(-2px)` and shadow, image zoom to `--zoom-photo`, tilt `--tilt-card`
  (mirrored in `rtl`), ring glow fading in to `--glow-ring-opacity`; `--dur-3`, `--ease-out`; the same on
  `:focus-visible`.
- Only `transform` and `opacity` animate (and the colour of links and pills). Nothing animates layout, so nothing
  shifts.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no animation or transition beyond colour. The dial, cards,
  reveals and pills render in their final state at once, hover and focus keep only the shadow and the focus ring,
  and the hero scene is its still poster.

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
- Moving content that lasts more than five seconds can be paused (WCAG 2.2.2): the hero scene's pause/play button,
  and the scene stops off-screen (version 2).
- The runner's `a11y` check (axe, WCAG 2.0–2.2 A/AA) is green on every captured state.

## 10. Resource decisions (DESIGN_METHOD §5.1, rows that fit the stack)

| Resource | Decision | Reason |
|---|---|---|
| CSS transitions, keyframes | **adopt** | all of §7 needs nothing more; no dependency |
| CSS scroll-driven animations | reject | the reveal happens once (§7); a scroll timeline would replay it backwards; one `IntersectionObserver` does it with no dependency (version 2) |
| View Transitions API | reject | Next.js's integration is experimental; the motion brief needs none |
| Motion (`motion`) | reject | version 2 re-examined it (OD-10 §4): CSS and one `IntersectionObserver` cover the reveal, the hover and the pills; lean (PR-47) |
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
| three.js + React Three Fiber (`three`, `@react-three/fiber`, MIT) | **adopt** (version 2, OD-10 §4) | the hero scene (§13), built in code; only in the home module's late-loaded client chunk |
| Drei (`@react-three/drei`) | reject | the scene needs a few primitives and lights; lean (PR-47) |
| Rive, Lottie | reject | no designed animation files |
| Barba.js / Swup | reject | Next.js routes the pages |
| assistant-ui / AI Elements | reject | not an AI product |
| Storybook | reject | a small UI; states are captured by the runner |
| Theatre.js | reject | paused upstream |
| `next/image` (built into Next.js, not in §5.1) | **adopt** | responsive, optimised, size-reserved photographs (§11) with no dependency |

## 11. Imagery (OD-09, OD-10 — version 2)

- **Sources, in order** (OD-10 §2): generated with `grok-imagine-image-2.0` by the owner's run of
  `scripts/images/generate.mjs`; open photographs under the Unsplash License, the Pexels License, CC0 or CC BY
  (Wikimedia Commons, Openverse), never share-alike, non-commercial or unclear; Mawsim's own artwork. Each image has its
  row in `content/photos.json` (`docs/CONTENT_MODEL.md` §5). A Pinterest pin, a search result or a reference image is
  not a source.
- **Art direction (every source).** Fresh, appetising produce that reads as a natural photograph: real texture, no
  glossy, plastic or over-saturated look, no heavy retouching. Natural warm daylight from one side, soft shadows,
  consistent white balance across the set. One produce (or a small group of it) per image, close and generous, on
  sand, linen, wood or a market crate; no text, logos, hands or people (A-11). One angle per slot type: three-quarter
  from slightly above for the produce images (they serve both the card and the produce page), a wider market
  composition for the hero, and a flat, even, overhead close-up of linen or crate wood with no produce and no strong
  shadow for the texture. Mawsim's own artwork follows the same light and palette.
- **Generation.** The generator builds one prompt per slot from the produce's English name and kind plus the art
  direction above, and asks for the slot's aspect ratio: `4:3` for produce, `1:1` for the hero (cropped to `4:5` and
  `5:4`), `1:1` for the texture. The owner rejects and regenerates any image that breaks this section.
- **Crop.** At least 1600 px wide (hero), 1200 px (produce) or 1024 px (texture), with the subject centred so the
  frames of §6 crop it cleanly at every width; the subject keeps a margin so the season-ring badge never covers it.
- **Performance.** `next/image` with `sizes` per frame (card about `(min-width: 64rem) 25vw, 50vw`), AVIF/WebP
  output, lazy loading except the hero, width and height from the manifest; no image above the fold shifts.
- **Fallback.** Missing image → the fallback tile in the same frame; never a broken image or empty box.
- **Dark theme.** Images are not filtered; frames get the `--color-hairline` border so light images sit on the
  cabbage ground.

## 12. Market texture (version 2)

- **Where:** behind the home hero band and the section bands (the heading band that opens a section: home's "in
  season this month", the guide's header with the month scroller and chips, the about page's header). Never behind a
  body paragraph, a card's text or the storage tip.
- **What:** the manifest's `texture` image (`next/image`, `alt=""`, covering the band, `object-fit: cover`), or, with
  no row, an SVG pattern drawn in code: a fine woven grid of hairline strokes in `--texture-ink`, repeating every
  `--texture-tile`.
- **How strong:** the layer's opacity is `--texture-opacity` (0.08) in both themes, never more; the band's ground stays
  `--color-bg`. The computed worst case in §2 keeps every text token at AA or better.
- **Behaviour:** decorative (`aria-hidden="true"`), not focusable, not animated, size reserved by its band (no shift),
  identical in both directions.

## 13. Hero scene (version 2)

- **What:** five to seven stylised low-poly produce built in code from simple geometry (a mango, an orange, a tomato,
  a date cluster, a leaf of molokhia), in the kind colours of §2 with soft warm lighting from one side, on a
  transparent background, so the sand or cabbage ground shows through. No model file, no texture image.
- **Where:** a reserved square frame beside the dial, at its inline end, never covering the headline or the hero
  image's subject. Its size is fixed by tokens at each breakpoint, so the poster, the canvas and the paused scene
  occupy exactly the same box.
- **Loading:** a client component loaded through `next/dynamic` with `ssr: false` after the page is usable. The first
  HTML carries only the poster, and the 3D code is in its own chunk.
- **When it is a still:** under reduced motion, without WebGL, on a viewport narrower than 22.5rem, and on a low-power
  device (`navigator.hardwareConcurrency` ≤ 2 or Save-Data on). The still is `HeroScenePoster`, an inline SVG of the
  same produce in the same colours (Mawsim's own artwork), with no button. These checks only choose how the
  decoration is drawn (OD-10 §4).
- **Control:** a pause/play `<button>` with `aria-pressed`, a catalogue label in both languages, the focus ring of §9,
  and `--target-min`, placed at the frame's inline-end bottom corner.
