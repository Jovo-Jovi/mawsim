# MAWSIM — Phases

The task ledger. The runner ticks Done and writes Verdict (PR-08, PR-13); nobody else does. Gates and risk-3 tasks
wait for the developer's merge.

| Task | Phase | Station | Name | Risk | Gate | Done | Verdict |
|---|---|---|---|---|---|---|---|
| T01 | P01 | J4 | Scaffold: Next.js, checks, logger, error handling, health route, architecture test | 2 | — | [x] | PASS a1 — docs/reviews/T01-a1.md |
| T02 | P01 | J4 | Security headers baseline and CSP | 3 | G-Foundation | [x] | PASS a1 — docs/reviews/T02-a1.md |
| T03 | P02 | J5 | Bilingual shell: Arabic-first locale routes, lang and dir, tokens, fonts, header and footer | 2 | — | [x] | PASS a2 — docs/reviews/T03-a2.md |
| T04 | P02 | J5 | Produce catalogue module and season logic | 2 | — | [ ] | — |
| T05 | P02 | J5 | Photo slots: licence manifest, responsive photo frame with designed fallback | 2 | — | [ ] | — |
| T06 | P02 | J5 | Produce page with photo, season bar and storage tip | 2 | G-Design | [ ] | — |
| T07 | P03 | J5 | Guide page: card grid and kind chips | 2 | — | [ ] | — |
| T08 | P03 | J5 | Guide page: twelve-month scroller | 2 | — | [ ] | — |
| T09 | P04 | J5 | Home page: photo hero and in season this month; core-flow browser test | 2 | G-Public | [ ] | — |
| T10 | P05 | J5 | About page with photo credits | 2 | — | [ ] | — |
| T11 | P05 | J5 | Hero dial animation and motion pass with reduced motion | 2 | — | [ ] | — |

## Phases

| Phase | Slice the developer can use when it ends |
|---|---|
| P01 Foundation | an app that builds and passes every check, logs in JSON, answers `/api/health`, and sends the security headers |
| P02 Produce pages | `/` → `/ar`, `/ar` and `/en` in the designed shell, and a page for each of the ten produce in both languages, with its photograph wherever a licensed one has landed |
| P03 Guide | the guide: pick a month and a kind, see the matching produce, open one |
| P04 Home and core flow | the home page with its photo hero and this month's produce; the whole core flow proven by a browser test on every run |
| P05 About and motion | the about page with the photo credits, and the calm hero animation with reduced motion |

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
