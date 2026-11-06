# Change request — issue #28: "The year turns"

**Decision:** accepted as **OD-11** (DRAFT until the owner merges this intake PR), with tasks **T18–T23** (phase P07),
ending at the gate **G-YearTurns**. First fence: `docs/fences/T18.md`. Planned 2026-11-06.

## What was asked

A design change, "The year turns": replace the 3D hero (T16) and the row of month links with one object, a
twelve-month **year dial**, used across the site.

1. **Home:** a pinned story scrubbed by scroll. The dial turns month by month, that month's produce photos (circle
   crops of the owner's images) come forward while the rest fade back, and the headline follows the month. Nothing
   autoplays; the dial stops when scrolling stops.
2. **Guide:** the dial is the month picker. Turning or tapping a month reorders the cards with shared-layout motion
   (stay slides, leave fades, new rises). A **Year chart** view: one row per produce, its in-season months as a bar
   across twelve months, the current month as a highlighted column.
3. **Cards:** a circular photo inside its own season ring with the in-season months lit; nothing on the photo
   (closes CF-49).
4. **Produce page:** the 12-box season bar becomes an arc around the photo that draws its months in on entry; the
   photo zooms slowly with scroll.
5. **Motion:** calm and typographic (Anthropic's sites), scroll-driven and pinned (Apple's product pages), with GSAP
   ScrollTrigger and Lenis. Reduced motion shows the settled, still state; no layout shift; both locales mirrored, the
   dial turning the other way in Arabic. Remove three.js and its chunk (closes CF-43). Update `DESIGN_SYSTEM.md` and
   the references, and split the work into tasks.

Judged done on the preview at 1280 and 390 in `en` and `ar`: the scroll turns the dial and the photos and headline
follow; stopping the scroll stops the motion; reduced motion is still; the guide's dial picks the month and the cards
move with no jump; the Year chart shows ten produce across twelve months with the current month highlighted; every
card is a circle in its ring with nothing covering the produce; each produce page draws its arc; three.js is gone;
axe 0, no layout shift, and captures of every screen in both locales.

## What was decided

- **OD-11** amends OD-08 and OD-10 §1 (design contract version 3), OD-10 §4 (the 3D scene and three.js are removed),
  OD-04 §4 (GSAP and Lenis join), D-03 (a `view` query value) and OD-09 §1 (the hero photograph becomes the dial's
  centre disc).
- **Written in this PR**, so that merging it is the owner's approval of the new look:
  - `docs/DESIGN_SYSTEM.md` version 3. Direction and signature (layout, imagery and motion rewritten around the year
    dial). The new "Year dial" tokens and the version 3 motion tokens, with no new colour. §5 responsive rules. §6
    components: `YearDial`, `MonthPicker`, `GuideViewLinks`, `YearChart`, `SeasonArc`, `YearStory`, the circular
    `ProduceCard`, and the removed components listed. §7 motion. §9 accessibility. §10 resource decisions (GSAP and
    Lenis adopted, three.js rejected). §11 crop. §13 the year dial and the year story;
  - `docs/design/REFERENCES.md`: R8 (Anthropic's sites), R9 (Apple's product pages), L7 (GSAP) and L8 (Lenis), with
    L5 retired;
  - `docs/design/UI_ACCEPTANCE.md`: UA-12 (motion driven by scroll or a link), UA-15 (nothing scrolls inline) and
    UA-19 (nothing drawn over a subject; circular frames);
  - `docs/PRODUCT_BRIEF.md` R-5 note, `docs/GLOSSARY.md` §2 terms, `docs/I18N_MODEL.md` §4 (ring direction);
  - amendment A-2 in `docs/SCOPE.md` §3.
- **Tasks**, each leaving every page working:
  - **T18**: the version 3 tokens, the shared ring geometry, and the circular card in its ring (closes CF-49).
  - **T19**: the guide's month picker (the dial) and the year chart view.
  - **T20**: the guide's motion. `gsap` joins, the dial turns and the cards re-sort with Flip. `package.json` makes
    the review deep.
  - **T21**: the home page's year story with ScrollTrigger and Lenis. three.js, React Three Fiber and the scene are
    removed (closes CF-43, and with it CF-41 and CF-44). The review is deep.
  - **T22**: the produce page's season arc and its scroll zoom.
  - **T23**: acceptance across the site, where **G-YearTurns** is the owner's merge.

## Interpretations, and what was left out and why

- **"Pinned" is CSS `position: sticky`, not ScrollTrigger's `pin`.** A script-inserted pin spacer adds height after
  hydration, and that is a layout shift the checks would fail. The scroll length is reserved by CSS only under
  `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`. ScrollTrigger only scrubs the timeline.
  Without JavaScript or under reduced motion the story is one settled section for this month, with no dead scroll.
- **"Stops when scrolling stops."** No snap and no autoplay. The scrub's lag is capped at `--story-scrub` (0.4 s), so
  the dial is still within that time. T21's spec checks the dial over 30 frames after the scroll stops.
- **Lenis on the home page only**, while the story is mounted. It is created only when motion is allowed. Smooth
  scrolling elsewhere (the guide, produce and about pages) brings no story, and Lenis is not added there.
- **"Turning" the dial means links.** Every control stays a link or a button (R-2), so the guide's dial has twelve
  month links plus previous and next links that turn it by one. A drag or swipe gesture is left out: it would need a
  single-pointer alternative anyway (WCAG 2.5.7), and the links are that alternative. A gesture is a later request.
- **Shared-layout motion uses GSAP Flip**, from the same `gsap` package. It needs no second library (Motion and the
  View Transitions API stay rejected). The guide keeps each card keyed by its slug, with the cards outside the
  selected set `hidden`, so Flip can slide, fade and raise them. The server-rendered page stays complete without
  JavaScript.
- **The year chart is a view of the guide** (`?view=chart`, set by a link, D-03 extended). It is a list of rows, not a
  table, and each row carries the season sentence as its text equivalent. It shows all ten produce with "All", and
  the kind chips filter it as they filter the cards. The highlighted column is the **selected** month, which is this
  month unless the dial chose another, so the dial stays useful in the chart. This month keeps its terracotta tick
  as everywhere. At 390 each name sits above its full-width row, so nothing scrolls inline (UA-15).
- **The hero photograph stays on the home page as the dial's centre disc.** OD-09 §1 promises a hero photograph on
  home, and the owner's market composition is the strongest image. The ten produce circles orbit the ring. The orbit
  circles are decorative (`alt=""`): the "in season this month" grid below carries the content with names.
- **The headline keeps today's words** ("What is fresh in Egypt in {month}"). Only the month follows the scroll, in a
  slot of fixed size. The request's "What is fresh in November" is read as an example of the month following. A new
  count sentence names the month shown ("In season in {month}: {count}"), because today's "this month" sentence would
  be false while the story shows another month.
- **The story runs from this month through the next eleven**, one `--story-step` each. That is the request's "November,
  then December" from today's date.
- **GSAP's licence.** GreenSock's Standard "no charge" licence allows any website (`DESIGN_METHOD.md` §5.1). It is not
  an OSI licence, which OD-11 §5 records. `@gsap/react` is not added: `gsap.context` and its `revert` in an effect do
  the clean-up (lean, PR-47).
- **The boundary is unchanged.** There is no new route, zone, form, cookie, storage, header or CSP value, and the
  bundled libraries call no host. They read the scroll position, the viewport and the motion preference only to
  draw the page. Each dependency task proves this (OD-11 §7).
- **Images.** The circle crops the owner's 4:3 images at their centre (`DESIGN_SYSTEM.md` §11). No image is added,
  replaced or regenerated by a task. If a subject sits off-centre in a circle, that is the owner's content call.
- **T17's state.** T17's PR (#25) is merged on `main`, but its ledger row still reads FAIL a3 and `[ ]`. Only the
  runner writes that row. T18 starts once T17's G-Showcase decision is recorded on `main`. This plan resolves the
  G-Showcase decisions on CF-43 and CF-49 (and CF-41 and CF-44) by design.
- **Six tasks, not fewer.** The guide's static picker and chart (T19) come before its motion and dependency (T20).
  The visible change and the deep review then stay apart, and each is a reviewable piece. T21 is split into three
  stages (removal and the static story; the scrubbed timeline and Lenis; the spec).
