# Usage

Every agent run of this project, totalled from the records in `docs/usage/`: one line per run, written by the runner
(`scripts/devos/usage.mjs`). Never edit those records by hand.

- **Tokens** are as each tool reported them. Cache read and cache write are kept apart from input.
- **Cost** is the tool's own figure where it gives one (Claude Code). Otherwise it is the tokens priced by
  `devos/prices.json`, which you fill in: US dollars per million tokens, per model. DEV_OS never looks prices up.
  "—" means no price is set.
- **Not in these totals:** runs that leave nothing in the repository. They are the gate doctor's and the
  supervisor's second opinions, and a change request answered without a plan. Each shows its usage on its own run
  page or comment.

Runs: 60 · Not reported: 32 · Last run: 2026-11-04T14:39:35.964Z

## Total

| Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|
| 60 | 3,963,825 | 2,285,077 | 232,681,053 | 4,513,987 | $74.13 (14 without a price) |

## By model

| Tool | Model | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|---|
| claude | claude-opus-5-5 | 12 | 120,634 | 1,202,155 | 106,232,793 | 4,369,837 | $73.17 |
| claude | claude-sonnet-5-5 | 2 | 50 | 23,819 | 1,429,380 | 144,150 | $0.96 |
| cursor | grok-4.7-xhigh-fast | 46 | 3,843,141 | 1,059,103 | 125,018,880 | 0 | — |

## By stage

| Stage | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| builder | 46 | 3,843,141 | 1,059,103 | 125,018,880 | 0 | — |
| reviewer | 12 | 1,978 | 944,808 | 83,818,184 | 3,762,672 | $58.82 |

## By task

| Task | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| T01 | 3 | 519,803 | 193,264 | 20,452,343 | 249,235 | $3.68 (2 without a price) |
| T02 | 3 | 362,086 | 175,406 | 17,926,604 | 533,296 | $8.09 (1 without a price) |
| T03 | 6 | 1,243,941 | 619,110 | 72,519,838 | 1,141,011 | $17.95 (3 without a price) |
| T04 | 2 | 167,335 | 82,910 | 4,554,444 | 69,378 | $0.44 (1 without a price) |
| T05 | 2 | 212,182 | 121,684 | 8,638,264 | 74,772 | $0.52 (1 without a price) |
| T06 | 42 | 1,339,772 | 811,537 | 84,745,571 | 1,694,980 | $28.14 (6 without a price) |
