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

### OD-10 — The showcase visual layer
**Status:** DRAFT — signed when the human merges the intake PR
**Amends:** OD-08 (design contract version 2), OD-09 §2 and §3 (generated imagery joins the sources; how the owner
adds files), OD-04 §4 (one 3D library for the hero scene), OD-06 §3 (the generator script writes the manifest on the
owner's machine)
**Requested by:** issue #17, with the owner's answer in its thread (2026-11-05)
**1.** The design contract becomes version 2 (`docs/DESIGN_SYSTEM.md`, written by the intake PR that lands this OD):
the Direction stays "Almanac in the sun" and gains four elements. These are real imagery in every frame, a slowly
turning 3D produce scene beside the hero dial, a market texture behind the hero and the section bands, and richer
state motion (card zoom, tilt and ring glow, a reveal on scroll once, animated selected states). Version 1 stays in
git history. Merging the intake PR is the owner's approval of the new look. The rendered result is signed off at
G-Showcase (T17).
**2.** Image sources, in order of preference, each image with one row in `content/photos.json` and its `source`
(`docs/CONTENT_MODEL.md` §5, version 2):
- **C `generated`**, the first choice: images generated with xAI's `grok-imagine-image-2.0` in one consistent style
  for all twelve slots (the hero, the ten produce and the background texture). Each row records the model id, the
  prompt, the date and a link to xAI's terms.
- **A `licensed`**: open photographs whose licence allows commercial use (Unsplash License, Pexels License, CC0 or
  CC BY from Wikimedia Commons or Openverse). Never a share-alike, non-commercial or unclear licence, and never a
  reference screenshot.
- **B `own`**: Mawsim's own artwork (SVG illustrations in the product's colours, or still renders of its own 3D
  models), for any slot that neither C nor A fills well.

Every image is credited on the about page. Art direction is `DESIGN_SYSTEM.md` §11 version 2.
**3.** T12 writes `scripts/images/generate.mjs`, which calls `POST https://api.x.ai/v1/images/generations` and saves
each image under `public/photos/` with its manifest row. Its tests mock the API: no key and no network in tests or CI.
**The owner** runs it on his own computer with his own `XAI_API_KEY` in the environment, reviews every image, and
commits the files and rows himself, or saves images made in Cursor's editor under the same names and rows. The key is
never committed, never a GitHub secret or variable, and never read by the product or the cycle, so it is not a setup
item (`docs/setup-items.json` is not created). The builder still never adds, replaces or deletes a file in
`public/photos/**` or edits `content/**` (OD-09 §3 stands for the builder). Because the runner owns task branches
(PR-04), the owner's images land as his own commit or PR to `main`, not as a commit on a runner task branch. They
must land after T12 merges (today's loader would refuse version 2 rows and `.png` files) and before T17 starts;
T17's fence halts until they have.
**4.** The 3D hero scene is built in code with three.js and React Three Fiber, as stylised low-poly produce in the
kind colours. No model file is loaded, so no glTF and no new licence row is needed. The scene loads after the page is
usable, in its own client chunk. It turns slowly, pauses when off-screen or when the tab is hidden, and has a
pause/play button (WCAG 2.2.2). It shows a still poster drawn in SVG under reduced motion, without WebGL, on a viewport
narrower than 22.5rem, and on a low-power device (`navigator.hardwareConcurrency` ≤ 2 or Save-Data on). These checks
choose only how the decoration is drawn. They run in the browser, are never sent or stored, and change no text, link
or data, so they are not "reading the device to change content" (`docs/BOUNDARY_MODEL.md` §2). The dependencies
`three` and `@react-three/fiber` (and `@types/three` for development) join in T16, each named by its fence line
(PR-47). Motion (`motion`) is not adopted: CSS and one `IntersectionObserver` cover the reveal and the selected
states.
**5.** The texture is decorative (`aria-hidden`, empty alt text), never more than 8% opaque over `--color-bg` in
either theme, so every text token keeps at least 4.5:1 whatever the texture holds (`DESIGN_SYSTEM.md` §12, computed).
It shows the manifest's `texture` image when that row exists, and an SVG pattern drawn in code otherwise.
**6.** The boundary does not change. There is no new route, zone, form, cookie, storage or tracker, the CSP stays as
it is, and the product calls no third-party host. xAI is called only by the owner's script on the owner's computer,
with prompts built from the sample data and nothing about a visitor. The `devos:boundary` line is unchanged. The
Boundary gate applies at T16 (dependencies) with its evidence.
**7.** The work is six tasks, T12–T17 (`docs/PHASES.md`, phase P06), ending at the gate **G-Showcase** (T17), which
the owner merges.
**Basis of signature:** the owner decides; merging the intake PR for issue #17 is the confirming act.
**Does not decide:** which generated or licensed images are kept (the owner's review against `DESIGN_SYSTEM.md` §11);
a glTF or other model file (a new change request); the Motion library or the View Transitions API; any CSP, header or
route change; a deploy; real farming or nutrition data.

### OD-11 — "The year turns": one year dial, scroll-driven motion and a real calendar
**Status:** DRAFT — signed when the human merges the intake PR
**Amends:** OD-08 and OD-10 §1 (design contract version 3), OD-10 §4 (the 3D hero scene and three.js are removed),
OD-04 §4 (GSAP and Lenis join for scroll-driven and shared-layout motion), D-03 (the guide gains a `view` query
value), OD-09 §1 (the hero photograph moves into the dial's centre)
**Requested by:** issue #28 (2026-11-06)
**1.** The design contract becomes version 3 (`docs/DESIGN_SYSTEM.md`, written by the intake PR that lands this OD).
The Direction stays "Almanac in the sun". Its spine becomes one object, the **year dial**: twelve equal cells in a
ring, January at the top, clockwise in English and counter-clockwise in Arabic. It is the home page's story, the
guide's month picker, every card's season ring and the produce page's season arc. Version 2 stays in git history.
Merging the intake PR is the owner's approval of the new look. The rendered result is signed off at **G-YearTurns**.
**2.** Home: the hero becomes a **year story**, a section held in place by CSS `position: sticky` while the visitor
scrolls through it. The scroll turns the dial one month per step, from this month through the next eleven. That
month's produce photographs, circle crops of the owner's images, come forward and the rest fade back. The headline
names the month shown ("What is fresh in November"). Scroll drives everything: nothing plays by itself, there is no
snap, and the dial stops when scrolling stops. The scroll length is reserved in CSS only when scripting is on and
motion is allowed (`@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`). Otherwise the section
is its settled, still state for this month, at its natural height. So nothing shifts. The hero photograph (the
manifest's `hero` row) is the dial's centre disc. It stays on the home page, credited and loaded first (OD-09 §1).
**3.** Guide: the year dial replaces the month scroller. Its twelve months are links to `?month=N`, and previous and
next links turn it by one month. Every control stays a link (R-2), with no drag gesture. When the month changes, the
dial turns to it. Cards that stay slide into their new places, cards that leave fade out and new cards rise in
(shared-layout motion with GSAP Flip). A second view, the **year chart**, is chosen by a link that sets
`view=chart`: one row per produce, its in-season months as a bar across twelve columns, and the selected month's
column highlighted. The selected month is this month unless the dial chose another. The kind chips apply to both
views. Month, kind and view are query values set by links (D-03 extended). The language link keeps all three.
**4.** Cards: each photograph is a circle inside its own season ring, with the in-season months lit. Nothing sits on
the photograph, which closes CF-49 by design. Produce page: the twelve-box season bar becomes the **season arc**, the
dial's ring around the circular photograph with the short month names around it. Its in-season months draw in once on
entry. The photograph zooms slowly as the page scrolls (scrubbed, at most `--zoom-scroll`). The text list of the
season stays, so season information is never colour alone.
**5.** Motion libraries. `gsap` (its core with ScrollTrigger and Flip, under GreenSock's Standard "no charge" licence,
which allows any website; `docs/method/DESIGN_METHOD.md` §5.1) and `lenis` (MIT) join, each named by its fence line
(PR-47). `@gsap/react`, Motion, Drei and every other animation library stay out. Lenis smooths scrolling on the home
page only, while its story is mounted. It is created only when motion is allowed and is destroyed on leaving the page.
Keyboard, the skip link and in-page focus scroll as normal. Only `transform` and `opacity` animate (and SVG
`stroke-dashoffset` for the arc's draw). Under reduced motion, or without JavaScript, every screen shows its settled
state with no movement. Both locales are mirrored, and the dial turns the other way in Arabic.
**6.** three.js, `@react-three/fiber` and `@types/three` are removed, with `HeroScene`, `HeroSceneFrame`,
`HeroScenePoster`, `scene-mode` and their tests and tokens. This closes CF-43 (the 927 KB chunk), and CF-41 and CF-44
(the scene's poster and placement) fall away with it. No client chunk of the build holds three.js.
**7.** The boundary does not change. No route, zone, form, cookie, storage, header or CSP value changes, and nothing
calls a third-party host. GSAP and Lenis are bundled from the site's own origin. They read only the scroll position,
the viewport and `prefers-reduced-motion` in the browser, to choose how the page is drawn, and they send or store
nothing (`docs/BOUNDARY_MODEL.md` §2). The `devos:boundary` line is unchanged. The Boundary gate applies, with its
evidence, at each task that changes `package.json` (T20, T21).
**8.** The work is six tasks, T18–T23 (`docs/PHASES.md`, phase P07), ending at the gate **G-YearTurns** (T23), which
the owner merges.
**Basis of signature:** the owner decides; merging the intake PR for issue #28 is the confirming act.
**Does not decide:** a drag or swipe gesture on the dial (a later change request); the View Transitions API;
`@gsap/react` or any other GSAP plugin than ScrollTrigger and Flip; Lenis outside the home page; new or replaced
images (the owner's content, OD-09 §3); a CSP, header or route change; a deploy; real farming or nutrition data.

## D-rows

| D | Decision | Date |
|---|---|---|
| D-01 | Default locale `ar` (the developer's answer): `/` redirects to `/ar` with one temporary redirect; `/en` stays fully supported; the language switch keeps the equivalent page | 2026-11-02 |
| D-02 | "This month" is computed in `Africa/Cairo` on the server (A-04) | 2026-11-02 |
| D-03 | Guide month and kind are query parameters set by links (A-08) | 2026-11-02 |
