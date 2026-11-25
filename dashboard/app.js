// Token Radar dashboard: renders window.RADAR (written by main.ts into data.js) with no network.
// Board: sortable, filterable by search / category / chain / watchlist. Click a row for its model
// breakdown and farm plan. Live tab: protocols whose token already trades, at the market's own
// values. Model tab: the formula and the category multiples computed from this snapshot.
(function () {
  var D = window.RADAR;
  if (!D) {
    document.body.insertAdjacentHTML('beforeend', '<p style="padding:20px">No data: data.js was not written next to this page.</p>');
    return;
  }

  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
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
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Header stats.
  document.getElementById('stats').innerHTML = [
    ['758', 'protocols scanned'],
    [String(D.watchlist_size), 'on the watchlist'],
    [String(D.board_size), 'rows ranked'],
    [String(D.early_size), 'early finds'],
    [String(D.live_size), 'live tokens'],
  ].map(function (s) {
    return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>';
  }).join('');
  document.getElementById('asof').textContent = D.as_of;
  document.getElementById('src').textContent = D.source;

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
  // A row is on the watchlist when the snapshot's own watchlist names its slug.
  function isWatch(r) { return watchlistSlugs.has(r.slug); }

  var tbody = document.getElementById('rows');
  var countEl = document.getElementById('count');
  var detailEl = document.getElementById('detail');

  function filtered() {
    var q = document.getElementById('q').value.trim().toLowerCase();
    var cat = catSel.value;
    var chain = chainSel.value;
    var onlyWatch = document.getElementById('watch').checked;
    var sort = document.getElementById('sort').value;
    var rows = D.rows.filter(function (r) {
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
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
    countEl.textContent = rows.length + ' of ' + D.board_size + ' ranked protocols' +
      (document.getElementById('watch').checked ? ' (watchlist only)' : '');
    tbody.innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td><span class="pill">' + esc(r.category || 'Uncategorised') + '</span></td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num gold">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
  }

  function showDetail(slug) {
    var r = D.rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    Array.from(tbody.querySelectorAll('tr')).forEach(function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-slug') === slug);
    });
    var base = r.tvl_usd * r.category_multiple;
    detailEl.hidden = false;
    detailEl.innerHTML =
      '<h2><span class="rank">#' + r.rank + '</span> ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · TVL ' + money(r.tvl_usd) + ' · 7d ' + (r.change_7d === null ? '—' : r.change_7d.toFixed(1) + '%') +
      ' · tracked since ' + (r.listed_at || 'unknown') + ' · records no token</p>' +
      '<div class="breakdown">' +
      '<div class="factor"><span>Base (TVL × category)</span><b>' + money(Math.round(base)) + '</b><code>× ' + r.category_multiple.toFixed(3) + ' ' + esc(r.category || '') + '</code></div>' +
      '<div class="factor"><span>Growth</span><b>× ' + r.growth_multiplier.toFixed(2) + '</b><code>7d ' + (r.change_7d === null ? '—' : r.change_7d.toFixed(1) + '%') + '</code></div>' +
      '<div class="factor"><span>Maturity</span><b>× ' + r.maturity_multiplier.toFixed(2) + '</b><code>' + (r.age_days === null ? 'age unknown' : r.age_days + ' days') + '</code></div>' +
      '<div class="factor"><span>Chains</span><b>× ' + r.chain_multiplier.toFixed(2) + '</b><code>' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</code></div>' +
      '<div class="factor"><span>Implied value</span><b class="gold">' + money(r.implied_value_usd) + '</b><code>rank #' + r.rank + '</code></div>' +
      '</div>' +
      '<h3>Farm plan — 6 steps</h3><ol>' +
      r.farm_steps.map(function (s) {
        var m = s.match(/^(.*?) Cost: (.*?) Time: (.*?)\.?$/);
        if (!m) return '<li><p>' + esc(s) + '</p></li>';
        return '<li><p>' + esc(m[1]) + '</p><p class="cost">Cost: ' + esc(m[2]) + ' · Time: ' + esc(m[3]) + '</p></li>';
      }).join('') + '</ol>';
    detailEl.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  tbody.addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr');
    if (tr) showDetail(tr.getAttribute('data-slug'));
  });
  ['q', 'cat', 'chain', 'watch', 'sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });

  // Live tab.
  document.getElementById('liveRows').innerHTML = D.live.map(function (p) {
    var ratio = p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(2) + '×' : '—';
    return '<tr><td><span class="name">' + esc(p.name) + '</span><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td><span class="pill">' + esc(p.category || 'Uncategorised') + '</span></td>' +
      '<td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + money(p.mcap_usd || 0) + '</td>' +
      '<td class="num">' + ratio + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // Model tab: category multiples.
  var mults = Object.entries(D.category_multiples).sort(function (a, b) { return b[1] - a[1]; });
  document.getElementById('multRows').innerHTML = mults.map(function (kv) {
    return '<tr><td>' + esc(kv[0]) + '</td><td class="num">' + kv[1].toFixed(3) + '</td></tr>';
  }).join('') +
    '<tr><td><b>Overall median (fallback)</b></td><td class="num"><b>' + D.overall_multiple.toFixed(3) + '</b></td></tr>';

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
  }
})();
