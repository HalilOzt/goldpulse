// Chart helpers: main interactive gold chart (Lightweight Charts), Chart.js theming, gauges
import { t, getLang } from './i18n.js';
import {
  state, setState, onState, getData, history, goldAt, fxAt, UNITS, RANGES, rangeStart, sma, stdev, rsi,
  fmtMoney, fmtNum, fmtPct, fmtDate, h, cssVar, idxOnOrBefore, cls, locale,
} from './core.js';

const LWC = window.LightweightCharts;

export const COMPARE = {
  silver: { color: '#b8c4d0' }, dxy: { color: '#5aa9e6' }, spx: { color: '#7bd389' },
  btc: { color: '#f7931a' }, oil: { color: '#9b7ede' }, realyield: { color: '#ef6f6c', level: true },
};

function themeOpts() {
  return {
    layout: { background: { type: 'solid', color: 'transparent' }, textColor: cssVar('--muted'), fontFamily: 'Inter, system-ui, sans-serif' },
    grid: { vertLines: { color: cssVar('--grid') }, horzLines: { color: cssVar('--grid') } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false },
    crosshair: { mode: 0 },
    localization: { locale: locale() },
  };
}

/** Build series data for the current state. Returns {main:[], compares:{}, intraday, idx0, idx1} */
async function buildData(range) {
  const [hist, latest, intra] = await Promise.all([history(), getData('latest.json'), getData('intraday.json')]);
  if (!hist) return null;
  const cur = state.currency, unit = state.unit;
  const intraday = (range === '1D' || range === '1W') && intra?.series?.gold?.length;
  if (intraday) {
    const fx = cur === 'USD' ? 1 : latest?.fx?.[cur] ?? 1;
    let pts = intra.series.gold.filter(p => p[1] != null);
    const lastTs = pts[pts.length - 1][0];
    const start = rangeStart(range, lastTs);
    pts = pts.filter(p => p[0] >= start);
    const main = pts.map(p => ({ time: p[0], value: p[1] * fx * UNITS[unit] }));
    // append live spot (scaled to futures basis so the line is continuous)
    if (state.live?.source === 'live' && latest?.basis) {
      const now = Math.floor(Date.now() / 1000);
      if (now > lastTs + 60) main.push({ time: now, value: state.live.price * latest.basis * fx * UNITS[unit] });
    }
    return { hist, latest, main, compares: {}, intraday: true };
  }
  const n = hist.dates.length;
  const start = rangeStart(range, hist.times[n - 1]);
  let i0 = 0; while (i0 < n && hist.times[i0] < start) i0++;
  const full = hist.dates.map((_, i) => goldAt(hist, i, cur, unit, latest));
  const main = [];
  for (let i = i0; i < n; i++) if (full[i] != null) main.push({ time: hist.times[i], value: full[i], i });
  return { hist, latest, main, full, i0, compares: {}, intraday: false };
}

function rebased(arr, i0, times) {
  let base = null; const out = [];
  for (let i = i0; i < arr.length; i++) {
    const v = arr[i]; if (v == null) continue;
    if (base == null) base = v;
    out.push({ time: times[i], value: v / base * 100 });
  }
  return out;
}

/**
 * Main interactive chart widget.
 * opts: { compact: bool, onDayClick: fn }
 */
export function mainChart(root, opts = {}) {
  root.classList.add('mainchart');
  const toolbar = h('div', { class: 'chart-toolbar' });
  const chartEl = h('div', { class: 'chart-canvas' });
  const rsiEl = h('div', { class: 'chart-rsi' });
  const legend = h('div', { class: 'chart-legend' });
  const detail = h('div', { class: 'day-detail hidden' });
  const wrap = h('div', { class: 'chart-wrap' }, chartEl, legend);
  root.append(toolbar, wrap, rsiEl, detail);

  let chart = null, rsiChart = null, disposed = false, lastData = null;

  function renderToolbar() {
    toolbar.innerHTML = '';
    const rg = h('div', { class: 'seg' });
    for (const r of RANGES) rg.append(h('button', { class: state.range === r ? 'on' : '', onclick: () => setState({ range: r }) }, t('r_' + r)));
    toolbar.append(rg);
    if (!opts.compact) {
      const cmp = h('div', { class: 'chips' }, h('span', { class: 'chips-label' }, t('compare') + ':'));
      for (const k of Object.keys(COMPARE)) {
        const on = state.compare.includes(k);
        cmp.append(h('button', {
          class: 'chip' + (on ? ' on' : ''), style: on ? `border-color:${COMPARE[k].color};color:${COMPARE[k].color}` : '',
          onclick: () => setState({ compare: on ? state.compare.filter(x => x !== k) : [...state.compare, k] }),
        }, t('s_' + k)));
      }
      toolbar.append(cmp);
      const ind = h('div', { class: 'chips' }, h('span', { class: 'chips-label' }, t('indicators') + ':'));
      for (const k of ['sma50', 'sma200', 'bb', 'rsi', 'news', 'log']) {
        const on = state.indicators.includes(k);
        ind.append(h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => setState({ indicators: on ? state.indicators.filter(x => x !== k) : [...state.indicators, k] }) }, t('i_' + k)));
      }
      toolbar.append(ind);
    }
  }

  async function render() {
    renderToolbar();
    const d = await buildData(state.range);
    if (disposed || !d) { if (!d) chartEl.innerHTML = `<div class="empty">${t('no_data')}</div>`; return; }
    lastData = d;
    if (chart) { chart.remove(); chart = null; }
    if (rsiChart) { rsiChart.remove(); rsiChart = null; }
    const ind = new Set(opts.compact ? [] : state.indicators);
    const comparing = !d.intraday && !opts.compact && state.compare.length > 0;
    chart = LWC.createChart(chartEl, {
      ...themeOpts(), autoSize: true,
      rightPriceScale: { borderVisible: false, mode: ind.has('log') && !comparing ? 1 : 0 },
      timeScale: { borderVisible: false, timeVisible: d.intraday, secondsVisible: false },
    });
    const gold = cssVar('--gold');
    let mainSeries;
    if (comparing) {
      mainSeries = chart.addLineSeries({ color: gold, lineWidth: 2, priceFormat: { type: 'price', precision: 1, minMove: 0.1 } });
      mainSeries.setData(rebased(d.full, d.i0, d.hist.times));
      for (const k of state.compare) {
        const s = d.hist.series[k]; if (!s) continue;
        const ser = chart.addLineSeries({ color: COMPARE[k].color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
        if (COMPARE[k].level) {
          // real yield is a level (can be negative): show raw on its own scale
          ser.applyOptions({ priceScaleId: 'left' });
          chart.applyOptions({ leftPriceScale: { visible: true, borderVisible: false } });
          const pts = []; for (let i = d.i0; i < s.length; i++) if (s[i] != null) pts.push({ time: d.hist.times[i], value: s[i] });
          ser.setData(pts);
        } else ser.setData(rebased(s, d.i0, d.hist.times));
      }
    } else {
      mainSeries = chart.addAreaSeries({ lineColor: gold, topColor: gold + '55', bottomColor: gold + '05', lineWidth: 2 });
      mainSeries.setData(d.main.map(p => ({ time: p.time, value: p.value })));
      if (!d.intraday) {
        const sl = arr => { const o = []; for (let i = d.i0; i < arr.length; i++) if (arr[i] != null) o.push({ time: d.hist.times[i], value: arr[i] }); return o; };
        if (ind.has('sma50')) chart.addLineSeries({ color: '#5aa9e6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(sl(sma(d.full, 50)));
        if (ind.has('sma200')) chart.addLineSeries({ color: '#ef6f6c', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(sl(sma(d.full, 200)));
        if (ind.has('bb')) {
          const m = sma(d.full, 20), s = stdev(d.full, 20);
          const up = m.map((v, i) => v == null || s[i] == null ? null : v + 2 * s[i]);
          const lo = m.map((v, i) => v == null || s[i] == null ? null : v - 2 * s[i]);
          for (const arr of [up, lo]) chart.addLineSeries({ color: '#9b7ede', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }).setData(sl(arr));
        }
      }
    }
    // news / event markers
    if (!d.intraday && !opts.compact && ind.has('news')) {
      const markers = await buildMarkers(d);
      try { mainSeries.setMarkers(markers); } catch (e) { console.warn(e); }
    }
    chart.timeScale().fitContent();

    // RSI pane
    rsiEl.classList.toggle('hidden', !(ind.has('rsi') && !d.intraday));
    if (ind.has('rsi') && !d.intraday) {
      rsiChart = LWC.createChart(rsiEl, { ...themeOpts(), autoSize: true, timeScale: { visible: false }, rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } } });
      const r = rsi(d.full, 14); const pts = []; for (let i = d.i0; i < r.length; i++) if (r[i] != null) pts.push({ time: d.hist.times[i], value: r[i] });
      const rs = rsiChart.addLineSeries({ color: cssVar('--gold'), lineWidth: 1, priceLineVisible: false });
      rs.setData(pts);
      rs.createPriceLine({ price: 70, color: '#ef6f6c', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      rs.createPriceLine({ price: 30, color: '#7bd389', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      rsiChart.timeScale().fitContent();
      chart.timeScale().subscribeVisibleLogicalRangeChange(lr => { if (lr && rsiChart) rsiChart.timeScale().setVisibleLogicalRange(lr); });
    }

    // legend + crosshair
    const first = d.main[0]?.value, last = d.main[d.main.length - 1]?.value;
    const setLegend = (val, time) => {
      const chg = first ? (val / first - 1) * 100 : null;
      legend.innerHTML = `<b>${comparing ? fmtNum(val, 1) : fmtMoney(val)}</b> <span class="${cls(chg)}">${comparing ? '' : fmtPct(chg)}</span> <span class="muted">${time ? fmtDate(time, d.intraday ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : undefined) : t('r_' + state.range)}</span>`;
    };
    if (!comparing && last != null) setLegend(last);
    else legend.innerHTML = `<span class="muted">${t('rebased_note')}</span>`;
    chart.subscribeCrosshairMove(p => {
      if (!p.time || !p.seriesData) { if (!comparing && last != null) setLegend(last); return; }
      const v = p.seriesData.get(mainSeries); if (v && !comparing) setLegend(v.value, p.time);
    });
    chart.subscribeClick(p => { if (p.time && !d.intraday) showDay(p.time); });
  }

  async function buildMarkers(d) {
    const [events, news] = await Promise.all([getData('static/events.json'), getData('news.json')]);
    const lang = getLang();
    const startTime = d.main[0]?.time ?? 0;
    const byTime = new Map();
    const add = (dateStr, text, kind) => {
      const i = idxOnOrBefore(d.hist, dateStr); const time = d.hist.times[i];
      if (time < startTime || byTime.has(time)) return;
      byTime.set(time, { time, position: 'aboveBar', color: kind === 'event' ? cssVar('--gold') : '#5aa9e6', shape: kind === 'event' ? 'arrowDown' : 'circle', text: text.length > 28 ? text.slice(0, 26) + '…' : text });
    };
    for (const e of events || []) add(e.d, e[lang] || e.en, 'event');
    const items = (news?.items || []).filter(x => x.major && (x.lang === lang));
    for (const x of items.slice(0, 40)) add(x.date.slice(0, 10), x.title, 'news');
    let arr = [...byTime.values()].sort((a, b) => a.time - b.time);
    // keep markers readable: thin out if too dense
    const span = (d.main[d.main.length - 1]?.time ?? 0) - startTime;
    const minGap = span / 25;
    const thin = []; for (const m of arr) if (!thin.length || m.time - thin[thin.length - 1].time > minGap) thin.push(m);
    return thin;
  }

  async function showDay(time) {
    const d = lastData; if (!d) return;
    const hist = d.hist; const dateStr = new Date(time * 1000).toISOString().slice(0, 10);
    const i = idxOnOrBefore(hist, dateStr);
    const v = goldAt(hist, i, state.currency, state.unit, d.latest), pv = i > 0 ? goldAt(hist, i - 1, state.currency, state.unit, d.latest) : null;
    const [events, news, fg, drv] = await Promise.all([getData('static/events.json'), getData('news.json'), getData('feargreed.json'), getData('drivers.json')]);
    const lang = getLang();
    const near = s => Math.abs(Date.parse(s.slice(0, 10)) - time * 1000) <= 2 * 86400000;
    const ev = (events || []).filter(e => near(e.d)).map(e => e[lang] || e.en);
    const nw = (news?.items || []).filter(x => near(x.date) && x.lang === lang).slice(0, 5);
    const fi = fg?.history?.dates?.indexOf(hist.dates[i]);
    const dr = drv?.days?.find(x => x.date === hist.dates[i]);
    detail.classList.remove('hidden');
    detail.innerHTML = '';
    detail.append(...[
      h('div', { class: 'dd-head' }, h('b', {}, fmtDate(time, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })),
        h('button', { class: 'icon-btn', onclick: () => detail.classList.add('hidden'), title: t('close') }, '✕')),
      h('div', { class: 'dd-grid' },
        h('div', {}, h('div', { class: 'muted small' }, t('close_price')), h('div', { class: 'big' }, fmtMoney(v))),
        h('div', {}, h('div', { class: 'muted small' }, t('day_change')), h('div', { class: 'big ' + cls(v - pv) }, pv ? fmtPct((v / pv - 1) * 100) : '–')),
        fi != null && fi >= 0 ? h('div', {}, h('div', { class: 'muted small' }, t('fear_greed')), h('div', { class: 'big' }, fmtNum(fg.history.values[fi], 0))) : null,
      ),
      dr ? h('div', { class: 'dd-drivers' }, t('drivers_short') + ': ', ...Object.entries(dr.contrib).map(([k, c]) => h('span', { class: 'pill ' + cls(c) }, `${t('f_' + k)} ${fmtPct(c, 2)}`))) : null,
      ev.length ? h('ul', { class: 'dd-list' }, ev.map(e => h('li', { class: 'ev' }, '★ ' + e))) : null,
      nw.length ? h('ul', { class: 'dd-list' }, nw.map(x => h('li', {}, h('a', { href: x.link, target: '_blank', rel: 'noopener' }, x.title), h('span', { class: 'muted small' }, ' · ' + x.source)))) : null,
      !ev.length && !nw.length ? h('div', { class: 'muted small' }, t('no_news_day')) : null,
    ].filter(Boolean));
  }

  render();
  const off = onState(p => { if (['range', 'currency', 'unit', 'compare', 'indicators', 'theme', 'lang'].some(k => k in p)) render(); });
  let liveDebounce = 0;
  const offLive = onState(p => {
    if ('live' in p && (state.range === '1D' || state.range === '1W') && Date.now() - liveDebounce > 60000) { liveDebounce = Date.now(); render(); }
  });
  return { destroy() { disposed = true; off(); offLive(); chart?.remove(); rsiChart?.remove(); } };
}

// ---------------------------------------------------------------- Chart.js
const charts = new Set();
export function cjs(canvas, config) {
  const C = window.Chart;
  C.defaults.color = cssVar('--muted');
  C.defaults.borderColor = cssVar('--grid');
  C.defaults.font.family = 'Inter, system-ui, sans-serif';
  C.defaults.maintainAspectRatio = false;
  C.defaults.animation = { duration: 300 };
  const c = new C(canvas, config);
  charts.add(c);
  return c;
}
export function destroyCharts(root) {
  for (const c of [...charts]) if (!document.body.contains(c.canvas) || (root && root.contains(c.canvas))) { c.destroy(); charts.delete(c); }
}

/** Simple LWC line chart for {time,value} arrays; series: [{data,color,title,area,scale}] */
export function lineChart(el, series, extra = {}) {
  const c = LWC.createChart(el, { ...themeOpts(), autoSize: true, ...extra });
  for (const s of series) {
    const ser = s.area
      ? c.addAreaSeries({ lineColor: s.color, topColor: s.color + '44', bottomColor: s.color + '05', lineWidth: 2, title: s.title || '', priceScaleId: s.scale || 'right' })
      : c.addLineSeries({ color: s.color, lineWidth: s.width || 2, lineStyle: s.dash ? 2 : 0, title: s.title || '', priceLineVisible: false, priceScaleId: s.scale || 'right' });
    ser.setData(s.data);
    if (s.markers) ser.setMarkers(s.markers);
    s.ref = ser;
  }
  if (series.some(s => s.scale === 'left')) c.applyOptions({ leftPriceScale: { visible: true, borderVisible: false } });
  c.timeScale().fitContent();
  return c;
}

// ---------------------------------------------------------------- Gauge (SVG)
export function gauge(value, { min = 0, max = 100, zones, label = '', size = 220 } = {}) {
  zones = zones || [[0, 20, '#d9534f'], [20, 40, '#f0a04b'], [40, 60, '#c9c3b6'], [60, 80, '#9ccc65'], [80, 100, '#43a047']];
  const cx = 100, cy = 100, r = 80;
  const ang = v => Math.PI * (1 - (v - min) / (max - min));
  const pt = (a, rr) => [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  let arcs = '';
  for (const [a, b, col] of zones) {
    const [x1, y1] = pt(ang(a), r), [x2, y2] = pt(ang(b), r);
    arcs += `<path d="M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}" stroke="${col}" stroke-width="18" fill="none"/>`;
  }
  const v = Math.max(min, Math.min(max, value ?? min));
  const [nx, ny] = pt(ang(v), r - 22);
  return `<svg viewBox="0 0 200 125" width="100%" style="max-width:${size}px" class="gauge" role="img" aria-label="${label} ${value}">
    ${arcs}
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="var(--text)"/>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)">${value == null ? '–' : Math.round(value)}</text>
  </svg>`;
}

export function sparkline(values, { w = 120, h: hh = 32, color = 'var(--gold)' } = {}) {
  const v = values.filter(x => x != null); if (v.length < 2) return '';
  const mn = Math.min(...v), mx = Math.max(...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1) * w).toFixed(1)},${(hh - (x - mn) / (mx - mn || 1) * (hh - 4) - 2).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" class="spark"><polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts}"/></svg>`;
}
