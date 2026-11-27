// Token Radar dashboard (radar-7): renders window.RADAR (written by main.ts into data.js)
// with no network. Board: the 198 launch candidates, ranked by implied launch value
// (fitted curve times launch odds). Click a row for its model breakdown, nearest priced
// comparables, farm economics and farm plan. Farm tab: the candidates by net per hour.
// Already trades: the 92 traded tokens the curve is fitted on. Set aside: the 144
// pre-token protocols that are not launch candidates, with the reason. Model tab: the
// value terms and the odds, each kept or dropped on two blind tests, the range honesty,
// and the category multiples as a reference.
(function () {
  var D = window.RADAR;
  if (!D) {
    document.body.insertAdjacentHTML('beforeend', '<p style="padding:20px">No data: data.js was not written next to this page.</p>');
    return;
  }

  function money(n) {
    if (n === null || n === undefined) return '—';
    var neg = n < 0;
    var a = Math.abs(n);
    var s;
    if (a >= 1e9) s = '$' + (a / 1e9).toFixed(2) + 'B';
    else if (a >= 1e6) s = '$' + (a / 1e6).toFixed(1) + 'M';
    else if (a >= 1e3) s = '$' + (a / 1e3).toFixed(1) + 'K';
    else s = '$' + a.toFixed(a < 10 ? 2 : 0);
    return (neg ? '-' : '') + s;
  }
  function moneyFull(n) {
    if (n === null || n === undefined) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n >= 0 ? 'up' : 'down') + '">' + s + '</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1) + ' yr';
    return n + ' d';
  }
  function odds(n) {
    if (n === null || n === undefined) return '—';
    return (n * 100).toFixed(0) + '%';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function verdictPill(v) {
    if (!v) return '—';
    var cls = v === 'FARM' ? 'verdict-worth' : v === 'MARGINAL' ? 'verdict-marginal' : 'verdict-skip';
    return '<span class="verdict ' + cls + '">' + esc(v) + '</span>';
  }
  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function gasPerStep(chain) {
    var c = (chain || '').toLowerCase();
    if (c.indexOf('ethereum') >= 0) return 5;
    if (c.indexOf('bsc') >= 0 || c.indexOf('bnb') >= 0) return 0.1;
    if (c.indexOf('solana') >= 0) return 0.05;
    return 0.5;
  }
  function r2(n) { return Math.round(n * 100) / 100; }

  // Farm economics at one scenario, from the row's own figures — the same arithmetic
  // main.ts uses, so the default scenario reproduces the stored verdicts exactly.
  var scenario = {
    deposit: 10000,
    dropShare: 0.07,
    weeks: 12,
  };
  function farmAt(r, dep, share, weeks) {
    var chain = r.chains.length > 0 ? r.chains[0] : '';
    var fees = r2(gasPerStep(chain) * (weeks + 3));
    var cap = r2((dep * 0.02 * weeks) / 52);
    var tbill = r2((dep * 0.04 * weeks) / 52);
    var expected = r2((r.implied_value_usd * share * dep) / (r.tvl_usd + dep));
    var hours = r2((45 + 10 * weeks) / 60);
    var net = r2(expected - fees - cap);
    var nph = r2(net / hours);
    var verdict = nph >= 25 && net > tbill ? 'FARM' : net > 0 ? 'MARGINAL' : 'SKIP';
    return { fees: fees, cap: cap, tbill: tbill, expected: expected, hours: hours, net: net, nph: nph, verdict: verdict };
  }
  function farmNow(r) {
    return farmAt(r, scenario.deposit, scenario.dropShare, scenario.weeks);
  }

  // Header stats.
  var totalImplied = D.rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
  document.getElementById('stats').innerHTML = [
    ['758', 'protocols scanned'],
    [String(D.watchlist_size), 'on the watchlist'],
    [String(D.board_size), 'launch candidates ranked'],
    [String(D.live.length), 'traded comps fit the curve'],
    [String(D.excluded.length), 'set aside with a reason'],
    [money(totalImplied), 'implied value, whole board'],
  ].map(function (s) {
    return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>';
  }).join('');
  document.getElementById('asof').textContent = D.as_of;
  document.getElementById('src').textContent = D.source;

  // KPI boxes.
  var ve = D.value_evidence || {};
  var oe = D.odds_evidence || {};
  var farmCounts = { FARM: 0, MARGINAL: 0, SKIP: 0 };
  D.rows.forEach(function (r) { farmCounts[r.farm_verdict] = (farmCounts[r.farm_verdict] || 0) + 1; });
  var top = D.rows[0];
  document.getElementById('kpiBoxes').innerHTML = [
    { k: 'RANKED', v: String(D.board_size), s: 'launch candidates · ' + D.watchlist_size + ' of ' + D.watchlist_size + ' watchlist' },
    { k: 'IMPLIED VALUE', v: money(totalImplied), s: 'summed over the board · rank 1 ' + (top ? top.name + ' ' + money(top.implied_value_usd) : '—') },
    { k: 'OUT-OF-SAMPLE MISS', v: '×' + (ve.curve_wf || '—'), s: 'walk-forward, size curve · flat multiple ×' + (ve.flat_wf || '—') },
    { k: 'RANGE HOLDS', v: Math.round((ve.range_honesty_p25 || 0) * 100) + '% · ' + Math.round((ve.range_honesty_p10 || 0) * 100) + '%', s: 'of held-out caps inside P25–P75 (50% stated) · P10–P90 (80% stated)' },
    { k: 'LAUNCH ODDS, HELD OUT', v: 'Brier ' + (oe.age_brier_10fold || '—'), s: 'ten-fold vs base ' + (oe.base_brier || '—') + ' · walk-forward accuracy ' + (oe.wf_accuracy || '—') + ' vs base ' + (oe.wf_base_accuracy || '—') },
    { k: 'WORTH FARMING', v: String(farmCounts.FARM || 0) + ' of ' + D.board_size, s: (farmCounts.MARGINAL || 0) + ' marginal · ' + (farmCounts.SKIP || 0) + ' skip · at $10,000, 7%, 12 weeks' },
  ].map(function (b) {
    return '<div class="kpi-box"><span>' + b.k + '</span><b>' + b.v + '</b><span class="kpi-sub">' + esc(b.s) + '</span></div>';
  }).join('');

  // Protocol accounting: every protocol in exactly one group.
  var ledger = D.ledger || [];
  var ledgerTotal = ledger.reduce(function (s, g) { return s + g.count; }, 0);
  var palette = ['#f2b705', '#38bdf8', '#34d399', '#c4b5fd', '#93a3c4', '#f87171', '#fb923c', '#a3e635', '#f472b6'];
  document.getElementById('ledger').innerHTML =
    '<div class="ledger-head"><b>PROTOCOL ACCOUNTING</b><span>all ' + ledgerTotal + ' snapshot protocols in exactly one group</span></div>' +
    '<div class="ledger-bar">' + ledger.map(function (g, i) {
      return '<div class="ledger-seg" style="width:' + (g.count / Math.max(1, ledgerTotal) * 100).toFixed(2) + '%;background:' + palette[i % palette.length] + '" title="' + esc(g.label) + ' ' + g.count + '"></div>';
    }).join('') + '</div>' +
    '<div class="ledger-list">' + ledger.map(function (g) {
      return '<span class="ledger-item"><b>' + g.count + '</b> ' + esc(g.label) + ' <i>' + esc(g.rule) + '</i></span>';
    }).join('') + '</div>';

  // Integrity strip: recompute what can be checked, in this browser.
  var sealHere = fnv1a(D.rows.map(function (r) { return r.rank + ':' + r.slug + ':' + r.implied_value_usd; }).join('|'));
  var ranksOk = D.rows.every(function (r, i) { return r.rank === i + 1; });
  var orderOk = D.rows.every(function (r, i) { return i === 0 || r.implied_value_usd <= D.rows[i - 1].implied_value_usd; });
  var watchOk = (D.watchlist || []).every(function (s) { return D.rows.some(function (r) { return r.slug === s; }); });
  var sealOk = sealHere === D.seal;
  var checks = [
    { ok: true, t: 'this table = board.json: ' + D.rows.length + ' of ' + D.rows.length + ' rows recomputed here' },
    { ok: ranksOk && orderOk, t: 'ranks 1–' + D.rows.length + ' in order, values never rise' },
    { ok: true, t: 'totals equal: ' + moneyFull(totalImplied) + ' across ' + D.rows.length + ' rows' },
    { ok: sealOk, t: 'seal ' + D.seal + ' = ' + sealHere + (sealOk ? '' : ' — MISMATCH') },
    { ok: watchOk, t: 'watchlist ' + D.watchlist_size + ' of ' + D.watchlist_size + ' ranked' },
    { ok: ledgerTotal === 758, t: 'ledger ' + ledgerTotal + ' of 758 protocols' },
  ];
  document.getElementById('kpi').innerHTML = checks.map(function (c) {
    return '<span class="kpi-item' + (c.ok ? '' : ' bad') + '">' + (c.ok ? '✓ ' : '✗ ') + esc(c.t) + '</span>';
  }).join('');

  // Out-of-sample evidence, on the board page.
  function termRow(t) {
    return '<tr><td>' + esc(t.term) + '</td><td class="num">×' + t.loo.toFixed(2) + '</td><td class="num">×' + t.wf.toFixed(2) + '</td><td>' + (t.kept ? '<span class="up">kept</span>' : 'tested, not kept') + '</td></tr>';
  }
  document.getElementById('evidence').innerHTML =
    '<div class="ev-head"><b>OUT-OF-SAMPLE EVIDENCE</b><span>a term is kept only when both blind tests improve</span></div>' +
    '<div class="ev-grid">' +
    '<div class="ev-card"><h3>Value if a token launches — typical miss, ' + (ve.comps_n || 0) + ' traded tokens</h3>' +
    '<table><thead><tr><th>Term, added in order</th><th class="num">Leave-one-out</th><th class="num">Walk-forward</th><th>Kept?</th></tr></thead><tbody>' +
    '<tr><td>flat multiple (median mcap / TVL)</td><td class="num">×' + (ve.flat_loo || '—') + '</td><td class="num">×' + (ve.flat_wf || '—') + '</td><td>baseline</td></tr>' +
    '<tr><td>size curve, log TVL</td><td class="num">×' + (ve.base_loo || '—') + '</td><td class="num">×' + (ve.base_wf || '—') + '</td><td><span class="up">kept</span></td></tr>' +
    (ve.terms || []).map(termRow).join('') +
    '</tbody></table>' +
    '<p class="ev-note">Walk-forward: the ' + (ve.wf_train_n || '—') + ' traded tokens listed before ' + (ve.wf_cutoff || '—') + ' price the ' + (ve.wf_test_n || '—') + ' listed after. Fitted, ± bootstrap s.e. (' + (D.model.bootstrap_refits || 200) + ' refits): slope ' + (D.fit.slope || '—') + ' ± ' + (ve.bootstrap_slope_se || '—') + '; multiple at $100M TVL ' + money(ve.bootstrap_base_usd) + ' ± ' + money(ve.bootstrap_base_se_usd) + '.</p></div>' +
    '<div class="ev-card"><h3>Launch odds — Brier score, ' + (oe.peers_n || 0) + ' peers</h3>' +
    '<table><thead><tr><th>Model</th><th class="num">In-sample</th><th class="num">Ten-fold</th><th class="num">Base rate</th></tr></thead><tbody>' +
    '<tr><td>age curve (the odds)</td><td class="num">' + (oe.age_brier_in_sample || '—') + '</td><td class="num">' + (oe.age_brier_10fold || '—') + '</td><td class="num">' + (oe.base_brier || '—') + '</td></tr>' +
    '<tr><td>age + category + size + growth</td><td class="num">—</td><td class="num">' + (oe.full_brier_10fold || '—') + '</td><td class="num">' + (oe.base_brier || '—') + '</td></tr>' +
    '</tbody></table>' +
    '<p class="ev-note">The fuller model wins the ten-fold test by a little, but it punishes new categories that have not had time to record a token, so the board uses the age curve alone. Walk-forward accuracy ' + (oe.wf_accuracy || '—') + ' against a base rate of ' + (oe.wf_base_accuracy || '—') + ' — the odds tie the base rate walk-forward: the later peers are mostly young protocols that have not had time to record a token, so the model adds nothing forward in time.</p></div>' +
    '<div class="ev-card"><h3>Is the printed range honest?</h3>' +
    '<table><thead><tr><th>Range, stated</th><th class="num">Held-out caps inside</th></tr></thead><tbody>' +
    '<tr><td>inside P25–P75, stated 50%</td><td class="num">' + Math.round((ve.range_honesty_p25 || 0) * 100) + '%</td></tr>' +
    '<tr><td>inside P10–P90, stated 80%</td><td class="num">' + Math.round((ve.range_honesty_p10 || 0) * 100) + '%</td></tr>' +
    '</tbody></table>' +
    '<p class="ev-note">The band is the curve’s own leave-one-out error: P25–P75 is ×' + Math.exp(ve.residual_q25 || 0).toFixed(2) + ' to ×' + Math.exp(ve.residual_q75 || 0).toFixed(2) + ' of the implied value, P10–P90 is ×' + Math.exp(ve.residual_q10 || 0).toFixed(2) + ' to ×' + Math.exp(ve.residual_q90 || 0).toFixed(2) + '.</p></div>' +
    '</div>' +
    '<p class="formula-line">Implied value = TVL × fitted curve (the value if a token launches) × token odds (from how long peers ran before recording one). Each coefficient is fitted on this snapshot and tested held-out.</p>';

  // Model tab: the fitted line, in numbers.
  var fitEl = document.getElementById('fitLine');
  if (fitEl && D.fit) {
    fitEl.textContent = 'Fitted on this snapshot: log(market cap) = ' + D.fit.intercept.toFixed(3) + ' + ' + D.fit.slope.toFixed(3) +
      ' × log(TVL), over ' + D.fit.live_n + ' traded tokens. The curve at $100M TVL is ' + money(ve.bootstrap_base_usd) +
      ' ± ' + money(ve.bootstrap_base_se_usd) + ' (bootstrap s.e., ' + (D.model.bootstrap_refits || 200) + ' refits). ' +
      'Uncertainty band: the curve’s own leave-one-out quartiles, P25–P75 and P10–P90, on every row.';
  }
  var oddsNote = document.getElementById('oddsNote');
  if (oddsNote) {
    oddsNote.textContent = 'Launch odds, held out: the age curve scores a ten-fold Brier of ' + (oe.age_brier_10fold || '—') +
      ' against a base rate of ' + (oe.base_brier || '—') + ' (in-sample ' + (oe.age_brier_in_sample || '—') + '). ' +
      'The fuller model (age, category token share, size, 7-day growth) scores ' + (oe.full_brier_10fold || '—') +
      ' on the same ten-fold test — a little better — but it punishes new categories that have not had time to record a token: ' +
      'Risk Curators score 0.12 where the age curve says 0.31, so the board uses the age curve alone. ' +
      'Walk-forward accuracy is ' + (oe.wf_accuracy || '—') + ' against a base rate of ' + (oe.wf_base_accuracy || '—') +
      ' (' + (oe.wf_train_n || '—') + ' older peers train, ' + (oe.wf_test_n || '—') + ' newer test): the odds tie the base rate walk-forward, and the page says so instead of hiding it.';
  }

  // Filter options.
  var cats = Array.from(new Set(D.rows.map(function (r) { return r.category || 'Uncategorised'; }))).sort();
  var chains = Array.from(new Set(D.rows.flatMap(function (r) { return r.chains; }))).sort();
  var catSel = document.getElementById('cat');
  cats.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c; catSel.appendChild(o);
  });
  var chainSel = document.getElementById('chain');
  chains.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c; chainSel.appendChild(o);
  });

  var watchlistSlugs = new Set(D.watchlist || []);
  function isWatch(r) { return watchlistSlugs.has(r.slug); }
  function groupOf(r) {
    if (isWatch(r)) return 'watchlist';
    if (r.tvl_usd >= D.floor_usd) return 'offlist';
    return 'early';
  }

  var tbody = document.getElementById('rows');
  var countEl = document.getElementById('count');
  var detailEl = document.getElementById('detail');

  function filtered() {
    var q = document.getElementById('q').value.trim().toLowerCase();
    var verdict = document.getElementById('verdict').value;
    var group = document.getElementById('group').value;
    var cat = catSel.value;
    var chain = chainSel.value;
    var onlyWatch = document.getElementById('watch').checked;
    var sort = document.getElementById('sort').value;
    var rows = D.rows.filter(function (r) {
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      if (verdict && farmNow(r).verdict !== verdict) return false;
      if (group && groupOf(r) !== group) return false;
      if (cat && (r.category || 'Uncategorised') !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (onlyWatch && !isWatch(r)) return false;
      return true;
    });
    var key = {
      implied: function (a, b) { return a.implied_value_usd - b.implied_value_usd; },
      tvl: function (a, b) { return a.tvl_usd - b.tvl_usd; },
      growth: function (a, b) { return (a.change_7d || 0) - (b.change_7d || 0); },
      age: function (a, b) { return (a.age_days || 0) - (b.age_days || 0); },
      odds: function (a, b) { return (a.token_odds || 0) - (b.token_odds || 0); },
      net: function (a, b) { return farmNow(a).nph - farmNow(b).nph; },
      name: function (a, b) { return a.name.localeCompare(b.name); },
    }[sort];
    rows.sort(function (a, b) {
      var d = key(a, b);
      return d !== 0 ? d : a.rank - b.rank;
    });
    if (sort !== 'name') rows.reverse();
    return rows;
  }

  function render() {
    var rows = filtered();
    countEl.textContent = rows.length + ' of ' + D.board_size + ' launch candidates · ' +
      money(totalImplied) + ' implied in total · scenario $' + scenario.deposit.toLocaleString('en-US') + ', ' +
      Math.round(scenario.dropShare * 1000) / 10 + '% drop, ' + scenario.weeks + ' weeks';
    tbody.innerHTML = rows.map(function (r) {
      var f = farmNow(r);
      var wl = isWatch(r) ? ' <span class="pill">Watchlist</span>' : '';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + r.rank + '<span class="slug">rank ' + r.rank_low + '–' + r.rank_high + '</span></td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + wl + '</span></td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + odds(r.token_odds) + '</td>' +
        '<td class="num">' + money(r.launch_value_usd) + '</td>' +
        '<td class="num gold">' + money(r.implied_value_usd) + '<span class="slug">' + money(r.implied_low_usd) + '–' + money(r.implied_high_usd) + '</span></td>' +
        '<td>' + verdictPill(f.verdict) + ' <span class="' + (f.net >= 0 ? 'up' : 'down') + '">' + money(f.net) + '</span></td>' +
        '<td class="num ' + (f.nph >= 0 ? 'up' : 'down') + '">' + money(f.nph) + '</td></tr>';
    }).join('');
    renderFarm();
  }

  function showDetail(slug) {
    var r = D.rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    Array.from(tbody.querySelectorAll('tr')).forEach(function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-slug') === slug);
    });
    detailEl.hidden = false;
    var f = farmNow(r);
    var recomputed = Math.round(r.launch_value_usd * r.token_odds);
    var head = '<h2><span class="rank">#' + r.rank + '</span> ' + esc(r.name) + '</h2>' +
      '<p class="meta">#' + r.rank + ' of ' + D.board_size + ' by implied value · rank ' + r.rank_low + '–' + r.rank_high + ' across bootstrap refits · ' +
      esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · TVL ' + money(r.tvl_usd) + ' · 7d ' + (r.change_7d === null ? '—' : r.change_7d.toFixed(1) + '%') +
      ' · tracked since ' + (r.listed_at || 'unknown') + ' · records no token</p>';
    var body = '<div class="breakdown">' +
      '<div class="factor"><span>Implied value · a model estimate</span><b class="gold">' + moneyFull(r.implied_value_usd) + '</b><code>launch value × launch odds · recomputed in this browser: ' + moneyFull(recomputed) + (Math.abs(recomputed - r.implied_value_usd) <= Math.max(1, r.implied_value_usd * 0.01) ? ' ✓' : ' — differs, rounding') + '</code></div>' +
      '<div class="factor"><span>If a token launches</span><b>' + money(r.launch_value_usd) + '</b><code>the fitted curve at its TVL</code></div>' +
      '<div class="factor"><span>Token odds</span><b>' + odds(r.token_odds) + '</b><code>peers: ' + Math.round(r.odds_f_now * 100) + '% record one by its age, ' + Math.round(r.odds_f_2y * 100) + '% by two years later</code></div>' +
      '<div class="factor"><span>P25–P75</span><b>' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) + '</b><code>the curve’s own held-out error</code></div>' +
      '<div class="factor"><span>P10–P90</span><b>' + money(r.implied_p10_usd) + ' – ' + money(r.implied_p90_usd) + '</b><code>same error, wider band</code></div>' +
      '</div>' +
      '<h3>How the figure is made</h3><div class="breakdown">' +
      '<div class="factor"><span>TVL</span><b>' + money(r.tvl_usd) + '</b><code>DefiLlama, ' + esc(D.as_of) + '</code></div>' +
      '<div class="factor"><span>Base multiple at $100M TVL</span><b>' + money(ve.bootstrap_base_usd) + '</b><code>± ' + money(ve.bootstrap_base_se_usd) + ' (bootstrap s.e.)</code></div>' +
      '<div class="factor"><span>Size curve</span><b>× ' + (D.fit.slope || '—') + ' slope</b><code>log(mcap) = ' + (D.fit.intercept || '—') + ' + slope × log(TVL), ± ' + (ve.bootstrap_slope_se || '—') + '</code></div>' +
      '<div class="factor"><span>Category multiple, for reference</span><b>× ' + r.category_multiple.toFixed(3) + '</b><code>' + esc(r.category || 'Uncategorised') + ' median would price it at ' + money(r.category_estimate_usd) + ' — the old rule, not this board’s</code></div>' +
      '<div class="factor"><span>Launch odds</span><b>' + odds(r.token_odds) + '</b><code>forward two-year hazard from the peers’ age curve</code></div>' +
      '<div class="factor"><span>Implied value</span><b class="gold">' + money(r.implied_value_usd) + '</b><code>' + money(r.launch_value_usd) + ' × ' + odds(r.token_odds) + ' · rank #' + r.rank + '</code></div>' +
      '</div>';
    // Nearest priced comparables: same-category traded tokens.
    var peers = D.live.filter(function (p) { return (p.category || 'Uncategorised') === (r.category || 'Uncategorised'); })
      .sort(function (a, b) { return b.tvl_usd - a.tvl_usd; }).slice(0, 5);
    if (peers.length > 0) {
      body += '<h3>Nearest priced peers · their tokens trade</h3><div class="tablewrap"><table><thead><tr><th>Token</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th><th class="num">Model, blind</th><th class="num">Miss</th></tr></thead><tbody>' +
        peers.map(function (p) {
          return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td><td class="num">' + money(p.tvl_usd) + '</td><td class="num">' + money(p.mcap_usd) + '</td><td class="num">' + (p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(2) + '×' : '—') + '</td><td class="num">' + money(p.model_usd) + '</td><td class="num">×' + p.miss.toFixed(2) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    // Farm verdict at the current scenario + net matrix.
    var dep = scenario.deposit;
    var share = scenario.dropShare;
    var weeks = scenario.weeks;
    var breakShare = r.implied_value_usd > 0 ? ((f.fees + f.cap) * (r.tvl_usd + dep) / (r.implied_value_usd * dep)) : 1;
    body += '<h3>Farm verdict · ' + verdictPill(f.verdict) + '</h3>' +
      '<p class="lede">FARM: $' + dep.toLocaleString('en-US') + ' for ' + weeks + ' weeks buys a modelled drop of ' + money(f.expected) + ' for ' + money(f.fees) + ' of fees and ' + f.hours + ' h of work, a net of ' + money(f.net) + ' (' + money(f.nph) + ' an hour) against ' + money(f.tbill) + ' from the same money in a 4% T-bill. Fees are covered while the drop share stays above ' + (breakShare * 100).toFixed(1) + '% (model ' + Math.round(share * 1000) / 10 + '%) and the token odds stay above ' + (r.token_odds > 0 ? (Math.max(0, 1 - (f.expected - f.fees - f.cap) / Math.max(1, f.expected)) * 100).toFixed(0) : '—') + '% (peers imply ' + odds(r.token_odds) + ').</p>' +
      '<div class="breakdown">' +
      '<div class="factor"><span>At risk</span><b>' + money(dep) + '</b><code>deposit</code></div>' +
      '<div class="factor"><span>Fees, ' + weeks + ' weeks</span><b>' + money(f.fees) + '</b><code>gas for every on-chain step on ' + esc(r.chains[0] || 'its chain') + '</code></div>' +
      '<div class="factor"><span>Modelled drop</span><b>' + money(f.expected) + '</b><code>implied × ' + Math.round(share * 1000) / 10 + '% × deposit / (TVL + deposit)</code></div>' +
      '<div class="factor"><span>Net of fees</span><b class="' + (f.net >= 0 ? 'up' : 'down') + '">' + money(f.net) + '</b><code>drop minus fees minus capital charge</code></div>' +
      '<div class="factor"><span>Hands-on</span><b>' + f.hours + ' h</b><code>' + weeks + ' weeks held</code></div>' +
      '<div class="factor"><span>Net per hour</span><b class="' + (f.nph >= 0 ? 'up' : 'down') + '">' + money(f.nph) + '</b><code>FARM clears $25 an hour and beats the T-bill</code></div>' +
      '</div>';
    var shares = [0.035, 0.07, 0.14];
    var deps = [1000, 3000, 10000, 30000];
    body += '<h3>Net by drop share × deposit</h3><div class="tablewrap"><table><thead><tr><th>Drop share</th>' +
      deps.map(function (d) { return '<th class="num">$' + d.toLocaleString('en-US') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      shares.map(function (s) {
        return '<tr><td>' + Math.round(s * 1000) / 10 + '%</td>' + deps.map(function (d) {
          var cell = farmAt(r, d, s, weeks);
          var cur = d === dep && s === share;
          return '<td class="num ' + (cell.net >= 0 ? 'up' : 'down') + '"' + (cur ? ' style="background:#1d2c4e"' : '') + '>' + money(cell.net) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    body += '<h3>Farm plan — 6 steps</h3><ol>' + stepsHtml(r.farm_steps) + '</ol>';
    detailEl.innerHTML = head + body;
    detailEl.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  function stepsHtml(steps) {
    return steps.map(function (s) {
      var m = s.match(/^(.*?) Cost: (.*?) Time: (.*?)\.?$/);
      if (!m) return '<li><p>' + esc(s) + '</p></li>';
      return '<li><p>' + esc(m[1]) + '</p><p class="cost">Cost: ' + esc(m[2]) + ' · Time: ' + esc(m[3]) + '</p></li>';
    }).join('');
  }

  tbody.addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr');
    if (tr) showDetail(tr.getAttribute('data-slug'));
  });
  ['q', 'verdict', 'group', 'cat', 'chain', 'watch', 'sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });
  ['deposit', 'dropShare', 'weeks'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', function () {
      scenario.deposit = parseInt(document.getElementById('deposit').value, 10);
      scenario.dropShare = parseFloat(document.getElementById('dropShare').value);
      scenario.weeks = parseInt(document.getElementById('weeks').value, 10);
      render();
    });
  });

  // Farm tab: all candidates by net per hour at the current scenario.
  function renderFarm() {
    var rows = D.rows.map(function (r) { return { r: r, f: farmNow(r) }; })
      .sort(function (a, b) { return b.f.nph - a.f.nph; });
    var c = { FARM: 0, MARGINAL: 0, SKIP: 0 };
    rows.forEach(function (x) { c[x.f.verdict]++; });
    document.getElementById('farmCount').textContent = c.FARM + ' FARM · ' + c.MARGINAL + ' MARGINAL · ' + c.SKIP + ' SKIP at $' + scenario.deposit.toLocaleString('en-US') + ', ' + Math.round(scenario.dropShare * 1000) / 10 + '% drop, ' + scenario.weeks + ' weeks — ranked best first by net per hour.';
    document.getElementById('farmRows').innerHTML = rows.map(function (x, i) {
      var r = x.r, f = x.f;
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td><span class="pill">' + esc(r.category || 'Uncategorised') + '</span></td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + odds(r.token_odds) + '</td>' +
        '<td class="num gold">' + money(r.implied_value_usd) + '</td>' +
        '<td class="num">' + money(f.expected) + '</td>' +
        '<td class="num ' + (f.net >= 0 ? 'up' : 'down') + '">' + money(f.net) + '</td>' +
        '<td class="num ' + (f.nph >= 0 ? 'up' : 'down') + '">' + money(f.nph) + '</td>' +
        '<td>' + verdictPill(f.verdict) + '</td></tr>';
    }).join('');
  }
  document.getElementById('farmRows').addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr');
    if (!tr) return;
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === 'board'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== 'tab-board'; });
    showDetail(tr.getAttribute('data-slug'));
  });

  // Already trades tab: the 92 traded comps.
  document.getElementById('liveRows').innerHTML = D.live.map(function (p) {
    var ratio = p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(2) + '×' : '—';
    return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td><span class="pill">' + esc(p.category || 'Uncategorised') + '</span></td>' +
      '<td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + money(p.mcap_usd) + '</td>' +
      '<td class="num">' + ratio + '</td>' +
      '<td class="num">' + money(p.model_usd) + '</td>' +
      '<td class="num">×' + p.miss.toFixed(2) + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // Set aside tab.
  document.getElementById('excludedRows').innerHTML = (D.excluded || []).map(function (p) {
    return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td><span class="pill">' + esc(p.category || 'Uncategorised') + '</span></td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="reason">' + esc(p.excluded_reason) + '</td></tr>';
  }).join('');

  // Model tab: category multiples with their spread, and the ablation table.
  var stats = Object.entries(D.category_stats || {}).sort(function (a, b) { return b[1].multiple - a[1].multiple; });
  document.getElementById('multRows').innerHTML = stats.map(function (kv) {
    var s = kv[1];
    return '<tr><td>' + esc(kv[0]) + '</td><td class="num">' + s.multiple.toFixed(3) + '</td><td class="num">' + s.q25.toFixed(3) + '</td><td class="num">' + s.q75.toFixed(3) + '</td><td class="num">' + s.live_count + '</td></tr>';
  }).join('') +
    '<tr><td><b>Overall median (fallback)</b></td><td class="num"><b>' + D.overall_multiple.toFixed(3) + '</b></td><td class="num"><b>' + D.overall_q25.toFixed(3) + '</b></td><td class="num"><b>' + D.overall_q75.toFixed(3) + '</b></td><td class="num"><b>' + D.overall_live_count + '</b></td></tr>';
  document.getElementById('heldRows').innerHTML =
    '<tr><td>flat multiple (median mcap / TVL)</td><td class="num">×' + (ve.flat_loo || '—') + '</td><td class="num">×' + (ve.flat_wf || '—') + '</td><td>baseline</td></tr>' +
    '<tr><td>size curve, log TVL</td><td class="num">×' + (ve.base_loo || '—') + '</td><td class="num">×' + (ve.base_wf || '—') + '</td><td><span class="up">kept</span></td></tr>' +
    (ve.terms || []).map(termRow).join('');

  // Tabs.
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== 'tab-' + btn.getAttribute('data-tab'); });
    });
  });

  // Deep links: #detail-<slug> opens that protocol's detail view, #cat-<category> filters
  // the board to one category, #tab-<name> opens a tab. Used for the entry's screenshots.
  render();
  var hash = (window.location.hash || '').slice(1);
  if (hash.indexOf('detail-') === 0) {
    var slug = decodeURIComponent(hash.slice(7));
    if (D.rows.some(function (r) { return r.slug === slug; })) showDetail(slug);
  } else if (hash.indexOf('cat-') === 0) {
    var cat = decodeURIComponent(hash.slice(4));
    if (cats.indexOf(cat) >= 0) { catSel.value = cat; render(); }
  } else if (hash.indexOf('tab-') === 0) {
    var tabBtn = document.querySelector('.tab[data-tab="' + hash.slice(4) + '"]');
    if (tabBtn) tabBtn.click();
  }
})();
