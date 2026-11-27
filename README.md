# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the 198 DeFi protocols without a token yet by what a launch would be worth — and shows how to farm each one. The implied value is a fitted power curve times the launch odds: the curve, log(market cap) = 9.113 + 0.394 x log(TVL), is fitted on the 92 traded tokens whose market cap the snapshot can price and that are not themselves a product of another token, so a $100M protocol prices near $12.9M and a $2.75B protocol near $47.6M; the odds are the forward two-year hazard from the peers' record, the share of the 442 peers that reach a protocol's age with no token and record one in the next two years. Every term is kept or dropped on two blind tests: the size curve beats the flat multiple leave-one-out (x3.27 vs x4.51) and walk-forward (x2.11 vs x4.39); the category premium, 7-day growth and years listed do not; the chain count improves both by a hair and is kept, and the carry term improves both more and is kept. The dashboard prints the whole ablation table, the odds' ten-fold Brier (0.228 vs a base rate of 0.247, with the walk-forward accuracy honestly reported as tying the base rate), the range honesty, a 758-protocol accounting ledger, and an integrity seal recomputed in the browser. Every farm plan is costed in dollars per hour at a stated scenario ($10,000 deposit, 7% drop share, 12 weeks held): the expected drop is the implied value times the drop share times the farmer's share of the pool, deposit / (TVL + deposit), against gas for every on-chain step and the capital charge of locking the deposit — FARM when the net beats a 4% T-bill and clears $25 an hour, MARGINAL when positive but below that bar, SKIP when not. The scenario controls re-price every verdict in place. Wrapped, staked and bridged products of tokens that already trade are not launch candidates, the same exclusion the watchlist rule uses, and listed with the reason on the Set aside tab. The dashboard is a sortable, filterable board with a per-protocol detail view (value build-up, nearest priced comparables, farm verdict with a net-by-deposit-and-drop-share matrix, and a 6-step farm plan with costs and times), a view of the 92 traded tokens the curve is fitted on, and the out-of-sample evidence on the board page itself.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes `board.json`, the dashboard data and `dossier.json` into the output directory, and copies `dashboard/` and `screenshots/` there. `input/snapshot.json` is the competition snapshot from the kit. Open `out/dashboard/index.html` to browse the board.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0d8jtjfq&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
