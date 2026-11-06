# MAWSIM — Session context

**Phase:** P07 The year turns · **Station:** J5 · **Next task:** T23, waiting at G-YearTurns for the developer's merge · **Profile:** A, adapted (no personal
data, no database) · **Scope:** mvp

## Done steps

| Step | What | Verdict |
|---|---|---|
| Blueprint | Fit research, documents, configuration and fence T01 (2026-11-02) | approved by the developer's merge |
| Blueprint revision | The developer's answers: Arabic default (`/` → `/ar`, D-01) and licensed photography (OD-09, task T05 added; 11 tasks) | approved by the developer's merge |
| T01–T09 | Scaffold through the home page and the core-flow browser test | PASS on `docs/PHASES.md` (the runner's ticks) |
| T10–T11 | About page, photo credits, hero dial and the motion pass | PASS on `docs/PHASES.md` |
| T12–T17 | Imagery pipeline through the showcase acceptance | PASS on `docs/PHASES.md` |
| T18–T22 | Year dial, guide motion, the home year story and the produce season arc | PASS on `docs/PHASES.md` (T18 a2, T19 a3, T20 a2, T21 a2, T22 a1) |

## Open carry-forwards

50 open (`grep -c "| open |" docs/method/CARRY_FORWARDS.md`). Live maximum CF-81 (`grep -oE 'CF-[0-9]+' docs/method/CARRY_FORWARDS.md | sed 's/CF-//' | sort -n | tail -1`). T23 closes CF-21, CF-28, CF-41, CF-43, CF-44 and CF-49, and the rows this attempt fixed (CF-52 through CF-63). The doubled sample-data notice stays (CF-24).

## Next action

P07 is in progress. T18–T22 are done. T23 is at G-YearTurns: the owner reads the captures and merges. The guide renders on each request (`ƒ`, CF-80) so the page arrives whole without JavaScript.
