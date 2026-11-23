// Pages: tools, world, turkey, seasonality, play, about
import { t, getLang } from './i18n.js';
import {
  state, getData, history, goldAt, idxOnOrBefore, fmtMoney, fmtNum, fmtPct, fmtDate, fmtAgo, h, cls, cssVar,
  OZ_G, UNITS, CURRENCIES, loadPref, savePref, livePrice,
} from './core.js';
import { cjs, lineChart } from './charts.js';
import { KARATS, ABOVE_GROUND_T, GOLD_DENSITY, cubeSVG, ICONS, monthLabels } from './widgets.js';
import { pricedInGold, seasonality as seas, valueIn, cpiRatio, tbillGrowth } from './analytics.js';

const head = (title, sub) => h('div', { class: 'page-head' }, h('h1', {}, t(title)), sub ? h('p', { class: 'muted' }, t(sub)) : null);
const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
const curSelect = (val = state.currency, only) => h('select', {}, (only || CURRENCIES).map(c => h('option', { value: c, selected: c === val }, c)));

// ================================================================ TOOLS
export function tools(root, sub) {
  root.append(head('tools_title', 'tools_sub'));
  const tabs = [['timemachine', 'tm_title'], ['dca', 'dca_title'], ['jewelry', 'jw_title']];
  const cur = sub && tabs.some(x => x[0] === sub) ? sub : 'timemachine';
  root.append(h('div', { class: 'tabs' }, tabs.map(([k, lbl]) => h('a', { href: '#/tools/' + k, class: k === cur ? 'on' : '' }, t(lbl)))));
  const box = h('section', { class: 'card' }); root.append(box);
  ({ timemachine, dca, jewelry })[cur](box);
}

function timemachine(box) {
  box.append(h('h2', {}, t('tm_title')), h('p', { class: 'muted' }, t('tm_sub')));
  const date = h('input', { type: 'date', value: loadPref('tm_date', '2015-06-15'), min: '1990-01-01', max: new Date().toISOString().slice(0, 10) });
  const amount = h('input', { type: 'number', value: loadPref('tm_amt', 1000), min: '0', step: 'any' });
  const cur = curSelect(loadPref('tm_cur', state.currency), ['USD', 'TRY', 'EUR', 'GBP']);
  const quick = h('div', { class: 'chips' }, [['2000-01-03', '2000'], ['2008-09-15', 'Lehman'], ['2011-09-06', '2011 ' + t('peak')], ['2015-12-17', '2015 ' + t('bottom')], ['2020-03-16', 'COVID']].map(([d, l]) => h('button', { class: 'chip', onclick: () => { date.value = d; run(); } }, l)));
  const out = h('div'); const el = h('div', { class: 'lwc tall' });
  box.append(h('div', { class: 'form-row' }, field(t('tm_date'), date), field(t('tm_amount'), amount), field(t('currency'), cur)), quick, out, el);
  let chart = null;
  async function run() {
    savePref('tm_date', date.value); savePref('tm_amt', +amount.value); savePref('tm_cur', cur.value);
    const [hist, macro, latest] = await Promise.all([history(), getData('macro.json'), getData('latest.json')]);
    if (!hist) return out.replaceChildren(h('div', { class: 'empty' }, t('no_data')));
    const c = cur.value, A = +amount.value || 0;
    let i0 = idxOnOrBefore(hist, date.value); const i1 = hist.dates.length - 1;
    const g0 = valueIn(hist, 'gold', i0, c), g1 = valueIn(hist, 'gold', i1, c);
    if (g0 == null) return out.replaceChildren(h('div', { class: 'empty' }, t('tm_nodata')));
    const grams = A / (g0 / OZ_G);
    const goldNow = grams / OZ_G * g1;
    const rows = [{ k: 'gold', v: goldNow }];
    rows.push({ k: 'cash', v: A });
    const fx0 = c === 'USD' ? 1 : hist.series['fx_' + c]?.[i0], fx1 = c === 'USD' ? 1 : hist.series['fx_' + c]?.[i1];
    if (c !== 'USD' && fx0 && fx1) rows.push({ k: 'usdcash', v: A / fx0 * fx1 });
    const s0 = hist.series.spx?.[i0], s1 = hist.series.spx?.[i1];
    if (s0 && s1 && fx0 && fx1) rows.push({ k: 'spx', v: A / fx0 * (s1 / s0) * fx1 });
    if (c === 'USD') { const f = tbillGrowth(hist, i0, i1); if (f) rows.push({ k: 'tbill', v: A * f }); }
    const cpiKey = c === 'TRY' ? 'cpi_tr' : c === 'USD' ? 'cpi_us' : null;
    const infl = cpiKey ? cpiRatio(macro, cpiKey, hist.dates[i0], hist.dates[i1]) : null;
    if (infl) rows.push({ k: 'inflation', v: A * infl });
    const years = (hist.times[i1] - hist.times[i0]) / 86400 / 365.25;
    rows.sort((a, b) => b.v - a.v);
    const mx = Math.max(...rows.map(r => r.v));
    out.innerHTML = `<div class="tm-hero">${t('tm_hero', { amt: fmtMoney(A, c), date: fmtDate(hist.dates[i0]), g: fmtNum(grams, 2), now: `<b>${fmtMoney(goldNow, c)}</b>` })}</div>
      <div class="tm-bars">${rows.map(r => `<div class="tm-row ${r.k === 'gold' ? 'gold' : ''}"><span>${t('tm_' + r.k)}</span><div class="bar"><i style="width:${r.v / mx * 100}%"></i></div><b>${fmtMoney(r.v, c)}</b><span class="${cls(r.v - A)} small">${fmtPct((r.v / A - 1) * 100, 0)} · ${t('cagr')} ${fmtPct(((r.v / A) ** (1 / Math.max(years, 0.01)) - 1) * 100, 1)}</span></div>`).join('')}</div>
      ${infl ? `<p class="small muted">${t('tm_infl_note', { v: fmtMoney(A * infl, c) })}</p>` : ''}`;
    // growth paths
    const step = Math.max(1, Math.floor((i1 - i0) / 600));
    const pts = { gold: [], spx: [] };
    for (let i = i0; i <= i1; i += step) {
      const g = valueIn(hist, 'gold', i, c); if (g != null) pts.gold.push({ time: hist.times[i], value: grams / OZ_G * g });
      const fx = c === 'USD' ? 1 : hist.series['fx_' + c]?.[i]; const s = hist.series.spx?.[i];
      if (s && s0 && fx && fx0) pts.spx.push({ time: hist.times[i], value: A / fx0 * (s / s0) * fx });
    }
    chart?.remove(); el.innerHTML = '';
    chart = lineChart(el, [{ data: pts.gold, color: cssVar('--gold'), title: t('tm_gold'), area: true }, { data: pts.spx, color: '#7bd389', title: t('tm_spx') }]);
  }
  [date, amount, cur].forEach(x => x.addEventListener('change', run));
  run();
}

function dca(box) {
  box.append(h('h2', {}, t('dca_title')), h('p', { class: 'muted' }, t('dca_sub')));
  const start = h('input', { type: 'date', value: loadPref('dca_start', '2016-01-01'), min: '1995-01-01' });
  const amt = h('input', { type: 'number', value: loadPref('dca_amt', 200), min: '1' });
  const cur = curSelect(loadPref('dca_cur', state.currency), ['USD', 'TRY', 'EUR', 'GBP']);
  const out = h('div'); const el = h('div', { class: 'lwc tall' });
  box.append(h('div', { class: 'form-row' }, field(t('dca_start'), start), field(t('dca_monthly'), amt), field(t('currency'), cur)), out, el);
  let chart;
  async function run() {
    savePref('dca_start', start.value); savePref('dca_amt', +amt.value); savePref('dca_cur', cur.value);
    const hist = await history(); if (!hist) return;
    const c = cur.value, M = +amt.value || 0;
    const i0 = idxOnOrBefore(hist, start.value), n = hist.dates.length;
    let grams = 0, spxUnits = 0, invested = 0, lastMonth = null;
    const series = { gold: [], spx: [], inv: [] };
    const fx = i => (c === 'USD' ? 1 : hist.series['fx_' + c]?.[i]);
    for (let i = i0; i < n; i++) {
      const m = hist.dates[i].slice(0, 7);
      const g = valueIn(hist, 'gold', i, c), f = fx(i), s = hist.series.spx?.[i];
      if (g == null || !f) continue;
      if (m !== lastMonth) { lastMonth = m; grams += M / (g / OZ_G); if (s) spxUnits += M / f / s; invested += M; }
      if (i % 5 === 0 || i === n - 1) {
        series.gold.push({ time: hist.times[i], value: grams / OZ_G * g });
        if (s) series.spx.push({ time: hist.times[i], value: spxUnits * s * f });
        series.inv.push({ time: hist.times[i], value: invested });
      }
    }
    const gEnd = series.gold.at(-1)?.value, sEnd = series.spx.at(-1)?.value;
    const g0 = valueIn(hist, 'gold', i0, c), gN = valueIn(hist, 'gold', n - 1, c);
    const lump = invested * gN / g0;
    out.innerHTML = `<div class="stats">
      <div class="stat"><div class="muted small">${t('dca_invested')}</div><div class="big">${fmtMoney(invested, c)}</div></div>
      <div class="stat"><div class="muted small">${t('dca_gold_value')}</div><div class="big">${fmtMoney(gEnd, c)}</div><div class="${cls(gEnd - invested)}">${fmtPct((gEnd / invested - 1) * 100, 1)}</div></div>
      <div class="stat"><div class="muted small">${t('dca_grams')}</div><div class="big">${fmtNum(grams, 2)} g</div></div>
      <div class="stat"><div class="muted small">${t('dca_spx_value')}</div><div class="big">${fmtMoney(sEnd, c)}</div><div class="${cls(sEnd - invested)}">${fmtPct((sEnd / invested - 1) * 100, 1)}</div></div>
      <div class="stat"><div class="muted small">${t('dca_lump')}</div><div class="big">${fmtMoney(lump, c)}</div><div class="${cls(lump - invested)}">${fmtPct((lump / invested - 1) * 100, 1)}</div></div></div>
      <p class="small muted">${t('dca_note')}</p>`;
    chart?.remove(); el.innerHTML = '';
    chart = lineChart(el, [{ data: series.gold, color: cssVar('--gold'), title: t('tm_gold'), area: true }, { data: series.spx, color: '#7bd389', title: 'S&P 500' }, { data: series.inv, color: '#8a8578', title: t('dca_invested'), dash: true, width: 1 }]);
  }
  [start, amt, cur].forEach(x => x.addEventListener('change', run));
  run();
}

function jewelry(box) {
  box.append(h('h2', {}, t('jw_title')), h('p', { class: 'muted' }, t('jw_sub')));
  const w = h('input', { type: 'number', value: loadPref('jw_w', 10), min: '0', step: 'any' });
  const kar = h('select', {}, Object.keys(KARATS).sort((a, b) => b - a).map(k => h('option', { value: k, selected: +k === loadPref('jw_k', 22) }, `${k}K (${(KARATS[k] * 1000).toFixed(0)})`)));
  const cur = curSelect();
  const dealer = h('input', { type: 'range', min: '60', max: '100', value: loadPref('jw_dealer', 85) });
  const labor = h('input', { type: 'range', min: '0', max: '60', value: loadPref('jw_labor', 15) });
  const out = h('div'); const table = h('div');
  box.append(h('div', { class: 'form-row' }, field(t('jw_weight'), w), field(t('jw_karat'), kar), field(t('currency'), cur)),
    h('div', { class: 'form-row' }, field(t('jw_dealer'), dealer), field(t('jw_labor'), labor)), out, h('h3', {}, t('jw_table')), table);
  async function run() {
    savePref('jw_w', +w.value); savePref('jw_k', +kar.value); savePref('jw_dealer', +dealer.value); savePref('jw_labor', +labor.value);
    const latest = await getData('latest.json'); if (!latest) return;
    const perG = livePrice(latest, cur.value, 'g');
    const fine = (+w.value || 0) * KARATS[kar.value];
    const melt = fine * perG;
    out.innerHTML = `<div class="stats">
      <div class="stat"><div class="muted small">${t('fine_gold')}</div><div class="big">${fmtNum(fine, 3)} g</div></div>
      <div class="stat"><div class="muted small">${t('jw_melt')}</div><div class="big">${fmtMoney(melt, cur.value)}</div></div>
      <div class="stat"><div class="muted small">${t('jw_dealer_pays')} (${dealer.value}%)</div><div class="big">${fmtMoney(melt * dealer.value / 100, cur.value)}</div></div>
      <div class="stat"><div class="muted small">${t('jw_retail')} (+${labor.value}%)</div><div class="big">${fmtMoney(melt * (1 + labor.value / 100), cur.value)}</div></div></div>
      <p class="small muted">${t('jw_note')}</p>`;
    table.innerHTML = `<table class="tbl"><thead><tr><th>${t('jw_karat')}</th><th>${t('jw_purity')}</th><th>${t('per_gram')}</th><th>${t('jw_melt')} (${fmtNum(+w.value, 1)} g)</th></tr></thead><tbody>
      ${Object.keys(KARATS).sort((a, b) => b - a).map(k => `<tr${k === kar.value ? ' class="hl"' : ''}><td>${k}K</td><td>${(KARATS[k] * 100).toFixed(1)}%</td><td>${fmtMoney(perG * KARATS[k], cur.value)}</td><td>${fmtMoney(perG * KARATS[k] * (+w.value || 0), cur.value)}</td></tr>`).join('')}</tbody></table>`;
  }
  [w, kar, cur, dealer, labor].forEach(x => x.addEventListener('input', run));
  run();
}

// ================================================================ WORLD
export function world(root) {
  root.append(head('world_title', 'world_sub'));
  const pig = h('section', { class: 'card' }), cb = h('section', { class: 'card' }), cube = h('section', { class: 'card' });
  root.append(pig, cb, cube);
  // priced in gold
  Promise.all([history(), getData('macro.json')]).then(([hist, macro]) => {
    if (!hist) return;
    const items = pricedInGold(hist, macro);
    pig.append(h('h2', {}, t('pig_title')), h('p', { class: 'muted' }, t('pig_sub')));
    const years = [2000, 2010, 2020];
    const tbl = h('table', { class: 'tbl pig-table' });
    tbl.innerHTML = `<thead><tr><th></th>${years.map(y => `<th>${y}</th>`).join('')}<th>${t('now')}</th><th>${t('change')}</th></tr></thead><tbody>
      ${items.map(it => { const a = it.at(2000) ?? it.series[0].value; const f = v => v == null ? '–' : `${fmtNum(v, v < 10 ? 2 : v < 100 ? 1 : 0)} ${it.unit === 'g' ? t('unit_g_short') : t('unit_oz_short')}`;
        return `<tr data-k="${it.key}"><td>${ICONS[it.key] || ''} ${t('pig_' + it.key)}</td>${years.map(y => `<td>${f(it.at(y))}</td>`).join('')}<td><b>${f(it.now)}</b></td><td class="${cls(-(it.now - a))}">${fmtPct((it.now / a - 1) * 100, 0)}</td></tr>`; }).join('')}</tbody>`;
    const el = h('div', { class: 'lwc' });
    const sel = h('div', { class: 'chips' });
    let chart; let cur = items[0]?.key;
    const draw = () => {
      sel.replaceChildren(...items.map(it => h('button', { class: 'chip' + (it.key === cur ? ' on' : ''), onclick: () => { cur = it.key; draw(); } }, (ICONS[it.key] || '') + ' ' + t('pig_' + it.key))));
      const it = items.find(x => x.key === cur); if (!it) return;
      chart?.remove(); el.innerHTML = '';
      chart = lineChart(el, [{ data: it.series.map(p => ({ time: Date.parse(p.date) / 1000, value: p.value })), color: cssVar('--gold'), area: true, title: it.unit === 'g' ? t('unit_g') : t('unit_oz') }], { rightPriceScale: { mode: 1, borderVisible: false } });
    };
    pig.append(tbl, h('p', { class: 'small muted' }, t('pig_note')), sel, el);
    draw();
  });
  // central bank map
  getData('static/centralbanks.json').then(async data => {
    cb.append(h('h2', {}, t('cb_title')), h('p', { class: 'muted' }, getLang() === 'tr' ? data.note_tr : data.note_en));
    const mapBox = h('div', { class: 'map' }); const tip = h('div', { class: 'map-tip hidden' });
    const side = h('div');
    cb.append(h('div', { class: 'grid-map' }, h('div', { class: 'map-wrap' }, mapBox, tip), side));
    const ul = h('ul', { class: 'highlights' }, (getLang() === 'tr' ? data.highlights_tr : data.highlights_en).map(x => h('li', {}, x)));
    const sorted = data.countries.slice().sort((a, b) => b.t - a.t);
    const mx = sorted[0].t;
    side.append(h('h3', {}, t('cb_top')), h('div', { class: 'hbars', html: sorted.map(c => `<div class="hbar"><span>${getLang() === 'tr' ? c.name_tr : c.name}</span><div class="bar"><i style="width:${c.t / mx * 100}%"></i></div><b>${fmtNum(c.t, 0)} t</b></div>`).join('') }), h('h3', {}, t('cb_highlights')), ul);
    try {
      const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(r => r.json());
      const d3 = window.d3; const countries = window.topojson.feature(topo, topo.objects.countries);
      const byIso = new Map(data.countries.map(c => [String(c.iso).padStart(3, '0'), c]));
      const W = 900, H = 460;
      const proj = d3.geoNaturalEarth1().fitSize([W, H], countries);
      const path = d3.geoPath(proj);
      const color = d3.scaleSequentialLog([3, 9000], d3.interpolateRgb('#5a4a20', '#f6d77a'));
      const svg = d3.select(mapBox).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'worldmap');
      svg.selectAll('path').data(countries.features).join('path').attr('d', path)
        .attr('fill', f => { const c = byIso.get(String(f.id).padStart(3, '0')); return c ? color(Math.max(3, c.t)) : 'var(--map-empty)'; })
        .attr('stroke', 'var(--bg)').attr('stroke-width', 0.5)
        .on('mousemove', (ev, f) => {
          const c = byIso.get(String(f.id).padStart(3, '0'));
          const r = mapBox.getBoundingClientRect();
          tip.classList.remove('hidden'); tip.style.left = (ev.clientX - r.left + 12) + 'px'; tip.style.top = (ev.clientY - r.top + 12) + 'px';
          tip.innerHTML = c ? `<b>${getLang() === 'tr' ? c.name_tr : c.name}</b><br>${fmtNum(c.t, 1)} t${c.t2021 != null ? `<br><span class="muted">2021: ${fmtNum(c.t2021, 1)} t</span>` : ''}<br><span class="muted tiny">${t('asof')} ${c.asof}</span>` : `${f.properties.name}<br><span class="muted">${t('cb_notlisted')}</span>`;
        })
        .on('mouseleave', () => tip.classList.add('hidden'));
    } catch (e) { console.warn(e); mapBox.textContent = t('no_data'); }
  });
  // cube
  const side = Math.cbrt(ABOVE_GROUND_T * 1000 / GOLD_DENSITY);
  const vol = ABOVE_GROUND_T * 1000 / GOLD_DENSITY;
  const mine = h('input', { type: 'number', value: loadPref('cube_g', 10), min: '0', step: 'any' });
  const res = h('div');
  cube.append(h('h2', {}, t('cube_title')), h('div', { class: 'cube-grid' }, h('div', { html: cubeSVG(side, 320) }),
    h('div', {},
      h('p', { html: t('cube_text', { t: fmtNum(ABOVE_GROUND_T, 0), s: fmtNum(side, 1), v: fmtNum(vol, 0), p: fmtNum(vol / 2500, 1) }) }),
      h('p', { html: t('cube_share', { g: fmtNum(ABOVE_GROUND_T * 1e6 / 8.2e9, 1) }) }),
      field(t('cube_mine'), mine), res, h('p', { class: 'muted small' }, t('cube_src')))));
  const runCube = async () => {
    savePref('cube_g', +mine.value);
    const g = +mine.value || 0; const sideMm = Math.cbrt(g / 1000 / GOLD_DENSITY) * 1000;
    const latest = await getData('latest.json');
    const share = g / (ABOVE_GROUND_T * 1e6);
    res.innerHTML = `<div class="stats"><div class="stat"><div class="muted small">${t('cube_your_side')}</div><div class="big">${fmtNum(sideMm, 1)} mm</div></div>
      <div class="stat"><div class="muted small">${t('cube_your_share')}</div><div class="big">${share > 0 ? '1 / ' + fmtNum(1 / share, 0) : '–'}</div></div>
      <div class="stat"><div class="muted small">${t('value')}</div><div class="big">${latest ? fmtMoney(livePrice(latest, state.currency, 'g') * g) : '–'}</div></div></div>`;
  };
  mine.addEventListener('input', runCube); runCube();
}

// ================================================================ TURKEY
export function turkey(root) {
  root.append(head('tr_title', 'tr_sub'));
  const a = h('section', { class: 'card' }), b = h('section', { class: 'card' }), c = h('section', { class: 'card' });
  root.append(h('div', { class: 'grid2' }, a, b), c);
  Promise.all([getData('turkey.json'), history(), getData('latest.json')]).then(([tr, hist, latest]) => {
    if (!tr) { a.append(h('div', { class: 'empty' }, t('no_data'))); return; }
    const keys = ['gram', 'ceyrek', 'yarim', 'tam', 'cumhuriyet', 'ata', 'ayar22', 'ayar18', 'ayar14', 'gumus'].filter(k => tr.items?.[k]);
    a.innerHTML = `<h2>${t('tr_prices')}</h2>${keys.length ? `<table class="tbl"><thead><tr><th></th><th>${t('buy')}</th><th>${t('sell')}</th><th>${t('change')}</th><th>${t('tr_fine_value')}</th><th>${t('premium')}</th></tr></thead><tbody>
      ${keys.map(k => { const it = tr.items[k]; return `<tr><td>${t('tr_' + k)}</td><td>${fmtMoney(it.buy, 'TRY', 2)}</td><td><b>${fmtMoney(it.sell, 'TRY', 2)}</b></td><td class="${cls(it.change)}">${fmtPct(it.change)}</td><td>${it.fine_value ? fmtMoney(it.fine_value, 'TRY', 2) : '–'}</td><td>${it.premium != null ? fmtPct(it.premium, 1) : '–'}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty">${t('tr_unavailable')}</div>`}
      <p class="muted tiny">${t('tr_src')} ${tr.feed_time ? '· ' + tr.feed_time : ''} · ${t('updated')} ${fmtAgo(tr.updated)}</p>`;
    // premium meter
    const gp = tr.items?.gram?.premium;
    b.innerHTML = `<h2>${t('tr_premium_title')}</h2><p class="muted small">${t('tr_premium_sub')}</p>
      <div class="stats"><div class="stat"><div class="muted small">${t('tr_parity')}</div><div class="big">${fmtMoney(tr.parity_gram, 'TRY', 2)}</div><div class="muted tiny">= ons ${fmtNum(tr.ons, 2)} $ × ${fmtNum(tr.usdtry, 4)} ÷ 31,1035</div></div>
      <div class="stat"><div class="muted small">${t('tr_gram_market')}</div><div class="big">${tr.items?.gram ? fmtMoney(tr.items.gram.sell, 'TRY', 2) : '–'}</div></div>
      <div class="stat"><div class="muted small">${t('premium')}</div><div class="big ${gp > 1.5 ? 'down' : gp < 0 ? 'up' : ''}">${gp != null ? fmtPct(gp, 2) : '–'}</div></div></div>
      <div class="zbar"><span class="muted tiny">−2%</span><div class="zline"><i style="left:${gp == null ? 50 : Math.max(0, Math.min(100, (gp + 2) / 6 * 100))}%"></i></div><span class="muted tiny">+4%</span></div>
      <p class="small">${t('tr_premium_explain')}</p>`;
    if (tr.history?.length > 1) {
      const el = h('div', { class: 'lwc short' }); b.append(h('h3', {}, t('tr_premium_hist')), el);
      lineChart(el, [{ data: tr.history.filter(x => x.gram && x.parity).map(x => ({ time: Date.parse(x.d) / 1000, value: (x.gram / x.parity - 1) * 100 })), color: cssVar('--gold'), area: true }]);
    }
    // gram gold TRY history
    if (hist?.series?.fx_TRY) {
      const el = h('div', { class: 'lwc tall' });
      c.append(h('h2', {}, t('tr_gram_hist')), h('p', { class: 'muted small' }, t('tr_gram_hist_sub')), el);
      const pts = [], usd = [];
      for (let i = 0; i < hist.dates.length; i++) {
        const v = goldAt(hist, i, 'TRY', 'g'); if (v != null && hist.dates[i] >= '2004-01-01') { pts.push({ time: hist.times[i], value: v }); usd.push({ time: hist.times[i], value: hist.series.fx_TRY[i] }); }
      }
      lineChart(el, [{ data: pts, color: cssVar('--gold'), area: true, title: t('tr_gram') + ' (₺)' }, { data: usd, color: '#5aa9e6', title: 'USD/TRY', scale: 'left' }], { rightPriceScale: { mode: 1, borderVisible: false }, leftPriceScale: { mode: 1, visible: true, borderVisible: false } });
      const g0 = pts.find(p => p.time >= Date.parse('2014-01-01') / 1000), g1 = pts.at(-1);
      if (g0 && g1) c.append(h('p', { class: 'small' }, t('tr_10y', { a: fmtMoney(g0.value, 'TRY', 0), b: fmtMoney(g1.value, 'TRY', 0), x: fmtNum(g1.value / g0.value, 1) })));
    }
  });
}

// ================================================================ SEASONALITY
export function seasonality(root) {
  root.append(head('seas_title', 'seas_sub'));
  const ctr = h('div', { class: 'form-row' }); const a = h('section', { class: 'card' }), b = h('section', { class: 'card' }), c = h('section', { class: 'card' });
  root.append(ctr, h('div', { class: 'grid2' }, a, b), c);
  const yrs = h('select', {}, [10, 20, 30, 50].map(y => h('option', { value: y, selected: y === 20 }, t('last_n_years', { n: y }))));
  const cur = curSelect(state.currency === 'TRY' ? 'TRY' : 'USD', ['USD', 'TRY', 'EUR']);
  ctr.append(field(t('period'), yrs), field(t('currency'), cur));
  const events = [{ m: [1, 2], k: 'cny' }, { m: [4, 5], k: 'akshaya' }, { m: [10, 11], k: 'diwali' }, { m: [10, 11, 12], k: 'wedding' }];
  async function run() {
    const hist = await history(); if (!hist) return;
    const s = seas(hist, +yrs.value, cur.value);
    [a, b, c].forEach(x => x.innerHTML = '');
    const cv1 = h('canvas'), cv2 = h('canvas');
    a.append(h('h2', {}, t('seas_monthly')), h('div', { class: 'cv-wrap tall' }, cv1),
      h('div', { class: 'season-events' }, events.map(e => h('span', { class: 'pill' }, `${e.m.map(m => monthLabels()[m - 1]).join('–')}: ${t('ev_' + e.k)}`))));
    const thisM = new Date().getUTCMonth();
    cjs(cv1, { type: 'bar', data: { labels: monthLabels(), datasets: [
      { label: t('avg_return'), data: s.avg, backgroundColor: s.avg.map((v, i) => i === thisM ? cssVar('--gold') : v >= 0 ? '#7bd389aa' : '#ef6f6caa'), yAxisID: 'y' },
      { type: 'line', label: t('pct_positive'), data: s.pos, borderColor: '#5aa9e6', backgroundColor: '#5aa9e6', yAxisID: 'y2', pointRadius: 3 }] },
      options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y2' ? `${c.dataset.label}: ${fmtNum(c.raw, 0)}%` : `${c.dataset.label}: ${fmtPct(c.raw)}` } } },
        scales: { y: { ticks: { callback: v => v + '%' } }, y2: { position: 'right', min: 0, max: 100, grid: { display: false }, ticks: { callback: v => v + '%' } } } } });
    b.append(h('h2', {}, t('seas_weekday')), h('div', { class: 'cv-wrap tall' }, cv2), h('p', { class: 'muted small' }, t('seas_note')));
    const wd = getLang() === 'tr' ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    cjs(cv2, { type: 'bar', data: { labels: wd, datasets: [{ label: t('avg_return'), data: s.weekday, backgroundColor: s.weekday.map(v => v >= 0 ? '#7bd389aa' : '#ef6f6caa') }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtPct(c.raw, 3) } } }, scales: { y: { ticks: { callback: v => v.toFixed(2) + '%' } } } } });
    // heatmap
    const ys = [...s.years].reverse();
    const col = v => { if (v == null) return 'transparent'; const a = Math.min(1, Math.abs(v) / 8); return v >= 0 ? `rgba(67,160,71,${0.15 + a * 0.75})` : `rgba(217,83,79,${0.15 + a * 0.75})`; };
    c.append(h('h2', {}, t('seas_heatmap')), h('div', { class: 'heat-wrap', html: `<table class="heat"><thead><tr><th></th>${monthLabels().map(m => `<th>${m}</th>`).join('')}<th>${t('year')}</th></tr></thead><tbody>
      ${ys.map(y => { const row = s.data[y] || {}; const yr = Object.values(row).reduce((acc, v) => acc * (1 + v / 100), 1); return `<tr><th>${y}</th>${Array.from({ length: 12 }, (_, m) => { const v = row[m + 1]; return `<td style="background:${col(v)}" title="${y}-${m + 1}: ${v == null ? '' : fmtPct(v)}">${v == null ? '' : fmtNum(v, 1)}</td>`; }).join('')}<td class="${cls(yr - 1)}"><b>${fmtPct((yr - 1) * 100, 0)}</b></td></tr>`; }).join('')}
      <tr class="avg"><th>${t('average')}</th>${s.avg.map(v => `<td>${fmtNum(v, 1)}</td>`).join('')}<td></td></tr></tbody></table>` }));
  }
  yrs.addEventListener('change', run); cur.addEventListener('change', run);
  run();
}

// ================================================================ PLAY: Higher or Lower
export function play(root) {
  root.append(head('play_title', 'play_sub'));
  const card = h('section', { class: 'card game' }); root.append(card);
  const score = { streak: 0, best: loadPref('hl_best', 0), played: loadPref('hl_played', 0), won: loadPref('hl_won', 0) };
  let mode = 'daily', round = 0, dailyScore = 0;
  const today = new Date().toISOString().slice(0, 10);
  const dailyDone = loadPref('hl_daily', {});
  let rng = mulberry(hash(today));
  const HORIZON = 20, WINDOW = 120;
  let chart = null;
  async function newRound() {
    const hist = await history(); if (!hist) return;
    const g = hist.series.gold; const n = g.length;
    const r = mode === 'daily' ? rng() : Math.random();
    const start = Math.floor(r * (n - WINDOW - HORIZON - 260)) + 200;
    const win = g.slice(start, start + WINDOW), fut = g.slice(start + WINDOW, start + WINDOW + HORIZON);
    if (win.some(v => v == null) || fut.some(v => v == null)) return newRound();
    draw(hist, start, win, fut);
  }
  function draw(hist, start, win, fut, revealed = null) {
    card.innerHTML = '';
    const info = h('div', { class: 'game-head' },
      h('div', { class: 'chips' }, h('button', { class: 'chip' + (mode === 'daily' ? ' on' : ''), onclick: () => { mode = 'daily'; round = 0; dailyScore = 0; rng = mulberry(hash(today)); newRound(); } }, t('hl_daily')),
        h('button', { class: 'chip' + (mode === 'endless' ? ' on' : ''), onclick: () => { mode = 'endless'; newRound(); } }, t('hl_endless'))),
      h('div', { class: 'game-score' }, mode === 'daily' ? `${t('hl_round')} ${Math.min(round + 1, 5)}/5 · ${t('score')} ${dailyScore}` : `${t('hl_streak')} ${score.streak}`, ` · ${t('hl_best')} ${score.best} · ${t('hl_acc')} ${score.played ? Math.round(score.won / score.played * 100) : 0}%`));
    card.append(info);
    if (mode === 'daily' && dailyDone[today] != null && revealed == null && round === 0) {
      card.append(h('div', { class: 'game-done' }, h('h2', {}, t('hl_daily_done', { s: dailyDone[today] })), h('p', {}, t('hl_come_back')), h('button', { class: 'btn', onclick: () => { mode = 'endless'; newRound(); } }, t('hl_play_endless'))));
      return;
    }
    const q = h('h2', { class: 'game-q' }, revealed == null ? t('hl_question', { n: HORIZON }) : '');
    const el = h('div', { class: 'lwc game-chart' }); card.append(q, el);
    const base = Date.UTC(2000, 0, 3) / 1000;
    const data = win.map((v, i) => ({ time: base + i * 86400, value: v }));
    const series = [{ data, color: cssVar('--gold'), area: true }];
    if (revealed != null) series.push({ data: [data.at(-1), ...fut.map((v, i) => ({ time: base + (WINDOW + i) * 86400, value: v }))], color: fut.at(-1) > win.at(-1) ? '#43a047' : '#d9534f', width: 3 });
    chart?.remove();
    chart = lineChart(el, series, { timeScale: { visible: false }, rightPriceScale: { visible: false }, handleScroll: false, handleScale: false, crosshair: { vertLine: { visible: false }, horzLine: { visible: false } } });
    if (revealed == null) {
      const guess = up => {
        const isUp = fut.at(-1) > win.at(-1); const ok = up === isUp;
        score.played++; if (ok) { score.won++; score.streak++; dailyScore += mode === 'daily' ? 1 : 0; } else score.streak = 0;
        score.best = Math.max(score.best, score.streak);
        savePref('hl_best', score.best); savePref('hl_played', score.played); savePref('hl_won', score.won);
        draw(hist, start, win, fut, ok);
      };
      card.append(h('div', { class: 'game-btns' }, h('button', { class: 'btn big up-btn', onclick: () => guess(true) }, '▲ ' + t('hl_higher')), h('button', { class: 'btn big down-btn', onclick: () => guess(false) }, '▼ ' + t('hl_lower'))));
    } else {
      const chg = (fut.at(-1) / win.at(-1) - 1) * 100;
      const d0 = hist.dates[start], d1 = hist.dates[start + WINDOW + HORIZON - 1];
      card.append(h('div', { class: 'game-result ' + (revealed ? 'ok' : 'bad') }, h('h2', {}, revealed ? '✓ ' + t('hl_right') : '✗ ' + t('hl_wrong')),
        h('p', {}, t('hl_reveal', { a: fmtDate(d0, { year: 'numeric', month: 'long' }), b: fmtDate(d1, { year: 'numeric', month: 'long', day: 'numeric' }), c: fmtPct(chg, 1), p0: fmtMoney(win.at(-1), 'USD', 0), p1: fmtMoney(fut.at(-1), 'USD', 0) }))));
      const next = () => {
        if (mode === 'daily') { round++; if (round >= 5) { dailyDone[today] = dailyScore; savePref('hl_daily', dailyDone); card.innerHTML = ''; card.append(h('div', { class: 'game-done' }, h('h2', {}, t('hl_daily_done', { s: dailyScore })), h('p', {}, t('hl_come_back')), h('button', { class: 'btn', onclick: () => { mode = 'endless'; newRound(); } }, t('hl_play_endless')))); return; } }
        newRound();
      };
      card.append(h('button', { class: 'btn', onclick: next }, t('hl_next') + ' →'));
    }
  }
  newRound();
}
function hash(s) { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t2 = Math.imul(a ^ a >>> 15, 1 | a); t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2; return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296; }; }

// ================================================================ ABOUT
export function about(root) {
  root.append(head('about_title'));
  const card = h('section', { class: 'card prose' });
  card.innerHTML = t('about_html');
  root.append(card);
  getData('status.json').then(st => {
    if (!st) return;
    const ok = Object.values(st.sources).filter(s => s.ok).length, all = Object.keys(st.sources).length;
    root.append(h('section', { class: 'card' }, h('h2', {}, t('data_status')), h('p', {}, t('status_line', { ok, all, ago: fmtAgo(st.updated) })),
      h('details', {}, h('summary', {}, t('details')), h('table', { class: 'tbl small' }, h('tbody', {}, Object.entries(st.sources).map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: v.ok ? 'up' : 'down' }, v.ok ? 'OK' : '✗'), h('td', { class: 'muted' }, v.info))))))));
  });
}
