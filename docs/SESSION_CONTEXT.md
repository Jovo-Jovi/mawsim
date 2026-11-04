# MAWSIM — Session context

**Phase:** P05 About and motion · **Station:** J5 · **Next task:** T10 (about page; attempt 1 halted on a layout shift) · **Profile:** A, adapted (no personal
data, no database) · **Scope:** mvp

## Done steps

| Step | What | Verdict |
|---|---|---|
| Blueprint | Fit research, documents, configuration and fence T01 (2026-11-02) | approved by the developer's merge |
| Blueprint revision | The developer's answers: Arabic default (`/` → `/ar`, D-01) and licensed photography (OD-09, task T05 added; 11 tasks) | approved by the developer's merge |
| T01–T09 | Scaffold through the home page and the core-flow browser test | PASS on `docs/PHASES.md` (the runner's ticks) |

## Open carry-forwards

31 open (`grep -c "| open |" docs/method/CARRY_FORWARDS.md`). Live maximum CF-39. Developer content pending: the licensed photographs and their manifest rows
(`docs/OPEN_QUESTIONS.md`); every frame shows its fallback until then. The doubled sample-data notice stays (CF-24).

## Next action

T10 is open. Attempt 1 halted: `/ar/about` at 390 has layout shift 0.0122, from the Arabic face swap in `src/app/fonts.ts`, which this fence cannot edit. The carry-forward ledger is landed (31 open, live maximum CF-39).
