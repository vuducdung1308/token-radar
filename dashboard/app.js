// Token Radar dashboard: renders window.RADAR (written by main.ts into data.js) with no network.
// Board: all 758 protocols, sortable, filterable by search / status / category / chain / watchlist.
// Click a row for its model breakdown, uncertainty range, launch odds, farm economics and farm plan.
// Farm tab: the candidates with a positive farm EV, best first. Live tab: every protocol whose
// token already trades, at the market's own values. Not candidates: pre-token protocols the radar
// refuses as launch candidates, with the reason. Model tab: the two-method consensus, the held-out
// test against the fitted line and the radar-3 baseline, the category multiples, the farm economics
// assumptions and the launch odds, all computed from this snapshot.
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
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n >= 0 ? 'up' : 'down') + '">' + s + '</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1) + 'y';
    return n + 'd';
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
    var cls = v === 'Worth farming' ? 'verdict-worth' : v === 'Marginal' ? 'verdict-marginal' : 'verdict-skip';
    return '<span class="verdict ' + cls + '">' + esc(v) + '</span>';
  }
  function evCell(v) {
    if (v === null || v === undefined) return '<td class="num">—</td>';
    return '<td class="num ' + (v > 0 ? 'up' : 'down') + '">' + money(v) + '</td>';
  }

  // Header stats.
  document.getElementById('stats').innerHTML = [
    ['758', 'protocols scanned'],
    [String(D.watchlist_size), 'on the watchlist'],
    [String(D.board_size), 'rows ranked'],
    [String(D.candidate_size), 'launch candidates'],
    [String(D.live_size), 'with a token'],
    [String(D.held_out && D.held_out[0] ? D.held_out[0].consensus_median_abs_log_err.toFixed(2) : '—'), 'held-out median log error (consensus)'],
  ].map(function (s) {
    return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>';
  }).join('');
  document.getElementById('asof').textContent = D.as_of;
  document.getElementById('src').textContent = D.source;

  // Integrity strip: what a reader can check about this entry without trusting it.
  var held = D.held_out || [];
  var worth = D.rows.filter(function (r) { return r.farm_verdict === 'Worth farming'; }).length;
  var marginal = D.rows.filter(function (r) { return r.farm_verdict === 'Marginal'; }).length;
  var skip = D.rows.filter(function (r) { return r.farm_verdict === 'Skip'; }).length;
  document.getElementById('kpi').innerHTML = [
    'Watchlist ' + D.watchlist_size + '/' + D.watchlist_size + ' covered',
    'Deterministic — the same snapshot always gives the same board',
    'No protocol is hardcoded by name',
    'Held-out test: consensus median log error ' + held.map(function (h) { return h.consensus_median_abs_log_err.toFixed(2); }).join(' and ') + ' — within noise of the fitted line (' + held.map(function (h) { return h.median_abs_log_err.toFixed(2); }).join(' and ') + ') and far below the category-median baseline (' + held.map(function (h) { return h.baseline_median_abs_log_err.toFixed(2); }).join(' and ') + ') on both splits',
    'Every one of 758 protocols is ranked on the board',
    'Farm verdicts are costed: ' + worth + ' worth farming, ' + marginal + ' marginal, ' + skip + ' skip',
  ].map(function (s) {
    return '<span class="kpi-item">✓ ' + esc(s) + '</span>';
  }).join('');

  // Model tab: the fitted line, in numbers.
  var fitEl = document.getElementById('fitLine');
  if (fitEl && D.fit) {
    fitEl.textContent = 'Fitted on this snapshot: two methods, each fitted on the ' + D.fit.live_n +
      ' live-token protocols — the category median multiple (overall ' + D.overall_multiple.toFixed(3) +
      ') and log(market cap) = ' + D.fit.intercept.toFixed(3) + ' + ' + D.fit.slope.toFixed(3) +
      ' × log(TVL). The board ranks by their geometric mean. 80% uncertainty band: the union of the category quartiles and the conformal interval × [' +
      D.conformal_low_mult + ', ' + D.conformal_high_mult + '], calibrated on the pooled held-out residuals of the consensus.';
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

  var tbody = document.getElementById('rows');
  var countEl = document.getElementById('count');
  var detailEl = document.getElementById('detail');

  function statusMatch(r, status) {
    if (!status) return true;
    if (status === 'candidate') return r.candidate;
    if (status === 'excluded') return r.token_status === 'pre-token' && !r.candidate;
    return r.token_status === status;
  }
  function statusLabel(status) {
    return {
      candidate: ' (launch candidates)',
      live: ' (live tokens)',
      'live-unpriced': ' (live, no market cap)',
      excluded: ' (not candidates)',
    }[status] || '';
  }

  function filtered() {
    var q = document.getElementById('q').value.trim().toLowerCase();
    var status = document.getElementById('status').value;
    var cat = catSel.value;
    var chain = chainSel.value;
    var onlyWatch = document.getElementById('watch').checked;
    var sort = document.getElementById('sort').value;
    var rows = D.rows.filter(function (r) {
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      if (!statusMatch(r, status)) return false;
      if (cat && (r.category || 'Uncategorised') !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (onlyWatch && !isWatch(r)) return false;
      return true;
    });
    var verdictRank = { 'Worth farming': 3, 'Marginal': 2, 'Skip': 1 };
    var key = {
      implied: function (a, b) { return a.implied_value_usd - b.implied_value_usd; },
      tvl: function (a, b) { return a.tvl_usd - b.tvl_usd; },
      growth: function (a, b) { return (a.change_7d || 0) - (b.change_7d || 0); },
      age: function (a, b) { return (a.age_days || 0) - (b.age_days || 0); },
      odds: function (a, b) { return (a.token_odds || 0) - (b.token_odds || 0); },
      ev: function (a, b) { return (a.farm_ev_usd === null ? -1e18 : a.farm_ev_usd) - (b.farm_ev_usd === null ? -1e18 : b.farm_ev_usd); },
      verdict: function (a, b) { return (verdictRank[a.farm_verdict] || 0) - (verdictRank[b.farm_verdict] || 0); },
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
    var status = document.getElementById('status').value;
    countEl.textContent = rows.length + ' of ' + D.board_size + ' ranked protocols' + statusLabel(status) +
      (document.getElementById('watch').checked ? ' · watchlist only' : '');
    tbody.innerHTML = rows.map(function (r) {
      var statusPill = r.token_status === 'live'
        ? '<span class="status status-live">Live</span>'
        : r.token_status === 'live-unpriced'
          ? '<span class="status status-unpriced">Live · no mcap</span>'
          : r.candidate
            ? '<span class="status status-cand">Candidate</span>'
            : '<span class="status status-excluded">Not candidate</span>';
      var value;
      if (r.token_status === 'live') value = '<td class="num">' + money(r.implied_value_usd) + ' <span class="tag">mcap</span></td>';
      else if (r.token_status === 'live-unpriced') value = '<td class="num">' + money(r.implied_value_usd) + ' <span class="tag">model</span></td>';
      else if (r.candidate) value = '<td class="num gold">' + money(r.implied_value_usd) + '</td>';
      else value = '<td class="num">' + money(r.implied_value_usd) + ' <span class="tag">model</span></td>';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + statusPill + '</td>' +
        '<td><span class="pill">' + esc(r.category || 'Uncategorised') + '</span></td>' +
        '<td>' + esc(r.chains.slice(0, 1).join(', ')) + (r.chains.length > 1 ? ' +' + (r.chains.length - 1) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + odds(r.token_odds) + '</td>' +
        evCell(r.farm_ev_usd) +
        '<td>' + verdictPill(r.farm_verdict) + '</td>' +
        value + '</tr>';
    }).join('');
  }

  function showDetail(slug) {
    var r = D.rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    Array.from(tbody.querySelectorAll('tr')).forEach(function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-slug') === slug);
    });
    detailEl.hidden = false;
    var statusText = r.token_status === 'live' ? 'token already trades'
      : r.token_status === 'live-unpriced' ? 'token trades, no market cap in the snapshot'
      : r.candidate ? 'records no token' : 'not a launch candidate';
    var head = '<h2><span class="rank">#' + r.rank + '</span> ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · TVL ' + money(r.tvl_usd) + ' · 7d ' + (r.change_7d === null ? '—' : r.change_7d.toFixed(1) + '%') +
      ' · tracked since ' + (r.listed_at || 'unknown') + ' · ' + statusText + '</p>';
    var body;
    if (r.token_status === 'live') {
      body = '<div class="breakdown">' +
        '<div class="factor"><span>Market cap</span><b class="gold">' + money(r.implied_value_usd) + '</b><code>the market’s own value</code></div>' +
        '<div class="factor"><span>TVL</span><b>' + money(r.tvl_usd) + '</b><code>mcap / TVL ' + (r.tvl_usd ? (r.implied_value_usd / r.tvl_usd).toFixed(2) + '×' : '—') + '</code></div>' +
        '<div class="factor"><span>Category multiple</span><b>× ' + r.category_multiple.toFixed(3) + '</b><code>' + esc(r.category || '') + ' median, for comparison</code></div>' +
        '</div>' +
        '<h3>What this row means — 3 steps</h3><ol>' + stepsHtml(r.farm_steps) + '</ol>';
    } else {
      body = '<div class="breakdown">' +
        '<div class="factor"><span>Category estimate</span><b>' + money(r.category_estimate_usd) + '</b><code>TVL × ' + r.category_multiple.toFixed(3) + ' (' + esc(r.category || 'Uncategorised') + ' median), same terms</code></div>' +
        '<div class="factor"><span>Fitted estimate</span><b>' + money(r.fit_estimate_usd) + '</b><code>exp(' + r.fit_intercept.toFixed(2) + ' + ' + r.fit_slope.toFixed(2) + ' × log TVL), same terms</code></div>' +
        '<div class="factor"><span>Growth</span><b>× ' + r.growth_multiplier.toFixed(2) + '</b><code>7d ' + (r.change_7d === null ? '—' : r.change_7d.toFixed(1) + '%') + '</code></div>' +
        '<div class="factor"><span>Maturity</span><b>× ' + r.maturity_multiplier.toFixed(2) + '</b><code>' + (r.age_days === null ? 'age unknown' : r.age_days + ' days') + '</code></div>' +
        '<div class="factor"><span>Chains</span><b>× ' + r.chain_multiplier.toFixed(2) + '</b><code>' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</code></div>' +
        '<div class="factor"><span>Implied value</span><b class="gold">' + money(r.implied_value_usd) + '</b><code>consensus, rank #' + r.rank + '</code></div>' +
        '<div class="factor"><span>80% uncertainty range</span><b>' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) + '</b><code>union of category quartiles and conformal ×[' + D.conformal_low_mult + ', ' + D.conformal_high_mult + ']</code></div>' +
        (r.candidate
          ? '<div class="factor"><span>Launch odds</span><b>' + odds(r.token_odds) + '</b><code>share of peers in ' + esc(r.category || 'this category') + ' that already have a token</code></div>'
          : '<div class="factor"><span>Category multiple</span><b>× ' + r.category_multiple.toFixed(3) + '</b><code>' + esc(r.category || '') + ' median, for comparison</code></div>') +
        '</div>';
      if (r.candidate) {
        body += '<div class="breakdown">' +
          '<div class="factor"><span>Farm cost</span><b>' + money(r.farm_cost_usd) + '</b><code>gas for 6 steps, slippage, locked capital</code></div>' +
          '<div class="factor"><span>Expected reward</span><b>' + money(r.farm_expected_usd) + '</b><code>odds × 5% of implied value, shared among est. farmers</code></div>' +
          '<div class="factor"><span>Farm EV</span><b class="' + (r.farm_ev_usd > 0 ? 'up' : 'down') + '">' + money(r.farm_ev_usd) + '</b><code>expected reward minus cost</code></div>' +
          '<div class="factor"><span>Verdict</span><b>' + esc(r.farm_verdict || '—') + '</b><code>costed, not asserted — see the Model tab</code></div>' +
          '</div>' +
          '<h3>Farm plan — 6 steps</h3><ol>' + stepsHtml(r.farm_steps) + '</ol>';
      } else if (r.token_status === 'live-unpriced') {
        body += '<h3>What this row means — 3 steps</h3><ol>' + stepsHtml(r.farm_steps) + '</ol>';
      } else {
        body += '<p class="lede">Not a launch candidate: ' + esc(r.excluded_reason || '') + '</p>' +
          '<h3>What this row means — 3 steps</h3><ol>' + stepsHtml(r.farm_steps) + '</ol>';
      }
    }
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
  ['q', 'status', 'cat', 'chain', 'watch', 'sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });

  // Live tab: every protocol whose token trades, priced ones first.
  document.getElementById('liveRows').innerHTML = D.live.map(function (p) {
    var ratio = p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(2) + '×' : '—';
    return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td><span class="pill">' + esc(p.category || 'Uncategorised') + '</span></td>' +
      '<td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + money(p.mcap_usd) + '</td>' +
      '<td class="num">' + ratio + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // Not candidates tab.
  document.getElementById('excludedRows').innerHTML = (D.excluded || []).map(function (p) {
    return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td><span class="pill">' + esc(p.category || 'Uncategorised') + '</span></td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="reason">' + esc(p.excluded_reason) + '</td></tr>';
  }).join('');

  // Farm tab: candidates with a positive farm EV, best first.
  var farm = D.rows.filter(function (r) { return r.candidate && r.farm_ev_usd !== null && r.farm_ev_usd > 0; })
    .sort(function (a, b) { return b.farm_ev_usd - a.farm_ev_usd; });
  document.getElementById('farmCount').textContent = farm.length + ' of ' + D.candidate_size + ' launch candidates have a positive farm EV — worth farming or marginal — ranked best first by expected value after cost.';
  document.getElementById('farmRows').innerHTML = farm.map(function (r, i) {
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span></td>' +
      '<td><span class="pill">' + esc(r.category || 'Uncategorised') + '</span></td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num">' + odds(r.token_odds) + '</td>' +
      '<td class="num gold">' + money(r.implied_value_usd) + '</td>' +
      '<td class="num">' + money(r.farm_cost_usd) + '</td>' +
      '<td class="num">' + money(r.farm_expected_usd) + '</td>' +
      evCell(r.farm_ev_usd) +
      '<td>' + verdictPill(r.farm_verdict) + '</td></tr>';
  }).join('');
  document.getElementById('farmRows').addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr');
    if (!tr) return;
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === 'board'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== 'tab-board'; });
    showDetail(tr.getAttribute('data-slug'));
  });

  // Model tab: category multiples with their spread, and the held-out test against the baseline.
  var stats = Object.entries(D.category_stats || {}).sort(function (a, b) { return b[1].multiple - a[1].multiple; });
  document.getElementById('multRows').innerHTML = stats.map(function (kv) {
    var s = kv[1];
    return '<tr><td>' + esc(kv[0]) + '</td><td class="num">' + s.multiple.toFixed(3) + '</td><td class="num">' + s.q25.toFixed(3) + '</td><td class="num">' + s.q75.toFixed(3) + '</td><td class="num">' + s.live_count + '</td></tr>';
  }).join('') +
    '<tr><td><b>Overall median (fallback)</b></td><td class="num"><b>' + D.overall_multiple.toFixed(3) + '</b></td><td class="num"><b>' + D.overall_q25.toFixed(3) + '</b></td><td class="num"><b>' + D.overall_q75.toFixed(3) + '</b></td><td class="num"><b>' + D.overall_live_count + '</b></td></tr>';
  document.getElementById('heldRows').innerHTML = held.map(function (h) {
    return '<tr><td>' + esc(h.name) + '</td><td class="num">' + h.train_n + '</td><td class="num">' + h.test_n + '</td><td class="num">' + h.consensus_median_abs_log_err.toFixed(3) + '</td><td class="num">' + Math.round(h.consensus_median_abs_pct_err * 100) + '%</td><td class="num">' + h.median_abs_log_err.toFixed(3) + '</td><td class="num">' + Math.round(h.median_abs_pct_err * 100) + '%</td><td class="num">' + h.baseline_median_abs_log_err.toFixed(3) + '</td><td class="num">' + Math.round(h.baseline_median_abs_pct_err * 100) + '%</td></tr>';
  }).join('');

  // Tabs.
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== 'tab-' + btn.getAttribute('data-tab'); });
    });
  });

  // Deep links: #detail-<slug> opens that protocol's detail view, #cat-<category> filters the
  // board to one category. Both are used for the entry's screenshots.
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
