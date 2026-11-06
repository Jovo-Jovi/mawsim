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

Runs: 190 · Not reported: 34 · Last run: 2026-11-06T22:08:04.525Z

## Total

| Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|
| 190 | 18,234,641 | 9,794,302 | 1,045,043,004 | 16,401,647 | $268.52 (88 without a price) |

## By model

| Tool | Model | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|---|
| claude | claude-opus-5-5 | 46 | 126,508 | 4,100,684 | 407,009,554 | 14,697,144 | $256.64 |
| claude | claude-sonnet-5-5 | 22 | 650 | 336,046 | 19,901,738 | 1,704,503 | $11.88 |
| cursor | grok-4.7-high | 66 | 12,146,432 | 3,634,855 | 404,778,112 | 0 | — |
| cursor | grok-4.7-xhigh-fast | 56 | 5,961,051 | 1,722,717 | 213,353,600 | 0 | — |

## By stage

| Stage | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| intake | 3 | 350 | 200,438 | 18,428,029 | 607,702 | $11.83 |
| revise | 1 | 62 | 24,159 | 1,164,892 | 109,905 | $1.46 |
| builder | 122 | 18,107,483 | 5,357,572 | 618,131,712 | 0 | — |
| reviewer | 62 | 8,040 | 3,930,967 | 383,474,382 | 14,932,725 | $239.91 |

## By task

| Task | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| intake-17 | 1 | 164 | 88,411 | 6,850,125 | 236,372 | $4.74 |
| intake-28 | 2 | 186 | 112,027 | 11,577,904 | 371,330 | $7.09 |
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
| T16 | 14 | 1,142,150 | 971,357 | 86,392,463 | 2,273,245 | $34.95 (6 without a price) |
| T17 | 15 | 1,225,957 | 594,531 | 64,212,700 | 1,202,936 | $20.67 (7 without a price) |
| T18 | 8 | 1,005,153 | 378,866 | 34,609,407 | 274,446 | $2.23 (6 without a price) |
| T19 | 10 | 1,535,065 | 418,918 | 29,724,470 | 225,485 | $1.50 (7 without a price) |
| T20 | 9 | 1,288,892 | 904,833 | 114,574,326 | 1,666,728 | $29.37 (5 without a price) |
| T21 | 11 | 931,743 | 826,961 | 112,356,333 | 1,855,465 | $38.79 (6 without a price) |
| T22 | 5 | 641,548 | 251,550 | 26,251,216 | 77,507 | $0.44 (3 without a price) |
| T23 | 12 | 1,093,786 | 713,524 | 79,551,220 | 1,242,451 | $22.91 (7 without a price) |
