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

Runs: 81 · Not reported: 32 · Last run: 2026-11-04T23:25:07.329Z

## Total

| Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|
| 81 | 6,611,647 | 3,538,472 | 380,803,796 | 6,270,608 | $100.84 (27 without a price) |

## By model

| Tool | Model | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|---|
| claude | claude-opus-5-5 | 16 | 121,462 | 1,600,972 | 143,489,042 | 5,881,162 | $98.30 |
| claude | claude-sonnet-5-5 | 6 | 132 | 63,302 | 3,490,498 | 389,446 | $2.54 |
| cursor | grok-4.7-xhigh-fast | 56 | 5,961,051 | 1,722,717 | 213,353,600 | 0 | — |
| cursor | grok-4.7-high | 3 | 529,002 | 151,481 | 20,470,656 | 0 | — |

## By stage

| Stage | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| builder | 59 | 6,490,053 | 1,874,198 | 233,824,256 | 0 | — |
| reviewer | 20 | 2,888 | 1,383,108 | 123,135,551 | 5,519,293 | $85.54 |

## By task

| Task | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| T01 | 3 | 519,803 | 193,264 | 20,452,343 | 249,235 | $3.68 (2 without a price) |
| T02 | 3 | 362,086 | 175,406 | 17,926,604 | 533,296 | $8.09 (1 without a price) |
| T03 | 6 | 1,243,941 | 619,110 | 72,519,838 | 1,141,011 | $17.95 (3 without a price) |
| T04 | 2 | 167,335 | 82,910 | 4,554,444 | 69,378 | $0.44 (1 without a price) |
| T05 | 2 | 212,182 | 121,684 | 8,638,264 | 74,772 | $0.52 (1 without a price) |
| T06 | 43 | 1,340,052 | 950,821 | 97,175,309 | 2,191,094 | $36.54 (6 without a price) |
| T07 | 8 | 953,091 | 303,100 | 41,830,613 | 126,114 | $0.83 (6 without a price) |
| T08 | 2 | 439,918 | 121,288 | 15,275,312 | 65,916 | $0.47 (1 without a price) |
| T09 | 6 | 725,519 | 533,060 | 57,894,031 | 1,015,211 | $16.73 (3 without a price) |
| T10 | 4 | 529,014 | 156,663 | 20,693,049 | 53,266 | $0.29 (3 without a price) |
