# MAWSIM — UI acceptance

The pass/fail criteria of every UI task (`docs/method/DESIGN_METHOD.md` §1, §4). A fence's `- Criteria:` names the
rows that apply. *automated* = a check or guard decides; *reviewer* = the reviewer decides from the captures.

| UA | Criterion | Checked by |
|---|---|---|
| UA-01 | Every state on the fence's `- Screens:` line is captured at 1280 and 390 without error, console error or failed request (`ui-evidence`) | automated |
| UA-02 | No layout shift: the captured layout-shift value is 0 at both widths | automated |
| UA-03 | axe (WCAG 2.0, 2.1, 2.2 A and AA) finds no violation on any capture (`a11y`) | automated |
| UA-04 | Tokens only and logical properties only: no raw colour, raw px or physical property outside `src/styles/tokens.css` (`guard:design`) | automated |
| UA-05 | `lang` and `dir` follow the URL locale; both catalogues have identical, non-empty keys (`guard:i18n`) | automated |
| UA-06 | No form control, cookie, storage, tracker or third-party script (`guard:boundary`) | automated |
| UA-07 | The `/ar` capture is a true right-to-left layout: reading order, alignment, the almanac's January-to-December order, arrows and the counter-name all mirror; nothing is merely translated in an LTR frame | reviewer |
| UA-08 | The Direction holds (`DESIGN_SYSTEM.md` §1): the twelve-cell almanac, the counter-name, kind colours on sand and terracotta only for "this month" are visible where the screen has them; nothing looks like a generic template | reviewer |
| UA-09 | Hierarchy: one clear `h1`, the page's main task is obvious at 390 within the first screen, spacing follows the token scale | reviewer |
| UA-10 | Focus is visible on every link and button in the captures that show it, in a logical order, with a skip link first | reviewer |
| UA-11 | Both themes: light and dark render with the specified tokens and pass contrast (`DESIGN_SYSTEM.md` §2) | reviewer |
| UA-12 | Motion matches `DESIGN_SYSTEM.md` §7: calm, state-only (the dial draws once), only `transform`/`opacity`; the reduced-motion capture shows the final state with no movement | reviewer |
| UA-13 | Season information is never colour alone: every ring and bar has its text equivalent; kind fills carry no text | reviewer |
| UA-14 | Targets are at least 44×44px for chips, months, cards and header links at 390 | reviewer |
| UA-15 | At 390 there is no horizontal page scroll; only the month scroller scrolls inline, with snap | reviewer |
| UA-16 | Empty and error states are designed (copy, links onward), never a blank region or placeholder | reviewer |
| UA-17 | The sample-data notice is present on every page that shows produce and on the about page (OD-06) | reviewer |
| UA-18 | Copy is plain and correct in both languages; Arabic reads naturally for Egyptian readers | reviewer |
| UA-19 | Every photo frame shows a manifest-listed, self-hosted photograph (art direction of `DESIGN_SYSTEM.md` §11, alt text in the page's language, clean crop, badge clear of the subject) or the designed fallback in the same frame; no broken image, hotlinked image or shift on load | reviewer |
| UA-20 | `/` reaches `/ar` with one temporary redirect and no loop; `/ar` is RTL and `/en` LTR; the language link lands on the equivalent page; every internal link on the visited pages answers 200 (the probe and, from T09, the core-flow test) | automated |
