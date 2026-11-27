// The token radar's model (radar-7): one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks the 198 launch candidates, strongest first, each by an implied launch
// value the radar can defend: the value if the protocol launched a token, times the launch
// odds — the share of its peers that record one within two years of reaching its age.
// Everything else the snapshot holds lives in the ledger and in the dashboard's other tabs:
// the 92 traded tokens whose market caps fit the value curve (the comparison set), the 324
// protocols whose token is recorded but the snapshot carries no usable market cap for, and
// the 144 wrapped, staked, bridged, exchange and versioned products that are set aside with
// a reason each. 198 + 92 + 324 + 144 = 758: every protocol is accounted for exactly once,
// and the watchlist's 40 slugs are all on the board.
//
// Implied value follows only from the snapshot's own figures, and every term in it is fitted,
// not asserted — and every term is kept or dropped on two blind tests. The launch value is
// a power curve fitted on the 92 traded tokens whose market cap the snapshot can price and
// that are not themselves a product of another token (wrapped, staked, bridged, versioned,
// exchange): log(market cap) = intercept + slope x log(TVL). On this snapshot the fit is
// 9.113 + 0.394 x log(TVL), so a $100M protocol prices near $12.9M and a $2.75B protocol
// near $47.6M — the fitted line, not a category multiple. The category multiple (radar-3's
// rule, 0.9107, and radar-6's, 0.8676) prices the same $2.75B protocol near $510M, and the
// blind test below shows why that overprices it: the flat multiple misses by x4.5
// leave-one-out and x4.4 walk-forward, the size curve by x3.3 and x2.1.
//
// The value terms are added in order and kept only when BOTH blind tests improve — the
// leave-one-out test (each of the 92 traded tokens priced from a fit on the other 91) and
// the walk-forward test (the older half of the traded tokens, listed before the median
// listing date, prices the newer half). Measured on this snapshot: the size curve beats the
// flat multiple on both; the category premium (shrunk toward 1) does not, and neither do
// 7-day growth or years listed; the chain count improves both by a hair and is kept, and
// the carry term — one more week of the 7-day change, held to ±25% — improves both more
// and is kept. The dashboard prints the whole ablation table with the exact misses, so the
// kept set is a result, not a choice.
//
// The launch odds are the peers' record, not a prediction. A logistic curve fitted on the
// 442 peers — every protocol that is not itself a product of another token — gives F(age),
// the share of peers that record a token by a given age. The odds for a candidate of age a
// are the forward two-year hazard, [F(a + 2y) - F(a)] / [1 - F(a)]: the share of peers
// that reach age a with no token and record one in the next two years. Young protocols get
// high odds (a 56-day protocol: 0.53) and old ones low odds (a 1.5-year protocol with no
// token: 0.31), because the peers' record says so. The odds model is tested the same way:
// ten-fold Brier 0.228 against a base rate of 0.247, and the walk-forward accuracy ties
// the base rate (0.682 against 0.682) — the later peers are mostly young protocols that
// have not had time to record a token, so the model adds nothing forward in time, and the
// dashboard says so. A fuller model with category share, size and growth does a little
// better on the ten-fold test (0.214) but punishes new categories that have not had time
// to record a token — Risk Curators score 0.12 where the age curve says 0.31 — so the
// board uses the age curve alone and prints the fuller model's score next to it.
//
// The uncertainty range on each row is the curve's own held-out error: the 25th and 75th
// percentile (and the 10th and 90th) of the leave-one-out log-residuals, applied to the
// row's implied value. The range-honesty table checks how often a real market cap lands
// inside the printed range. The bootstrap (200 refits on resampled traded tokens) gives the
// curve's slope and its multiple at $100M TVL with standard errors, and each row's rank
// range across the refits.
//
// Farm verdicts are costed, not asserted, and they are priced in dollars per hour. For each
// candidate the radar prices the farm at a stated scenario — a $10,000 deposit, a 7% drop
// share, 12 weeks held — and the expected drop is the implied value times the drop share
// times the farmer's share of the pool, deposit / (TVL + deposit): a $10,000 position in a
// $2.75B protocol buys almost nothing, so the giants are marginal at best however large
// their implied value is. The cost is gas for every on-chain step at the chain's stated
// rate, plus the capital charge of locking the deposit at 2% a year. The verdict compares
// the net with a 4% T-bill on the same money and with $25 an hour of hands-on work: FARM
// when the net beats the T-bill and clears $25 an hour, MARGINAL when it is positive but
// below that bar, SKIP when it is not. The dashboard's scenario controls (deposit, drop
// share, weeks held) re-price every verdict in place, from the row's own figures.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  unknown_age_days: number;
  odds_horizon_days: number;
  cat_shrink_k: number;
  bootstrap_refits: number;
  deposit_usd: number;
  drop_share: number;
  weeks_held: number;
  farm_hour_threshold_usd: number;
  tbill_rate: number;
  capital_rate: number;
  cat_mult_min_live: number;
}

export const MODEL: ModelConstants = {
  unknown_age_days: 365,
  odds_horizon_days: 730,
  cat_shrink_k: 4,
  bootstrap_refits: 200,
  deposit_usd: 10_000,
  drop_share: 0.07,
  weeks_held: 12,
  farm_hour_threshold_usd: 25,
  tbill_rate: 0.04,
  capital_rate: 0.02,
  cat_mult_min_live: 5,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-7';

/** A farm step: the action, what it costs, how long it takes, and the hands-on minutes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
  minutes: number;
}

/** One row of board.json: a launch candidate, ranked by implied launch value. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  candidate: true;
  excluded_reason: null;
  token_odds: number;
  odds_f_now: number;
  odds_f_2y: number;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  implied_p10_usd: number;
  implied_p90_usd: number;
  rank_low: number;
  rank_high: number;
  model: {
    fit_intercept: number;
    fit_slope: number;
    launch_value_usd: number;
    category_multiple: number;
    category_estimate_usd: number;
    growth_pct: number;
    chain_count: number;
    age_days: number | null;
  };
  farm_fees_usd: number;
  farm_capital_charge_usd: number;
  farm_tbill_usd: number;
  farm_expected_usd: number;
  farm_net_usd: number;
  farm_hours: number;
  farm_net_per_hour_usd: number;
  farm_verdict: 'FARM' | 'MARGINAL' | 'SKIP';
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  implied_p10_usd: number;
  implied_p90_usd: number;
  rank_low: number;
  rank_high: number;
  token_odds: number;
  odds_f_now: number;
  odds_f_2y: number;
  fit_intercept: number;
  fit_slope: number;
  launch_value_usd: number;
  category_multiple: number;
  category_estimate_usd: number;
  growth_pct: number;
  chain_count: number;
  farm_fees_usd: number;
  farm_capital_charge_usd: number;
  farm_tbill_usd: number;
  farm_expected_usd: number;
  farm_net_usd: number;
  farm_hours: number;
  farm_net_per_hour_usd: number;
  farm_verdict: 'FARM' | 'MARGINAL' | 'SKIP';
  farm_steps: string[];
}

/** A traded token the value curve is fitted on: the comparison set, with the curve's blind price of it. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  change_7d: number | null;
  model_usd: number;
  miss: number;
}

/** One value term's blind-test result: added in order, kept only when both tests improve. */
export interface ValueTermRow {
  term: string;
  loo: number;
  wf: number;
  kept: boolean;
}

/** The value model's blind-test evidence, computed from the snapshot at run time. */
export interface ValueEvidence {
  comps_n: number;
  flat_loo: number;
  flat_wf: number;
  base_loo: number;
  base_wf: number;
  curve_loo: number;
  curve_wf: number;
  terms: ValueTermRow[];
  kept_keys: string[];
  residual_q25: number;
  residual_q75: number;
  residual_q10: number;
  residual_q90: number;
  range_honesty_p25: number;
  range_honesty_p10: number;
  bootstrap_slope: number;
  bootstrap_slope_se: number;
  bootstrap_base_usd: number;
  bootstrap_base_se_usd: number;
  wf_cutoff: string;
  wf_train_n: number;
  wf_test_n: number;
}

/** The launch-odds model's blind-test evidence. */
export interface OddsEvidence {
  peers_n: number;
  base_rate: number;
  base_brier: number;
  age_brier_in_sample: number;
  age_brier_10fold: number;
  full_brier_10fold: number;
  wf_accuracy: number;
  wf_base_accuracy: number;
  wf_train_n: number;
  wf_test_n: number;
  logit_const: number;
  logit_slope: number;
  logit_mu: number;
  logit_sd: number;
}

/** One group of the accounting ledger: every protocol in exactly one group. */
export interface LedgerGroup {
  key: string;
  label: string;
  count: number;
  rule: string;
}

/** One category's reference multiple and its spread, from the snapshot's live protocols. */
export interface CategoryStat {
  multiple: number;
  q25: number;
  q75: number;
  live_count: number;
}

/** The fitted log-log line, from the snapshot's traded tokens. */
export interface LogLogFit {
  intercept: number;
  slope: number;
  live_n: number;
}

/** Everything the dashboard needs: the board, the comparison set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  candidate_size: number;
  ledger: LedgerGroup[];
  category_stats: Record<string, CategoryStat>;
  overall_multiple: number;
  overall_q25: number;
  overall_q75: number;
  overall_live_count: number;
  fit: LogLogFit;
  value_evidence: ValueEvidence;
  odds_evidence: OddsEvidence;
  seal: string;
  watchlist: string[];
  rows: RadarRow[];
  live: LiveRow[];
  excluded: ExcludedRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted-ascending list, or null when it is empty. */
function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The value at the p-th quantile of a sorted-ascending list (nearest-rank), or null when empty. */
function quantile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** A deterministic hash of a slug, for the ten-fold split: no randomness, no dates. */
function slugHash(slug: string): number {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Ordinary least squares of y on x: returns [intercept, slope]. */
function ols(xs: number[], ys: number[]): [number, number] {
  const n = xs.length;
  if (n === 0) return [0, 0];
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
    sxy += (xs[i]! - mx) * (ys[i]! - my);
  }
  if (sxx === 0) return [my, 0];
  const slope = sxy / sxx;
  return [my - slope * mx, slope];
}

/**
 * The log-log fit: log(market cap) against log(TVL) over the protocols whose token trades
 * with a usable market cap and that are not themselves a product of another token. Sixteen
 * live protocols record a market cap of 0 or -1 (dead tokens); they carry no price to fit,
 * so they are left out, and so are the wrapped, staked, bridged, versioned and exchange
 * products, whose market cap belongs to someone else's token.
 */
export function fitLogLog(protocols: SnapshotProtocol[]): LogLogFit {
  const live = protocols.filter((p) => hasUsableMcap(p) && p.tvl_usd > 0 && !excludedProduct(p));
  const [intercept, slope] = ols(
    live.map((p) => Math.log(p.tvl_usd)),
    live.map((p) => Math.log(p.mcap_usd!)),
  );
  return { intercept: round4(intercept), slope: round4(slope), live_n: live.length };
}

/** The live protocols' market-cap-to-TVL ratios, grouped by category, sorted ascending. */
function ratioGroups(protocols: SnapshotProtocol[]): { byCategory: Map<string, number[]>; all: number[] } {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0 || p.mcap_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    all.push(ratio);
    const key = p.category ?? 'Uncategorised';
    const list = byCategory.get(key);
    if (list === undefined) byCategory.set(key, [ratio]);
    else list.push(ratio);
  }
  all.sort((a, b) => a - b);
  for (const list of byCategory.values()) list.sort((a, b) => a - b);
  return { byCategory, all };
}

/**
 * Every category's reference multiple and its spread, from the snapshot's own live-token
 * protocols: the median market-cap-to-TVL ratio per category (categories with fewer than
 * `minLive` live protocols fall back to the overall median), with the 25th and 75th
 * percentile of the same ratios. In radar-7 the multiples are a reference the dashboard
 * prints, not the ranking rule: the fitted curve ranks, and the table lets a reader see
 * what the old rule would have said.
 */
export function categoryStats(
  protocols: SnapshotProtocol[],
  model: ModelConstants,
): { table: Record<string, CategoryStat>; overall: CategoryStat } {
  const { byCategory, all } = ratioGroups(protocols);
  const overallRaw = median(all) ?? 0.2;
  const overall: CategoryStat = {
    multiple: round3(overallRaw),
    q25: round3(quantile(all, 0.25) ?? overallRaw),
    q75: round3(quantile(all, 0.75) ?? overallRaw),
    live_count: all.length,
  };
  const table: Record<string, CategoryStat> = {};
  for (const [key, ratios] of byCategory) {
    if (ratios.length >= model.cat_mult_min_live) {
      table[key] = {
        multiple: round3(median(ratios)!),
        q25: round3(quantile(ratios, 0.25)!),
        q75: round3(quantile(ratios, 0.75)!),
        live_count: ratios.length,
      };
    } else {
      table[key] = { ...overall, live_count: ratios.length };
    }
  }
  return { table, overall };
}

/** Backwards-compatible shape: the multiples table and the overall median. */
export function categoryMultiples(
  protocols: SnapshotProtocol[],
  model: ModelConstants,
): { table: Record<string, number>; overall: number } {
  const stats = categoryStats(protocols, model);
  const table: Record<string, number> = {};
  for (const [key, stat] of Object.entries(stats.table)) table[key] = stat.multiple;
  return { table, overall: stats.overall.multiple };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories the watchlist rule keeps out: a wrapped, staked or bridged product of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name beginning with an exchange's name is that exchange's product, not a launch candidate. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** A name carrying a whole word wrapped, staked or staking is a product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol is itself a product of another token, by the snapshot's own watchlist rule. */
export function excludedProduct(p: SnapshotProtocol): boolean {
  if (EXCLUDED_CATEGORIES.has(p.category ?? '')) return true;
  if (EXCHANGE_PREFIX.test(p.name)) return true;
  if (WRAPPED_WORD.test(p.name)) return true;
  if (VERSIONED.test(p.name)) return true;
  return false;
}

/** Which product group a set-aside protocol falls in, for the ledger. */
export function productGroup(p: SnapshotProtocol): 'bridge' | 'staking' | 'exchange' | 'versioned' | null {
  if (p.category === 'Bridge' || p.category === 'Canonical Bridge') return 'bridge';
  if (p.category === 'Liquid Staking' || p.category === 'Liquid Restaking' || p.category === 'Restaked BTC') return 'staking';
  if (p.category === 'CEX' || EXCHANGE_PREFIX.test(p.name)) return 'exchange';
  if (VERSIONED.test(p.name) || WRAPPED_WORD.test(p.name)) return 'versioned';
  return null;
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol's token already trades with a market cap the snapshot can price. */
export function hasUsableMcap(p: SnapshotProtocol): boolean {
  return p.mcap_usd !== null && p.mcap_usd > 0;
}

/** Why a pre-token protocol is not a launch candidate, or null when it is one. */
export function excludedReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return null;
  if (EXCLUDED_CATEGORIES.has(p.category ?? '')) return `category ${p.category} is a wrapped, staked or bridged product of a token that already trades`;
  if (EXCHANGE_PREFIX.test(p.name)) return 'the name starts with an exchange, so this is that exchange’s product';
  if (WRAPPED_WORD.test(p.name)) return 'the name carries wrapped, staked or staking, so this is a product of a token that already trades';
  if (VERSIONED.test(p.name)) return 'the name ends in a version marker, so this is a pool of another protocol';
  return null;
}

/**
 * Whether a protocol is one the board may rank as a launch candidate: pre-token, and not a
 * wrapped, staked or bridged product of a token that already trades — the same exclusion the
 * snapshot's own watchlist rule uses, applied here to every row the radar adds.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && excludedReason(p) === null;
}

/** The traded tokens the value curve is fitted on: usable market cap, not a product. */
export function tradedComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => hasUsableMcap(p) && p.tvl_usd > 0 && !excludedProduct(p));
}

/** The peers the launch odds are fitted on: every protocol that is not itself a product. */
export function oddsPeers(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => !excludedProduct(p));
}

/**
 * The accounting ledger: every protocol in exactly one group, with the rule that puts it
 * there. Ranked watchlist + ranked off-list above the floor + ranked early below the floor
 * = the board; priced comps = the curve's comparison set; token recorded with no usable cap
 * = a token exists but the snapshot carries no price for it; the four set-aside groups are
 * the products of tokens that already trade.
 */
export function ledgerGroups(snapshot: Snapshot): LedgerGroup[] {
  const wl = new Set(snapshot.watchlist);
  const comps = tradedComps(snapshot);
  const compSet = new Set(comps.map((p) => p.slug));
  let watchlist = 0;
  let offList = 0;
  let early = 0;
  let recorded = 0;
  const setAside: Record<string, number> = { bridge: 0, staking: 0, exchange: 0, versioned: 0 };
  for (const p of snapshot.protocols) {
    if (isRankable(p)) {
      if (wl.has(p.slug)) watchlist++;
      else if (p.tvl_usd >= snapshot.floor_usd) offList++;
      else early++;
    } else if (compSet.has(p.slug)) {
      // priced comp: counted in the comparison set, not in a group below
    } else if (p.symbol !== null) {
      recorded++;
    } else {
      const g = productGroup(p);
      if (g !== null) setAside[g]!++;
    }
  }
  const groups: LedgerGroup[] = [
    { key: 'watchlist', label: 'Ranked · watchlist', count: watchlist, rule: 'on the house watchlist, no token, not a product' },
    { key: 'offlist', label: 'Ranked · off-list, above the floor', count: offList, rule: 'no token, not a product, TVL at or above the $50M floor' },
    { key: 'early', label: 'Ranked · early, below the floor', count: early, rule: 'no token, not a product, TVL below the $50M floor' },
    { key: 'comps', label: 'Token trades · priced comp', count: comps.length, rule: 'usable market cap, not a product — the curve is fitted on these' },
    { key: 'recorded', label: 'Token recorded · no usable cap', count: recorded, rule: 'a symbol is recorded but the snapshot carries no usable market cap' },
    { key: 'bridge', label: 'Out · bridge', count: setAside.bridge!, rule: 'a bridge of a token that already trades' },
    { key: 'staking', label: 'Out · liquid staking', count: setAside.staking!, rule: 'a staked or restaked form of a token that already trades' },
    { key: 'exchange', label: 'Out · exchange', count: setAside.exchange!, rule: 'an exchange product, by category or by name' },
    { key: 'versioned', label: 'Out · versioned or wrapped', count: setAside.versioned!, rule: 'a versioned pool, or a name carrying wrapped, staked or staking' },
  ];
  return groups;
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

// ---------------------------------------------------------------------------
// Value model: a power curve on the traded comps, with every term kept or dropped
// on two blind tests.
// ---------------------------------------------------------------------------

/** One value term's feature, from a protocol's own record. */
export type ValueKey = 'logTVL' | 'growth' | 'logYears' | 'logChains' | 'carry';

function valueFeature(p: SnapshotProtocol, asOf: string, key: ValueKey): number {
  switch (key) {
    case 'logTVL':
      return Math.log(Math.max(1, p.tvl_usd));
    case 'growth':
      return Math.max(-0.6, Math.min(1.2, finite(p.change_7d, 0) / 100));
    case 'logYears': {
      const age = ageDays(asOf, p.listed_at);
      return Math.log(Math.max(age ?? MODEL.unknown_age_days, 30) / 365);
    }
    case 'logChains':
      return Math.log(Math.max(1, p.chains.length));
    case 'carry':
      return Math.max(-0.25, Math.min(0.25, finite(p.change_7d, 0) / 100));
  }
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r]![i]!) > Math.abs(M[piv]![i]!)) piv = r;
    [M[i], M[piv]] = [M[piv]!, M[i]!];
    const d = M[i]![i]!;
    if (d === 0) return new Array(n).fill(0);
    for (let r = i + 1; r < n; r++) {
      const f = M[r]![i]! / d;
      for (let c = i; c <= n; c++) M[r]![c]! -= f * M[i]![c]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i]![n]!;
    for (let j = i + 1; j < n; j++) s -= M[i]![j]! * x[j]!;
    x[i] = s / M[i]![i]!;
  }
  return x;
}

/** Multi-term OLS of log(market cap) on the given features, with an intercept. */
function fitValueMulti(train: SnapshotProtocol[], asOf: string, keys: ValueKey[]): number[] {
  const n = keys.length + 1;
  const A: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b = new Array<number>(n).fill(0);
  for (const p of train) {
    const x = [1, ...keys.map((k) => valueFeature(p, asOf, k))];
    const y = Math.log(p.mcap_usd!);
    for (let i = 0; i < n; i++) {
      b[i]! += x[i]! * y;
      for (let j = 0; j < n; j++) A[i]![j]! += x[i]! * x[j]!;
    }
  }
  return solveLinear(A, b);
}

function predictValueMulti(p: SnapshotProtocol, asOf: string, keys: ValueKey[], w: number[]): number {
  let s = w[0]!;
  for (let i = 0; i < keys.length; i++) s += w[i + 1]! * valueFeature(p, asOf, keys[i]!);
  return Math.exp(s);
}

/** The miss of a prediction against a real market cap, as a multiple. */
function missRatio(pred: number, actual: number): number {
  return Math.max(pred / actual, actual / pred);
}

/** A category premium from a training set's residuals: each category's mean log-residual,
 * shrunk toward zero by n / (n + k) pseudo-observations, so a category with few priced
 * tokens barely moves the prediction. */
function categoryPremium(train: SnapshotProtocol[], asOf: string, keys: ValueKey[], w: number[], k: number): Map<string, number> {
  const sums = new Map<string, { s: number; n: number }>();
  for (const p of train) {
    const r = Math.log(p.mcap_usd! / predictValueMulti(p, asOf, keys, w));
    const key = p.category ?? 'Uncategorised';
    const e = sums.get(key) ?? { s: 0, n: 0 };
    e.s += r;
    e.n++;
    sums.set(key, e);
  }
  const out = new Map<string, number>();
  for (const [key, e] of sums) out.set(key, (e.s / e.n) * (e.n / (e.n + k)));
  return out;
}

function predictWithPremium(
  p: SnapshotProtocol,
  asOf: string,
  keys: ValueKey[],
  w: number[],
  premium: Map<string, number> | null,
): number {
  const base = predictValueMulti(p, asOf, keys, w);
  if (premium === null) return base;
  return base * Math.exp(premium.get(p.category ?? 'Uncategorised') ?? 0);
}

/** The median listing date of the traded comps that carry one, as an ISO date. */
function medianListedDate(comps: SnapshotProtocol[]): string {
  const ds = comps
    .filter((p) => p.listed_at !== null)
    .map((p) => p.listed_at!)
    .sort();
  return ds[Math.floor(ds.length / 2)] ?? '2024-07-15';
}

/**
 * The value model's blind-test evidence. The traded comps are split leave-one-out (each
 * priced from a fit on the other 91) and walk-forward (the older half, listed before the
 * median listing date, prices the newer half). The flat multiple and the size curve are
 * scored on both; then each further term is added in order and kept only when it improves
 * BOTH misses. The residual quartiles come from the final model's leave-one-out residuals,
 * and the range honesty is the share of those residuals that land inside the band the
 * full-fit residuals would print — the band is built from one set of residuals and tested
 * on the other, never on itself.
 */
export function valueEvidence(snapshot: Snapshot, model: ModelConstants = MODEL): ValueEvidence {
  const asOf = snapshot.as_of;
  const comps = tradedComps(snapshot);
  const cutoff = medianListedDate(comps);
  const older = comps.filter((p) => p.listed_at !== null && p.listed_at < cutoff);
  const newer = comps.filter((p) => p.listed_at !== null && p.listed_at >= cutoff);
  const flat = median(comps.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b)) ?? 0.2;

  const looMiss = (keys: ValueKey[], usePremium: boolean): number => {
    const rs: number[] = [];
    for (let i = 0; i < comps.length; i++) {
      const tr = comps.filter((_, j) => j !== i);
      const w = fitValueMulti(tr, asOf, keys);
      const prem = usePremium ? categoryPremium(tr, asOf, keys, w, model.cat_shrink_k) : null;
      rs.push(missRatio(predictWithPremium(comps[i]!, asOf, keys, w, prem), comps[i]!.mcap_usd!));
    }
    rs.sort((a, b) => a - b);
    return round3(median(rs) ?? 0);
  };
  const wfMiss = (keys: ValueKey[], usePremium: boolean): number => {
    const w = fitValueMulti(older, asOf, keys);
    const prem = usePremium ? categoryPremium(older, asOf, keys, w, model.cat_shrink_k) : null;
    const rs = newer.map((p) => missRatio(predictWithPremium(p, asOf, keys, w, prem), p.mcap_usd!));
    rs.sort((a, b) => a - b);
    return round3(median(rs) ?? 0);
  };
  const flatLoo = round3(median(comps.map((p) => missRatio(flat * p.tvl_usd, p.mcap_usd!)).sort((a, b) => a - b)) ?? 0);
  const flatWf = round3(median(newer.map((p) => missRatio(flat * p.tvl_usd, p.mcap_usd!)).sort((a, b) => a - b)) ?? 0);

  let keys: ValueKey[] = ['logTVL'];
  let usePremium = false;
  let curLoo = looMiss(keys, false);
  let curWf = wfMiss(keys, false);
  const baseLoo = curLoo;
  const baseWf = curWf;
  const terms: ValueTermRow[] = [];
  const trialOrder: { label: string; key: ValueKey | 'catPremium' }[] = [
    { label: 'category premium, shrunk', key: 'catPremium' },
    { label: '7-day TVL growth', key: 'growth' },
    { label: 'years listed, log', key: 'logYears' },
    { label: 'chain count, log', key: 'logChains' },
    { label: 'carry (one more week of 7-day change, held to ±25%)', key: 'carry' },
  ];
  for (const t of trialOrder) {
    const nextKeys = t.key === 'catPremium' ? keys : [...keys, t.key as ValueKey];
    const nextPrem = t.key === 'catPremium' ? true : usePremium;
    const l = looMiss(nextKeys, nextPrem);
    const f = wfMiss(nextKeys, nextPrem);
    const kept = l < curLoo && f < curWf;
    terms.push({ term: t.label, loo: l, wf: f, kept });
    if (kept) {
      keys = nextKeys;
      usePremium = nextPrem;
      curLoo = l;
      curWf = f;
    }
  }

  // Final fit on all 92 comps, with the kept terms.
  const wFull = fitValueMulti(comps, asOf, keys);
  const premFull = usePremium ? categoryPremium(comps, asOf, keys, wFull, model.cat_shrink_k) : null;
  // Leave-one-out residuals of the final model, for the range band.
  const looRes: number[] = [];
  for (let i = 0; i < comps.length; i++) {
    const tr = comps.filter((_, j) => j !== i);
    const w = fitValueMulti(tr, asOf, keys);
    const prem = usePremium ? categoryPremium(tr, asOf, keys, w, model.cat_shrink_k) : null;
    looRes.push(Math.log(comps[i]!.mcap_usd! / predictWithPremium(comps[i]!, asOf, keys, w, prem)));
  }
  looRes.sort((a, b) => a - b);
  // The band itself comes from the full-fit residuals, so the coverage below is a real test.
  const fullRes = comps
    .map((p) => Math.log(p.mcap_usd! / predictWithPremium(p, asOf, keys, wFull, premFull)))
    .sort((a, b) => a - b);
  const q25 = quantile(fullRes, 0.25) ?? 0;
  const q75 = quantile(fullRes, 0.75) ?? 0;
  const q10 = quantile(fullRes, 0.1) ?? 0;
  const q90 = quantile(fullRes, 0.9) ?? 0;
  const honestyP25 = looRes.filter((r) => r >= q25 && r <= q75).length / Math.max(1, looRes.length);
  const honestyP10 = looRes.filter((r) => r >= q10 && r <= q90).length / Math.max(1, looRes.length);

  // Bootstrap: 200 refits of the size curve on resampled comps, for the curve's
  // slope and its multiple at $100M TVL with standard errors.
  let seed = 20261114;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const slopes: number[] = [];
  const bases: number[] = [];
  for (let b = 0; b < model.bootstrap_refits; b++) {
    const sample: SnapshotProtocol[] = [];
    for (let i = 0; i < comps.length; i++) sample.push(comps[Math.floor(rnd() * comps.length)]!);
    const wb = fitValueMulti(sample, asOf, ['logTVL']);
    slopes.push(wb[1]!);
    bases.push(Math.exp(wb[0]! + wb[1]! * Math.log(100_000_000)));
  }
  const sd = (xs: number[]): number => {
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, xs.length - 1));
  };
  const fit = fitLogLog(snapshot.protocols);
  return {
    comps_n: comps.length,
    flat_loo: flatLoo,
    flat_wf: flatWf,
    base_loo: baseLoo,
    base_wf: baseWf,
    curve_loo: curLoo,
    curve_wf: curWf,
    terms,
    kept_keys: keys,
    residual_q25: round4(q25),
    residual_q75: round4(q75),
    residual_q10: round4(q10),
    residual_q90: round4(q90),
    range_honesty_p25: round3(honestyP25),
    range_honesty_p10: round3(honestyP10),
    bootstrap_slope: round4(fit.slope),
    bootstrap_slope_se: round4(sd(slopes)),
    bootstrap_base_usd: Math.round(Math.exp(fit.intercept + fit.slope * Math.log(100_000_000))),
    bootstrap_base_se_usd: Math.round(sd(bases)),
    wf_cutoff: cutoff,
    wf_train_n: older.length,
    wf_test_n: newer.length,
  };
}

/** The launch value of one protocol under the final value model: the fitted curve at its TVL. */
export function launchValue(
  p: SnapshotProtocol,
  snapshot: Snapshot,
  evidence: ValueEvidence,
  model: ModelConstants = MODEL,
): number {
  const comps = tradedComps(snapshot);
  const keys = evidence.kept_keys as ValueKey[];
  const w = fitValueMulti(comps, snapshot.as_of, keys);
  const usePremium = evidence.terms.some((t) => t.term.startsWith('category premium') && t.kept);
  const prem = usePremium ? categoryPremium(comps, snapshot.as_of, keys, w, model.cat_shrink_k) : null;
  return predictWithPremium(p, snapshot.as_of, keys, w, prem);
}

// ---------------------------------------------------------------------------
// Launch odds: the peers' record, as a forward two-year hazard.
// ---------------------------------------------------------------------------

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
}

/** One peer's odds features: log years listed, category token share (shrunk), log TVL, 7-day growth. */
function oddsFeatures(
  p: SnapshotProtocol,
  asOf: string,
  share: Map<string, number>,
  overall: number,
  ageOverride: number | null,
  model: ModelConstants,
): number[] {
  const age = ageOverride ?? ageDays(asOf, p.listed_at) ?? model.unknown_age_days;
  return [
    Math.log(Math.max(age, 30) / 365),
    share.get(p.category ?? 'Uncategorised') ?? overall,
    Math.log(Math.max(1, p.tvl_usd)),
    Math.max(-0.6, Math.min(1.2, finite(p.change_7d, 0) / 100)),
  ];
}

function categoryTokenShare(train: SnapshotProtocol[], k: number): { share: Map<string, number>; overall: number } {
  const tot = new Map<string, number>();
  const tok = new Map<string, number>();
  let all = 0;
  let allTok = 0;
  for (const p of train) {
    const key = p.category ?? 'Uncategorised';
    tot.set(key, (tot.get(key) ?? 0) + 1);
    all++;
    if (p.symbol !== null) {
      tok.set(key, (tok.get(key) ?? 0) + 1);
      allTok++;
    }
  }
  const overall = all === 0 ? 0.5 : allTok / all;
  const share = new Map<string, number>();
  for (const [key, n] of tot) share.set(key, ((tok.get(key) ?? 0) + k * overall) / (n + k));
  return { share, overall };
}

/** Standardised logistic regression by gradient descent: deterministic, no randomness. */
function fitLogistic(
  train: SnapshotProtocol[],
  asOf: string,
  share: Map<string, number>,
  overall: number,
  useFull: boolean,
  model: ModelConstants,
  iters = 1500,
): { w: number[]; mu: number[]; sd: number[] } {
  const raw = train.map((p) => oddsFeatures(p, asOf, share, overall, null, model));
  const dim = useFull ? 4 : 1;
  const cols = useFull ? [0, 1, 2, 3] : [0];
  const mu = cols.map((c) => raw.reduce((s, r) => s + r[c]!, 0) / raw.length);
  const sd = cols.map((c, i) => {
    const v = raw.reduce((s, r) => s + (r[c]! - mu[i]!) * (r[c]! - mu[i]!), 0) / raw.length;
    return Math.sqrt(v) || 1;
  });
  const X = raw.map((r) => [1, ...cols.map((c, i) => (r[c]! - mu[i]!) / sd[i]!)]);
  const y = train.map((p) => (p.symbol !== null ? 1 : 0));
  const w = [Math.log(Math.max(1, y.reduce((s, v) => s + v, 0)) / Math.max(1, y.length - y.reduce((s, v) => s + v, 0))), ...new Array<number>(dim).fill(0)];
  const lr = 0.5;
  const lam = 1.0;
  for (let it = 0; it < iters; it++) {
    const g = new Array<number>(dim + 1).fill(0);
    for (let i = 0; i < X.length; i++) {
      const z = X[i]!.reduce((s, v, j) => s + w[j]! * v, 0);
      const pr = sigmoid(z);
      for (let j = 0; j <= dim; j++) g[j]! += (y[i]! - pr) * X[i]![j]!;
    }
    for (let j = 0; j <= dim; j++) w[j]! += lr * (g[j]! / X.length - (j > 0 ? (lam * w[j]!) / X.length : 0));
  }
  return { w, mu, sd };
}

function predictLogistic(
  p: SnapshotProtocol,
  asOf: string,
  share: Map<string, number>,
  overall: number,
  fit: { w: number[]; mu: number[]; sd: number[] },
  useFull: boolean,
  ageOverride: number | null,
  model: ModelConstants,
): number {
  const raw = oddsFeatures(p, asOf, share, overall, ageOverride, model);
  const cols = useFull ? [0, 1, 2, 3] : [0];
  const x = [1, ...cols.map((c, i) => (raw[c]! - fit.mu[i]!) / fit.sd[i]!)];
  return sigmoid(x.reduce((s, v, j) => s + fit.w[j]! * v, 0));
}

function brierScore(
  ps: SnapshotProtocol[],
  asOf: string,
  share: Map<string, number>,
  overall: number,
  fit: { w: number[]; mu: number[]; sd: number[] },
  useFull: boolean,
  model: ModelConstants,
): number {
  if (ps.length === 0) return 0;
  let s = 0;
  for (const p of ps) {
    const pr = predictLogistic(p, asOf, share, overall, fit, useFull, null, model);
    const y = p.symbol !== null ? 1 : 0;
    s += (pr - y) * (pr - y);
  }
  return s / ps.length;
}

/**
 * The launch-odds evidence. The age-only logistic curve is fitted on the 442 peers; the
 * ten-fold Brier (folds by slug hash) and the walk-forward accuracy (older peers train,
 * newer peers test, called right at 0.5 against the base rate's accuracy) are computed from
 * the snapshot. The fuller four-feature model is fitted the same way and its ten-fold Brier
 * is printed next to the age-only model's, so the choice of the simpler curve is measured.
 */
export function oddsEvidence(snapshot: Snapshot, model: ModelConstants = MODEL): OddsEvidence {
  const asOf = snapshot.as_of;
  const peers = oddsPeers(snapshot);
  const { share, overall } = categoryTokenShare(peers, model.cat_shrink_k);
  const baseBrier = overall * (1 - overall);
  const ageFit = fitLogistic(peers, asOf, share, overall, false, model);
  const fullFit = fitLogistic(peers, asOf, share, overall, true, model);
  const ageInSample = brierScore(peers, asOf, share, overall, ageFit, false, model);
  // Ten-fold Brier for both models, folds by slug hash.
  let ageFoldErr = 0;
  let fullFoldErr = 0;
  let foldN = 0;
  for (let k = 0; k < 10; k++) {
    const te = peers.filter((p) => slugHash(p.slug) % 10 === k);
    const tr = peers.filter((p) => slugHash(p.slug) % 10 !== k);
    if (te.length === 0 || tr.length === 0) continue;
    const { share: sh, overall: ov } = categoryTokenShare(tr, model.cat_shrink_k);
    const af = fitLogistic(tr, asOf, sh, ov, false, model, 800);
    const ff = fitLogistic(tr, asOf, sh, ov, true, model, 800);
    ageFoldErr += brierScore(te, asOf, sh, ov, af, false, model) * te.length;
    fullFoldErr += brierScore(te, asOf, sh, ov, ff, true, model) * te.length;
    foldN += te.length;
  }
  const age10 = foldN === 0 ? 0 : ageFoldErr / foldN;
  const full10 = foldN === 0 ? 0 : fullFoldErr / foldN;
  // Walk-forward accuracy: peers listed before the median listing date train, newer test.
  const dated = peers.filter((p) => p.listed_at !== null).map((p) => p.listed_at!).sort();
  const cutoff = dated[Math.floor(dated.length / 2)] ?? '2024-07-15';
  const trW = peers.filter((p) => p.listed_at !== null && p.listed_at < cutoff);
  const teW = peers.filter((p) => p.listed_at !== null && p.listed_at >= cutoff);
  const { share: shW, overall: ovW } = categoryTokenShare(trW, model.cat_shrink_k);
  const wfFit = fitLogistic(trW, asOf, shW, ovW, false, model);
  const wfAcc = teW.length === 0 ? 0 : teW.filter((p) => (predictLogistic(p, asOf, shW, ovW, wfFit, false, null, model) >= 0.5) === (p.symbol !== null)).length / teW.length;
  const teTok = teW.filter((p) => p.symbol !== null).length;
  const wfBase = teW.length === 0 ? 0 : Math.max(teTok, teW.length - teTok) / teW.length;
  return {
    peers_n: peers.length,
    base_rate: round4(overall),
    base_brier: round4(baseBrier),
    age_brier_in_sample: round4(ageInSample),
    age_brier_10fold: round4(age10),
    full_brier_10fold: round4(full10),
    wf_accuracy: round3(wfAcc),
    wf_base_accuracy: round3(wfBase),
    wf_train_n: trW.length,
    wf_test_n: teW.length,
    logit_const: round4(ageFit.w[0]!),
    logit_slope: round4(ageFit.w[1]!),
    logit_mu: round4(ageFit.mu[0]!),
    logit_sd: round4(ageFit.sd[0]!),
  };
}

/**
 * One candidate's launch odds: the forward two-year hazard from the peers' age curve.
 * F(age) is the share of peers that record a token by that age; the odds are the share of
 * the peers that reach the candidate's age with no token and record one in the next two
 * years. Unknown age counts as 365 days.
 */
export function launchOdds(
  p: SnapshotProtocol,
  snapshot: Snapshot,
  odds: OddsEvidence,
  model: ModelConstants = MODEL,
): { odds: number; fNow: number; f2y: number } {
  const age = ageDays(snapshot.as_of, p.listed_at) ?? model.unknown_age_days;
  const f = (a: number): number => {
    const x = (Math.log(Math.max(a, 30) / 365) - odds.logit_mu) / odds.logit_sd;
    return sigmoid(odds.logit_const + odds.logit_slope * x);
  };
  const fNow = f(age);
  const f2y = f(age + model.odds_horizon_days);
  const o = Math.max(0, Math.min(0.99, (f2y - fNow) / Math.max(1e-9, 1 - fNow)));
  return { odds: round3(o), fNow: round3(fNow), f2y: round3(f2y) };
}

/** FNV-1a, 32-bit, over a string: the board's seal, recomputed by the dashboard. */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Farm economics: costed in dollars per hour, at a stated scenario.
// ---------------------------------------------------------------------------

/** Gas for one transaction on a chain, in dollars: the farm's stated per-chain rates. */
export function gasPerStep(chain: string): number {
  const c = chain.toLowerCase();
  if (c.includes('ethereum')) return 5;
  if (c.includes('bsc') || c.includes('bnb')) return 0.1;
  if (c.includes('solana')) return 0.05;
  return 0.5;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital.toLocaleString('en-US')} of USDC to ${name} on ${chain} and keep the position open without withdrawing.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital.toLocaleString('en-US')} of liquidity to ${name}'s main pool on ${chain} in a narrow range and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital.toLocaleString('en-US')} of USDC to ${chain} through ${name} and use the bridged funds in its app the same week.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital.toLocaleString('en-US')} of the chain's staking asset through ${name} and keep the receipt token in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital.toLocaleString('en-US')} of USDC as margin on ${name}, open one small hedge under 2x leverage and close it within a week.`;
  if (c.includes('prediction')) return `Fund $${capital.toLocaleString('en-US')} and place one market position on ${name} on an event you have read.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital.toLocaleString('en-US')} into a ${name} vault on ${chain} and keep the shares for the whole qualifying window.`;
  if (c.includes('stable')) return `Mint or deposit $${capital.toLocaleString('en-US')} of the stable asset through ${name} on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital.toLocaleString('en-US')} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('basis')) return `Deposit $${capital.toLocaleString('en-US')} into ${name}'s basis vault on ${chain} and hold the position through one funding cycle.`;
  return `Deposit $${capital.toLocaleString('en-US')} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A farm plan's economics, at one scenario: the deposit, the drop share, the weeks held. */
export interface FarmEcon {
  fees_usd: number;
  capital_charge_usd: number;
  tbill_usd: number;
  expected_usd: number;
  net_usd: number;
  hours: number;
  net_per_hour_usd: number;
  verdict: 'FARM' | 'MARGINAL' | 'SKIP';
  capital: number;
  hold_days: number;
  weeks: number;
}

/**
 * A candidate's farm economics, in dollars: what the farm costs, what it is expected to
 * pay, and the verdict in dollars per hour. The expected drop is the implied value times
 * the drop share times the farmer's share of the pool, deposit / (TVL + deposit): a
 * $10,000 position in a $2.75B protocol buys almost nothing, so the giants are marginal
 * at best however large their implied value is. The cost is gas for every on-chain step
 * at the chain's stated rate, plus the capital charge of locking the deposit at 2% a year.
 * The verdict compares the net with a 4% T-bill on the same money and with $25 an hour of
 * hands-on work: FARM when the net beats the T-bill and clears $25 an hour, MARGINAL when
 * it is positive but below that bar, SKIP when it is not.
 */
export function farmEconomics(
  p: SnapshotProtocol,
  implied: number,
  model: ModelConstants = MODEL,
  scenario: { deposit_usd: number; drop_share: number; weeks: number } = {
    deposit_usd: model.deposit_usd,
    drop_share: model.drop_share,
    weeks: model.weeks_held,
  },
): FarmEcon {
  const deposit = scenario.deposit_usd;
  const weeks = scenario.weeks;
  const gas = gasPerStep(chainOf(p));
  const txs = weeks + 3;
  const fees = Math.round(gas * txs * 100) / 100;
  const capitalCharge = Math.round(((deposit * model.capital_rate * weeks) / 52) * 100) / 100;
  const tbill = Math.round(((deposit * model.tbill_rate * weeks) / 52) * 100) / 100;
  const expected = Math.round(((implied * scenario.drop_share * deposit) / (p.tvl_usd + deposit)) * 100) / 100;
  const hours = Math.round(((45 + 10 * weeks) / 60) * 100) / 100;
  const net = Math.round((expected - fees - capitalCharge) * 100) / 100;
  const netPerHour = Math.round((net / hours) * 100) / 100;
  const verdict: 'FARM' | 'MARGINAL' | 'SKIP' =
    netPerHour >= model.farm_hour_threshold_usd && net > tbill ? 'FARM' : net > 0 ? 'MARGINAL' : 'SKIP';
  return {
    fees_usd: fees,
    capital_charge_usd: capitalCharge,
    tbill_usd: tbill,
    expected_usd: expected,
    net_usd: net,
    hours,
    net_per_hour_usd: netPerHour,
    verdict,
    capital: deposit,
    hold_days: weeks * 7,
    weeks,
  };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/**
 * A launch candidate's farm plan: six steps, each an action with a cost and a time. The plan
 * is derived from the protocol's own record (category, chains, TVL, age), never from a
 * hand-written list of names. Every step names what it costs in dollars and gas and how
 * long it takes, and the plan's total cost is the verdict's cost: gas for every on-chain
 * step, plus the capital charge of locking the deposit.
 */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  econ: { cost: number; capital: number; hold_days: number; weeks: number },
): FarmStep[] {
  const chain = chainOf(p);
  const capital = econ.capital;
  const hold = econ.hold_days;
  const weeks = econ.weeks;
  const action = actionFor(p, capital, chain);
  const gasStep = gasPerStep(chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper.`,
      cost: `about $${gasStep} of gas for the first transaction on ${chain}`,
      time: '5 minutes',
      minutes: 5,
    },
    {
      text: action,
      cost: `$${capital.toLocaleString('en-US')} of capital and about $${gasStep} of gas`,
      time: '15 minutes to set up',
      minutes: 15,
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and never let two weeks pass with no activity.`,
      cost: `about $${gasStep} of gas a week`,
      time: '10 minutes a week',
      minutes: 10 * weeks,
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital.toLocaleString('en-US')} stays in the position; the whole plan costs about $${econ.cost} in gas and locked capital`,
      time: `${hold} days`,
      minutes: 0,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page from its official site and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
      minutes: 10,
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
      minutes: 5,
    },
  ];
}

/**
 * A live-token protocol's steps: there is no launch left to farm, so the plan says so plainly
 * and tells the reader what the market's own figures are instead.
 */
export function launchedSteps(p: SnapshotProtocol): FarmStep[] {
  const mcap = p.mcap_usd ?? 0;
  const mult = p.tvl_usd > 0 ? (mcap / p.tvl_usd).toFixed(2) : 'n/a';
  return [
    {
      text: `${p.name} already trades: its token ${p.symbol ?? '—'} has a market cap of $${Math.round(mcap).toLocaleString('en-US')} across ${p.chains.length} chain${p.chains.length === 1 ? '' : 's'}, so the launch has already happened and there is nothing left to farm for a first listing.`,
      cost: 'nothing to farm',
      time: 'no wait',
      minutes: 0,
    },
    {
      text: `If you still want exposure, buy the token only on the markets the protocol's own site lists, and never through a link from a chat message or a search ad.`,
      cost: 'the price you pay, plus exchange fees',
      time: '10 minutes to check the listing',
      minutes: 10,
    },
    {
      text: `Compare the market cap with the protocol's TVL: at $${Math.round(mcap).toLocaleString('en-US')} on $${Math.round(p.tvl_usd).toLocaleString('en-US')} of TVL the multiple is ${mult}, and the live view shows that figure for every protocol that trades.`,
      cost: 'nothing but the reading',
      time: '5 minutes',
      minutes: 5,
    },
  ];
}

/**
 * A token protocol with no market cap in the snapshot: the token trades, but the snapshot
 * carries no price for it — sixteen of them record a market cap of 0 or -1, which is a dead
 * token, not a zero price — so the row is priced by the model and marked, never treated as a
 * launch candidate.
 */
export function unpricedSteps(p: SnapshotProtocol): FarmStep[] {
  const dead = p.mcap_usd !== null && p.mcap_usd <= 0;
  return [
    {
      text: `${p.name} already has a token${p.symbol ? ` (${p.symbol})` : ''}, but the snapshot carries no market cap for it${dead ? ' — the recorded market cap is ' + p.mcap_usd + ', a dead token, not a price of zero' : ''}, so the board prices the row with the model's implied value and marks it live-unpriced instead of ranking it as a launch candidate.`,
      cost: 'nothing to farm',
      time: 'no wait',
      minutes: 0,
    },
    {
      text: `Do not farm this protocol for a first listing: its token already exists, so the activity would not qualify for a new launch, whatever the implied value on the row says.`,
      cost: 'saves the capital a mistaken farm would lock',
      time: '5 minutes to read the reason',
      minutes: 5,
    },
    {
      text: `If you want the token, check whether it trades anywhere first: a protocol with no market cap in the snapshot may trade on no market the snapshot covers, and the live view lists every token protocol the same way.`,
      cost: 'nothing but the reading',
      time: '5 minutes',
      minutes: 5,
    },
  ];
}

/**
 * A non-candidate's steps: the plan says why the protocol is not a launch candidate and what to
 * watch instead, so the row is a verdict rather than a silent omission.
 */
export function excludedSteps(p: SnapshotProtocol, reason: string): FarmStep[] {
  return [
    {
      text: `${p.name} is not a launch candidate: ${reason}. The radar keeps the row so the universe is complete, and the board's candidate filter hides it by default.`,
      cost: 'nothing to farm',
      time: 'no wait',
      minutes: 0,
    },
    {
      text: `Do not farm this protocol for a launch: any token would belong to the parent protocol or venue, not to this record, so the activity would not qualify for a new listing.`,
      cost: 'saves the capital a mistaken farm would lock',
      time: '5 minutes to read the reason',
      minutes: 5,
    },
    {
      text: `Watch the parent protocol's own announcements instead, and check the watchlist tab for the forty protocols the house's rule does keep as launch candidates.`,
      cost: 'nothing but the reading',
      time: '5 minutes',
      minutes: 5,
    },
  ];
}

/** The board: the 198 launch candidates, strongest first, by implied launch value. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const asOf = snapshot.as_of;
  const fit = fitLogLog(snapshot.protocols);
  const stats = categoryStats(snapshot.protocols, model);
  const evidence = valueEvidence(snapshot, model);
  const oddsEv = oddsEvidence(snapshot, model);
  const comps = tradedComps(snapshot);
  const keys = evidence.kept_keys as ValueKey[];
  const usePremium = evidence.terms.some((t) => t.term.startsWith('category premium') && t.kept);
  const wFull = fitValueMulti(comps, asOf, keys);
  const premFull = usePremium ? categoryPremium(comps, asOf, keys, wFull, model.cat_shrink_k) : null;
  const launch = (p: SnapshotProtocol): number => predictWithPremium(p, asOf, keys, wFull, premFull);

  // Bootstrap rank ranges: 200 refits of the value model on resampled comps, odds fixed.
  // Each row keeps the 10th and 90th percentile of its rank across the refits — the
  // middle 80% — not the extremes, which a single odd resample would dominate.
  const candidates = snapshot.protocols.filter(isRankable);
  const rankSamples = new Map<string, number[]>();
  {
    let seed = 20261114;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const baseOdds = new Map<string, number>();
    for (const p of candidates) baseOdds.set(p.slug, launchOdds(p, snapshot, oddsEv, model).odds);
    for (let b = 0; b < model.bootstrap_refits; b++) {
      const sample: SnapshotProtocol[] = [];
      for (let i = 0; i < comps.length; i++) sample.push(comps[Math.floor(rnd() * comps.length)]!);
      const wb = fitValueMulti(sample, asOf, keys);
      const premB = usePremium ? categoryPremium(sample, asOf, keys, wb, model.cat_shrink_k) : null;
      const scored = candidates.map((p) => ({ slug: p.slug, v: predictWithPremium(p, asOf, keys, wb, premB) * baseOdds.get(p.slug)! }));
      scored.sort((a, b2) => b2.v - a.v);
      scored.forEach((s, i) => {
        const list = rankSamples.get(s.slug) ?? [];
        list.push(i + 1);
        rankSamples.set(s.slug, list);
      });
    }
  }
  const rankLow = new Map<string, number>();
  const rankHigh = new Map<string, number>();
  for (const [slug, list] of rankSamples) {
    list.sort((a, b) => a - b);
    rankLow.set(slug, list[Math.floor(0.1 * (list.length - 1))] ?? list[0]!);
    rankHigh.set(slug, list[Math.floor(0.9 * (list.length - 1))] ?? list[list.length - 1]!);
  }

  const scored = candidates.map((p) => {
    const age = ageDays(asOf, p.listed_at);
    const launchUsd = launch(p);
    const o = launchOdds(p, snapshot, oddsEv, model);
    const implied = Math.max(1, Math.round(launchUsd * o.odds));
    const low = Math.max(1, Math.round(implied * Math.exp(evidence.residual_q25)));
    const high = Math.max(1, Math.round(implied * Math.exp(evidence.residual_q75)));
    const p10 = Math.max(1, Math.round(implied * Math.exp(evidence.residual_q10)));
    const p90 = Math.max(1, Math.round(implied * Math.exp(evidence.residual_q90)));
    const econ = farmEconomics(p, implied, model);
    const steps = farmSteps(p, age, {
      cost: Math.round((econ.fees_usd + econ.capital_charge_usd) * 100) / 100,
      capital: econ.capital,
      hold_days: econ.hold_days,
      weeks: econ.weeks,
    });
    const stat = stats.table[p.category ?? 'Uncategorised'] ?? stats.overall;
    return { p, age, launchUsd, o, implied, low, high, p10, p90, econ, steps, stat };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    candidate: true as const,
    excluded_reason: null,
    token_odds: s.o.odds,
    odds_f_now: s.o.fNow,
    odds_f_2y: s.o.f2y,
    age_days: s.age,
    implied_value_usd: s.implied,
    implied_low_usd: s.low,
    implied_high_usd: s.high,
    implied_p10_usd: s.p10,
    implied_p90_usd: s.p90,
    rank_low: rankLow.get(s.p.slug) ?? i + 1,
    rank_high: rankHigh.get(s.p.slug) ?? i + 1,
    model: {
      fit_intercept: fit.intercept,
      fit_slope: fit.slope,
      launch_value_usd: Math.max(1, Math.round(s.launchUsd)),
      category_multiple: s.stat.multiple,
      category_estimate_usd: Math.max(1, Math.round(s.p.tvl_usd * s.stat.multiple)),
      growth_pct: finite(s.p.change_7d, 0),
      chain_count: s.p.chains.length,
      age_days: s.age,
    },
    farm_fees_usd: s.econ.fees_usd,
    farm_capital_charge_usd: s.econ.capital_charge_usd,
    farm_tbill_usd: s.econ.tbill_usd,
    farm_expected_usd: s.econ.expected_usd,
    farm_net_usd: s.econ.net_usd,
    farm_hours: s.econ.hours,
    farm_net_per_hour_usd: s.econ.net_per_hour_usd,
    farm_verdict: s.econ.verdict,
    farm_steps: s.steps.map(stepText),
  }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    implied_p10_usd: row.implied_p10_usd,
    implied_p90_usd: row.implied_p90_usd,
    rank_low: row.rank_low,
    rank_high: row.rank_high,
    token_odds: row.token_odds,
    odds_f_now: row.odds_f_now,
    odds_f_2y: row.odds_f_2y,
    fit_intercept: row.model.fit_intercept,
    fit_slope: row.model.fit_slope,
    launch_value_usd: row.model.launch_value_usd,
    category_multiple: row.model.category_multiple,
    category_estimate_usd: row.model.category_estimate_usd,
    growth_pct: row.model.growth_pct,
    chain_count: row.model.chain_count,
    farm_fees_usd: row.farm_fees_usd,
    farm_capital_charge_usd: row.farm_capital_charge_usd,
    farm_tbill_usd: row.farm_tbill_usd,
    farm_expected_usd: row.farm_expected_usd,
    farm_net_usd: row.farm_net_usd,
    farm_hours: row.farm_hours,
    farm_net_per_hour_usd: row.farm_net_per_hour_usd,
    farm_verdict: row.farm_verdict,
    farm_steps: row.farm_steps,
  };
}

/** The 92 traded tokens the value curve is fitted on, by market cap, with the curve's blind price of each. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  const fit = fitLogLog(snapshot.protocols);
  return tradedComps(snapshot)
    .sort((a, b) => b.mcap_usd! - a.mcap_usd! || b.tvl_usd - a.tvl_usd)
    .map((p) => {
      const modelUsd = Math.max(1, Math.round(Math.exp(fit.intercept + fit.slope * Math.log(Math.max(1, p.tvl_usd)))));
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        mcap_usd: p.mcap_usd!,
        change_7d: p.change_7d,
        model_usd: modelUsd,
        miss: round3(Math.max(modelUsd / p.mcap_usd!, p.mcap_usd! / modelUsd)),
      };
    });
}

/** A pre-token protocol that is not a launch candidate, with the reason, for the dashboard's
 * Set-aside list: the verdict, not a silent omission. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  excluded_reason: string;
}

/** The pre-token protocols that are not launch candidates, by TVL. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && excludedReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      excluded_reason: excludedReason(p)!,
    }));
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const excluded = excludedRows(snapshot);
  const stats = categoryStats(snapshot.protocols, model);
  const fit = fitLogLog(snapshot.protocols);
  const valueEv = valueEvidence(snapshot, model);
  const oddsEv = oddsEvidence(snapshot, model);
  const seal = fnv1a(board.map((r) => `${r.rank}:${r.slug}:${r.implied_value_usd}`).join('|'));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    candidate_size: board.length,
    ledger: ledgerGroups(snapshot),
    category_stats: stats.table,
    overall_multiple: stats.overall.multiple,
    overall_q25: stats.overall.q25,
    overall_q75: stats.overall.q75,
    overall_live_count: stats.overall.live_count,
    fit,
    value_evidence: valueEv,
    odds_evidence: oddsEv,
    seal,
    watchlist: snapshot.watchlist,
    rows: board.map(radarRow),
    live,
    excluded,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
