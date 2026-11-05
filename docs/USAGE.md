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

Runs: 109 · Not reported: 32 · Last run: 2026-11-05T15:34:43.510Z

## Total

| Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|
| 109 | 9,878,464 | 5,010,442 | 516,275,388 | 7,784,382 | $119.72 (44 without a price) |

## By model

| Tool | Model | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|---|
| claude | claude-opus-5-5 | 18 | 121,862 | 1,876,874 | 159,286,551 | 6,657,317 | $112.00 |
| claude | claude-sonnet-5-5 | 15 | 414 | 216,428 | 12,098,725 | 1,127,065 | $7.72 |
| cursor | grok-4.7-xhigh-fast | 56 | 5,961,051 | 1,722,717 | 213,353,600 | 0 | — |
| cursor | grok-4.7-high | 20 | 3,795,137 | 1,194,423 | 131,536,512 | 0 | — |

## By stage

| Stage | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| intake | 1 | 164 | 88,411 | 6,850,125 | 236,372 | $4.74 |
| builder | 76 | 9,756,188 | 2,917,140 | 344,890,112 | 0 | — |
| reviewer | 30 | 3,406 | 1,723,725 | 140,691,162 | 6,796,695 | $99.67 |

## By task

| Task | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| intake-17 | 1 | 164 | 88,411 | 6,850,125 | 236,372 | $4.74 |
| T01 | 3 | 519,803 | 193,264 | 20,452,343 | 249,235 | $3.68 (2 without a price) |
| T02 | 3 | 362,086 | 175,406 | 17,926,604 | 533,296 | $8.09 (1 without a price) |
| T03 | 6 | 1,243,941 | 619,110 | 72,519,838 | 1,141,011 | $17.95 (3 without a price) |
| T04 | 2 | 167,335 | 82,910 | 4,554,444 | 69,378 | $0.44 (1 without a price) |
| T05 | 2 | 212,182 | 121,684 | 8,638,264 | 74,772 | $0.52 (1 without a price) |
| T06 | 43 | 1,340,052 | 950,821 | 97,175,309 | 2,191,094 | $36.54 (6 without a price) |
| T07 | 8 | 953,091 | 303,100 | 41,830,613 | 126,114 | $0.83 (6 without a price) |
| T08 | 2 | 439,918 | 121,288 | 15,275,312 | 65,916 | $0.47 (1 without a price) |
| T09 | 6 | 725,519 | 533,060 | 57,894,031 | 1,015,211 | $16.73 (3 without a price) |
| T10 | 8 | 933,676 | 284,798 | 31,785,813 | 225,103 | $1.61 (6 without a price) |
| T11 | 3 | 392,903 | 130,701 | 15,993,927 | 34,579 | $0.18 (2 without a price) |
| T12 | 3 | 355,748 | 161,784 | 10,780,845 | 94,037 | $0.57 (2 without a price) |
| T13 | 5 | 586,724 | 187,745 | 26,632,853 | 102,779 | $0.71 (3 without a price) |
| T14 | 4 | 466,878 | 178,667 | 18,650,584 | 212,124 | $1.58 (2 without a price) |
| T15 | 3 | 551,435 | 207,820 | 14,988,071 | 89,718 | $0.63 (2 without a price) |
| T16 | 5 | 508,303 | 388,707 | 30,482,423 | 572,328 | $9.15 (3 without a price) |
