// GoldPulse core: state, data loading, formatting, live price
import { t, getLang } from './i18n.js';

export const OZ_G = 31.1034768;
export const UNITS = { oz: 1, g: 1 / OZ_G, kg: 1000 / OZ_G };
export const CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP', 'CHF', 'JPY', 'INR', 'CNY', 'AUD'];

// ------------------------------------------------------------ persistent state
function load(key, def) {
  try { const v = localStorage.getItem('gp_' + key); return v === null ? def : JSON.parse(v); } catch { return def; }
}
function save(key, v) { try { localStorage.setItem('gp_' + key, JSON.stringify(v)); } catch { /* ignore */ } }

export const state = {
  currency: load('currency', 'USD'),
  unit: load('unit', 'oz'),
  theme: load('theme', 'dark'),
  range: load('range', '1Y'),
  compare: load('compare', []),
  indicators: load('indicators', ['sma50']),
  chartMode: load('chartMode', 'price'),
  live: null, // {price, ts, source}
};

const listeners = new Set();
export function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setState(patch) {
  Object.assign(state, patch);
  for (const k of Object.keys(patch)) if (k !== 'live') save(k, state[k]);
  for (const fn of [...listeners]) { try { fn(patch); } catch (e) { console.error(e); } }
}
export { load as loadPref, save as savePref };

// ------------------------------------------------------------ data
const cache = {};
const BASE = new URL('../../', import.meta.url).href;
export function getData(name) {
  if (!cache[name]) {
    const url = (name.startsWith('static/') ? BASE + 'assets/' + name : BASE + 'data/' + name) + '?v=' + Math.floor(Date.now() / 300000);
    cache[name] = fetch(url).then(r => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); })
      .catch(e => { console.warn('data load failed', name, e); delete cache[name]; return null; });
  }
  return cache[name];
}

// History helpers -------------------------------------------------------------
let _hist = null;
export async function history() {
  if (_hist) return _hist;
  const h = await getData('history.json');
  if (!h) return null;
  h.times = h.dates.map(d => Date.parse(d + 'T00:00:00Z') / 1000);
  h.index = new Map(h.dates.map((d, i) => [d, i]));
  _hist = h;
  return h;
}

/** USD -> currency rate at history index i (falls back to latest). */
export function fxAt(h, cur, i, latest) {
  if (cur === 'USD') return 1;
  const s = h.series['fx_' + cur];
  let v = s ? s[i] : null;
  if (v == null && s) { for (let j = i; j >= 0 && v == null; j--) v = s[j]; }
  if (v == null && latest) v = latest.fx?.[cur];
  return v;
}

/** gold price in chosen currency/unit at history index */
export function goldAt(h, i, cur = state.currency, unit = state.unit, latest = null) {
  const g = h.series.gold[i];
  if (g == null) return null;
  const fx = fxAt(h, cur, i, latest);
  if (fx == null) return null;
  return g * fx * UNITS[unit];
}

export function rangeStart(range, lastTime) {
  const d = new Date(lastTime * 1000);
  const day = 86400;
  switch (range) {
    case '1D': return lastTime - 1.2 * day;
    case '1W': return lastTime - 7 * day;
    case '1M': return lastTime - 31 * day;
    case '3M': return lastTime - 92 * day;
    case '6M': return lastTime - 183 * day;
    case 'YTD': return Date.UTC(d.getUTCFullYear(), 0, 1) / 1000;
    case '1Y': return lastTime - 365 * day;
    case '5Y': return lastTime - 5 * 365.25 * day;
    case '10Y': return lastTime - 10 * 365.25 * day;
    case '20Y': return lastTime - 20 * 365.25 * day;
    default: return 0;
  }
}
export const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', '10Y', 'MAX'];

// ------------------------------------------------------------ formatting
export function locale() { return getLang() === 'tr' ? 'tr-TR' : 'en-US'; }
export function fmtMoney(v, cur = state.currency, digits) {
  if (v == null || !isFinite(v)) return '–';
  const d = digits ?? (Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 10 ? 2 : 3);
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: cur, minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d }).format(v);
  } catch { return v.toFixed(d) + ' ' + cur; }
}
export function fmtNum(v, d = 2) {
  if (v == null || !isFinite(v)) return '–';
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
}
export function fmtPct(v, d = 2, sign = true) {
  if (v == null || !isFinite(v)) return '–';
  const s = new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  return (sign && v > 0 ? '+' : '') + s + '%';
}
export function fmtCompact(v) {
  if (v == null || !isFinite(v)) return '–';
  return new Intl.NumberFormat(locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}
export function fmtDate(d, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const dt = typeof d === 'number' ? new Date(d * 1000) : new Date(d);
  return new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...opts }).format(dt);
}
export function fmtAgo(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  if (s < 60) return rtf.format(-Math.round(s), 'second');
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
}
export const unitLabel = (u = state.unit) => t('unit_' + u);
export const cls = v => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');

// ------------------------------------------------------------ DOM helpers
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

// ------------------------------------------------------------ math helpers
export function sma(arr, n) {
  const out = new Array(arr.length).fill(null); let s = 0, c = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]; if (v != null) { s += v; c++; }
    if (i >= n) { const o = arr[i - n]; if (o != null) { s -= o; c--; } }
    if (i >= n - 1 && c === n) out[i] = s / n;
  }
  return out;
}
export function stdev(arr, n) {
  const out = new Array(arr.length).fill(null);
  for (let i = n - 1; i < arr.length; i++) {
    const w = arr.slice(i - n + 1, i + 1); if (w.some(v => v == null)) continue;
    const m = w.reduce((a, b) => a + b, 0) / n; out[i] = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / n);
  }
  return out;
}
export function rsi(arr, n = 14) {
  const out = new Array(arr.length).fill(null); let up = 0, dn = 0;
  for (let i = 1; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1]; const u = Math.max(d, 0), w = Math.max(-d, 0);
    if (i <= n) { up += u / n; dn += w / n; if (i === n) out[i] = 100 - 100 / (1 + up / (dn || 1e-9)); continue; }
    up = (up * (n - 1) + u) / n; dn = (dn * (n - 1) + w) / n; out[i] = 100 - 100 / (1 + up / (dn || 1e-9));
  }
  return out;
}
export function percentile(arr, v) {
  const a = arr.filter(x => x != null); if (!a.length) return null;
  return a.filter(x => x < v).length / a.length * 100;
}
/** nearest history index on or before date string */
export function idxOnOrBefore(h, dateStr) {
  const ts = Date.parse(dateStr + 'T00:00:00Z') / 1000;
  let lo = 0, hi = h.times.length - 1, ans = 0;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (h.times[mid] <= ts) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}

// ------------------------------------------------------------ live price
// Spot price from gold-api.com (free, keyless). Falls back to the latest pipeline snapshot.
let liveTimer = null;
export async function startLive() {
  const latest = await getData('latest.json');
  const apply = (spot, source) => {
    const ref = latest?.spot_prev_close ?? latest?.prev_close;
    setState({ live: { price: spot, ts: Date.now(), source, prevClose: ref, change: spot - ref, changePct: (spot / ref - 1) * 100 } });
  };
  if (latest) apply(latest.spot ?? latest.gold, 'snapshot');
  const tick = async () => {
    try {
      const r = await fetch('https://api.gold-api.com/price/XAU', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (j && j.price) apply(+j.price, 'live');
    } catch (e) { /* keep snapshot */ }
  };
  tick();
  clearInterval(liveTimer);
  liveTimer = setInterval(() => { if (!document.hidden) tick(); }, 20000);
}
/** live spot converted to chosen currency/unit */
export function livePrice(latest, cur = state.currency, unit = state.unit) {
  const usd = state.live?.price ?? latest?.spot ?? latest?.gold;
  const fx = cur === 'USD' ? 1 : latest?.fx?.[cur];
  if (usd == null || fx == null) return null;
  return usd * fx * UNITS[unit];
}
