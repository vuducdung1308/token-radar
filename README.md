# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vuducdung1308/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the DeFi protocols without a token yet by what a launch would be worth — and shows how to farm each one. It covers all 758 protocols in the snapshot: 198 launch candidates (all 40 on the competition watchlist plus 158 early finds below the TVL floor) ranked by implied launch value, and 128 protocols whose token already trades ranked by market cap, kept apart so a reader never mistakes one for a launch candidate. The model is computed from the snapshot itself: each category's multiple is the median market-cap/TVL of the live protocols in that category, adjusted for 7-day growth, age and chain count, with an uncertainty range from the category's 25th–75th percentile multiples and launch odds from the peers' record. The model is tested, not just asserted: it is fitted on one half of the live protocols and asked to predict the other half's market caps, twice, and the dashboard prints both splits' median miss. Wrapped, staked and bridged products of tokens that already trade are left out of the board, the same exclusion the watchlist rule uses, and listed with the reason. The dashboard is a sortable, filterable board with a per-protocol detail view (model breakdown, uncertainty range, launch odds and a 6-step farm plan with costs and times), a view of every protocol whose token already trades at the market's own values, and an integrity strip with the checks a reader can verify without trusting the entry.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes `board.json`, the dashboard data and `dossier.json` into the output directory, and copies `dashboard/` and `screenshots/` there. `input/snapshot.json` is the competition snapshot from the kit. Open `out/dashboard/index.html` to browse the board.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0d8jtjfq&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
