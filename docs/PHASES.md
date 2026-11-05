# MAWSIM — Phases

The task ledger. The runner ticks Done and writes Verdict (PR-08, PR-13); nobody else does. Gates and risk-3 tasks
wait for the developer's merge.

| Task | Phase | Station | Name | Risk | Gate | Done | Verdict |
|---|---|---|---|---|---|---|---|
| T01 | P01 | J4 | Scaffold: Next.js, checks, logger, error handling, health route, architecture test | 2 | — | [x] | PASS a1 — docs/reviews/T01-a1.md |
| T02 | P01 | J4 | Security headers baseline and CSP | 3 | G-Foundation | [x] | PASS a1 — docs/reviews/T02-a1.md |
| T03 | P02 | J5 | Bilingual shell: Arabic-first locale routes, lang and dir, tokens, fonts, header and footer | 2 | — | [x] | PASS a2 — docs/reviews/T03-a2.md |
| T04 | P02 | J5 | Produce catalogue module and season logic | 2 | — | [x] | PASS a1 — docs/reviews/T04-a1.md |
| T05 | P02 | J5 | Photo slots: licence manifest, responsive photo frame with designed fallback | 2 | — | [x] | PASS a1 — docs/reviews/T05-a1.md |
| T06 | P02 | J5 | Produce page with photo, season bar and storage tip | 2 | G-Design | [x] | PASS a3 — docs/reviews/T06-a3.md |
| T07 | P03 | J5 | Guide page: card grid and kind chips | 2 | — | [x] | PASS a2 — docs/reviews/T07-a2.md |
| T08 | P03 | J5 | Guide page: twelve-month scroller | 2 | — | [x] | PASS a1 — docs/reviews/T08-a1.md |
| T09 | P04 | J5 | Home page: photo hero and in season this month; core-flow browser test | 2 | G-Public | [x] | PASS a2 — docs/reviews/T09-a2.md |
| T10 | P05 | J5 | About page with photo credits | 2 | — | [x] | PASS a2 — docs/reviews/T10-a2.md |
| T11 | P05 | J5 | Hero dial animation and motion pass with reduced motion | 2 | — | [x] | PASS a1 — docs/reviews/T11-a1.md |
| T12 | P06 | J5 | Imagery pipeline: photo manifest v2, credits for every source, generator script with a mocked API | 2 | — | [ ] | — |
| T13 | P06 | J5 | Showcase tokens and the market texture behind the hero and section bands | 2 | — | [ ] | — |
| T14 | P06 | J5 | Card hover and focus: photo zoom, mirrored tilt, season-ring glow | 2 | — | [ ] | — |
| T15 | P06 | J5 | Reveal on scroll once, and animated selected states for months and chips | 2 | — | [ ] | — |
| T16 | P06 | J5 | 3D hero scene: stylised produce in three.js / React Three Fiber, loaded late, with a still poster | 2 | — | [ ] | — |
| T17 | P06 | J5 | Showcase acceptance with the owner's images: every frame, credits, captures and the e2e | 2 | G-Showcase | [ ] | — |

## Phases

| Phase | Slice the developer can use when it ends |
|---|---|
| P01 Foundation | an app that builds and passes every check, logs in JSON, answers `/api/health`, and sends the security headers |
| P02 Produce pages | `/` → `/ar`, `/ar` and `/en` in the designed shell, and a page for each of the ten produce in both languages, with its photograph wherever a licensed one has landed |
| P03 Guide | the guide: pick a month and a kind, see the matching produce, open one |
| P04 Home and core flow | the home page with its photo hero and this month's produce; the whole core flow proven by a browser test on every run |
| P05 About and motion | the about page with the photo credits, and the calm hero animation with reduced motion |
| P06 Showcase (OD-10) | real imagery in every frame with its credits, the market texture, rich card and scroll motion, and the turning 3D hero scene with its still poster, signed off at G-Showcase |

## Phase outlines

The reviewer writes each next fence from its outline (`devos/prompts/reviewer.md`), judges its size with the
`devos-fence-writing` skill, and cites the documents named here. Module folders: `src/modules/{produce,guide,home}`
(`devos.config.json` `structure.modules`). No task adds, replaces or deletes a file in `public/photos/` or edits
`content/**` (OD-06, OD-09).

### T01 — Scaffold (risk 2)
`docs/fences/T01.md`. Builds no feature.

### T02 — Security headers baseline and CSP (risk 3, G-Foundation)
Layers: security · ops. Paths: `next.config.ts` · `tests/**`. Set every
header of `docs/SECURITY_MODEL.md` §4 for all routes in `next.config.ts` `headers()` and `poweredByHeader: false`;
the dev-only `'unsafe-eval'` keyed on `process.env.NODE_ENV`. A Vitest test imports the config and asserts each
header's exact value for production. Done when: run-checks strict exits 0; `node scripts/devos/probe.mjs` (or the
fence's equivalent) shows the headers on `/api/health`. Do NOT: weaken a value, add a nonce or middleware, add
`includeSubDomains`, add any third-party origin. Deep review; the developer merges.

### T03 — Bilingual shell, Arabic first (risk 2, UI)
Layers: design · frontend · accessibility. Move pages under `src/app/[locale]/` (root layout there with
`lang`/`dir` from `src/i18n/config.ts`, `generateStaticParams` for `ar`/`en`, unknown locale → `notFound()`);
`redirects()` `/` → `/ar` (temporary, the only redirect; no redirect from `/ar` or `/en`, so no loop) in
`next.config.ts` (deep path: keep T02's headers intact); fonts via `next/font/google` with CSS variables; full
`src/styles/tokens.css` from `DESIGN_SYSTEM.md` §2 (both themes); `src/components/`: `SiteHeader` (glass,
`Wordmark` with counter-name, nav to Guide and About, `LanguageLink` to the equivalent page), `SiteFooter`,
`SampleDataNotice`, `Icon`, skip link; a placeholder home `h1` from the catalogue; localised `not-found`. Arabic is
the primary composition (`DESIGN_SYSTEM.md` §5), English its LTR adaptation. Done when also: `node
scripts/devos/probe.mjs --strict / /ar /en` shows `/` → 307 with location `/ar`, `/ar` → 200 `lang="ar"
dir="rtl"`, `/en` → 200 `lang="en" dir="ltr"`. Screens: `home-ar /ar` · `home-en /en` · `not-found-ar
/ar/produce/unknown`. Criteria: UA-01 … UA-07, UA-10, UA-11, UA-14, UA-15, UA-18, UA-20.

### T04 — Produce catalogue and season logic (risk 2, no UI)
Layers: architecture · testing. `src/domain/season.ts` (pure: `isInSeason(months, month)`, `cairoMonth(date)`
using `Intl.DateTimeFormat` with `timeZone: "Africa/Cairo"`, `filterByKind`, parsing `month`/`kind` query values
with defaults); `src/modules/produce/` with `index.ts` exposing typed `Produce`, `ProduceKind`, `listProduce()`,
`getProduceBySlug()`, `inSeasonIn(month)`, and the server-side "this month" (`"use cache"` + `cacheLife("hours")`
or the stack's equivalent). Tests: every rule of `CONTENT_MODEL.md` §1 on the real `content/produce.json` (10 rows);
domain functions with fixed dates (including a UTC/Cairo month boundary); the architecture test still passes. Do NOT:
edit `content/**`, add zod or any dependency.

### T05 — Photo slots (risk 2, components without a route: no `- Screens:` line)
Layers: design · frontend · accessibility · testing. In `src/modules/produce/`: a typed loader for
`content/photos.json` (`getProducePhoto(slug)`, `getHeroPhoto()`, `listPhotoCredits()`) and a unit test of every rule
of `CONTENT_MODEL.md` §5 on the real file (it passes with today's empty array, and fails on a row whose file is
missing from `public/photos/`, whose key is unknown, or whose alt text or licence is empty); `ProducePhoto`: the
photo frame of `DESIGN_SYSTEM.md` §6 and §11 — `next/image` with the manifest's width and height, `sizes` per slot,
the frame's fixed `aspect-ratio`, alt text in the page's locale; with no manifest row it renders the designed
fallback (kind-colour tile with the season ring) in the same frame. Exported from `src/modules/produce/index.ts`.
A temporary preview is not added: the slot is captured on the produce page in T06. Done when: run-checks strict
exits 0; tests prove both branches (photo row present via a fixture manifest, absent). Do NOT: add, replace or
delete any file in `public/photos/`, edit `content/**`, load an image from another host, add an image dependency.

### T06 — Produce page (risk 2, UI, G-Design)
Layers: design · frontend · accessibility. `src/app/[locale]/produce/[slug]/page.tsx` with `generateStaticParams`
(10 slugs × 2 locales) and `notFound()` for an unknown slug; the `ProducePhoto` header (the photograph, or its
fallback), `SeasonBar`, `StorageTipPanel`, the counter-name heading, kind label, `SampleDataNotice`, localised
metadata and `alternates`. Components in `src/modules/produce/`. Screens: `produce-ar /ar/produce/mango` ·
`produce-en /en/produce/mango` · `produce-leafy-ar /ar/produce/molokhia`. Criteria: UA-01 … UA-11, UA-13, UA-17,
UA-18, UA-19. The developer approves the rendered direction (G-Design).

### T07 — Guide: card grid and kind chips (risk 2, UI)
Layers: design · frontend · accessibility. `src/app/[locale]/guide/page.tsx` reading `month` and `kind` query
values through the domain parsers (default: this month, all kinds); `ProduceCard` (its `ProducePhoto` thumbnail with
the `SeasonRing` as a badge), `CardGrid` with its empty state, `KindChips` as links preserving `month`; components
in `src/modules/guide/` (the card may live in `src/modules/produce/` and be exported from its entry). Screens:
`guide-ar /ar/guide?month=8` · `guide-en /en/guide?month=8` · `guide-fruit-ar /ar/guide?month=8&kind=fruit` ·
`guide-empty-en /en/guide?month=1&kind=leafy`. Criteria: UA-01 … UA-11, UA-13, UA-14, UA-16, UA-17, UA-19.

### T08 — Guide: month scroller (risk 2, UI)
Layers: design · frontend · accessibility. `MonthScroller` in `src/modules/guide/`: twelve links preserving `kind`,
selected `aria-current`, this-month dot, CSS scroll-snap at 390, all twelve visible at 1280, the selected month in
view on load without layout shift. Screens: `guide-months-ar /ar/guide?month=12` · `guide-months-en
/en/guide?month=12` · `guide-month-focus-ar /ar/guide?month=3 focus a[aria-current="true"]`. Criteria: UA-01 …
UA-07, UA-10, UA-14, UA-15.

### T09 — Home page and the core-flow test (risk 2, UI, G-Public)
Layers: design · frontend · accessibility · testing. Stages: 2 (page; then the e2e). `src/app/[locale]/page.tsx`
with `Hero` (the hero photograph or its fallback, headline with this month in accent, the static `SeasonRing` dial
with the in-season count, link to the guide) and the in-season `CardGrid`; components in `src/modules/home/`. Then
`playwright.config.ts` (Chromium, `webServer` building and starting the app on `127.0.0.1`) and
`e2e/core-flow.spec.ts`: `/` lands on `/ar` with `dir="rtl"` after one redirect → guide → choose a month and a kind
→ a produce page → its English link lands on `/en/produce/<slug>` with `dir="ltr"` → back to Arabic on the same
page; every internal link on the pages visited answers 200; `test` script becomes `vitest run && pnpm run test:e2e`
where `test:e2e` installs Chromium (`playwright install chromium`) and runs the spec; `e2e` script runs all
Playwright specs. Screens: `home-ar /ar` · `home-en /en`. Criteria: UA-01 … UA-11, UA-13, UA-16 … UA-20. The core
flow is complete here; the developer merges.

### T10 — About page with photo credits (risk 2, UI)
Layers: design · frontend · accessibility. `src/app/[locale]/about/page.tsx`: what Mawsim is, sample data and not
advice, that it collects nothing (no cookies, storage, accounts or trackers), the language rule, and the photo
credits listed from `listPhotoCredits()` (author, source and licence links; the section says so plainly when the
manifest is empty); catalogue copy in both languages; no contact data. Screens: `about-ar /ar/about` · `about-en
/en/about`. Criteria: UA-01 … UA-07, UA-09, UA-11, UA-17, UA-18. The core-flow test still passes.

### T11 — Hero dial animation and motion pass (risk 2, UI)
Layers: motion · design · accessibility. The motion of `DESIGN_SYSTEM.md` §7 in CSS only: the dial's segment draw
and settle, the card rise with stagger, chip and month transitions, card hover; all off under
`prefers-reduced-motion`. No dependency. Screens: `home-motion-ar /ar` · `home-motion-en /en` ·
`card-hover-en /en/guide?month=8 hover a[href="/en/produce/mango"]`. Criteria: UA-01 … UA-03, UA-07, UA-08,
UA-12. The core-flow test still passes.

### P06 — Showcase (OD-10, issue #17)

The tasks below implement `docs/DESIGN_SYSTEM.md` version 2. The builder never adds, replaces or deletes a file in
`public/photos/**` and never edits `content/**`: the owner runs the generator and commits the images (OD-10 §3).

### T12 — Imagery pipeline (risk 2, no UI; Stages: 2)
`docs/fences/T12.md`. Layers: architecture · frontend · testing. Stage 1: `src/modules/produce/photos.ts` reads
manifest version 2 (`docs/CONTENT_MODEL.md` §5): the `source` field (`generated` · `licensed` · `own`) with each
source's fields, the `texture` key, `.png` files, and `getTexturePhoto()`. `PhotoCredits` credits every source, using
new `about.*` catalogue strings in both languages. Fixture tests cover every rule. Stage 2: `scripts/images/generate.mjs`
(one prompt per slot from `content/produce.json` and §11; `POST https://api.x.ai/v1/images/generations` with
`grok-imagine-image-2.0`, `resolution: "2k"`, the slot's `aspect_ratio`, `response_format: "b64_json"`; the size read
from the image header; the file saved under `public/photos/`; the row upserted). It refuses to run without
`XAI_API_KEY` and never prints it. Tests in `tests/images/` mock `fetch` and write only to a temporary folder. No
dependency, no screen.

### T13 — Showcase tokens and the market texture (risk 2, UI)
Layers: design · frontend · accessibility · testing. The new tokens of `DESIGN_SYSTEM.md` §2 version 2 (motion,
tilt, zoom, glow, texture opacity) in `src/styles/tokens.css`, and `MarketTexture` (§12) behind the home hero and the
section bands of home, guide and about. It shows the `texture` manifest image through `next/image` (`alt=""`,
`aria-hidden`), or the SVG pattern drawn in code, at no more than `--texture-opacity`. A Playwright spec emulates
light and dark, asserts the layer and its opacity, and runs axe in both themes. Screens: `home-ar /ar` · `home-en /en`
· `guide-en /en/guide?month=8` · `about-ar /ar/about`. Criteria: UA-01 … UA-08, UA-11, UA-12, UA-17.

### T14 — Card hover and focus (risk 2, UI)
Layers: motion · design · accessibility. CSS only, in `src/modules/produce/ProduceCard.module.css` (and the
`SeasonRing` badge). On `:hover` and `:focus-visible`: the photo or fallback zooms to `--zoom-photo` inside its frame,
the card tilts by `--tilt-card` with the tilt mirrored in `rtl`, and the ring glows (`--glow-ring`, opacity only).
Only `transform` and `opacity` animate. Nothing moves under reduced motion; the focus ring stays. Screens:
`card-hover-en /en/guide?month=8 hover a[href="/en/produce/mango"]` · `card-hover-ar /ar/guide?month=8 hover
a[href="/ar/produce/mango"]` · `card-focus-ar /ar/guide?month=8 focus a[href="/ar/produce/mango"]`. Criteria: UA-01
… UA-04, UA-07, UA-08, UA-10, UA-12, UA-14.

### T15 — Reveal on scroll and animated selected states (risk 2, UI)
Layers: motion · frontend · accessibility · testing. One small client hook or component in `src/modules/guide/`
(`IntersectionObserver`, no dependency) reveals the guide's sections and cards once as they enter the view (§7
version 2). Content is visible without JavaScript and under reduced motion, and elements already in the first viewport
are not hidden, so the captures and axe see them. The selected month and chip pills animate in (`--dur-2`, transform
and opacity). A Playwright spec scrolls the guide and asserts each card ends visible and is never animated twice.
Screens: `guide-ar /ar/guide?month=8` · `guide-en /en/guide?month=8` · `guide-chip-focus-en /en/guide?month=8&kind=fruit
focus a[aria-current="true"]`. Criteria: UA-01 … UA-07, UA-10, UA-12, UA-14, UA-15.

### T16 — 3D hero scene (risk 2, UI; package.json makes the review deep; Stages: 2)
Layers: design · motion · frontend · accessibility · security · testing. Dependencies `three`, `@react-three/fiber`
and `@types/three` (dev), each named by its fence line (PR-47), with the Boundary gate's evidence: no network call,
no telemetry, no CSP change. Stage 1: `HeroScene` in `src/modules/home/`. It is code-built, stylised low-poly
produce in the kind colours, turning slowly (§13), loaded through `next/dynamic` with `ssr: false` after the page is
usable. It pauses off-screen and when the tab is hidden, and has a pause/play `<button>` (catalogue strings, WCAG
2.2.2). It renders `HeroScenePoster` (the SVG still) under reduced motion, without WebGL, below 22.5rem, and on a
low-power device (OD-10 §4), all in one reserved square frame. Stage 2: the hero layout of §6 version 2, and a
Playwright spec: the poster under reduced motion, the scene chunk absent from the first HTML's scripts, no console
error, and CLS 0. `docs/STACK.md` "Rendering" gains the client-component exception. Screens: `home-ar /ar` · `home-en
/en` · `home-scene-pause-en /en click button[aria-pressed]`. Criteria: UA-01 … UA-12.

### T17 — Showcase acceptance with the owner's images (risk 2, UI, G-Showcase)
Layers: design · frontend · accessibility · testing. Precondition: the owner's image commit is on `main`, with
`content/photos.json` holding 12 rows (hero, texture and the ten produce), counted by command. Otherwise the fence
HALTs. `e2e/showcase.spec.ts`: every card, every produce page and the hero render an `<img>` from `/photos/` (none
shows the fallback). The about page lists one credit per row in both languages. The texture image is used. The 3D
chunk loads after the page is usable. The core-flow test still passes. Fixes only in code (badge clearance, crops
through `object-position` tokens). Screens: every page in both locales (home, guide, produce mango and molokhia,
about). Criteria: UA-01 … UA-20. The owner merges.
