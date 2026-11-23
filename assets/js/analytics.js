// Client-side analytics shared by widgets and pages
import { OZ_G, idxOnOrBefore, percentile } from './core.js';

/** month-end samples of a daily history series: [{date:'YYYY-MM', i}] */
export function monthEnds(hist) {
  const out = [];
  for (let i = 0; i < hist.dates.length; i++) {
    const m = hist.dates[i].slice(0, 7);
    if (i === hist.dates.length - 1 || hist.dates[i + 1].slice(0, 7) !== m) out.push({ ym: m, i });
  }
  return out;
}

function goldUSDAtDate(hist, dateStr) {
  const i = idxOnOrBefore(hist, dateStr);
  return hist.series.gold[i];
}

/** "The world priced in gold" items. */
export function pricedInGold(hist, macro) {
  const items = [];
  const me = monthEnds(hist);
  const fromHist = (key, unit, label) => {
    const s = hist.series[key]; if (!s) return;
    const series = [];
    for (const { ym, i } of me) {
      const g = hist.series.gold[i];
      if (s[i] != null && g) series.push({ date: ym + '-01', value: unit === 'g' ? s[i] / (g / OZ_G) : s[i] / g });
    }
    if (series.length) items.push({ key, unit, series });
  };
  const fromMacro = (key, unit, mult = 1) => {
    const m = macro?.[key]; if (!m) return;
    const series = [];
    m.dates.forEach((d, k) => {
      const v = m.values[k]; const g = goldUSDAtDate(hist, d.slice(0, 10));
      if (v != null && g && Date.parse(d) >= Date.parse(hist.dates[0])) series.push({ date: d.slice(0, 10), value: (v * mult) / (unit === 'g' ? g / OZ_G : g) });
    });
    if (series.length) items.push({ key, unit, series });
  };
  fromMacro('bigmac', 'g');
  fromHist('oil', 'g');
  fromMacro('wage', 'oz', 52 / 12);
  fromMacro('house', 'oz');
  fromHist('spx', 'oz');
  fromHist('dji', 'oz');
  fromHist('btc', 'oz');
  for (const it of items) {
    const s = it.series;
    it.now = s[s.length - 1].value;
    it.at = y => { const x = s.find(p => p.date.startsWith(String(y))); return x ? x.value : null; };
  }
  return items;
}

/** Cross-asset ratios with history percentile */
export function ratios(hist) {
  const g = hist.series.gold;
  const defs = [
    { key: 'gold_silver', a: g, b: hist.series.silver },
    { key: 'gold_oil', a: g, b: hist.series.oil },
    { key: 'spx_gold', a: hist.series.spx, b: g },
    { key: 'dow_gold', a: hist.series.dji, b: g },
    { key: 'btc_gold', a: hist.series.btc, b: g },
  ];
  const out = [];
  for (const d of defs) {
    if (!d.a || !d.b) continue;
    const r = d.a.map((v, i) => (v != null && d.b[i] ? v / d.b[i] : null));
    let last = r.length - 1; while (last >= 0 && r[last] == null) last--;
    if (last < 0) continue;
    const yago = r[Math.max(0, last - 252)];
    const valid = r.filter(x => x != null);
    out.push({ key: d.key, now: r[last], yearAgo: yago, pct: percentile(valid, r[last]), min: Math.min(...valid), max: Math.max(...valid), series: r });
  }
  return out;
}

/** Seasonality: monthly returns matrix {years:[], data:{year:{m:ret}}, avg[12], pos[12]} */
export function seasonality(hist, years = 20, cur = 'USD') {
  const me = monthEnds(hist);
  const val = i => { const g = hist.series.gold[i]; if (cur === 'USD') return g; const fx = hist.series['fx_' + cur]?.[i]; return g && fx ? g * fx : null; };
  const data = {};
  for (let k = 1; k < me.length; k++) {
    const a = val(me[k - 1].i), b = val(me[k].i);
    if (a == null || b == null) continue;
    const [y, m] = me[k].ym.split('-').map(Number);
    (data[y] = data[y] || {})[m] = (b / a - 1) * 100;
  }
  let ys = Object.keys(data).map(Number).sort((a, b) => a - b);
  const thisYear = new Date().getUTCFullYear();
  ys = ys.filter(y => y >= thisYear - years);
  const avg = [], pos = [], med = [];
  for (let m = 1; m <= 12; m++) {
    const v = ys.map(y => data[y]?.[m]).filter(x => x != null && !(ys[ys.length - 1] === thisYear && false));
    avg.push(v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
    pos.push(v.length ? v.filter(x => x > 0).length / v.length * 100 : null);
    const s = [...v].sort((a, b) => a - b); med.push(s.length ? s[Math.floor(s.length / 2)] : null);
  }
  // weekday effect (daily returns)
  const wd = [[], [], [], [], []];
  const g = hist.series.gold; const start = Date.UTC(thisYear - years, 0, 1) / 1000;
  for (let i = 1; i < g.length; i++) {
    if (hist.times[i] < start || g[i] == null || g[i - 1] == null) continue;
    const day = new Date(hist.times[i] * 1000).getUTCDay();
    if (day >= 1 && day <= 5) wd[day - 1].push((g[i] / g[i - 1] - 1) * 100);
  }
  const weekday = wd.map(a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null));
  return { years: ys, data, avg, pos, med, weekday };
}

/** Daily-return series helper for backtests: value of currency amount at index */
export function valueIn(hist, key, i, cur) {
  const v = hist.series[key]?.[i]; if (v == null) return null;
  if (cur === 'USD') return v;
  const fx = hist.series['fx_' + cur]?.[i]; return fx ? v * fx : null;
}

/** Monthly CPI lookup returning ratio cpi(to)/cpi(from) */
export function cpiRatio(macro, key, fromDate, toDate) {
  const m = macro?.[key]; if (!m || !m.dates.length) return null;
  const find = d => { let v = null; for (let k = 0; k < m.dates.length; k++) { if (m.dates[k] <= d) v = m.values[k]; else break; } return v; };
  const a = find(fromDate), b = find(toDate) ?? m.values[m.values.length - 1];
  return a && b ? b / a : null;
}

/** Compound T-bill (annualised %, daily series) between indices */
export function tbillGrowth(hist, i0, i1) {
  const s = hist.series.tbill; if (!s) return null;
  let f = 1, last = s[i0] ?? 2;
  for (let i = i0 + 1; i <= i1; i++) {
    const r = s[i] ?? last; last = r;
    const days = (hist.times[i] - hist.times[i - 1]) / 86400;
    f *= 1 + (r / 100) * days / 365;
  }
  return f;
}
