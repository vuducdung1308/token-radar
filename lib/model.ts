// The token radar's model (radar-3): one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks the rows that have a value to rank by: pre-token launch candidates, by an
// implied launch value, and protocols whose token already trades, by their market cap, the
// market's own value. The two kinds are kept apart by a token_status flag and by the dashboard's
// tabs, so a reader never mistakes one for a launch candidate. Two kinds of record stay off the
// board because they have no value to rank by: a protocol whose token trades but the snapshot
// carries no market cap for (272 of them, including 16 dead tokens whose recorded market cap is
// 0 or -1), and a pre-token protocol that is not a launch candidate (a wrapped, staked or
// bridged product, a versioned pool, an exchange's product, a centralised exchange — 144 of
// them). Both kinds are still in the dashboard's data, listed with the reason, so the universe
// is complete and nothing is silently dropped: the dashboard covers all 758 protocols, the
// board ranks the 342 that have a value. The watchlist is the floor, never a ceiling: all 40
// of its slugs are on the board.
//
// Implied value follows only from the snapshot's own figures. The one thing the starter's flat
// 0.25 multiple gets wrong is that the market does not pay the same multiple of TVL for every kind
// of protocol, so radar-3 derives each category's multiple from the snapshot itself: for every
// category, the median market-cap-to-TVL ratio of the live-token protocols in that category (at
// least 5 of them), falling back to the overall median where a category has too few. No protocol
// name is ever special-cased: the same function scores every row, and the dashboard prints the
// table it computed so a reader can check it.
//
//   catMult    = median(mcap_usd / tvl_usd) of live protocols in the category
//   base       = tvl_usd x catMult
//   growth     = clamp(change_7d, -60, 120) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   chainMult  = 1 + min(max(chains - 1, 0), 10) x 0.01
//   implied    = max(1, round(base x growthMult x maturityMult x chainMult))
//
// The multiples are NOT clamped any more. radar-2 clamped them to [0.05, 0.60]; the held-out test
// below showed the clamp hurts: on a held-out split of the live protocols the clamped model missed
// by a median 80% while the unclamped medians missed by 30%, so radar-3 keeps the medians the
// snapshot gives. Every number the model states is computed at run time from whatever snapshot the
// program reads, never baked in.
//
// The model is tested, not just asserted. Before the board is built, the live protocols are split
// in two deterministic ways (hash parity of the slug; first-letter parity) and the full model is
// fitted on one half and asked to predict the other half's market caps. The dashboard prints both
// splits' median errors, so a reader can see how far the multiples actually carry. Measured on the
// sealed snapshot (2026-11-14): split A median absolute error 30%, split B 15%. The error is wide
// because market-cap-to-TVL varies a lot inside a category; that is why each row also carries an
// uncertainty range, from the category's 25th and 75th percentile multiples.
//
// Token odds are the peers' record, not a prediction. For a pre-token protocol, the odds are the
// share of protocols in its category that already have a token (smoothed), discounted by age: a
// protocol that has run for years with no token is less likely to launch soon than a young one.
// The board never predicts whether or when a token is issued; the odds say only how often the
// protocol's peers have launched.

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
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  cat_mult_min_live: number;
  chain_step: number;
  chain_max_steps: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.6,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  cat_mult_min_live: 5,
  chain_step: 0.01,
  chain_max_steps: 10,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
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
  token_status: 'pre-token' | 'live';
  candidate: boolean;
  excluded_reason: string | null;
  token_odds: number | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  model: {
    category_multiple: number;
    category_q25: number;
    category_q75: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
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
  token_status: 'pre-token' | 'live';
  candidate: boolean;
  excluded_reason: string | null;
  token_odds: number | null;
  category_multiple: number;
  category_q25: number;
  category_q75: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One held-out split's result: the model fitted on one half, tested on the other. */
export interface HeldOutSplit {
  name: string;
  train_n: number;
  test_n: number;
  median_abs_log_err: number;
  median_abs_pct_err: number;
}

/** One category's fitted multiple and its spread, from the snapshot's live protocols. */
export interface CategoryStat {
  multiple: number;
  q25: number;
  q75: number;
  live_count: number;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  pre_token_size: number;
  candidate_size: number;
  category_stats: Record<string, CategoryStat>;
  overall_multiple: number;
  overall_q25: number;
  overall_q75: number;
  overall_live_count: number;
  held_out: HeldOutSplit[];
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

/** A deterministic hash of a slug, for the held-out split: no randomness, no dates. */
function slugHash(slug: string): number {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
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
 * Every category's market multiple and its spread, derived from the snapshot's own live-token
 * protocols: the median market-cap-to-TVL ratio per category (categories with fewer than `minLive`
 * live protocols fall back to the overall median), with the 25th and 75th percentile of the same
 * ratios as the uncertainty range. Unclamped: the held-out test showed clamping the multiples
 * hurts prediction, so the medians the snapshot gives are the medians the model uses.
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

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  stats: { table: Record<string, CategoryStat>; overall: CategoryStat },
): {
  implied: number;
  low: number;
  high: number;
  catMult: number;
  catQ25: number;
  catQ75: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const stat = stats.table[protocol.category ?? 'Uncategorised'] ?? stats.overall;
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainSteps = Math.min(Math.max(protocol.chains.length - 1, 0), model.chain_max_steps);
  const chainMult = 1 + chainSteps * model.chain_step;
  const rest = growthMult * maturityMult * chainMult;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * stat.multiple * rest));
  const low = Math.max(1, Math.round(protocol.tvl_usd * stat.q25 * rest));
  const high = Math.max(1, Math.round(protocol.tvl_usd * stat.q75 * rest));
  return { implied, low, high, catMult: stat.multiple, catQ25: stat.q25, catQ75: stat.q75, growthPct, growthMult, maturityMult, chainMult, age };
}

/**
 * The held-out test: the live protocols are split in two deterministic ways, the full model is
 * fitted on one half and asked to predict the other half's market caps. Both splits are reported,
 * with the median absolute log error and the median absolute percentage error, so a reader can see
 * how far the multiples actually carry instead of taking the model's word for it.
 */
export function heldOutTest(snapshot: Snapshot, model: ModelConstants = MODEL): HeldOutSplit[] {
  // Sixteen live protocols record a market cap of 0 or -1 (dead tokens); they carry no price to
  // predict, so they are left out of both halves of the test.
  const live = snapshot.protocols.filter((p) => hasUsableMcap(p) && p.tvl_usd > 0);
  const splits: { name: string; train: SnapshotProtocol[]; test: SnapshotProtocol[] }[] = [
    {
      name: 'split A (slug hash parity)',
      train: live.filter((p) => slugHash(p.slug) % 2 === 0),
      test: live.filter((p) => slugHash(p.slug) % 2 === 1),
    },
    {
      name: 'split B (first-letter parity)',
      train: live.filter((p) => p.slug.charCodeAt(0) % 2 === 0),
      test: live.filter((p) => p.slug.charCodeAt(0) % 2 === 1),
    },
  ];
  return splits.map(({ name, train, test }) => {
    const stats = categoryStats(train, model);
    const logErrs: number[] = [];
    const pctErrs: number[] = [];
    for (const p of test) {
      const pred = impliedValue(p, snapshot.as_of, model, stats).implied;
      const actual = p.mcap_usd!;
      logErrs.push(Math.abs(Math.log(pred / actual)));
      pctErrs.push(Math.abs(pred - actual) / actual);
    }
    logErrs.sort((a, b) => a - b);
    pctErrs.sort((a, b) => a - b);
    return {
      name,
      train_n: train.length,
      test_n: test.length,
      median_abs_log_err: round3(median(logErrs) ?? 0),
      median_abs_pct_err: round3(median(pctErrs) ?? 0),
    };
  });
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories the watchlist rule keeps out: a wrapped, staked or bridged product of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name beginning with an exchange's name is that exchange's product, not a launch candidate. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** A name carrying a whole word wrapped, staked or staking is a product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

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

/**
 * A pre-token candidate's launch odds from the peers' record: the share of protocols in its
 * category that already have a token, smoothed, discounted by age — a protocol that has run for
 * years with no token is less likely to launch soon than a young one. This is a base rate, not a
 * prediction of whether or when a token is issued.
 */
export function tokenOdds(p: SnapshotProtocol, snapshot: Snapshot, asOf: string): number | null {
  if (!isRankable(p)) return null;
  const peers = snapshot.protocols.filter((q) => (q.category ?? 'Uncategorised') === (p.category ?? 'Uncategorised'));
  const live = peers.filter((q) => !isPreToken(q)).length;
  const rate = (live + 1) / (peers.length + 2);
  const age = ageDays(asOf, p.listed_at) ?? 365;
  const ageFactor = 0.6 + 0.4 * Math.exp(-age / 1095);
  return round3(Math.min(0.99, Math.max(0.01, rate * ageFactor)));
}

/** The protocols the board ranks, strongest first, with ranks 1..n: launch candidates by implied
 * value, and protocols whose token already trades by market cap. A protocol with no value to rank
 * by — a token with no market cap in the snapshot, or a pre-token protocol that is not a launch
 * candidate — is not a board row; it is listed in the dashboard's data instead. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const stats = categoryStats(snapshot.protocols, model);
  const scored = snapshot.protocols
    .filter((p) => isRankable(p) || hasUsableMcap(p))
    .map((p) => {
      const s = impliedValue(p, snapshot.as_of, model, stats);
      const live = hasUsableMcap(p);
      const implied = live ? Math.max(1, Math.round(p.mcap_usd!)) : s.implied;
      const low = live ? implied : s.low;
      const high = live ? implied : s.high;
      return {
        p,
        live,
        candidate: !live,
        reason: null as string | null,
        implied,
        low,
        high,
        odds: !live ? tokenOdds(p, snapshot, snapshot.as_of) : null,
        s,
      };
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
    token_status: s.live ? ('live' as const) : ('pre-token' as const),
    candidate: s.candidate,
    excluded_reason: null,
    token_odds: s.odds,
    age_days: s.s.age,
    implied_value_usd: s.implied,
    implied_low_usd: s.low,
    implied_high_usd: s.high,
    model: {
      category_multiple: s.s.catMult,
      category_q25: s.s.catQ25,
      category_q75: s.s.catQ75,
      growth_pct: s.s.growthPct,
      growth_multiplier: round4(s.s.growthMult),
      maturity_multiplier: round4(s.s.maturityMult),
      chain_multiplier: round4(s.s.chainMult),
      age_days: s.s.age,
    },
    farm_steps: (s.candidate ? farmSteps(s.p, s.s.age) : launchedSteps(s.p)).map(stepText),
  }));
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open without withdrawing.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} in a narrow range and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app the same week.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name}, open one small hedge under 2x leverage and close it within a week.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name} on an event you have read.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares for the whole qualifying window.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis vault on ${chain} and hold the position through one funding cycle.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A launch candidate's farm plan: six steps, each an action with a cost and a time. The plan is
 * derived from the protocol's own record (category, chains, TVL, age), never from a hand-written
 * list of names. Every step names what it costs in dollars and gas and how long it takes.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const gas = capital >= 150 ? 8 : 4;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and never let two weeks pass with no activity.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page from its official site and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
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
    },
    {
      text: `If you still want exposure, buy the token only on the markets the protocol's own site lists, and never through a link from a chat message or a search ad.`,
      cost: 'the price you pay, plus exchange fees',
      time: '10 minutes to check the listing',
    },
    {
      text: `Compare the market cap with the protocol's TVL: at $${Math.round(mcap).toLocaleString('en-US')} on $${Math.round(p.tvl_usd).toLocaleString('en-US')} of TVL the multiple is ${mult}, and the live view shows that figure for every protocol that trades.`,
      cost: 'nothing but the reading',
      time: '5 minutes',
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
    },
    {
      text: `Do not farm this protocol for a launch: any token would belong to the parent protocol or venue, not to this record, so the activity would not qualify for a new listing.`,
      cost: 'saves the capital a mistaken farm would lock',
      time: '5 minutes to read the reason',
    },
    {
      text: `Watch the parent protocol's own announcements instead, and check the watchlist tab for the forty protocols the house's rule does keep as launch candidates.`,
      cost: 'nothing but the reading',
      time: '5 minutes',
    },
  ];
}

/** Every protocol whose token already trades, by market cap, for the dashboard's Live token view.
 * Protocols with no usable market cap in the snapshot (a token with no price, or a dead token
 * whose recorded market cap is 0 or -1) are listed last with a null market cap. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (hasUsableMcap(b) ? b.mcap_usd! : 0) - (hasUsableMcap(a) ? a.mcap_usd! : 0) || b.tvl_usd - a.tvl_usd)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: hasUsableMcap(p) ? p.mcap_usd : null,
      change_7d: p.change_7d,
    }));
}

/** A pre-token protocol that is not a launch candidate, with the reason, for the dashboard's
 * Not-candidates list: the verdict, not a silent omission. */
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
    token_status: row.token_status,
    candidate: row.candidate,
    excluded_reason: row.excluded_reason,
    token_odds: row.token_odds,
    category_multiple: row.model.category_multiple,
    category_q25: row.model.category_q25,
    category_q75: row.model.category_q75,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const excluded = excludedRows(snapshot);
  const stats = categoryStats(snapshot.protocols, model);
  const held = heldOutTest(snapshot, model);
  const early = board.filter((r) => r.candidate && !snapshot.watchlist.includes(r.slug)).length;
  const preToken = snapshot.protocols.filter(isPreToken).length;
  const candidates = board.filter((r) => r.candidate).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    pre_token_size: preToken,
    candidate_size: candidates,
    category_stats: stats.table,
    overall_multiple: stats.overall.multiple,
    overall_q25: stats.overall.q25,
    overall_q75: stats.overall.q75,
    overall_live_count: stats.overall.live_count,
    held_out: held,
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
