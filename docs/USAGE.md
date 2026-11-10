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

Runs: 206 · Not reported: 35 · Last run: 2026-11-10T10:05:10.887Z

## Total

| Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|
| 206 | 20,147,518 | 10,665,680 | 1,136,625,097 | 17,998,323 | $293.66 (96 without a price) |

## By model

| Tool | Model | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|---|
| claude | claude-opus-5-5 | 51 | 127,384 | 4,464,366 | 445,794,990 | 16,139,248 | $280.88 |
| claude | claude-sonnet-5-5 | 24 | 692 | 352,988 | 20,696,859 | 1,859,075 | $12.77 |
| cursor | grok-4.7-high | 74 | 13,797,726 | 4,063,225 | 453,073,280 | 0 | — |
| cursor | grok-4.7-xhigh-fast | 56 | 5,961,051 | 1,722,717 | 213,353,600 | 0 | — |
| cursor | grok-4.7-xhigh | 1 | 260,665 | 62,384 | 3,706,368 | 0 | — |

## By stage

| Stage | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| intake | 6 | 852 | 426,055 | 43,917,376 | 1,359,529 | $26.34 |
| revise | 1 | 62 | 24,159 | 1,164,892 | 109,905 | $1.46 |
| builder | 131 | 20,019,442 | 5,848,326 | 670,133,248 | 0 | — |
| reviewer | 66 | 8,456 | 4,085,974 | 397,565,592 | 15,777,574 | $250.54 |

## By task

| Task | Runs | Input | Output | Cache read | Cache write | Cost (USD) |
|---|---|---|---|---|---|---|
| blueprint | 2 | 118,706 | 281,166 | 23,843,989 | 751,315 | $15.31 |
| intake-17 | 1 | 164 | 88,411 | 6,850,125 | 236,372 | $4.74 |
| intake-28 | 2 | 186 | 112,027 | 11,577,904 | 371,330 | $7.09 |
| intake-36 | 3 | 502 | 225,617 | 25,489,347 | 751,827 | $14.51 |
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
| T24 | 4 | 810,010 | 321,304 | 31,041,885 | 433,169 | $6.61 (3 without a price) |
| T25 | 3 | 330,943 | 108,521 | 12,691,336 | 67,003 | $0.39 (2 without a price) |
| T26 | 4 | 510,737 | 144,319 | 18,341,756 | 257,108 | $3.13 (2 without a price) |
| T27 | 2 | 260,685 | 71,617 | 4,017,769 | 87,569 | $0.50 (1 without a price) |
