# MAWSIM — Stack

The chosen stack in one page (PR-47). Every builder follows it; a fence may narrow it, never widen it without an OD.

## 1. Versions (npm `latest`, read 2026-11-02)

| Package | Version | Role |
|---|---|---|
| `next` | 16.4.x (16.4.3) | framework, App Router, Turbopack (default) |
| `react`, `react-dom` | 19.3.x | UI |
| `typescript` | the version `create-next-app` pins | types |
| `eslint` + `eslint-config-next` | the versions `create-next-app` pins | lint (flat config, `eslint.config.mjs`) |
| `pino` | 10.4.x | the one structured logger |
| `gsap` | 3.15.x (3.15.1) | scroll-scrubbed motion (ScrollTrigger) and the guide's shared-layout re-sort (Flip) |
| `lenis` | 1.3.x (1.3.27) | smooth scroll for the home story only |
| `vitest` | 5.0.x | unit and architecture tests |
| `@playwright/test` | 1.64.x | browser tests and the runner's captures (dev) |
| `@axe-core/playwright` | 4.14.x | accessibility checks in the runner's captures (dev) |

Runtime: Node 22, pnpm 10 (PR-01). No other dependency without the fence line that needs it (PR-47).

## 2. Commands (`devos.config.json` `stack.commands`)

| Check | Command | Script in `package.json` |
|---|---|---|
| install | `pnpm install --frozen-lockfile` | — |
| guards | `pnpm run guards` | `node scripts/guards/run-all.mjs` |
| typecheck | `pnpm run typecheck` | `tsc --noEmit` |
| lint | `pnpm run lint` | `eslint .` (ignores `scripts/**`, `devos/**`, `docs/**`, `.devos/**`, `.claude/**`, `.cursor/**`) |
| test | `pnpm run test` | `vitest run`; from T09 also the core-flow browser test (§5) |
| build | `pnpm run build` | `next build` |
| preview | `pnpm exec next start -H 127.0.0.1 -p {port}` | the runner serves the build for captures |

The whole suite: `node scripts/devos/run-checks.mjs --strict` (exits 0 only when every required check passes).

## 3. Folder layout

```
content/produce.json            developer-owned sample data (the builder never edits content/**)
content/photos.json             developer-owned photo manifest (OD-09, OD-10): hero, produce and the texture. The owner writes the rows, by hand or with scripts/images/generate.mjs, which he runs on his own computer (OD-10 §3)
public/photos/{hero,produce,texture}/   developer-owned photographs, including the texture folder (outside surfaces.builder). The owner fills them by running scripts/images/generate.mjs on his own computer (OD-10 §3)
src/app/[locale]/               routes: page.tsx (home), guide/, produce/[slug]/, about/; layout.tsx sets lang/dir
src/app/api/health/route.ts     the health route (the one boundary zone, OD-05)
src/app/global-error.tsx        last-resort error boundary (safe message)
src/instrumentation.ts          onRequestError → logger
src/domain/                     pure TypeScript: season logic; imports nothing from next, react, src/app or a data client
src/modules/produce/            loading and typing the Produce rows; produce page parts   → public entry index.ts
src/modules/guide/              month scroller, kind chips, card grid                     → public entry index.ts
src/modules/home/               hero, "in season this month"                              → public entry index.ts
src/components/                 shared UI: header, footer, language link, sample-data notice, icons
src/i18n/                       config.ts (locales, defaultLocale, directionOf), messages/en.json, messages/ar.json
src/lib/logger.ts               the pino logger
src/styles/tokens.css           every colour, space, radius, type and motion token (guard:design reads the rest)
tests/                          architecture and other cross-module tests (Vitest)
e2e/                            Playwright specs (from T09)
```

Code outside a module imports it only through its `index.ts` (`guard:imports`, PR-58). The task that first builds a
module creates its folder and its entry.

## 4. Conventions

- **Routing.** Every page lives under `src/app/[locale]/`; `generateStaticParams` returns `ar` and `en`; an unknown
  locale is `notFound()`. `/` → `/ar` by one `redirects()` entry in `next.config.ts` (`permanent: false`, 307), the
  only redirect, so no loop is possible. No proxy or middleware: nothing is read from the request to choose a
  language.
- **Images.** Photographs are local files in `public/photos/` (`hero/`, `produce/` and `texture/`), rendered with
  `next/image` (built in; optimised to AVIF/WebP in responsive sizes by `next start`) using the manifest's `width`
  and `height`, a `sizes` value per slot and the frame's fixed `aspect-ratio`, so nothing shifts. The hero is the
  only `priority` image; the rest load lazily. The owner generates a file and its manifest row with
  `scripts/images/generate.mjs`, which he runs on his own computer (OD-10 §3). No remote image host is configured.
- **Rendering.** Server Components by default; `"use client"` only for a control that needs browser state. `ThemeSwitch`
  (`src/components/theme/ThemeSwitch.tsx`) is a client component: it reads the remembered choice and applies it when a
  button is pressed. `public/theme-init.js` is the one synchronous head script (OD-12 §4): it applies a stored Light or
  Dark choice before first paint. `Reveal`
  (`src/modules/guide/Reveal.tsx`) adds an attribute and an observer and renders no state. `YearStoryMotion`
  (`src/modules/home/YearStoryMotion.tsx`) scrubs the home story with `gsap` ScrollTrigger and, only while motion
  is allowed, smooths that scroll with `lenis`. `GuideMotion` (`src/modules/guide/GuideMotion.tsx`) re-sorts the
  guide cards with `gsap` Flip. `SeasonArcMotion` (`src/modules/produce/SeasonArcMotion.tsx`) scrubs the produce
  photograph with `gsap` ScrollTrigger. The hero scene and its canvas are not part of the build. Every control is
  a link or a button. The produce pages are generated for every slug × locale. "This month" is
  computed on the server in `Africa/Cairo` and cached for at most an hour (with Cache Components, a `"use cache"`
  function with `cacheLife("hours")`), so the content is never changed, only revealed.
- **Data.** `content/produce.json` is imported once, in `src/modules/produce/`, and checked by a unit test (unique
  slugs, kinds in `ProduceKind`, months 1–12, non-empty names and tips in both locales). No database, no fetch.
- **Strings.** Every interface string is in both catalogues with identical keys (`guard:i18n`); `lang` and `dir` come
  from the locale, never a literal. Produce names and tips come from the data, by locale.
- **Styles.** CSS Modules plus `src/styles/tokens.css`; logical properties only; no raw colour or px outside the
  tokens (1px hairlines allowed); no Tailwind (OD-04).
- **Errors.** A thrown error is logged once through `logger` with a stable `event` name and the error, and the
  visitor sees a safe message from the catalogue — never a stack trace or internal detail.
- **Names.** `GLOSSARY.md`: entity names exact, forbidden bare nouns never.

## 5. Testing

- Vitest runs `src/**/*.test.ts(x)` and `tests/**/*.test.ts` only (never `scripts/**`, `e2e/**`), in the `node`
  environment unless a test needs another.
- `tests/architecture.test.ts` proves the stack's rule: code under `src/domain` imports nothing from `next`, `react`,
  `react-dom`, `@/app`, `src/app` or a database client (`@supabase/*`, `pg`, `firebase*`, `mongodb`, `prisma`).
- Domain logic (`isInSeason`, the Cairo month, kind filtering) has unit tests with fixed dates.
- From T09, `pnpm run test` also runs the core-flow browser test (`e2e/core-flow.spec.ts`, Playwright, Chromium,
  against the production build on `127.0.0.1`): `/` lands on `/ar` (`dir="rtl"`) → guide → a month and a kind → a
  produce page → the English page with `dir="ltr"` → back to Arabic, with every internal link visited answering 200. The runner's `a11y` and `ui-evidence` checks cover axe and captures (DESIGN_METHOD §4).

## 6. Logging

One logger, `src/lib/logger.ts`, exporting `logger` (pino, JSON lines to stdout, `level` from `LOG_LEVEL`, default
`info`; `base` holds `app: "mawsim"`). Every log line goes through it; `console.*` is not used in `src/`. A line
carries an `event` name (`health.check`, `request.error`) and only what it needs: never an IP address, user agent,
cookie, header dump or request body (Boundary gate). Server errors reach it through `onRequestError` in
`src/instrumentation.ts`. The logger is server-only.
