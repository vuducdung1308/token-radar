# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the DeFi protocols without a token yet by what a launch would be worth — and shows how to farm each one. It scores all 40 protocols on the competition watchlist plus 138 early finds below the TVL floor, on a model computed from the snapshot itself: each category's multiple is the median market-cap/TVL of the live protocols in that category, adjusted for 7-day growth, age and chain count. Wrapped, staked and bridged products of tokens that already trade are left out, the same exclusion the watchlist rule uses. The dashboard is a sortable, filterable board with a per-protocol detail view (model breakdown and a 6-step farm plan with costs and times) and a separate view of the protocols whose token already trades, at the market's own values.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes `board.json`, the dashboard data and `dossier.json` into the output directory, and copies `dashboard/` and `screenshots/` there. `input/snapshot.json` is the competition snapshot from the kit. Open `out/dashboard/index.html` to browse the board.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0d8jtjfq&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
