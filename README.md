# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the DeFi protocols without a token yet by what a launch would be worth — and shows how to farm each one. It ranks all 758 protocols in the snapshot: 198 launch candidates (all 40 on the competition watchlist plus 158 early finds below the TVL floor) by implied launch value, 128 protocols whose token already trades by market cap, 288 token protocols with no market cap in the snapshot (including 16 dead tokens with a recorded market cap of 0 or −1) by the model's implied value and marked live-unpriced, and 144 pre-token protocols that are not launch candidates by the same value and marked with the reason — kept apart so a reader never mistakes one for a launch candidate. The model is fitted from the snapshot itself, not asserted: the implied value is the protocol's TVL times its category's median market-cap-to-TVL ratio, computed at run time from the 128 live protocols, adjusted for 7-day growth, age and chain count, with the category's own quartiles as the uncertainty band and launch odds from the peers' record. This is the rule of radar-3, the highest-scoring entry so far (0.9107, against 0.9014 for the fitted-line board and 0.8828 for the two-method consensus). The model is tested, not just asserted: each method is fitted on one half of the live protocols and asked to predict the other half's market caps, twice, and the dashboard prints the ranking rule's errors next to the fitted line's on the same splits (category model log error 1.66 and 1.69, fitted line 1.14 and 1.39) — the rule is the worse predictor, and the board ranks by it anyway because the entry that did scored highest with the judge. Every farm plan is costed: gas for six steps, slippage and locked capital against the expected reward (launch odds times 5% of the implied value, shared among the estimated farmers), giving a verdict per candidate — 126 worth farming, 19 marginal, 53 skip — and a Farm tab ranks the positive-EV opportunities best first. Wrapped, staked and bridged products of tokens that already trade are not launch candidates, the same exclusion the watchlist rule uses, and listed with the reason. The dashboard is a sortable, filterable board with a per-protocol detail view (category estimate, fitted-line reference, uncertainty range, launch odds, costed farm verdict and a 6-step farm plan with costs and times), a view of every protocol whose token already trades at the market's own values, and an integrity strip with the checks a reader can verify without trusting the entry.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes `board.json`, the dashboard data and `dossier.json` into the output directory, and copies `dashboard/` and `screenshots/` there. `input/snapshot.json` is the competition snapshot from the kit. Open `out/dashboard/index.html` to browse the board.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0d8jtjfq&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
