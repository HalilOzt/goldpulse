// Pages: dashboard, drivers & fair value, news, sentiment
import { t, getLang } from './i18n.js';
import { state, setState, onState, getData, history, fmtMoney, fmtNum, fmtPct, fmtDate, fmtAgo, h, cls, cssVar, loadPref, savePref } from './core.js';
import { WIDGETS, driverBars, newsList, pmEvent } from './widgets.js';
import { cjs, gauge, lineChart } from './charts.js';

// ================================================================ DASHBOARD
const DEFAULT_LAYOUT = [
  { id: 'price', x: 0, y: 0, w: 4, h: 6 }, { id: 'chart', x: 4, y: 0, w: 8, h: 9 },
  { id: 'feargreed', x: 0, y: 6, w: 4, h: 7 }, { id: 'drivers', x: 4, y: 9, w: 4, h: 6 },
  { id: 'news', x: 8, y: 9, w: 4, h: 8 }, { id: 'fairvalue', x: 0, y: 13, w: 4, h: 5 },
  { id: 'turkey', x: 4, y: 15, w: 4, h: 6 }, { id: 'ratios', x: 8, y: 17, w: 4, h: 5 },
  { id: 'pricedin', x: 0, y: 18, w: 4, h: 6 }, { id: 'polymarket', x: 4, y: 21, w: 4, h: 6 },
  { id: 'converter', x: 8, y: 22, w: 4, h: 5 }, { id: 'seasonality', x: 0, y: 24, w: 4, h: 5 },
  { id: 'centralbanks', x: 4, y: 27, w: 4, h: 6 }, { id: 'cube', x: 8, y: 27, w: 4, h: 5 },
];
const LAYOUT_VERSION = 2;

export function dashboard(root) {
  let layout = loadPref('layout_v' + LAYOUT_VERSION, null) || DEFAULT_LAYOUT;
  let locked = loadPref('locked', false);
  const cleanups = new Map();
  const bar = h('div', { class: 'dash-bar' });
  const gridEl = h('div', { class: 'grid-stack' });
  root.append(
    h('div', { class: 'page-head' }, h('h1', {}, t('dash_title')), h('p', { class: 'muted' }, t('dash_sub'))),
    bar, gridEl);

  const narrow = window.innerWidth < 760;
  if (narrow) {
    // phones: one column in reading order, not draggable (so scrolling works)
    let y = 0;
    layout = [...layout].sort((a, b) => a.y - b.y || a.x - b.x).map(it => { const o = { ...it, x: 0, y, w: 1 }; y += it.h; return o; });
  }
  const grid = window.GridStack.init(narrow
    ? { column: 1, cellHeight: 64, margin: 5, float: false, staticGrid: true, disableOneColumnMode: true }
    : { column: 12, cellHeight: 64, margin: 7, handle: '.w-head', float: false, animate: true,
        columnOpts: { breakpoints: [{ w: 1100, c: 6 }], layout: 'list' }, staticGrid: locked }, gridEl);

  function renderBody(id, body) {
    cleanups.get(id)?.();
    body.innerHTML = '';
    const w = WIDGETS.find(x => x.id === id);
    try { const c = w.render(body); cleanups.set(id, typeof c === 'function' ? c : null); } catch (e) { console.error(e); body.textContent = t('no_data'); }
  }
  function addWidget(item) {
    const w = WIDGETS.find(x => x.id === item.id); if (!w) return;
    const el = h('div', { class: 'grid-stack-item', 'gs-id': w.id, 'gs-x': item.x, 'gs-y': item.y, 'gs-w': item.w ?? w.w, 'gs-h': item.h ?? w.h, 'gs-min-w': w.minW, 'gs-min-h': w.minH });
    const body = h('div', { class: 'w-body' });
    const content = h('div', { class: 'grid-stack-item-content widget' },
      h('div', { class: 'w-head' }, h('span', { class: 'w-title' }, t(w.title)),
        h('div', { class: 'w-actions' },
          h('button', { class: 'icon-btn', title: t('refresh'), onclick: () => renderBody(w.id, body) }, '↻'),
          h('button', { class: 'icon-btn', title: t('remove'), onclick: () => { cleanups.get(w.id)?.(); cleanups.delete(w.id); grid.removeWidget(el); persist(); drawBar(); } }, '✕'))),
      body);
    el.append(content);
    gridEl.append(el);
    grid.makeWidget(el);
    renderBody(w.id, body);
  }
  function persist() {
    if (narrow) return;
    const items = grid.save(false).map(n => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h }));
    savePref('layout_v' + LAYOUT_VERSION, items);
  }
  function drawBar() {
    const present = new Set(grid.getGridItems().map(el => el.getAttribute('gs-id')));
    const missing = WIDGETS.filter(w => !present.has(w.id));
    const sel = h('select', { class: 'add-sel', onchange: e => { if (!e.target.value) return; addWidget({ id: e.target.value, x: 0, y: 1000 }); persist(); drawBar(); } },
      h('option', { value: '' }, '+ ' + t('add_widget')), missing.map(w => h('option', { value: w.id }, t(w.title))));
    bar.replaceChildren(...[
      sel,
      narrow ? null : h('button', { class: 'btn ghost', onclick: () => { locked = !locked; grid.setStatic(locked); savePref('locked', locked); drawBar(); } }, locked ? '🔒 ' + t('unlock_layout') : '🔓 ' + t('lock_layout')),
      h('button', { class: 'btn ghost', onclick: () => { savePref('layout_v' + LAYOUT_VERSION, null); location.reload(); } }, '⟲ ' + t('reset_layout')),
      h('span', { class: 'muted small hint' }, t('dash_hint')),
    ].filter(Boolean));
  }
  grid.batchUpdate();
  for (const it of layout) addWidget(it);
  grid.batchUpdate(false);
  grid.on('change', persist);
  drawBar();

  // re-render widgets on global changes (the chart handles itself)
  const off = onState(p => {
    if (['currency', 'unit', 'lang', 'theme'].some(k => k in p)) {
      for (const el of grid.getGridItems()) {
        const id = el.getAttribute('gs-id'); if (id === 'chart') continue;
        renderBody(id, el.querySelector('.w-body'));
        el.querySelector('.w-title').textContent = t(WIDGETS.find(w => w.id === id).title);
      }
    }
  });
  return () => { off(); for (const c of cleanups.values()) c?.(); grid.destroy(false); };
}

// ================================================================ DRIVERS + FAIR VALUE
export function drivers(root) {
  root.append(h('div', { class: 'page-head' }, h('h1', {}, t('drivers_title')), h('p', { class: 'muted' }, t('drivers_sub'))));
  const today = h('section', { class: 'card' }), hist = h('section', { class: 'card' }), fv = h('section', { class: 'card' });
  root.append(h('div', { class: 'grid2' }, today, hist), fv);
  Promise.all([getData('drivers.json'), getData('fairvalue.json')]).then(([dr, f]) => {
    if (dr?.days?.length) {
      const days = dr.days; let sel = days.length - 1;
      const box = h('div');
      const drawDay = () => box.replaceChildren(driverBars(days[sel]), h('p', { class: 'small' }, narrative(days[sel])));
      const selEl = h('select', { onchange: e => { sel = +e.target.value; drawDay(); } }, days.map((d, i) => h('option', { value: i, selected: i === sel }, fmtDate(d.date))).reverse());
      today.append(h('div', { class: 'row-between' }, h('h2', {}, t('drv_today')), selEl), box,
        h('div', { class: 'muted small' }, t('drv_model', { w: dr.window, r2: fmtNum(dr.r2 * 100, 0) })),
        h('table', { class: 'tbl small' }, h('thead', {}, h('tr', {}, h('th', {}, t('factor')), h('th', {}, t('beta')), h('th', {}, t('beta_meaning')))),
          h('tbody', {}, Object.entries(dr.betas).map(([k, b]) => h('tr', {}, h('td', {}, t('f_' + k)), h('td', {}, fmtNum(b, 3)), h('td', { class: 'muted' }, betaMeaning(k, b)))))));
      drawDay();
      // stacked history
      const cv = h('canvas');
      hist.append(h('h2', {}, t('drv_history')), h('div', { class: 'cv-wrap tall' }, cv), h('p', { class: 'muted small' }, t('drv_history_note')));
      const colors = { dxy: '#5aa9e6', realyield: '#ef6f6c', oil: '#9b7ede', spx: '#7bd389', other: '#8a8578' };
      cjs(cv, {
        type: 'bar',
        data: { labels: days.map(d => fmtDate(d.date, { month: 'short', day: 'numeric' })), datasets: [
          ...Object.keys(days[0].contrib).map(k => ({ label: t('f_' + k), data: days.map(d => d.contrib[k]), backgroundColor: colors[k] || '#999', stack: 's' })),
          { type: 'line', label: t('drv_total'), data: days.map(d => d.total), borderColor: cssVar('--gold'), backgroundColor: cssVar('--gold'), pointRadius: 2, borderWidth: 2 },
        ] },
        options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtPct(c.raw)}` } } }, scales: { x: { stacked: true, ticks: { maxTicksLimit: 10 } }, y: { stacked: true, ticks: { callback: v => v + '%' } } } },
      });
    } else { today.append(h('div', { class: 'empty' }, t('no_data'))); }

    // fair value
    fv.append(h('h2', {}, t('fv_title')), h('p', { class: 'muted' }, t('fv_sub')));
    if (f?.models?.adaptive) {
      const A = f.models.adaptive, C = f.models.classic, n = f.now;
      const verdict = n.z > 1 ? 'fv_expensive' : n.z < -1 ? 'fv_cheap' : 'fv_fair';
      fv.append(h('div', { class: 'stats' },
        stat(t('price'), fmtMoney(n.price, 'USD')), stat(t('fair_value'), fmtMoney(n.fair, 'USD')),
        stat(t('fv_band'), `${fmtMoney(n.band_lo, 'USD')} – ${fmtMoney(n.band_hi, 'USD')}`),
        stat(t('fv_verdict'), `<span class="${verdict}">${t(verdict)}</span> (z ${fmtNum(n.z, 2)})`)));
      const el = h('div', { class: 'lwc tall' }); fv.append(el);
      const T = f.dates.map(d => Date.parse(d) / 1000);
      const ser = (arr) => arr.map((v, i) => ({ time: T[i], value: v })).filter(p => p.value != null);
      const startIdx = f.dates.findIndex(d => d >= '2006-01-01');
      const cut = a => a.slice(Math.max(0, startIdx));
      const sd = A.sd;
      lineChart(el, [
        { data: cut(ser(f.actual)), color: cssVar('--gold'), title: t('actual'), width: 2 },
        { data: cut(ser(A.fair)), color: '#5aa9e6', title: t('fv_adaptive'), width: 2 },
        { data: cut(ser(A.fair.map(v => v * Math.exp(1.5 * sd)))), color: '#5aa9e6', dash: true, width: 1 },
        { data: cut(ser(A.fair.map(v => v * Math.exp(-1.5 * sd)))), color: '#5aa9e6', dash: true, width: 1 },
        ...(C ? [{ data: cut(ser(C.fair)), color: '#ef6f6c', title: t('fv_classic'), width: 1 }] : []),
      ], { rightPriceScale: { mode: 1, borderVisible: false } });
      const ptab = (m, name) => h('div', {}, h('h3', {}, name), h('code', { class: 'small' }, m.desc),
        h('table', { class: 'tbl small' }, h('tbody', {}, Object.entries(m.params).map(([k, v]) => h('tr', {}, h('td', {}, t('p_' + k)), h('td', {}, fmtNum(v, 4)))), h('tr', {}, h('td', {}, 'R²'), h('td', {}, fmtNum(m.r2, 3))))));
      fv.append(h('div', { class: 'grid2' }, ptab(A, t('fv_adaptive')), C ? ptab(C, t('fv_classic')) : h('div')), h('p', { class: 'small' }, t('fv_explain')));
    } else fv.append(h('div', { class: 'empty' }, t('no_data')));
  });
}
function stat(label, value) { const d = h('div', { class: 'stat' }); d.innerHTML = `<div class="muted small">${label}</div><div class="big">${value}</div>`; return d; }
function betaMeaning(k, b) {
  if (k === 'realyield') return t('bm_ry', { v: fmtPct(b * 10, 2) });
  return t('bm_pct', { v: fmtNum(b, 2), f: t('f_' + k) });
}
function narrative(d) {
  const parts = Object.entries(d.contrib).filter(([k]) => k !== 'other').sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const s = parts.slice(0, 2).map(([k, v]) => t('nar_part', { f: t('f_' + k), v: fmtPct(v) })).join(t('and'));
  return t('nar', { dir: t(d.total >= 0 ? 'drv_rose' : 'drv_fell'), v: fmtPct(d.total), parts: s, o: fmtPct(d.contrib.other) });
}

// ================================================================ NEWS
export function news(root) {
  root.append(h('div', { class: 'page-head' }, h('h1', {}, t('news_title')), h('p', { class: 'muted' }, t('news_sub'))));
  const controls = h('div', { class: 'news-controls' }); const listBox = h('div'); const side = h('aside', { class: 'card' });
  root.append(h('div', { class: 'grid-news' }, h('section', { class: 'card' }, controls, listBox), side));
  getData('news.json').then(n => {
    const all = n?.items || [];
    let tag = null, langAll = false, q = '';
    const tags = ['fed', 'geopolitics', 'centralbanks', 'demand', 'dollar', 'inflation'];
    const draw = () => {
      let items = all.filter(x => langAll || x.lang === getLang());
      if (tag) items = items.filter(x => x.tags?.includes(tag));
      if (q) items = items.filter(x => x.title.toLowerCase().includes(q));
      listBox.replaceChildren(items.length ? newsList(items.slice(0, 120)) : h('div', { class: 'empty' }, t('no_news')));
      controls.replaceChildren(
        h('input', { type: 'search', placeholder: t('search'), value: q, oninput: e => { q = e.target.value.toLowerCase(); draw(); setTimeout(() => controls.querySelector('input').focus(), 0); } }),
        h('div', { class: 'chips' }, h('button', { class: 'chip' + (!tag ? ' on' : ''), onclick: () => { tag = null; draw(); } }, t('all')),
          tags.map(tg => h('button', { class: 'chip t-' + tg + (tag === tg ? ' on' : ''), onclick: () => { tag = tag === tg ? null : tg; draw(); } }, t('tag_' + tg)))),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: langAll, onchange: e => { langAll = e.target.checked; draw(); } }), ' ' + t('all_languages')));
    };
    draw();
    // sentiment by day (last 14 days)
    const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10));
    const mine = all.filter(x => x.lang === getLang());
    const pos = days.map(d => mine.filter(x => x.date.startsWith(d) && x.sent > 0).length);
    const neg = days.map(d => mine.filter(x => x.date.startsWith(d) && x.sent < 0).length);
    const neu = days.map(d => mine.filter(x => x.date.startsWith(d) && x.sent === 0).length);
    const cv = h('canvas');
    const totP = pos.reduce((a, b) => a + b, 0), totN = neg.reduce((a, b) => a + b, 0);
    side.append(h('h2', {}, t('news_sentiment')), h('div', { class: 'big ' + cls(totP - totN) }, t(totP > totN * 1.2 ? 'sent_1' : totN > totP * 1.2 ? 'sent_-1' : 'sent_0')),
      h('p', { class: 'muted small' }, t('news_sent_note')), h('div', { class: 'cv-wrap' }, cv));
    cjs(cv, { type: 'bar', data: { labels: days.map(d => fmtDate(d, { month: 'short', day: 'numeric' })), datasets: [
      { label: t('sent_1'), data: pos, backgroundColor: '#7bd389', stack: 's' }, { label: t('sent_0'), data: neu, backgroundColor: '#8a857866', stack: 's' }, { label: t('sent_-1'), data: neg, backgroundColor: '#ef6f6c', stack: 's' }] },
      options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } } });
    // topic counts
    const tc = tags.map(tg => [tg, mine.filter(x => x.tags?.includes(tg)).length]).sort((a, b) => b[1] - a[1]);
    const mx = Math.max(1, ...tc.map(x => x[1]));
    side.append(h('h3', {}, t('news_topics')), h('div', { class: 'hbars', html: tc.map(([tg, c]) => `<div class="hbar"><span>${t('tag_' + tg)}</span><div class="bar"><i class="t-${tg}" style="width:${c / mx * 100}%"></i></div><b>${c}</b></div>`).join('') }));
    if (n?.updated) side.append(h('div', { class: 'muted tiny' }, t('updated') + ' ' + fmtAgo(n.updated)));
  });
}

// ================================================================ SENTIMENT
export function sentiment(root) {
  root.append(h('div', { class: 'page-head' }, h('h1', {}, t('sent_title')), h('p', { class: 'muted' }, t('sent_sub'))));
  const a = h('section', { class: 'card' }), b = h('section', { class: 'card' }), c = h('section', { class: 'card' }), d = h('section', { class: 'card' });
  root.append(h('div', { class: 'grid2' }, a, b), h('div', { class: 'grid2' }, c, d));
  Promise.all([getData('feargreed.json'), getData('cot.json'), getData('polymarket.json'), getData('fairvalue.json')]).then(([fg, cot, pm, fv]) => {
    if (fg) {
      a.innerHTML = `<h2>${t('w_feargreed')}</h2><div class="fg big-fg">${gauge(fg.score, { size: 320 })}<div class="fg-label lbl-${fg.label}">${t('fg_' + fg.label)}</div>
      <div class="fg-ago">${['week', 'month', 'year'].map(k => `<span>${t('ago_' + k)}: <b>${fg.ago[k] == null ? '–' : Math.round(fg.ago[k])}</b></span>`).join('')}</div></div>
      <table class="tbl"><thead><tr><th>${t('component')}</th><th>${t('score')}</th><th>${t('what_it_measures')}</th></tr></thead><tbody>
      ${Object.entries(fg.components).map(([k, v]) => `<tr><td>${t('fgc_' + k)}</td><td><div class="bar inline"><i style="width:${v ?? 0}%"></i></div> <b>${v == null ? '–' : Math.round(v)}</b></td><td class="muted small">${t('fgd_' + k)}</td></tr>`).join('')}</tbody></table>
      <p class="muted small">${t('fg_method')}</p>`;
      const el = h('div', { class: 'lwc' });
      b.append(h('h2', {}, t('fg_history')), el);
      const T = fg.history.dates.map(x => Date.parse(x) / 1000);
      lineChart(el, [{ data: fg.history.values.map((v, i) => ({ time: T[i], value: v })), color: cssVar('--gold'), area: true }], { rightPriceScale: { borderVisible: false, autoScale: false } });
    }
    if (cot?.dates?.length) {
      const el = h('div', { class: 'lwc' });
      b.append(h('h2', {}, t('cot_title')), h('p', { class: 'muted small' }, t('cot_sub')), el);
      const T = cot.dates.map(x => Date.parse(x) / 1000);
      lineChart(el, [{ data: cot.net.map((v, i) => ({ time: T[i], value: v / 1000 })), color: '#5aa9e6', area: true, title: t('cot_net_k') }]);
    }
    c.append(h('h2', {}, t('w_polymarket')), h('p', { class: 'muted small' }, t('pm_sub')));
    if (pm?.events?.length) for (const e of pm.events) c.append(pmEvent(e));
    else c.append(h('div', { class: 'empty' }, t('pm_none')));
    if (pm?.updated) c.append(h('div', { class: 'muted tiny' }, t('updated') + ' ' + fmtAgo(pm.updated)));
    // crowd vs model
    d.append(h('h2', {}, t('crowd_vs_model')));
    if (fv?.now) {
      d.append(h('p', {}, t('cvm_text', { fair: fmtMoney(fv.now.fair, 'USD'), lo: fmtMoney(fv.now.band_lo, 'USD'), hi: fmtMoney(fv.now.band_hi, 'USD'), fg: fg ? Math.round(fg.score) : '–', lbl: fg ? t('fg_' + fg.label) : '' })));
    }
    d.append(h('p', { class: 'muted small' }, t('cvm_note')));
  });
}
