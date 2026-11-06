# Change request — issue #36: a theme switch with a circular reveal, and README screenshots in both themes

**Decision:** accepted as **OD-12** (DRAFT until the owner merges this intake PR), with tasks **T24–T26** (phase P08),
ending at the gate **G-Theme**. First fence: `docs/fences/T24.md`. Planned 2026-11-06.

## What was asked

1. **A theme switch** in the header of every page, in both locales: System (the default, today's behaviour), Light
   and Dark. It is a small segmented control with sun, moon and "auto" icons, labelled in `en` and `ar`, at the
   header's inline end and mirrored in Arabic. The controls are real buttons with `aria-pressed`, keyboard use and a
   visible focus ring.
2. **An animated change.** The new theme is revealed as a circle growing from the switch in about 500 ms on the site's
   calm easing, through `document.startViewTransition` with a `clip-path` circle. Where that is unsupported it is a
   short cross-fade, and under reduced motion it is instant. Only colours change.
3. **The choice is remembered** across pages and visits in one `localStorage` key (`mawsim-theme` = `light | dark |
   system`). It is never sent anywhere, and is applied before first paint with no flash. A needed inline script
   updates the CSP with its hash, not `unsafe-inline`. If storage fails, the switch still works for the page and falls
   back to System. The request asks for an OD, because this amends "no browser storage".
4. **Both themes finished and equal**, to WCAG 2.2 AA everywhere: the year dial, rings, arcs, year chart, cards, photo
   frames, focus rings, the photo fallback and the hero story.
5. **README screenshots**, one screen tall with every photograph loaded: home, guide and one produce page, in `en`
   and `ar`, in light and dark. Today's `docs/screenshots/home-ar.png` is 7905 px tall, mostly the story's empty
   scroll length, and its cards' photos had not loaded.

Judged done on the preview at 1280 and 390 in `en` and `ar`:
- the switch shows, and Light or Dark reveals as a circle;
- System follows the device again;
- the choice survives reload and navigation with no flash;
- reduced motion is instant, and keyboard and screen reader work;
- axe 0, no layout shift and captures of every screen in both themes;
- the CSP still has no `unsafe-inline`;
- the README shows the twelve screenshots.

## What was decided

- **OD-12** amends:
  - OD-05 §1 and §3 (a zone for one storage key);
  - OD-08 and OD-11 §1 (design contract version 4);
  - the "Does not decide" of OD-10 and OD-11 (the View Transitions API, now adopted for the theme change only);
  - the brief's R-1 and R-3;
  - `docs/SCOPE.md` "Out of scope".
- **Written in this PR**, so merging it is the owner's approval:
  - `docs/BOUNDARY_MODEL.md`: the `devos:boundary` line gains the zone `theme-preference` (`personal_data: false`, no
    URL). Its source is `src/components/theme/theme-storage.ts` (and its test) and `public/theme-init.js`. §2 and §3
    say what the zone allows: the one key, nothing else. `guard:boundary` passes with the new line.
  - `docs/SECURITY_MODEL.md` §4: the pre-paint script and why the CSP does not change.
  - `docs/DESIGN_SYSTEM.md` version 4:
    - §2: `--dur-theme`, and the contrast pairs, computed in both themes;
    - §4: Themes rewritten;
    - §5: the header with the switch at 320, 390 and 1280;
    - §6: `ThemeSwitch`, and the sun, moon and auto glyphs;
    - §7: the reveal;
    - §9 and §10: the View Transitions API, adopted narrowly.
  - `docs/design/REFERENCES.md`: R10 (Apple's and Telegram's theme changes, named with no link; nothing fetched) and
    L9 (the View Transitions API).
  - `docs/PRODUCT_BRIEF.md` R-1 and R-3 notes, and amendment A-3 in `docs/SCOPE.md` §3.
- **Tasks**, each leaving every page working:
  - **T24** (risk 3, deep review, the developer merges): the stored choice, the pre-paint script and the switch, with
    an instant change.
  - **T25**: the circular reveal, the cross-fade fallback, and the instant change under reduced motion.
  - **T26** (G-Theme): both themes proven on every screen, the fixes that proof needs, and the twelve README
    screenshots.

## Interpretations, and what was left out and why

- **The CSP.** Today's CSP already has `script-src 'self' 'unsafe-inline'` (T02, `docs/SECURITY_MODEL.md` §4). Next.js
  inlines its own bootstrap scripts, and a nonce would make every page dynamic. So "the CSP still has no
  `unsafe-inline`" cannot be literally true. It is read as **no new `unsafe-inline` and no weaker CSP**.

  A hash would also be harmful here. In CSP Level 2 and later, a hash beside `'unsafe-inline'` makes the browser
  ignore `'unsafe-inline'`, which would block Next.js's bootstrap and break every page.

  So the pre-paint code is **not inline**. It is a tiny same-origin file, `public/theme-init.js`, loaded synchronously
  from the `<head>` and allowed by `script-src 'self'`. The CSP does not change at all. Removing `'unsafe-inline'`
  from the site is a separate change request: it needs nonces, and so dynamic rendering.
- **The boundary holds; it is not waived.** The stored value is a display preference the visitor sets, kept in their
  own browser, never sent, logged or read by the server. It is not data about the visitor, so the zone has
  `personal_data: false`. No Protection model is needed, and the repository may stay public.

  The zone is the mechanism the method gives for this (PR-19). Its exception is limited to three named files and one
  key. Everywhere else, `guard:boundary` still fails on any `localStorage`, and cookies, `sessionStorage` and
  `indexedDB` stay forbidden everywhere. Because the guard does not scan `public/`, `public/theme-init.js` gets its own
  test and the deep review reads every line of it.
- **Nothing is stored until a visitor presses a button.** System is the default and needs no storage.
- **Risk 3 for T24.** It opens a zone and touches the layout's `<head>`. That is the boundary, so it gets a deep review
  and the developer's merge. T25 and T26 touch no storage, header or head.
- **The switch without JavaScript** cannot act, so it is hidden with `visibility: hidden`, keeping its space so nothing
  shifts. The site then follows the system as today.
- **The pressed look comes from the `<html>` attribute** set before first paint, so the pill never flashes from System
  to the stored choice. `aria-pressed` follows on hydration.
- **The header at 390 and 320.** Three 44 px buttons do not fit beside the nav on a phone. Below 40rem, the language
  link and the switch share the first row with the brand, and the nav keeps its second row. Below 22.5rem the tools
  wrap under the brand, so nothing scrolls at 320 (`DESIGN_SYSTEM.md` §5).
- **"System" in Arabic** is "حسب الجهاز" ("by the device"), which reads naturally. A literal "النظام" would not.
- **The about page** says today that Mawsim uses no browser storage. That would become false, so T24 replaces the
  sentence with exact text in both languages: the one choice is kept in the visitor's browser and never sent. The
  footer's "Mawsim collects nothing: no accounts, cookies or trackers" stays true and is unchanged.
- **Three tasks, not four.** A first draft put the dark-theme proof first. But `e2e/showcase.spec.ts` already runs axe
  in light and dark on home, guide, produce and about at 1280, and every token pair computes above its minimum in both
  themes today. So the full proof (the year chart, 390, focus rings, the computed token test) moves to the gate task,
  where it runs with the switch.

  One pair is below 3:1: light fruit against the empty-cell track (2.78:1). It is recorded as report-only, because the
  empty cell carries a hairline and the season is always given in text (UA-13).
- **README screenshots** are taken by a script against the production build, viewport only, at 1280 × 800, under
  reduced motion (the story settled, at its natural height), after every image in view has decoded. The guide uses
  `?month=8` and the produce page is mango, so the images do not change with the date. The old three full-page
  captures are removed. The README keeps every other line (PR-77).
- **Left out:**
  - view transitions between pages;
  - a theme per page or any theme beyond light and dark;
  - syncing the choice across open tabs;
  - any other stored value;
  - removing `'unsafe-inline'` from the CSP (a separate request: nonces and dynamic rendering).

## For the owner, after merging

- `CLAUDE.md` ("Standing rules": "the theme follows the system", "browser storage") and
  `.cursor/rules/10-security-data.mdc` (the `localStorage` ban) still state the old rules. They are method files that
  intake may not edit. OD-12 and the T24 fence name the exception for the builder and the reviewer. Updating those two
  lines to cite the zone `theme-preference` (OD-12) is a small method change for you to make.
- `.cursor/rules/10-security-data.mdc` also says "Every control is a link (or a button for retry)". The T24 fence
  names the three theme buttons as the exception. `docs/design/UI_ACCEPTANCE.md` UA-06 ("No … storage") is outside
  intake's surface too: `guard:boundary` already decides it with the zone, but its wording could cite OD-12.
- The T24 fence was checked by `fence-check.mjs` and audited by the `fence-auditor` agent. The audit found one
  blocker: `src/modules/produce/messages.test.ts` counts the catalogue keys, so the fence now lets T24 extend it to 91.
  The audit's defects and notes were fixed in the fence before this PR.
- No setting outside the repository is needed: no account, key or variable.
