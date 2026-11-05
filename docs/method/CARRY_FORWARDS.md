# MAWSIM — Carry-forwards

Every finding becomes a row; the landing task allocates the id from the live maximum (handbook §5.2).
**Live maximum: CF-48.**

One item carried across later reviews stays one row. A bullet that lists several items has one row each.
An item marked "Owner: none" or "no action" is not a row. `closed` only where a later review, or T10 stages 1–3, shows the item done.

| CF | Item | Owner | Status | Lands at |
|---|---|---|---|---|
| CF-01 | Root `README.md` (from `devos init`) was deleted: T01 Done-when 8 named it in `ls` while step 2 meant only the generator's README. Recoverable from `bcf3e3e`. T02: still absent. | developer | open | — |
| CF-02 | Toolchain warnings on every test run: Vitest's unmet peer `@types/node@^22 \|\| >=24` (generator left `^20`) and Vite's ESM-config-as-CommonJS notice for `vitest.config.ts`. Checks pass. | reviewer | open | — |
| CF-03 | pino's default `err` serializer writes the message, stack and enumerable properties of a thrown error. From T03, a message built from a request value (`locale`, `slug`, `month`, `kind`) would reach a log. | reviewer | open | T03, T04 |
| CF-04 | `SECURITY_MODEL.md` §5 says no version reaches a response, but Next's client bootstrap sets `window.next.version`, outside the app's control. DOC CORRECTION: §5 should say "responses the app controls". | reviewer | open | — |
| CF-05 | Dependency advisories were not checked with network (`SECURITY_MODEL.md` §6). T02 marks this CLOSED by D7 (`pnpm audit --prod`). | T02 builder | closed | T02 |
| CF-06 | No request-derived value may enter a `"use cache"` function (`cacheComponents: true`), or one visitor's result could be served to another. | reviewer | open | T03, T04 |
| CF-07 | `NODE_ENV=development next build` would put the dev CSP (`'unsafe-eval'`) into a build manifest. No deploy exists. Every fence that touches `next.config.ts` proves no `'unsafe-eval'` on the built app. | reviewer | open | T03 |
| CF-08 | The header test checks `source` but not that the rule has no `has`, `missing` or `locale` condition. | T03 builder | open | T03 |
| CF-09 | The header's Guide and About nav links, the footer About link and NotFound's guide link were left out of T03 until those pages exist, and no later outline added them back. | reviewer | closed | T10 |
| CF-10 | `DESIGN_SYSTEM.md` amendment for the focus-ring tokens, the `info` → `notice` glyph rename (forbidden noun), and ErrorState's "link home" (§6), which no task builds yet. | reviewer | open | — |
| CF-11 | DOC CORRECTION. `docs/STACK.md` §3/§4 should name `src/app/global-not-found.tsx`, `experimental.globalNotFound` and the real mechanism: the root layout renders `lang`/`dir` for every segment (fallback `defaultLocale`), each page calls `localeParam()`, and `src/app/[locale]/not-found.tsx` catches the throw. A layout-level `notFound()` loses `lang`/`dir` on 16.4.3. | reviewer | open | — |
| CF-12 | DOC CORRECTION. On 16.4.3 the `/` 307 carries none of the six headers. `SECURITY_MODEL.md` §4 says "every route", so it should record the redirect as a known framework exception. | reviewer | open | — |
| CF-13 | Since the root layout no longer enforces the closed locale set, every new page must call `localeParam()`, and its fence must probe an unknown locale on the new route. Also consider narrowing `localeSegment()`, which exports the raw segment. | reviewer | open | T06, T07, T10 |
| CF-14 | Decide whether `global-not-found.tsx` and `experimental.globalNotFound` stay, since no URL reaches them. Removing them is a deep-path change. | reviewer, developer | open | — |
| CF-15 | Set IBM Plex Sans Arabic `subsets: ["arabic", "latin"]`, so punctuation and Western digits in Arabic text do not swap faces after first paint. | builder | closed | T10, step 7 |
| CF-16 | Align the focused skip link with the container edge at 64rem and wider (`PageShell.module.css`). | builder | open | T09 |
| CF-17 | The runner should capture a hydrated 404 state (`not-found-ar`). The runner counts a 404 as a failed request, so the not-found page has no capture. | method (developer) | open | — |
| CF-18 | The runner should capture each state in dark as well as light (UA-11). `screens.mjs` sets no `colorScheme`, so dark evidence rests on computed contrast. | method (developer) | open | — |
| CF-19 | `SeasonRing` had no this-month accent tick because `ProducePhoto` got no `CalendarMonth`. | T06, T07 | closed | T06, T07 |
| CF-20 | The season text equivalent ("In season: July – October") beside the ring was not rendered. | T06, T07 | closed | T06, T07 |
| CF-21 | `ProducePhoto` is a card-sized dial; confirm it reads well at the 3:2 page frame at 390 and 1280. | T06 | open | T06 |
| CF-22 | Locale punctuation in code: `SeasonBar` state joiner (`", "` and `"، "`) and the produce page's title joiner (`" — "`) sat outside the two catalogues. | builder | closed | T07 |
| CF-23 | `ensureStatic = "navigation"` on the produce page: under `next start`, each slug never seen before is rendered on demand and may be cached with no cap. The 404 payload echoes the typed slug in `__next_f`. Settle both before any deploy OD. | reviewer | open | — |
| CF-24 | The sample-data notice shows twice (page body and `SiteFooter`). Decide whether `DESIGN_SYSTEM.md` §6 keeps the page-body notice. | developer, reviewer | open | T11 |
| CF-25 | Filmstrip clock: `motion.json` `frame_ms` is the same for all five frames of every capture, and negative for `produce-en-1280`, so a strip cannot show motion over time. | reviewer | open | T11 |
| CF-26 | Fallback-tile ring: the in-season arcs read as hollow, and the accent tick is 1.64:1 on the fruit tile and 1.24:1 on the leafy tile. | developer, reviewer | open | — |
| CF-27 | The runner image lacks Playwright's Chromium; the builder installs it every attempt. | reviewer | open | — |
| CF-28 | `DESIGN_SYSTEM.md` says the `SeasonBar` has "short month names". T06 sets full Arabic names, two rows of six, where twelve equal cells cannot hold them. Amend §6 so later tasks inherit the rule. | reviewer | open | — |
| CF-29 | Thirty-two failed builder runs: T06 attempt 3's builder exited 1 unreported 32 times before the stage-1 run succeeded. The cause is outside the repository's code. | developer, reviewer | open | — |
| CF-30 | `docs/method/CARRY_FORWARDS.md` had no rows ("Live maximum: none"), although every review since T01 describes rows. | builder | closed | T10 |
| CF-31 | The name pill in the card tile hides the counter-name below an 8rem frame, and the fallback pill sits over the ring's 3 and 9 o'clock arcs. The card text repeats the name. | T11 | open | T11 |
| CF-32 | Home card names were restyled by a `.season h2` selector, so "Pomegranate" crossed its card border. | builder | closed | T09 |
| CF-33 | At 1280 the `home.dialCount` sentence sits under the headline, far from the dial. | T11 | open | T11 |
| CF-34 | `globals.css` sets a colour transition on `a`. `DESIGN_SYSTEM.md` §7 ("links' colour, `--dur-1`"): `globals.css` keeps its `a` transition and its reduced-motion block. | T11 | closed | T11 |
| CF-35 | Synthetic photo fixtures used `author: "Huda N."`, which reads as a person's name. | builder | closed | T10 |
| CF-36 | `src/app/[locale]/page.tsx` throws when a month has no produce (none today). | developer | open | — |
| CF-37 | `card-names.spec.ts` runs only in the optional `e2e` check (`test:e2e` runs `core-flow.spec.ts` only), so a failure there would not override a PASS (PR-08). | reviewer | open | T11 |
| CF-38 | In the first film frame the Arabic `h1` is 17px wider than from 47ms on, so the Arabic 700 face arrives late. The line count is the same and the shift is 0. | T11 | open | T11 |
| CF-39 | At 390 the dial sits below the photo. §5 says "below the headline" and §6 says "overlapping the photo's inline-start edge". The wording should be settled. | T11 | open | T11 |
| CF-40 | The licence name accepts any non-empty string, while `CONTENT_MODEL.md` §5 names a closed set (Unsplash License, Pexels License, CC0 or CC BY). Decide whether manifest v2 should enforce that set. | reviewer | open | — |
| CF-41 | The poster and the scene differ in composition. When the scene replaces the poster, the produce visibly jumps up and shrinks (poster x784–970 y245–401, scene x792–956 y228–358, `home-en-1280-film-320.png` against `-film-640.png`). This is not a layout shift, and §13 asks only for "the same produce in the same colours". The poster's bottom sits inside the band, but the button never shows with the poster. | developer | open | G-Showcase |
| CF-42 | Every e2e that measures layout or reads computed style after `page.goto` first waits for the element to be visible, because the layout's `<Suspense>` hides the body at `load`. `e2e/showcase.spec.ts` and the Stage 1 specs (`hero-scene.spec.ts` `boxOf`, `card-motion.spec.ts`) do this; no `waitForTimeout`. | reviewer | closed | T17 |
| CF-43 | Size of the late scene chunk. Measured on the T17 build: `.next/static/chunks/0v7dp6epeqnci.js` is 927041 bytes (`wc -c`) and 243431 bytes gzipped (`gzip -c <file> \| wc -c`). The budget is the developer's decision at G-Showcase. | developer | open | G-Showcase |
| CF-44 | The frame's placement under OD-10 §1 ("beside the dial"): from 64rem it sits above the photograph and leaves about 180px empty above the photograph's inline end. | developer | open | G-Showcase |
| CF-45 | The "Pomegranate" label overlapped its ring on the fallback card tile. With every manifest row present, the captures show the photograph in that frame and no fallback tile. | reviewer | closed | T17 |
| CF-46 | Capture method: after the hover, the full-page shot paints the sticky header mid-page, and the 390 filmstrips of `home-en`/`home-ar` never reach the frame, which is below the fold. | method (developer) | open | — |
| CF-47 | `docs/SESSION_CONTEXT.md` still said "P05 … complete · Next task: none" after T16. T17 rewrites it for P06, with T12–T16 done and T17 waiting at G-Showcase. | T17 builder | closed | T17 |
| CF-48 | T16 attempt 3's D2 lockfile count cited "the script" without its command. Attempt 4 did not repeat that count. Report hygiene: a count names its command. | builder | open | — |
