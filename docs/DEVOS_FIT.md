# MAWSIM — Dev OS fit research

Written by the blueprint on 2026-11-02 from `devos/answers.json`, `devos/intake-docs/` (`mwasim-ref.txt`,
`produce.json`), the four images in `docs/design/references/` and Dev OS v2 (`docs/method/DEV_OS_V2_REVIEWER.md`
§0–§13, §17, §18). The developer approves it by merging the blueprint. Where the answers and research left something
open, the safer option was chosen and is listed in §10 as an **assumption**.

## 1. The project in one paragraph

Mawsim ("season" in Arabic, موسم) is a small bilingual guide (English and Arabic) to which fruits and vegetables are in
season in Egypt, month by month. It is a test product: its ten produce rows are the developer's sample data
(`content/produce.json`, a byte copy of `devos/intake-docs/produce.json`), not farming or nutrition advice. Four page
types: a home page with an animated hero and "in season this month"; a guide page with a 12-month scroller and kind
chips (fruit, vegetable, leafy greens) filtering a card grid; one page per produce with a 12-month season bar and a
storage tip; an about page. Licensed fruit and vegetable photography is part of the identity (OD-09). No accounts,
forms, search box, cookies, browser storage, analytics or trackers. Language from the URL (`/ar/…`, `/en/…`), Arabic
the default (`/` → `/ar`) and right to left, the colour theme follows the system, calm motion that respects
reduced motion, mobile-first at 390 and 1280, WCAG 2.2 AA, no layout shift. Stack: Next.js (App Router) with
TypeScript, pnpm, Vitest, pino. No database, storage, sign-in or hosting provider; repository public; deploy none.

## 2. Profile and data classification

- **Profile A, adapted** (handbook §0): a public bilingual site that collects no personal data. It has **no Operator
  dashboard, no partner area and no database**: the content is a static, developer-owned file.
- **Non-waivable gate: Boundary** (§10.2). No form, input, cookie, browser storage, beacon, analytics or tracker
  anywhere; one declared zone, `health` (the `/api/health` route handler that the stack's scaffold requires, which
  reads and returns nothing about the visitor) — `docs/BOUNDARY_MODEL.md`, OD-05.
- **Domain gate: none.** The produce rows are sample data, labelled as such on every page that shows them (OD-06);
  the builder may not edit `content/**` (it is outside `surfaces.builder`), so the data is transcribed, never
  "corrected".
- **Data classification:**

| Data | Where | Personal? | Class |
|---|---|---|---|
| Produce rows (names, kind, months, storage tips, en/ar) | `content/produce.json` | no | public, developer-owned sample |
| Interface strings (en/ar) | `src/i18n/messages/*.json` | no | public |
| Photographs and their licence manifest (author, source, licence, alt text) | `public/photos/`, `content/photos.json` | no — a photographer's published credit name is shown only as the licence asks; no image shows an identifiable person by intent (A-11) | public, developer-owned, licensed |
| Server logs (pino, stdout) | the process running `next start` | no — the logger never records IP addresses, user agents, cookies or request bodies (§6) | operational |
| Visitor data | — | — | **none is collected, stored or sent** |

## 3. Stations, gates, documents and guards this project needs

| Station | Fit | Why |
|---|---|---|
| J0 Intake | **Adapt** — done by `devos init` | no client estate, no domain, no old site: the estate inventory is "none" (§10 A-07) |
| J1 Scope | **Include** | brief, glossary, decisions, scope (this blueprint); no quotation (a test product, A-01) |
| J2 Models | **Adapt** | `CONTENT_MODEL.md`, `I18N_MODEL.md`, `SECURITY_MODEL.md`, `BOUNDARY_MODEL.md`; **Omit** `DATA_MODEL.md` (no database, `stores_data` false) and `PROTECTION_MODEL.md` (no personal data) |
| J3 Design | **Include** | `DESIGN_SYSTEM.md`, `design/REFERENCES.md`, `design/UI_ACCEPTANCE.md` now; G-Design on T06, the first full page |
| J4 Foundation | **Include** | T01 scaffold, T02 headers baseline (G-Foundation) |
| J5 Public site | **Include** | T03–T11 |
| J6 Dashboard and accounts | **Omit** | no accounts (brief: "no accounts") |
| J7 Content entry and domain sign-off | **Omit** | the content is a static sample file; no domain gate (OD-06) |
| J8 Features that need content | **Omit** | no search, no catalogue backend (brief: "no search box") |
| J9 Freeze and hardening | **Adapt** | MVP scope: no production-readiness phase; a later change request adds one if the product is deployed |
| J10 Handover and cutover | **Omit** | deploy is `none`; no domain, no DNS |
| J11 Maintenance | **Omit** | test product |

| Gate | Fit |
|---|---|
| G-Scope | signed by merging this blueprint (OD-01…OD-07) |
| G-Models | the J2 documents in this blueprint |
| G-Foundation | T02 (risk 3, headers) — human gate |
| G-Design | T06 — human gate: the first page that composes the whole design system, in both locales |
| G-Public | T09 — human gate: the core flow is complete and its end-to-end test lands |
| Boundary | every task (guard:boundary, non-waivable) |

| Guard | Fit |
|---|---|
| `guard:naming` | Include — forbidden nouns in `GLOSSARY.md` §3 |
| `guard:design` | Include — tokens only, logical properties only, no third-party host |
| `guard:i18n` | Include — `en` and `ar` catalogues with identical keys |
| `guard:boundary` | Include — non-waivable |
| `guard:literals` | Include — no phone or email literal (the about page has no contact data) |
| `guard:phases`, `guard:fences`, `guard:scope`, `guard:imports`, `guard:design-spec`, `guard:skills`, `guard:secrets`, `guard:config`, `guard:manual` | Include — the method's own |
| `guard:schema`, `guard:data`, `guard:services`, `verify_seed` | N/A — no database, storage or Firebase module (PR-53) |
| Dependency audit | Include — through the stack's install and lint; no extra tool |
| Spec runner | Include — `pnpm run test` (Vitest; from T09 also the core-flow browser test) |

## 4. Layers — Include · Omit · Adapt

| Layer (handbook §9) | Decision | Cites |
|---|---|---|
| Framework: Next.js App Router, every page under `[locale]` | **Include** | brief: "The language comes from the URL (/en/…, /ar/…)"; Arabic default (D-01) |
| Styling: one token stylesheet + CSS Modules, logical properties | **Include**; Tailwind **Omit** (`--no-tailwind`, OD-04) | brief: Arabic laid out right to left; guard:design reads CSS |
| Strings: one catalogue per locale, key parity | **Include** | brief: "in English and Arabic" |
| Data: Supabase Postgres | **Omit** → **Adapt**: one static JSON file, `content/produce.json`, read at build | `stores_data` false; the developer supplied the rows (OD-06) |
| Staff auth, partner auth, privileged key | **Omit** | brief: "no accounts" |
| Media: private bucket | **Omit** → **Adapt**: licensed photographs as static files in `public/photos/` with a licence manifest, served by `next/image`; no bucket, no uploads | R-10, OD-09 |
| Search | **Omit** | brief: "no search box" |
| Headers: HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors, minimal CSP | **Include** (T02) | brief: "no … analytics or trackers" — the CSP refuses every third-party script; handbook §9 sets them at J4 |
| Other systems on the domain | **Omit** | no domain |
| Feature flags | **Omit** | nothing ships behind a sign-off |
| Structured logging + error handling (pino) | **Include** (T01) | `modules.observability` = `structured-logs` |
| Error tracking provider (Sentry) | **Omit** | `modules.observability` is not `sentry`; MVP scope has no pre-launch phase |
| Theme: light and dark from `prefers-color-scheme` | **Include** | brief: "the colour theme follows the system" |
| Motion: CSS transitions and keyframes, `prefers-reduced-motion` | **Include**; Motion library **Omit** | brief: "Motion is calm and purposeful, and it respects reduced motion" |
| Feature modules `src/modules/{produce,guide,home}` with public entries | **Include** | PR-58; one per feature area the phases build |
| Pure season logic in `src/domain/` | **Include** | stack architecture rule; "in season this month" must be testable without the framework |

## 5. Stack fit and providers

| Item | Choice | Note |
|---|---|---|
| `stack` | `next` — Next.js 16.4 (npm `next` latest 16.4.3, read 2026-11-02), React 19.3, TypeScript, pnpm 10, Node 22 | `docs/STACK.md` |
| `modules.database` | none | no `supabase/`; PR-17 module never starts (PR-53) |
| `modules.storage` | none | — |
| `modules.auth` | none | — |
| `modules.hosting` | none | no Vercel deploy, no `DEVOS_VERCEL`; the runner previews the production build locally (`stack.preview`) |
| `modules.observability` | `structured-logs` | pino (npm latest 10.4.0) behind one `logger`; T01 |
| Tests | Vitest (npm latest 5.0.5); Playwright 1.64 and `@axe-core/playwright` 4.14 as dev dependencies from T01 | the runner's UI evidence (DESIGN_METHOD §4) and, from T09, the core-flow browser test |
| Fonts | Inter and IBM Plex Sans Arabic through `next/font/google` (self-hosted at build, metric fallbacks prevent layout shift) | the brand line of `mwasim-ref.txt`; build retries per PR-24 |
| Current month | computed on the server in the `Africa/Cairo` time zone | brief: "in season this month" for people in Egypt (A-04) |

No provider key is needed by the product. The cycle needs only the agent credentials (§8).

## 6. Obligations

| Obligation | Applies? | Source | How it is met |
|---|---|---|---|
| Egypt Personal Data Protection Law (Law No. 151 of 2020) and its Executive Regulations | **Not engaged** — nothing personal is collected or processed | Official Gazette No. 28 (bis H), 15 July 2020; handbook §10.3 | Boundary gate; the logger records no IP address, user agent, cookie or body; no cookies or storage, so no consent banner is needed. *Assumption A-05:* server access logs of a future host are outside this repository and are decided when a deploy is added. |
| WCAG 2.2 level AA | **Yes** (brief) | W3C Recommendation, WCAG 2.2 (5 October 2023; updated 12 December 2024) | `DESIGN_SYSTEM.md` §9, `UI_ACCEPTANCE.md`, the runner's `a11y` check (axe, WCAG 2.0–2.2 A/AA) and the reviewer's reading of the captures |
| Font licences | **Yes** | SIL Open Font License 1.1 (Inter; IBM Plex Sans Arabic) | self-hosted by `next/font`; licence named in `DESIGN_SYSTEM.md` §2 |
| Reference images | **Yes** | copyright of their owners | used as references only; nothing reproduced (`design/REFERENCES.md`) |
| Photograph licences | **Yes** (OD-09) | each image's own licence or written permission | only commercial-use licences; one manifest row per image with source, author, licence and licence URL; attribution on the about page where required. A pin on Pinterest is not a licence (Pinterest hosts images re-shared by its users, who are mostly not the rights holders) |
| Not advice | **Yes** (brief) | brief: "sample data, not farming or nutrition advice" | the sample-data notice on home, guide, produce and about (OD-06) |
| Public repository | **Yes** (answers) | handbook §7, §16.6 | no secrets, no personal data, no operational assessment of third-party systems; no CI trigger runs fork code with repository context (the installed workflows) |

## 7. Deviations from the handbook

- No quotation, no client signatory: the developer is the client; merging is the signature (OD-01).
- No database: the content model is a JSON file in `content/`, which the builder may not edit (OD-06).
- One route-handler zone, `health`, declared for the scaffold's health route (OD-05).
- No J6–J8, J10–J11 stations (§3).

## 7a. Tooling review

Read on 2026-11-02: `https://cursor.com/marketplace` (the page collapses most of its lists; the visible entries were
judged) and `https://cursor.com/docs/models`. Every item is judged against the Boundary gate, "a tool is never
authority", "a connected MCP is not permission" (PR-05) and "the runner owns git" (PR-04).

| Item | Kind | Decision | Reason |
|---|---|---|---|
| Context7 | MCP (docs) | **Include** — `.cursor/mcp.example.json`, `devos/ci/mcp.ci.json`, `devos/ci/mcp.claude.json` | read-only current library documentation; PR-05, PR-47 |
| Playwright | MCP (marketplace "Playwright") | **Include for manual IDE runs only** — `.cursor/mcp.example.json`, never in CI | local rendered checks; the runner captures evidence itself (DESIGN_METHOD §6) |
| Motion (marketplace plugin: animation best practices) | skill | **Omit** | the product uses CSS motion, and pinned skills already cover motion review (`review-animations`, `emil-design-eng`); a tool is never authority |
| GSAP (marketplace plugin) | skill | **Omit** | GSAP is rejected for this product (`DESIGN_SYSTEM.md` §10) |
| Figma, Canva, Paper, MagicPath, Framer | design MCP | **Omit** | the design contract is the repository's files; no design file was given |
| Vercel, Netlify, Cloudflare, Render, Railway, AWS, Azure, DigitalOcean | deploy MCP | **Omit** | deploy is `none` |
| Supabase, Neon, PlanetScale, Prisma, MongoDB, Turso, Firebase, Convex | data MCP | **Omit** | no database |
| Sentry, Datadog, Grafana, Coralogix, PostHog | observability MCP | **Omit** | structured logs only; PostHog, Mixpanel, Amplitude, Fullstory, Statsig, GrowthBook and similar analytics would break the Boundary gate |
| Clerk, WorkOS | auth | **Omit** | no sign-in |
| GitHub/GitLab/Linear/Atlassian/Slack/Notion/Google Workspace plugins | productivity MCP | **Omit** | the runner owns git and PRs (PR-04); issues go through the DEV_OS forms |
| Automations: "Assign PR reviewers" (auto-approves low-risk PRs), "Fix bugs reported in Slack" (opens PRs), "Find vulnerabilities", "Triage failed GitHub Actions", "Summarize changes daily" | Cursor automations | **Omit** | they approve, open or comment on PRs outside the cycle: only a verdict merges (PR-13), the runner owns git (PR-04), and the supervisor and doctor already triage failures (PR-15, PR-36) |
| BrowserStack, Browserless | test infra | **Omit** | Playwright in the runner covers 390 and 1280 |
| Payments plugins (PayPal, Shop, OnePay …) | MCP | **Omit** | no money |
| Models (`cursor.com/docs/models`) | — | the pool's builder `grok-4.7-xhigh-fast` (Grok 4.7, Fast) stays as the developer chose; effort is set per fence (`builder-model.mjs`) | the page lists Grok 4.7 Standard and Fast with a 256k context; ids come from `agent models` |

The tooling OD is OD-07.

## 8. Setup (names only, never values)

- GitHub secrets: `CURSOR_API_KEY` (optional `CURSOR_API_KEY_2`), `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`
  (optional `_2`).
- No product secret, no Vercel, Supabase, R2, Firebase or Sentry setting.
- Content (not a secret): the licensed photographs in `public/photos/` and their rows in `content/photos.json`,
  committed by the developer (OD-09).

## 9. Dropped rules and why

- Published business data in a database (§7): there is none; the produce rows live in `content/` (OD-06).
- Re-authentication, rate limiting, account recovery, MFA (J2 "decide here"): nothing to authenticate and no input.
- Cutover runbook (J4 draft): deploy is `none`.
- Carry-forward triage at J9: there is no J9; triage happens at each gate (T02, T06, T09).

## 10. Assumptions and open points

- **A-01** No quotation and no client: the developer approves scope by merging the blueprint.
- **A-02** *Resolved by the developer:* the default locale is `ar`; `/` redirects to `/ar` (D-01). Nothing about
  the visitor (Accept-Language, cookie) is read, under the Boundary gate.
- **A-03** *Resolved by the developer:* licensed photography is part of the identity (OD-09). No licensed image has
  been supplied yet, and the blueprint did not source any (reference images and Pinterest pins carry no licence), so
  every photo frame shows the designed fallback tile until the developer adds files and manifest rows.
- **A-04** "This month" is the calendar month in Egypt (`Africa/Cairo`), computed on the server per request window
  (cached for an hour at most), never from the visitor's device, so the page renders without a shift.
- **A-05** Hosting logs of a future deploy are outside this repository.
- **A-06** "Leafy greens" is the display name of the data's `kind` value `leafy`.
- **A-07** There is no existing site, domain or estate to inventory.
- **A-08** Month and kind on the guide page are URL query parameters set by links (`?month=1…12&kind=…`), so every
  control is a link, the state is shareable, and nothing is stored.
- **A-09** `mwasim-ref.txt`'s first four lines name reference titles ("Animated Hero Website Design", "Food Website
  Layout", "Food Dashboard UI", "Organic Color Palette") without links; they were matched to the four images by name.
  The "Food Dashboard UI" reference has no image and is not used (the product has no dashboard).
- **A-10** The site's display name is "Mawsim" in English and "موسم" in Arabic.
- **A-11** Photographs show produce, not people; an image with an identifiable person needs that person's release,
  which is outside this plan.

Open questions for the developer: `docs/OPEN_QUESTIONS.md`.
