# MAWSIM — Decisions

Precedence 2 (with `SCOPE.md`). A signed OD is never edited; a later OD amends it. Every OD below is **DRAFT** until
the developer merges the blueprint that lands it; that merge is the confirming act and makes each one SIGNED on the
merge date.

### OD-01 — Scope, profile and journey
**Status:** DRAFT — signed by merging the blueprint
**Amends:** none
**Requested by:** the developer, `devos init`, 2026-11-02
**1.** Mawsim is built to the brief in `docs/PRODUCT_BRIEF.md` with scope `mvp`: the core flow end to end
(`docs/SCOPE.md`), in the order of `docs/PHASES.md`.
**2.** Profile A, adapted (`docs/DEVOS_FIT.md` §2–§4): a public bilingual site with no personal data, no dashboard,
no accounts and no database. The Boundary gate is non-waivable.
**3.** Stations J0–J5 apply; J6, J7, J8, J10 and J11 are omitted and J9 is adapted (`DEVOS_FIT.md` §3). There is no
quotation; the developer is the client.
**4.** Human gates: G-Foundation (T02), G-Design (T06), G-Public (T09), and every risk-3 task.
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** a deploy, a domain, or any feature listed under Later or Out of scope. Photography is OD-09.

### OD-02 — The automated relay
**Status:** DRAFT — signed by merging the blueprint
**Amends:** handbook §2 (the human-pasted loop)
**Requested by:** the developer, `devos init`, 2026-11-02
**1.** The handbook's loop runs automatically on GitHub (`docs/method/AUTOMATION.md`): `devos-cycle` hands each fence
to the builder, runs every check, and hands the evidence to the reviewer; nobody pastes a fence or a report.
**2.** Agents: builder `cursor-grok-4-7-xhigh-fast` (Cursor, Grok 4.7, the pool's default); reviewer `claude-deep`
(Claude Code, `claude-opus-5-5`) for deep reviews, planning and revisions; light reviewer `claude-light`
(`claude-sonnet-5-5`) for risk 1–2 tasks that touch nothing critical (PR-22, PR-53).
**3.** The runner owns git (PR-04): agents never commit, push or open PRs. A PASS on a risk 1–2 task without a gate
is merged by the runner; a risk-3 task, a gate and a method change wait for the developer's merge (PR-13).
**4.** Red checks override PASS (PR-08). A usage limit is a wait, not a failure (PR-12, PR-29, PR-31); `resume.relay`
stays `public` (the repository is public, so relayed waits cost no runner minutes).
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** model changes (a D-row or PR-63 repository variable).

### OD-03 — Public repository
**Status:** DRAFT — signed by merging the blueprint
**Amends:** handbook §J1 "private by default"
**Requested by:** the developer (`visibility`: `public`), 2026-11-02
**1.** The repository is public from day one: it holds no personal data, no client data, no secret and no
operational weakness of any third-party system.
**2.** The public-repository rules of handbook §7 apply: no CI trigger runs fork code with repository context;
fixtures are synthetic; no key, token or connection string anywhere.
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** a later change of visibility (a new OD).

### OD-04 — Stack, styling and scaffold
**Status:** DRAFT — signed by merging the blueprint
**Amends:** none
**Requested by:** the developer (`stack`: `next`), 2026-11-02
**1.** Next.js 16 App Router, React 19, TypeScript, pnpm 10, Node 22, Vitest, pino (`docs/STACK.md`).
**2.** Styling is CSS Modules over one token file, `src/styles/tokens.css`, with logical properties only. Tailwind
CSS is not used, so the scaffold runs with `--no-tailwind`.
**3.** The scaffold also runs with `--no-agents-md` (the agents' rules are DEV_OS's own: `CLAUDE.md`, `.cursor/rules/`),
`--no-agent-feedback` (nothing about the project is prepared for an outside service) and `--disable-git` (the runner
owns git). It is generated outside the working tree and copied in, because `create-next-app` refuses a folder that
already holds the method's files (fence T01).
**4.** Motion is CSS (transitions, keyframes, `prefers-reduced-motion`); no animation library. Fonts are Inter and IBM
Plex Sans Arabic through `next/font/google`, self-hosted at build (PR-24 retries a failed download).
**5.** No dependency joins without the fence line that needs it (PR-47).
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** a hosting provider.

### OD-05 — Boundary and the health zone
**Status:** DRAFT — signed by merging the blueprint
**Amends:** none
**Requested by:** the blueprint (stack scaffold `health`: `/api/health`), 2026-11-02
**1.** Nothing in Mawsim accepts, stores or sends a visitor's data: no form, input, cookie, browser storage, beacon,
analytics, tracker or third-party script (`docs/BOUNDARY_MODEL.md`).
**2.** One zone is declared, `health`: `src/app/api/health/**`, URL `/api/health`, `personal_data: false`. Its route
handler takes no input, reads no header or cookie, and returns only `{ "status": "ok" }` (or a safe error).
**3.** No other route handler exists. A new zone is a new OD.
**Basis of signature:** the developer decides; merging the blueprint is the confirming act. The Boundary gate itself
cannot be waived by any OD.
**Does not decide:** —

### OD-06 — Sample data and its notice
**Status:** DRAFT — signed by merging the blueprint
**Amends:** handbook §7 "published business data lives in the database"
**Requested by:** the developer (brief; `devos/intake-docs/produce.json`), 2026-11-02
**1.** The ten produce rows are the developer's sample data, kept byte for byte in `content/produce.json` (copied
from `devos/intake-docs/produce.json` by the blueprint). The builder never edits `content/**`; a change to the data
is the developer's commit or a change request.
**2.** Every page that shows produce, and the about page, shows the sample-data notice: the data is sample data, not
farming or nutrition advice.
**3.** The photo licence manifest `content/photos.json` is developer-owned on the same terms (OD-09).
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** real data or its source.

### OD-07 — Tooling
**Status:** DRAFT — signed by merging the blueprint
**Amends:** none
**Requested by:** the blueprint, 2026-11-02
**1.** The tools of `docs/DEVOS_FIT.md` §7a: Context7 (read-only documentation) in every agent's MCP configuration;
Playwright MCP for manual IDE runs only. No marketplace plugin, automation or other MCP server acts on this
repository.
**2.** A tool is never authority; a connected MCP is not permission (PR-05); the runner owns git (PR-04).
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** a tool for a later deploy.

### OD-08 — Design direction
**Status:** DRAFT — signed by merging the blueprint
**Amends:** none
**Requested by:** the developer's references (`docs/design/references/`, `mwasim-ref.txt`), 2026-11-02
**1.** `docs/DESIGN_SYSTEM.md` (Direction "Almanac in the sun"), `docs/design/REFERENCES.md` and
`docs/design/UI_ACCEPTANCE.md` are the design contract. A new look or reference is a change request (PR-59).
**2.** G-Design at T06: the developer approves the rendered direction on the first full page before the rest is built.
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** which photographs are used (OD-09).

### OD-09 — Licensed photography
**Status:** DRAFT — signed by merging the blueprint
**Amends:** OD-08 (photography joins the visual identity)
**Requested by:** the developer, answer to the blueprint's open questions, 2026-11-02
**1.** Licensed, high-quality fruit and vegetable photography is part of Mawsim's visual identity: a hero photograph
on the home page and one photograph per `Produce`, shown on its card and its page (`docs/DESIGN_SYSTEM.md` §1, §6, §11).
**2.** Only images whose licence allows commercial use, with permission recorded, are used. A Pinterest pin is not a
licence: an image found there is used only once its owner's licence or permission is obtained. Each image has one row
in `content/photos.json` (`docs/CONTENT_MODEL.md` §5): its source, author, licence and licence URL, and its alt text
in both languages.
**3.** Image files are self-hosted in `public/photos/` (never hotlinked: the Boundary gate and the CSP allow no
third-party host) and served through `next/image` in responsive sizes with fixed aspect ratios, so they cause no
layout shift. The developer adds the files and their manifest rows; the builder never adds, replaces or deletes a
photograph (`public/photos/**` is outside `surfaces.builder`).
**4.** Until an image exists for a slot, the slot shows the designed fallback (the kind-colour tile with the season
ring) in the same frame and size, so adding photographs needs no redesign and no code change.
**5.** Where a licence asks for attribution, the credit is shown on the about page, listed from the manifest.
**Basis of signature:** the developer decides; merging the blueprint is the confirming act.
**Does not decide:** which images are chosen (the developer's selection, judged against `DESIGN_SYSTEM.md` §11).

## D-rows

| D | Decision | Date |
|---|---|---|
| D-01 | Default locale `ar` (the developer's answer): `/` redirects to `/ar` with one temporary redirect; `/en` stays fully supported; the language switch keeps the equivalent page | 2026-11-02 |
| D-02 | "This month" is computed in `Africa/Cairo` on the server (A-04) | 2026-11-02 |
| D-03 | Guide month and kind are query parameters set by links (A-08) | 2026-11-02 |
