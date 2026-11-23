// GoldPulse app shell: header, router, ticker
import { t, getLang, setLang } from './i18n.js';
import { state, setState, onState, getData, startLive, livePrice, fmtMoney, fmtPct, cls, h, CURRENCIES } from './core.js';
import { destroyCharts } from './charts.js';
import { dashboard, drivers, news, sentiment } from './pages_a.js';
import { tools, world, turkey, seasonality, play, about } from './pages_b.js';

const ROUTES = {
  dashboard: { fn: dashboard, label: 'nav_dashboard' },
  drivers: { fn: drivers, label: 'nav_drivers' },
  news: { fn: news, label: 'nav_news' },
  sentiment: { fn: sentiment, label: 'nav_sentiment' },
  tools: { fn: tools, label: 'nav_tools' },
  world: { fn: world, label: 'nav_world' },
  turkey: { fn: turkey, label: 'nav_turkey' },
  seasonality: { fn: seasonality, label: 'nav_seasonality' },
  play: { fn: play, label: 'nav_play' },
  about: { fn: about, label: 'nav_about' },
};

const app = document.getElementById('app');
let cleanup = null;

function applyTheme() { document.documentElement.dataset.theme = state.theme; }

function renderHeader() {
  const route = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'dashboard';
  const nav = document.getElementById('nav');
  nav.replaceChildren(...Object.entries(ROUTES).map(([k, r]) => h('a', { href: '#/' + k, class: k === route ? 'on' : '' }, t(r.label))));
  const ctr = document.getElementById('controls');
  ctr.replaceChildren(
    h('select', { 'aria-label': t('currency'), onchange: e => setState({ currency: e.target.value }) }, CURRENCIES.map(c => h('option', { value: c, selected: c === state.currency }, c))),
    h('select', { 'aria-label': t('unit'), onchange: e => setState({ unit: e.target.value }) }, ['oz', 'g', 'kg'].map(u => h('option', { value: u, selected: u === state.unit }, t('unit_' + u)))),
    h('div', { class: 'seg lang' }, ['en', 'tr'].map(l => h('button', { class: getLang() === l ? 'on' : '', onclick: () => { setLang(l); setState({ lang: l }); } }, l.toUpperCase()))),
    h('button', { class: 'icon-btn', title: t('theme'), onclick: () => setState({ theme: state.theme === 'dark' ? 'light' : 'dark' }) }, state.theme === 'dark' ? '☀' : '☾'),
  );
  document.documentElement.lang = getLang();
  document.getElementById('foot').innerHTML = t('footer');
}

async function renderTicker() {
  const latest = await getData('latest.json');
  const el = document.getElementById('ticker');
  if (!latest) { el.textContent = ''; return; }
  const lv = state.live;
  const p = livePrice(latest);
  const items = [
    `<span class="tk-main"><b>XAU/${state.currency}</b> ${fmtMoney(p)} <span class="${cls(lv?.changePct)}">${fmtPct(lv?.changePct ?? latest.change_pct)}</span></span>`,
    latest.silver ? `<span>XAG ${fmtMoney(latest.silver, 'USD', 2)}</span>` : '',
    latest.dxy ? `<span>DXY ${latest.dxy.toFixed(2)} <span class="${cls(latest.dxy_chg)}">${fmtPct(latest.dxy_chg)}</span></span>` : '',
    latest.realyield != null ? `<span>${t('s_realyield')} ${latest.realyield.toFixed(2)}%</span>` : '',
    latest.spx ? `<span>S&P ${Math.round(latest.spx).toLocaleString()} <span class="${cls(latest.spx_chg)}">${fmtPct(latest.spx_chg)}</span></span>` : '',
    latest.btc ? `<span>BTC ${fmtMoney(latest.btc, 'USD', 0)}</span>` : '',
    latest.fx?.TRY ? `<span>USD/TRY ${latest.fx.TRY.toFixed(2)}</span>` : '',
  ];
  el.innerHTML = `<span class="dot ${lv?.source === 'live' ? 'live' : ''}"></span>` + items.filter(Boolean).join('<i class="sep">·</i>');
}

function route() {
  const [name, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const r = ROUTES[name] || ROUTES.dashboard;
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.warn(e); } }
  cleanup = null;
  destroyCharts();
  app.innerHTML = '';
  app.className = 'page page-' + (ROUTES[name] ? name : 'dashboard');
  const c = r.fn(app, sub);
  cleanup = typeof c === 'function' ? c : null;
  renderHeader();
  window.scrollTo(0, 0);
  document.title = `GoldPulse · ${t(r.label)}`;
}

applyTheme();
window.addEventListener('hashchange', route);
const isDash = () => { const n = location.hash.replace(/^#\/?/, '').split('/')[0]; return !n || n === 'dashboard' || !ROUTES[n]; };
onState(p => {
  if ('theme' in p) applyTheme();
  if (['theme', 'lang', 'currency', 'unit'].some(k => k in p)) {
    renderHeader();
    if (!isDash()) route(); // the dashboard re-renders its own widgets
  }
  if (['live', 'currency', 'unit', 'lang'].some(k => k in p)) renderTicker();
});
route();
renderTicker();
startLive();
