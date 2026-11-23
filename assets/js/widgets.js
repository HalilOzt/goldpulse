// Dashboard widgets. Each widget: { id, title, w, h, minW, minH, render(body) -> cleanup? }
import { t, getLang } from './i18n.js';
import {
  state, setState, onState, getData, history, livePrice, fmtMoney, fmtNum, fmtPct, fmtAgo, fmtDate, fmtCompact,
  h, esc, cls, unitLabel, UNITS, OZ_G, CURRENCIES, cssVar,
} from './core.js';
import { mainChart, cjs, gauge, sparkline } from './charts.js';
import { pricedInGold, ratios, seasonality } from './analytics.js';

export const KARATS = { 24: 0.999, 22: 0.916, 21: 0.875, 18: 0.75, 14: 0.585, 10: 0.417, 9: 0.375 };
export const ABOVE_GROUND_T = 224200; // WGC, end-Q3 2026
export const GOLD_DENSITY = 19320; // kg/m3

const loading = () => h('div', { class: 'loading' }, t('loading'));
const nodata = () => h('div', { class: 'empty' }, t('no_data'));
const more = (href) => h('a', { class: 'more', href }, t('more') + ' →');

export const WIDGETS = [
  // ------------------------------------------------------------ price board
  {
    id: 'price', title: 'w_price', w: 4, h: 5, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      let latest = null, hist = null;
      const draw = () => {
        if (!latest) { body.replaceChildren(nodata()); return; }
        const p = livePrice(latest);
        const lv = state.live;
        const chgPct = lv?.changePct ?? latest.change_pct;
        const fx = state.currency === 'USD' ? 1 : latest.fx?.[state.currency] ?? 1;
        const chgAbs = (lv?.change ?? latest.change) * fx * UNITS[state.unit];
        const hi = latest.high_52w * fx * UNITS[state.unit], lo = latest.low_52w * fx * UNITS[state.unit];
        const pos = Math.max(0, Math.min(100, ((p - lo) / (hi - lo)) * 100));
        const gsr = latest.silver ? (lv?.price ?? latest.gold) / latest.silver : null;
        const others = ['USD', 'EUR', 'TRY', 'GBP'].filter(c => c !== state.currency).slice(0, 3);
        body.innerHTML = `
          <div class="pb-top"><span class="badge ${lv?.source === 'live' ? 'live' : 'delayed'}">${lv?.source === 'live' ? '● ' + t('live') : t('delayed')}</span>
            <span class="muted small">XAU/${state.currency} · ${unitLabel()}</span></div>
          <div class="pb-price">${fmtMoney(p)}</div>
          <div class="pb-chg ${cls(chgPct)}">${chgAbs > 0 ? '+' : ''}${fmtMoney(chgAbs)} (${fmtPct(chgPct)}) <span class="muted small">${t('today')}</span></div>
          <div class="pb-range"><div class="muted small">${t('range_52w')}</div>
            <div class="rangebar"><div class="rangefill" style="left:${pos}%"></div></div>
            <div class="row-between small"><span>${fmtMoney(lo)}</span><span>${fmtMoney(hi)}</span></div></div>
          <div class="pb-stats">
            <div><span class="muted small">${t('ath')}</span><b>${fmtMoney(latest.ath * fx * UNITS[state.unit])}</b><span class="muted small">${fmtDate(latest.ath_date)}</span></div>
            <div><span class="muted small">${t('gold_silver_ratio')}</span><b>${fmtNum(gsr, 1)}</b></div>
            ${others.map(c => `<div><span class="muted small">${c}</span><b>${fmtMoney(livePrice(latest, c), c)}</b></div>`).join('')}
          </div>
          <div class="muted tiny">${t('updated')} ${lv?.ts ? fmtAgo(new Date(lv.ts).toISOString()) : fmtAgo(latest.updated)} · ${t('spot_src')}</div>`;
      };
      Promise.all([getData('latest.json'), history()]).then(([l, hh]) => { latest = l; hist = hh; draw(); });
      const off = onState(p => { if ('live' in p) draw(); });
      return off;
    },
  },
  // ------------------------------------------------------------ main chart
  { id: 'chart', title: 'w_chart', w: 8, h: 9, minW: 4, minH: 6, render(body) { const c = mainChart(body); return () => c.destroy(); } },
  // ------------------------------------------------------------ TradingView live chart
  {
    id: 'tvchart', title: 'w_tvchart', w: 6, h: 7, minW: 4, minH: 5, hidden: true,
    render(body) {
      const box = h('div', { class: 'tradingview-widget-container', style: 'height:100%;width:100%' }, h('div', { class: 'tradingview-widget-container__widget', style: 'height:100%;width:100%' }));
      const s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'; s.async = true;
      s.innerHTML = JSON.stringify({ autosize: true, symbol: 'OANDA:XAUUSD', interval: '15', timezone: 'Etc/UTC', theme: state.theme === 'light' ? 'light' : 'dark', style: '1', locale: getLang() === 'tr' ? 'tr' : 'en', allow_symbol_change: true, hide_side_toolbar: true, support_host: 'https://www.tradingview.com', backgroundColor: 'rgba(0,0,0,0)' });
      box.append(s); body.append(box);
    },
  },
  // ------------------------------------------------------------ fear & greed
  {
    id: 'feargreed', title: 'w_feargreed', w: 4, h: 6, minW: 3, minH: 5,
    render(body) {
      body.append(loading());
      getData('feargreed.json').then(fg => {
        if (!fg) return body.replaceChildren(nodata());
        body.innerHTML = `<div class="fg">${gauge(fg.score)}<div class="fg-label lbl-${fg.label}">${t('fg_' + fg.label)}</div>
          <div class="fg-ago small">${['week', 'month', 'year'].map(k => `<span>${t('ago_' + k)}: <b>${fg.ago[k] == null ? '–' : Math.round(fg.ago[k])}</b></span>`).join('')}</div>
          <div class="fg-comps">${Object.entries(fg.components).map(([k, v]) => `<div class="fg-comp"><span>${t('fgc_' + k)}</span><div class="bar"><i style="width:${v ?? 0}%"></i></div><b>${v == null ? '–' : Math.round(v)}</b></div>`).join('')}</div></div>`;
        body.append(more('#/sentiment'));
      });
    },
  },
  // ------------------------------------------------------------ why did gold move
  {
    id: 'drivers', title: 'w_drivers', w: 4, h: 6, minW: 3, minH: 5,
    render(body) {
      body.append(loading());
      getData('drivers.json').then(dr => {
        const d = dr?.days?.[dr.days.length - 1];
        if (!d) return body.replaceChildren(nodata());
        body.replaceChildren(driverBars(d, true), more('#/drivers'));
      });
    },
  },
  // ------------------------------------------------------------ news
  {
    id: 'news', title: 'w_news', w: 4, h: 8, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      getData('news.json').then(n => {
        const items = (n?.items || []).filter(x => x.lang === getLang()).slice(0, 15);
        if (!items.length) return body.replaceChildren(nodata());
        body.replaceChildren(newsList(items, true), more('#/news'));
      });
    },
  },
  // ------------------------------------------------------------ ratios
  {
    id: 'ratios', title: 'w_ratios', w: 4, h: 5, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      history().then(hist => {
        if (!hist) return body.replaceChildren(nodata());
        const rs = ratios(hist);
        body.innerHTML = `<table class="tbl"><thead><tr><th>${t('ratio')}</th><th>${t('now')}</th><th>${t('ago_year')}</th><th title="${t('pct_hist_tip')}">${t('pct_hist')}</th><th></th></tr></thead><tbody>
          ${rs.map(r => `<tr><td>${t('ratio_' + r.key)}</td><td><b>${fmtNum(r.now, r.now < 10 ? 2 : 1)}</b></td><td>${fmtNum(r.yearAgo, r.yearAgo < 10 ? 2 : 1)}</td><td>${fmtNum(r.pct, 0)}%</td><td>${sparkline(r.series.slice(-252), { w: 70, h: 22 })}</td></tr>`).join('')}
          </tbody></table>`;
      });
    },
  },
  // ------------------------------------------------------------ world priced in gold
  {
    id: 'pricedin', title: 'w_pricedin', w: 4, h: 6, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      Promise.all([history(), getData('macro.json')]).then(([hist, macro]) => {
        if (!hist) return body.replaceChildren(nodata());
        const items = pricedInGold(hist, macro);
        body.innerHTML = `<div class="pig">${items.map(it => `<div class="pig-row"><span class="pig-ico">${ICONS[it.key] || '•'}</span><span>${t('pig_' + it.key)}</span><b>${fmtNum(it.now, it.now < 10 ? 2 : it.now < 100 ? 1 : 0)} ${it.unit === 'g' ? t('unit_g_short') : t('unit_oz_short')}</b></div>`).join('')}</div>`;
        body.append(more('#/world'));
      });
    },
  },
  // ------------------------------------------------------------ Turkey
  {
    id: 'turkey', title: 'w_turkey', w: 4, h: 6, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      getData('turkey.json').then(tr => {
        if (!tr || !Object.keys(tr.items || {}).length) {
          if (tr?.parity_gram) { body.innerHTML = `<div class="kv"><span>${t('tr_parity')}</span><b>${fmtMoney(tr.parity_gram, 'TRY', 2)}</b></div>`; return; }
          return body.replaceChildren(nodata());
        }
        const rows = ['gram', 'ceyrek', 'yarim', 'tam', 'cumhuriyet'].filter(k => tr.items[k]);
        body.innerHTML = `<table class="tbl"><thead><tr><th></th><th>${t('sell')}</th><th>${t('change')}</th><th>${t('premium')}</th></tr></thead><tbody>
          ${rows.map(k => { const it = tr.items[k]; return `<tr><td>${t('tr_' + k)}</td><td><b>${fmtMoney(it.sell, 'TRY', 0)}</b></td><td class="${cls(it.change)}">${fmtPct(it.change)}</td><td>${fmtPct(it.premium, 1)}</td></tr>`; }).join('')}
          </tbody></table><div class="muted tiny">${t('tr_parity')}: ${fmtMoney(tr.parity_gram, 'TRY', 2)} · USD/TRY ${fmtNum(tr.usdtry, 2)}</div>`;
        body.append(more('#/turkey'));
      });
    },
  },
  // ------------------------------------------------------------ Polymarket
  {
    id: 'polymarket', title: 'w_polymarket', w: 4, h: 6, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      getData('polymarket.json').then(pm => {
        const e = pm?.events?.[0];
        if (!e) return body.replaceChildren(h('div', { class: 'empty' }, t('pm_none')));
        body.replaceChildren(pmEvent(e, 8), more('#/sentiment'));
      });
    },
  },
  // ------------------------------------------------------------ converter
  {
    id: 'converter', title: 'w_converter', w: 4, h: 5, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      getData('latest.json').then(latest => {
        if (!latest) return body.replaceChildren(nodata());
        const amt = h('input', { type: 'number', value: '10', min: '0', step: 'any' });
        const unit = h('select', {}, ['g', 'oz', 'kg'].map(u => h('option', { value: u }, t('unit_' + u))));
        const kar = h('select', {}, Object.keys(KARATS).sort((a, b) => b - a).map(k => h('option', { value: k }, k + 'K')));
        const cur = h('select', {}, CURRENCIES.map(c => h('option', { value: c, selected: c === state.currency }, c)));
        const out = h('div', { class: 'conv-out' });
        const calc = () => {
          const usdOz = state.live?.price ?? latest.spot ?? latest.gold;
          const fx = cur.value === 'USD' ? 1 : latest.fx?.[cur.value];
          const oz = (+amt.value || 0) * (unit.value === 'g' ? 1 / OZ_G : unit.value === 'kg' ? 1000 / OZ_G : 1) * KARATS[kar.value];
          out.innerHTML = `<div class="big">${fmtMoney(oz * usdOz * fx, cur.value)}</div><div class="muted small">${fmtNum(oz * OZ_G, 3)} ${t('unit_g_short')} ${t('fine_gold')}</div>`;
        };
        [amt, unit, kar, cur].forEach(x => x.addEventListener('input', calc));
        body.replaceChildren(h('div', { class: 'conv' }, amt, unit, kar, cur), out);
        calc();
      });
    },
  },
  // ------------------------------------------------------------ fair value mini
  {
    id: 'fairvalue', title: 'w_fairvalue', w: 4, h: 5, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      getData('fairvalue.json').then(fv => {
        if (!fv?.now) return body.replaceChildren(nodata());
        const n = fv.now; const z = n.z;
        const verdict = z > 1 ? 'fv_expensive' : z < -1 ? 'fv_cheap' : 'fv_fair';
        const pos = Math.max(0, Math.min(100, 50 + z * 20));
        body.innerHTML = `<div class="fvmini"><div class="kv"><span>${t('price')}</span><b>${fmtMoney(n.price, 'USD')}</b></div>
          <div class="kv"><span>${t('fair_value')}</span><b>${fmtMoney(n.fair, 'USD')}</b></div>
          <div class="zbar"><span class="muted tiny">${t('fv_cheap')}</span><div class="zline"><i style="left:${pos}%"></i></div><span class="muted tiny">${t('fv_expensive')}</span></div>
          <div class="fv-verdict ${verdict}">${t(verdict)} <span class="muted small">(z = ${fmtNum(z, 2)})</span></div></div>`;
        body.append(more('#/drivers'));
      });
    },
  },
  // ------------------------------------------------------------ seasonality mini
  {
    id: 'seasonality', title: 'w_seasonality', w: 4, h: 5, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      history().then(hist => {
        if (!hist) return body.replaceChildren(nodata());
        const s = seasonality(hist, 20);
        const cv = h('canvas'); body.replaceChildren(h('div', { class: 'cv-wrap' }, cv), more('#/seasonality'));
        const m = new Date().getUTCMonth();
        cjs(cv, {
          type: 'bar', data: { labels: monthLabels(), datasets: [{ data: s.avg, backgroundColor: s.avg.map((v, i) => i === m ? cssVar('--gold') : v >= 0 ? '#7bd38999' : '#ef6f6c99') }] },
          options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtPct(c.raw) } } }, scales: { y: { ticks: { callback: v => v + '%' } } } },
        });
      });
    },
  },
  // ------------------------------------------------------------ gold cube mini
  {
    id: 'cube', title: 'w_cube', w: 4, h: 5, minW: 3, minH: 4,
    render(body) {
      const side = Math.cbrt(ABOVE_GROUND_T * 1000 / GOLD_DENSITY);
      body.innerHTML = `<div class="cube-mini">${cubeSVG(side, 140)}<div><div class="big">${fmtNum(side, 1)} m</div><div class="small">${t('cube_mini', { t: fmtNum(ABOVE_GROUND_T, 0) })}</div></div></div>`;
      body.append(more('#/world'));
    },
  },
  // ------------------------------------------------------------ central banks mini
  {
    id: 'centralbanks', title: 'w_centralbanks', w: 4, h: 6, minW: 3, minH: 4,
    render(body) {
      body.append(loading());
      getData('static/centralbanks.json').then(cb => {
        if (!cb) return body.replaceChildren(nodata());
        const top = cb.countries.slice().sort((a, b) => b.t - a.t).slice(0, 10); const mx = top[0].t;
        body.innerHTML = `<div class="hbars">${top.map(c => `<div class="hbar"><span>${getLang() === 'tr' ? c.name_tr : c.name}</span><div class="bar"><i style="width:${c.t / mx * 100}%"></i></div><b>${fmtNum(c.t, 0)} t</b></div>`).join('')}</div>`;
        body.append(more('#/world'));
      });
    },
  },
];

export const ICONS = { bigmac: '🍔', oil: '🛢️', wage: '💼', house: '🏠', spx: '📈', dji: '🏛️', btc: '₿' };

export function monthLabels(style = 'short') {
  return Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(getLang() === 'tr' ? 'tr-TR' : 'en-US', { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2020, i, 1))));
}

/** Driver attribution bars for one day */
export function driverBars(d, compact = false) {
  const entries = Object.entries(d.contrib);
  const mx = Math.max(0.05, ...entries.map(([, v]) => Math.abs(v ?? 0)), Math.abs(d.total));
  const dir = d.total > 0 ? 'drv_rose' : d.total < 0 ? 'drv_fell' : 'drv_flat';
  const top = entries.filter(([k]) => k !== 'other').sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const wrap = h('div', { class: 'drv' });
  wrap.innerHTML = `<div class="drv-head"><span class="muted small">${fmtDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
    <div class="drv-total ${cls(d.total)}">${t(dir)} ${fmtPct(d.total)}</div>
    ${top ? `<div class="small">${t('drv_top', { f: t('f_' + top[0]), v: fmtPct(top[1]) })}</div>` : ''}</div>
    <div class="drv-bars">${entries.map(([k, v]) => `<div class="drv-row"><span>${t('f_' + k)}${!compact && d.moves?.[k] != null ? ` <span class="muted tiny">(${k === 'realyield' ? fmtNum(d.moves[k], 3) + ' pp' : fmtPct(d.moves[k])})</span>` : ''}</span>
      <div class="drv-bar"><div class="mid"></div><i class="${cls(v)}" style="${v >= 0 ? 'left:50%' : `right:50%`};width:${Math.abs(v) / mx * 50}%"></i></div><b class="${cls(v)}">${fmtPct(v)}</b></div>`).join('')}</div>`;
  return wrap;
}

export function newsList(items, compact = false) {
  const ul = h('ul', { class: 'news' + (compact ? ' compact' : '') });
  for (const x of items) {
    ul.append(h('li', {},
      h('span', { class: 'sent s' + x.sent, title: t('sent_' + x.sent) }),
      h('div', {},
        h('a', { href: x.link, target: '_blank', rel: 'noopener' }, x.title),
        h('div', { class: 'news-meta' }, h('span', {}, x.source), h('span', {}, fmtAgo(x.date)), ...(x.tags || []).map(tg => h('span', { class: 'tag t-' + tg }, t('tag_' + tg)))),
      )));
  }
  return ul;
}

export function pmEvent(e, max = 20) {
  const box = h('div', { class: 'pm' });
  box.append(h('a', { class: 'pm-title', href: `https://polymarket.com/event/${e.slug}`, target: '_blank', rel: 'noopener' }, e.title));
  box.append(h('div', { class: 'muted tiny' }, `${t('pm_ends')} ${e.endDate ? fmtDate(e.endDate) : '–'} · ${t('volume')} $${fmtCompact(e.volume)}`));
  const list = h('div', { class: 'pm-list' });
  for (const m of e.markets.slice(0, max)) {
    const p = (m.prob ?? 0) * 100;
    list.append(h('div', { class: 'pm-row', title: m.question || '' }, h('span', {}, m.label), h('div', { class: 'bar' }, h('i', { style: `width:${p}%` })), h('b', {}, p < 1 ? '<1%' : Math.round(p) + '%')));
  }
  box.append(list);
  return box;
}

/** isometric cube; side in metres, includes a 1.75 m person for scale */
export function cubeSVG(side, size = 260, person = true) {
  const s = 100; // drawing units for cube side
  const cx = 0.866, sy = 0.5;
  const x0 = 20, y0 = 20 + s * sy;
  const p = (x, y, z) => [x0 + (x - y) * cx * s / 1 + s * cx, y0 + (x + y) * sy * s - z * s];
  const P = (a) => a.map(v => v.join(',')).join(' ');
  const top = [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)];
  const left = [p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)];
  const right = [p(1, 0, 1), p(1, 1, 1), p(1, 1, 0), p(1, 0, 0)];
  const ph = 1.75 / side * s; const [px, py] = p(1.25, 1.25, 0);
  const w = 20 + 2 * s * cx + 40, hgt = y0 + 2 * s * sy + 10;
  return `<svg viewBox="0 0 ${w} ${hgt}" width="${size}" class="cube" role="img" aria-label="gold cube">
    <defs><linearGradient id="gt" x1="0" x2="1"><stop offset="0" stop-color="#f6d77a"/><stop offset="1" stop-color="#e2b33c"/></linearGradient>
    <linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="#b8861f"/><stop offset="1" stop-color="#d4a63a"/></linearGradient>
    <linearGradient id="gr" x1="0" x2="1"><stop offset="0" stop-color="#9a6f16"/><stop offset="1" stop-color="#7d5a12"/></linearGradient></defs>
    <polygon points="${P(top)}" fill="url(#gt)"/><polygon points="${P(left)}" fill="url(#gl)"/><polygon points="${P(right)}" fill="url(#gr)"/>
    ${person ? `<g transform="translate(${px + 8},${py - ph})"><rect x="-1.2" y="${ph * 0.22}" width="2.4" height="${ph * 0.78}" fill="var(--text)"/><circle cx="0" cy="${ph * 0.1}" r="${Math.max(0.8, ph * 0.1)}" fill="var(--text)"/></g>` : ''}
  </svg>`;
}
