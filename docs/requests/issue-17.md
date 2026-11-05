# Change request — issue #17: a showcase visual layer

**Decision:** accepted as **OD-10** (DRAFT until the owner merges this intake PR), with tasks **T12–T17** (phase P06),
ending at the gate **G-Showcase**. First fence: `docs/fences/T12.md`. Planned 2026-11-05.

## What was asked

A showcase visual layer, kept inside "Almanac in the sun":

1. Real imagery in every photo frame (the hero and the ten produce; 11 today). Each image is recorded in
   `content/photos.json` and credited on the about page, served with `next/image` at the frame's ratio. Sources: open
   photographs with a commercial-use licence (A), or Mawsim's own artwork (B). **The owner's answer in the thread
   makes generated images the first choice (C):** `grok-imagine-image-2.0` in one style for all slots and the
   background texture. A task writes `scripts/images/generate.mjs` with mocked tests, and the owner runs it once with
   his own `XAI_API_KEY` (never committed, never a CI secret) or generates the images in Cursor's editor.
2. A 3D hero: a small scene of produce turning slowly beside the sun dial (three.js / React Three Fiber). It loads
   after the page is usable and shows a still under reduced motion, without WebGL, and on a small or low-power screen.
3. A subtle market texture behind the hero and the section breaks, in both themes, with AA contrast.
4. Card hover and focus: the photo zooms, the card tilts (mirrored in Arabic) and the ring glows.
5. Scroll and page motion: the guide's sections and cards reveal once, and the month and chip selected states
   animate.
6. The design contract changes first, approved by the owner, then the build in tasks.

## What was decided

- **OD-10** amends OD-08 (design contract version 2), OD-09 §2–§3 (generated imagery and how the owner adds files),
  OD-04 §4 (three.js and React Three Fiber for the hero scene) and OD-06 §3.
- **Written in this PR**, so that merging it is the owner's approval of the new look (point 6):
  - `docs/DESIGN_SYSTEM.md` version 2: Direction and signature (imagery, ground, motion), new motion and texture
    tokens with the contrast computed, component states, §7 motion, §9 pause control, §10 resource decisions, §11
    imagery, and the new §12 (texture) and §13 (hero scene);
  - `docs/CONTENT_MODEL.md` §5 version 2: the manifest's `source` (`generated`, `licensed`, `own`), each source's
    fields, the `texture` key and `.png`;
  - the new rows L5 and L6 in `docs/design/REFERENCES.md`;
  - the `terms_url` credit link and the generator's place in `docs/BOUNDARY_MODEL.md` §2;
  - notes on R-5 and R-10 in `docs/PRODUCT_BRIEF.md`;
  - amendment A-1 in `docs/SCOPE.md` §3.
- **Tasks:**
  - **T12**: the manifest v2 loader, credits for every source and the generator script, with a mocked API.
  - **T13**: the showcase tokens and the market texture.
  - **T14**: card hover and focus.
  - **T15**: reveal on scroll and the selected states.
  - **T16**: the 3D hero scene, which adds the dependencies, so the review is deep.
  - **T17**: acceptance with the owner's images, where **G-Showcase** is the owner's merge.
- **Twelve generated slots**, not eleven: the hero, the texture and the ten produce. One image per produce serves
  both its card and its page, as today.

## Interpretations, and what was left out and why

- **Where the owner's images land.** The thread says "commits them on the task branch". Task branches belong to the
  runner (PR-04), and a risk-2 task without a gate is merged by the runner on PASS, so the owner would have no window
  to commit there. The images are content (OD-06, OD-09), so they land as **the owner's own commit or PR to `main`**,
  after T12 merges (not earlier: today's loader would refuse version 2 rows and `.png` files) and before T17
  starts. T17's fence halts until `content/photos.json` holds the 12 rows.
- **No setup item for `XAI_API_KEY`.** The owner said it is never a CI secret. `docs/setup-items.json` lists only
  secrets, variables and Vercel settings that the cycle or the app reads, and listing the key would ask him to add it
  to GitHub. So it is named in OD-10 §3 only.
- **3D models are built in code**, as stylised low-poly produce. Openly licensed glTF models were allowed by the
  request, but they need a loader, a licence row and model files in `public/`. Code meets the request with less, so
  a model file is a later change request.
- **Motion (`motion`) is not adopted.** The request allowed it "if CSS is not enough". CSS and one
  `IntersectionObserver` cover the reveal, the hover and the pills (lean, PR-47). The View Transitions API stays
  rejected.
- **The still image of the 3D hero** is an SVG poster drawn in code (Mawsim's own artwork), not a file in
  `public/photos/`, so the builder can make it. "Small screen" means a viewport narrower than 22.5rem. That keeps the
  scene turning at 390, as the acceptance list asks. "Low power" means `navigator.hardwareConcurrency` ≤ 2 or
  Save-Data. OD-10 §4 records why choosing how a decoration is drawn is not "reading the device to change content".
- **A pause button for the scene.** It is a looping animation longer than five seconds, so WCAG 2.2.2 requires one.
  It is a real `<button>`, which "every control is a link or a button" allows. The request did not mention it.
- **The texture** may be the generated `texture` image or an SVG pattern drawn in code (the request allows "a photo
  or an SVG pattern"). Either way it is at most 8% opaque, which keeps every text token at AA or better whatever the
  texture holds (computed in `DESIGN_SYSTEM.md` §2). "Section breaks" means the heading band that opens a section on
  home, guide and about.
- **Dark-theme evidence.** The runner's captures do not switch theme. T13 adds a Playwright spec that renders both
  themes and runs axe in each.
- **Art direction.** §11's old "no AI-looking renders" rule becomes "reads as a natural photograph; no glossy,
  plastic or over-saturated look", which is the owner's intent for generated images.
- **Unchanged:** the CSP, the routes, the zones and the `devos:boundary` line. Nothing in the product calls xAI.
