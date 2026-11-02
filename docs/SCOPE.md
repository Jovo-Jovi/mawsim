# MAWSIM — Scope

Precedence 2 (with `DECISIONS.md`). Scope `mvp` (OD-01). Built in the order of `docs/PHASES.md`.

## In scope — the core flow

| # | Feature | Brief | Task |
|---|---|---|---|
| S-01 | Scaffold, checks, structured logging, error handling, health route | stack, observability | T01 |
| S-02 | Security headers baseline with a CSP that refuses every third-party script | R-1 | T02 |
| S-03 | Bilingual shell, Arabic first: `/` → `/ar`, `/ar` and `/en`, `lang` and `dir` from the URL, RTL, light/dark tokens, fonts, header with language link to the equivalent page, footer | R-3, R-4 | T03 |
| S-04 | The produce catalogue: typed rows from `content/produce.json`, season logic, "this month" in Cairo | B-1–B-3 | T04 |
| S-05 | Photo slots: the licence manifest `content/photos.json`, responsive self-hosted photographs, the designed fallback in the same frame | R-10 | T05 |
| S-06 | Produce page with its photograph, the 12-month season bar and storage tip | B-3 | T06 |
| S-07 | Guide page: photo cards and kind chips | B-2 | T07 |
| S-08 | Guide page: 12-month scroller | B-2 | T08 |
| S-09 | Home page: photo hero and "in season this month"; the core-flow browser test | B-1 | T09 |
| S-10 | About page, with the photo credits | B-4, R-10 | T10 |
| S-11 | The hero's animation and the motion pass, with reduced motion | B-1, R-5 | T11 |

Eleven tasks: T01 and ten after it, within the "about 12 after T01" of an MVP core flow. T05 is the one task added
for photography (OD-09). Supplying the licensed image files is the developer's content work, not a task (OD-09 §3).

## Later

None. Every feature the brief asks for is in the core flow above. New work is a change request.

## Out of scope (the brief excludes it, or nothing asks for it)

Accounts and sign-in · forms and any input · a search box · cookies and browser storage · analytics, trackers and
third-party scripts · a database or CMS · hotlinked or unlicensed images · a deploy, domain or hosting ·
error-tracking provider · a theme toggle (the theme follows the system) · notifications · real farming or nutrition
data.
