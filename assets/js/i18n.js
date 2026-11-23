// GoldPulse translations (English / Türkçe)
const EN = {
  // nav
  nav_dashboard: 'Dashboard', nav_drivers: 'Drivers & Fair Value', nav_news: 'News', nav_sentiment: 'Sentiment', nav_tools: 'Tools',
  nav_world: 'World of Gold', nav_turkey: 'Türkiye', nav_seasonality: 'Seasonality', nav_play: 'Play', nav_about: 'About',
  currency: 'Currency', unit: 'Unit', theme: 'Theme', loading: 'Loading…', no_data: 'Data not available yet. The data job runs every 30 minutes.',
  more: 'More', close: 'Close', refresh: 'Refresh', remove: 'Remove', updated: 'Updated', live: 'Live', delayed: 'Delayed', today: 'today',
  unit_oz: 'Troy ounce', unit_g: 'Gram', unit_kg: 'Kilogram', unit_g_short: 'g', unit_oz_short: 'oz',
  footer: 'GoldPulse is an independent, open-source project for information only, <b>not investment advice</b>. Spot price: gold-api.com · History: COMEX futures via Yahoo Finance · Macro: FRED · Positioning: CFTC · News: Google News · Odds: Polymarket · Turkish prices: Truncgil · Reserves: World Gold Council. Data may be delayed or contain errors. <a href="#/about">Methodology & sources</a>',
  // dashboard
  dash_title: 'Gold dashboard', dash_sub: 'Live gold price and everything that moves it. Drag panels by their title bar, resize from the corner, and add or remove panels. Your layout is saved in this browser.',
  add_widget: 'Add panel', lock_layout: 'Lock layout', unlock_layout: 'Unlock layout', reset_layout: 'Reset', dash_hint: 'Tip: click any day on the chart to see that day’s news, drivers and sentiment.',
  w_price: 'Live price', w_chart: 'Interactive chart', w_tvchart: 'TradingView live chart', w_feargreed: 'Gold Fear & Greed', w_drivers: 'Why did gold move?',
  w_news: 'Latest news', w_ratios: 'Cross-asset ratios', w_pricedin: 'The world priced in gold', w_turkey: 'Türkiye gold prices', w_polymarket: 'Prediction markets',
  w_converter: 'Quick converter', w_fairvalue: 'Fair value', w_seasonality: 'Seasonality', w_cube: 'All the gold ever mined', w_centralbanks: 'Central bank gold',
  range_52w: '52-week range', ath: 'All-time high', gold_silver_ratio: 'Gold/silver ratio', spot_src: 'Spot price via gold-api.com',
  // chart
  compare: 'Compare', indicators: 'Overlays', rebased_note: 'Rebased to 100 at the start of the range', close_price: 'Close', day_change: 'Day change', fear_greed: 'Fear & Greed',
  drivers_short: 'Drivers', no_news_day: 'No stored headlines for this day.',
  r_1D: '1D', r_1W: '1W', r_1M: '1M', r_3M: '3M', r_6M: '6M', r_YTD: 'YTD', r_1Y: '1Y', r_5Y: '5Y', r_10Y: '10Y', r_MAX: 'Max',
  s_silver: 'Silver', s_dxy: 'Dollar index', s_spx: 'S&P 500', s_btc: 'Bitcoin', s_oil: 'Oil', s_realyield: 'Real yield 10y',
  i_sma50: 'SMA 50', i_sma200: 'SMA 200', i_bb: 'Bollinger', i_rsi: 'RSI', i_news: 'News & events', i_log: 'Log scale',
  // fear & greed
  fg_extreme_fear: 'Extreme fear', fg_fear: 'Fear', fg_neutral: 'Neutral', fg_greed: 'Greed', fg_extreme_greed: 'Extreme greed',
  ago_week: '1 week ago', ago_month: '1 month ago', ago_year: '1 year ago',
  fgc_momentum: 'Momentum', fgc_rsi: 'RSI (14)', fgc_range: '52-week range', fgc_volatility: 'Volatility', fgc_gsratio: 'Gold/silver ratio', fgc_haven: 'Safe-haven demand', fgc_positioning: 'Futures positioning',
  fgd_momentum: 'Price versus its 125-day average, ranked against the last 3 years.', fgd_rsi: 'Relative Strength Index: above 70 is overbought, below 30 is oversold.',
  fgd_range: 'Where the price sits between its 52-week low (0) and high (100).', fgd_volatility: 'CBOE Gold Volatility Index (GVZ), inverted: calm markets score high.',
  fgd_gsratio: 'Gold/silver ratio, inverted: a falling ratio signals speculative appetite.', fgd_haven: 'Gold’s 20-day return relative to the S&P 500.',
  fgd_positioning: 'Managed-money net long as % of open interest (CFTC), ranked over 3 years.',
  fg_method: 'Each component is scaled from 0 (fear) to 100 (greed) using its percentile over recent years. The index is their simple average. It is an original GoldPulse indicator, not an official index.',
  fg_history: 'Fear & Greed history (2 years)', component: 'Component', score: 'Score', what_it_measures: 'What it measures',
  // drivers
drv_rose: 'Gold rose', drv_fell: 'Gold fell', drv_flat: 'Gold was flat', drv_top: 'Biggest driver: {f} ({v})',
  f_dxy: 'US dollar', f_realyield: 'Real yields', f_oil: 'Oil', f_spx: 'Stocks', f_other: 'Gold-specific / other',
  drivers_title: 'Why gold moves', drivers_sub: 'A daily breakdown of the gold price move into its macro drivers, and a transparent fair-value model.',
  drv_today: 'Daily attribution', drv_model: 'Rolling {w}-day regression of daily gold returns on the dollar index, 10-year real yield, oil and the S&P 500. The model explained about {r2}% of daily moves over the window.',
  factor: 'Factor', beta: 'Sensitivity (β)', beta_meaning: 'Meaning', bm_pct: 'a 1% move in {f} → {v}% in gold', bm_ry: '+0.10 pp in real yields → {v} in gold',
  drv_history: 'Last 60 trading days', drv_history_note: 'Each bar shows how much of the day’s move each factor explains. The line is the actual move. Grey is the part the macro factors don’t explain (flows, central-bank buying, geopolitics, news).',
  drv_total: 'Actual move', nar: '{dir} {v}. {parts} The rest ({o}) came from gold-specific factors such as flows, physical demand or news.', nar_part: '{f} contributed {v}', and: ', and ',
  fv_title: 'Gold fair-value model', fv_sub: 'Where gold “should” trade based on real interest rates, the US dollar and a slow-moving structural trend.',
  price: 'Price', fair_value: 'Fair value', fv_band: 'Fair range (±1.5σ)', fv_verdict: 'Verdict', fv_cheap: 'Cheap', fv_fair: 'Fair', fv_expensive: 'Expensive',
  actual: 'Gold', fv_adaptive: 'Adaptive model (5y window)', fv_classic: 'Classic model (2006–2021)',
  p_a: 'Intercept', p_real_yield: 'Real yield (per pp)', p_log_dxy: 'log(Dollar index)', p_trend: 'Trend (per year)',
  fv_explain: 'The classic model (red) captures the textbook relationship: higher real yields and a stronger dollar push gold down. Since 2022 gold has risen far above it, as central banks and Asian buyers kept buying despite high rates. The adaptive model (blue) is re-estimated on the last 5 years and adds a trend term, so it can follow that structural shift. Read the gap between the two as a measure of the “new demand” premium.',
  // news
  news_title: 'Gold news', news_sub: 'Headlines collected every 30 minutes, tagged by what moves gold and scored with a simple sentiment model.',
  search: 'Search headlines…', all: 'All', all_languages: 'Show both languages', no_news: 'No headlines match.',
  tag_fed: 'Fed & rates', tag_geopolitics: 'Geopolitics', tag_centralbanks: 'Central banks', tag_demand: 'Demand & ETFs', tag_dollar: 'Dollar & yields', tag_inflation: 'Inflation',
  sent_1: 'Bullish', sent_0: 'Neutral', 'sent_-1': 'Bearish', news_sentiment: 'Headline sentiment (14 days)', news_sent_note: 'Keyword-based: “rises, record, rally” vs “falls, slides, plunge”.', news_topics: 'Topics',
  // sentiment page
  sent_title: 'Sentiment & positioning', sent_sub: 'GoldPulse Fear & Greed index, speculative futures positioning, and what prediction markets expect.',
  cot_title: 'Managed-money positioning (CFTC)', cot_sub: 'Net long COMEX gold futures held by hedge funds and other money managers, in thousands of contracts.', cot_net_k: 'Net long (k)',
  pm_sub: 'Live odds from Polymarket gold markets: the crowd’s probability for each price outcome.', pm_none: 'No open gold markets on Polymarket right now.', pm_ends: 'Ends', volume: 'Volume',
  crowd_vs_model: 'Crowd vs model', cvm_text: 'The fair-value model puts gold at <b>{fair}</b> (fair range {lo} – {hi}). Market mood reads <b>{fg} / 100 ({lbl})</b>. Compare these with the Polymarket odds: when the crowd prices big moves beyond the fair range while sentiment is extreme, a reversal is more likely.',
  cvm_note: 'For information only, not a forecast or investment advice.',
  // ratios
  ratio: 'Ratio', now: 'Now', pct_hist: 'Hist. %ile', pct_hist_tip: 'Percentile of today’s value within the full history', ratio_gold_silver: 'Gold / Silver', ratio_gold_oil: 'Gold / Oil (bbl)', ratio_spx_gold: 'S&P 500 / Gold', ratio_dow_gold: 'Dow / Gold', ratio_btc_gold: 'Bitcoin / Gold',
  // priced in gold
  pig_bigmac: 'A Big Mac', pig_oil: 'A barrel of oil', pig_wage: 'A month of average US pay', pig_house: 'Median US house', pig_spx: 'The S&P 500 index', pig_dji: 'The Dow Jones index', pig_btc: 'One Bitcoin',
  pig_title: 'The world priced in gold', pig_sub: 'Prices measured in gold instead of dollars. When the numbers fall, gold has gained purchasing power.',
  pig_note: 'Change is measured since 2000 (or the first available date). Sources: The Economist Big Mac index, FRED (median house price, average weekly earnings), Yahoo Finance.',
  // tools
  tools_title: 'Gold tools', tools_sub: 'Calculators built on real historical prices.',
  tm_title: 'Gold time machine', tm_sub: 'What if you had bought gold on a date that matters to you: a birthday, a wedding, your first salary?',
  tm_date: 'Purchase date', tm_amount: 'Amount invested', tm_nodata: 'No price data for that date.', peak: 'peak', bottom: 'bottom',
  tm_hero: '{amt} on {date} would have bought <b>{g} g</b> of gold, worth {now} today.',
  tm_gold: 'Gold', tm_cash: 'Cash (under the mattress)', tm_usdcash: 'US dollars', tm_spx: 'S&P 500 (price only)', tm_tbill: 'US Treasury bills', tm_inflation: 'Inflation (to keep purchasing power)', cagr: 'per year',
  tm_infl_note: 'You would need {v} today to buy what your money bought back then.',
  dca_title: 'Savings plan backtester', dca_sub: 'Invest a fixed amount every month. Compare gold, the S&P 500, and putting everything in at the start.',
  dca_start: 'Start date', dca_monthly: 'Monthly amount', dca_invested: 'Total invested', dca_gold_value: 'Gold plan value', dca_grams: 'Gold accumulated', dca_spx_value: 'S&P 500 plan value', dca_lump: 'Lump sum in gold at start',
  dca_note: 'Buys at the first trading day of each month at the closing price, with no fees, spreads or taxes. S&P 500 is price only (no dividends).',
  jw_title: 'Jewelry & scrap calculator', jw_sub: 'Melt value of gold jewelry by karat and weight, and what dealers typically pay.',
  jw_weight: 'Weight (grams)', jw_karat: 'Karat', jw_dealer: 'Dealer pays (% of melt)', jw_labor: 'Retail markup / labor (%)', jw_melt: 'Melt value', jw_dealer_pays: 'Dealer offer', jw_retail: 'Typical retail price',
  jw_note: 'Scrap buyers usually pay 70–95% of melt value. Shop prices add labor, design and margin. Live spot price.', jw_table: 'Price per gram by karat', jw_purity: 'Purity', per_gram: 'Per gram', fine_gold: 'fine gold',
  // world
  world_title: 'The world of gold', world_sub: 'Gold measured against the things we buy, who holds it, and how little of it exists.',
  cb_title: 'Central bank gold reserves', cb_top: 'Largest holders (tonnes)', cb_highlights: 'Recent moves', cb_notlisted: 'Not in our list', asof: 'as of',
  cube_title: 'All the gold ever mined', cube_mini: '≈{t} tonnes of gold exist above ground. Melted together, they would form a cube this wide.',
  cube_text: 'Humanity has mined about <b>{t} tonnes</b> of gold in all of history. Gold is so dense (19.3 t/m³) that it would fit in a single cube <b>{s} m</b> on each side. That is about {v} m³, or roughly {p} Olympic swimming pools. The tiny figure next to the cube is a 1.75 m person.',
  cube_share: 'Shared equally, every person on Earth would get about <b>{g} g</b>.', cube_mine: 'Your gold (grams)', cube_your_side: 'Your cube side', cube_your_share: 'Your share of all gold', value: 'Value',
  cube_src: 'Source: World Gold Council, above-ground stocks (end-Q3 2026: 224,200 t).',
  // turkey
  tr_title: 'Türkiye gold prices', tr_sub: 'Gram gold, çeyrek and Cumhuriyet coins from the local market, compared with the international price converted to lira.',
  tr_prices: 'Local market prices (₺)', buy: 'Buy', sell: 'Sell', change: 'Change', premium: 'Premium', tr_fine_value: 'Fine-gold value',
  tr_gram: 'Gram gold', tr_ceyrek: 'Çeyrek (quarter)', tr_yarim: 'Yarım (half)', tr_tam: 'Tam (full)', tr_cumhuriyet: 'Cumhuriyet', tr_ata: 'Ata', tr_ayar22: '22 karat (g)', tr_ayar18: '18 karat (g)', tr_ayar14: '14 karat (g)', tr_gumus: 'Silver (g)',
  tr_src: 'Local prices via Truncgil Finans (free market).', tr_unavailable: 'Local prices are unavailable right now.',
  tr_premium_title: 'Grand Bazaar premium meter', tr_premium_sub: 'How far the local gram price sits above or below the international price converted to lira.',
  tr_parity: 'International parity (gram)', tr_gram_market: 'Local gram price', tr_premium_hist: 'Premium history',
  tr_premium_explain: 'A premium of 0–1.5% is normal (refining, transport, dealer margin). A large premium means strong local demand, for example from currency fears or import limits. A discount means local selling pressure. Coin premiums also include minting costs.',
  tr_gram_hist: 'Gram gold in lira (log scale)', tr_gram_hist_sub: 'Gram gold (₺) and the USD/TRY rate. In lira terms, gold has protected savings against currency depreciation.',
  tr_10y: 'Ten years ago a gram of gold cost about {a}. Today it costs {b}, {x}× more.',
  // seasonality
  seas_title: 'Seasonality lab', seas_sub: 'Does gold have favourite months? Average returns by month and weekday, and every month’s return in a heatmap.',
  seas_monthly: 'Average return by month', seas_weekday: 'Average daily return by weekday', seas_heatmap: 'Monthly returns heatmap', period: 'Period', last_n_years: 'Last {n} years',
  avg_return: 'Average return', pct_positive: 'Months positive', average: 'Avg', year: 'Year',
  seas_note: 'Seasonal patterns are averages. They are weak and unreliable for any single year.',
  ev_cny: 'Chinese New Year buying', ev_akshaya: 'Akshaya Tritiya (India)', ev_diwali: 'Diwali & Dhanteras', ev_wedding: 'Indian wedding season',
  // play
  play_title: 'Higher or Lower?', play_sub: 'You see 6 months of a real, hidden gold chart. Will gold be higher or lower 20 trading days later? The date is revealed after you guess.',
  hl_daily: 'Daily challenge', hl_endless: 'Endless', hl_round: 'Round', hl_streak: 'Streak', hl_best: 'Best', hl_acc: 'Accuracy',
  hl_question: 'Where will gold be in {n} trading days?', hl_higher: 'Higher', hl_lower: 'Lower', hl_right: 'Correct!', hl_wrong: 'Not this time',
  hl_reveal: 'This chart started in {a}. By {b}, gold had moved {c} (from {p0} to {p1}).', hl_next: 'Next chart',
  hl_daily_done: 'Today’s score: {s} / 5', hl_come_back: 'A new daily challenge appears tomorrow. Everyone gets the same 5 charts.', hl_play_endless: 'Play endless mode',
  // about
  about_title: 'About GoldPulse', data_status: 'Data pipeline status', status_line: '{ok} of {all} data sources were fetched successfully in the last run ({ago}).', details: 'Details',
  about_html: `<p><b>GoldPulse</b> is an open-source gold market website that runs entirely on GitHub Pages. A GitHub Actions job runs every 30 minutes. It downloads free public data, computes the analytics and publishes the site. Your browser then gets the live spot price directly every 20 seconds.</p>
  <h3>Data sources</h3><ul>
  <li><b>Live spot price</b>: gold-api.com (XAU/USD), every 20 seconds in your browser.</li>
  <li><b>Price history</b>: COMEX gold futures (GC=F), silver, dollar index, S&P 500, oil, Bitcoin and FX via Yahoo Finance. Long gold history via Stooq.</li>
  <li><b>Macro</b>: FRED (10-year TIPS real yield, T-bills, US CPI, median house price, earnings, Turkish CPI).</li>
  <li><b>Positioning</b>: CFTC Commitments of Traders (disaggregated, managed money).</li>
  <li><b>News</b>: Google News RSS, English and Turkish. Tagging and sentiment use simple keyword rules.</li>
  <li><b>Prediction markets</b>: Polymarket public API.</li>
  <li><b>Türkiye</b>: Truncgil Finans (free market gram, coins and karat prices).</li>
  <li><b>Reserves & above-ground stocks</b>: World Gold Council.</li></ul>
  <h3>Methodology</h3><ul>
  <li><b>Why gold moved</b>: a rolling 250-day OLS of daily log returns of gold on log returns of the dollar index, oil and S&P 500, and daily changes in the 10-year real yield. Each factor’s contribution is its β times today’s move. The remainder is “gold-specific”.</li>
  <li><b>Fair value</b>: monthly log(gold) regressed on the real yield and log(DXY). The classic model is fit on 2006–2021; the adaptive model on a rolling 5-year window with a trend term.</li>
  <li><b>Fear & Greed</b>: the average of up to 7 percentile-scaled components (momentum, RSI, 52-week range, GVZ volatility, gold/silver ratio, safe-haven demand, CFTC positioning).</li>
  <li><b>Price note</b>: charts use COMEX front-month futures, which trade slightly above spot. The headline price is spot.</li></ul>
  <p class="muted">Nothing on this site is investment advice. Data may be delayed, revised or wrong. Always check with your bank or dealer before trading.</p>`,
};

const TR = {
  nav_dashboard: 'Panel', nav_drivers: 'Etkenler & Adil Değer', nav_news: 'Haberler', nav_sentiment: 'Piyasa Duyarlılığı', nav_tools: 'Araçlar',
  nav_world: 'Altının Dünyası', nav_turkey: 'Türkiye', nav_seasonality: 'Mevsimsellik', nav_play: 'Oyun', nav_about: 'Hakkında',
  currency: 'Para birimi', unit: 'Birim', theme: 'Tema', loading: 'Yükleniyor…', no_data: 'Veri henüz hazır değil. Veri güncellemesi 30 dakikada bir çalışır.',
  more: 'Devamı', close: 'Kapat', refresh: 'Yenile', remove: 'Kaldır', updated: 'Güncellendi', live: 'Canlı', delayed: 'Gecikmeli', today: 'bugün',
  unit_oz: 'Ons', unit_g: 'Gram', unit_kg: 'Kilogram', unit_g_short: 'g', unit_oz_short: 'ons',
  footer: 'GoldPulse yalnızca bilgilendirme amaçlı, bağımsız ve açık kaynaklı bir projedir; <b>yatırım tavsiyesi değildir</b>. Spot fiyat: gold-api.com · Geçmiş: Yahoo Finance üzerinden COMEX vadeli · Makro: FRED · Pozisyon: CFTC · Haberler: Google Haberler · Olasılıklar: Polymarket · Türkiye fiyatları: Truncgil · Rezervler: Dünya Altın Konseyi. Veriler gecikmeli veya hatalı olabilir. <a href="#/about">Yöntem ve kaynaklar</a>',
  dash_title: 'Altın paneli', dash_sub: 'Canlı altın fiyatı ve onu hareket ettiren her şey. Panelleri başlıklarından sürükleyin, köşeden boyutlandırın, ekleyin veya kaldırın. Düzeniniz bu tarayıcıda saklanır.',
  add_widget: 'Panel ekle', lock_layout: 'Düzeni kilitle', unlock_layout: 'Kilidi aç', reset_layout: 'Sıfırla', dash_hint: 'İpucu: o günün haberlerini, etkenlerini ve duyarlılığını görmek için grafikte herhangi bir güne tıklayın.',
  w_price: 'Canlı fiyat', w_chart: 'Etkileşimli grafik', w_tvchart: 'TradingView canlı grafik', w_feargreed: 'Altın Korku & Açgözlülük', w_drivers: 'Altın neden hareket etti?',
  w_news: 'Son haberler', w_ratios: 'Varlık oranları', w_pricedin: 'Altın cinsinden dünya', w_turkey: 'Türkiye altın fiyatları', w_polymarket: 'Tahmin piyasaları',
  w_converter: 'Hızlı çevirici', w_fairvalue: 'Adil değer', w_seasonality: 'Mevsimsellik', w_cube: 'Çıkarılmış tüm altın', w_centralbanks: 'Merkez bankası altını',
  range_52w: '52 haftalık aralık', ath: 'Tüm zamanların zirvesi', gold_silver_ratio: 'Altın/gümüş oranı', spot_src: 'Spot fiyat: gold-api.com',
  compare: 'Karşılaştır', indicators: 'Göstergeler', rebased_note: 'Aralık başında 100’e eşitlendi', close_price: 'Kapanış', day_change: 'Günlük değişim', fear_greed: 'Korku & Açgözlülük',
  drivers_short: 'Etkenler', no_news_day: 'Bu gün için kayıtlı haber yok.',
  r_1D: '1G', r_1W: '1H', r_1M: '1A', r_3M: '3A', r_6M: '6A', r_YTD: 'YBB', r_1Y: '1Y', r_5Y: '5Y', r_10Y: '10Y', r_MAX: 'Tümü',
  s_silver: 'Gümüş', s_dxy: 'Dolar endeksi', s_spx: 'S&P 500', s_btc: 'Bitcoin', s_oil: 'Petrol', s_realyield: 'Reel faiz 10y',
  i_sma50: 'HO 50', i_sma200: 'HO 200', i_bb: 'Bollinger', i_rsi: 'RSI', i_news: 'Haber & olaylar', i_log: 'Log ölçek',
  fg_extreme_fear: 'Aşırı korku', fg_fear: 'Korku', fg_neutral: 'Nötr', fg_greed: 'Açgözlülük', fg_extreme_greed: 'Aşırı açgözlülük',
  ago_week: '1 hafta önce', ago_month: '1 ay önce', ago_year: '1 yıl önce',
  fgc_momentum: 'Momentum', fgc_rsi: 'RSI (14)', fgc_range: '52 haftalık aralık', fgc_volatility: 'Oynaklık', fgc_gsratio: 'Altın/gümüş oranı', fgc_haven: 'Güvenli liman talebi', fgc_positioning: 'Vadeli pozisyonlar',
  fgd_momentum: 'Fiyatın 125 günlük ortalamaya göre konumu, son 3 yıla göre sıralanır.', fgd_rsi: 'Göreceli Güç Endeksi: 70 üstü aşırı alım, 30 altı aşırı satım.',
  fgd_range: 'Fiyatın 52 haftalık en düşük (0) ile en yüksek (100) arasındaki yeri.', fgd_volatility: 'CBOE Altın Oynaklık Endeksi (GVZ), ters çevrilmiş: sakin piyasa yüksek puan alır.',
  fgd_gsratio: 'Altın/gümüş oranı, ters çevrilmiş: düşen oran spekülatif iştahı gösterir.', fgd_haven: 'Altının 20 günlük getirisinin S&P 500’e göre farkı.',
  fgd_positioning: 'Fon yöneticilerinin net uzun pozisyonu / açık pozisyon (CFTC), 3 yıla göre sıralanır.',
  fg_method: 'Her bileşen son yıllardaki yüzdelik dilimine göre 0 (korku) ile 100 (açgözlülük) arasında ölçeklenir; endeks bunların basit ortalamasıdır. Resmi bir endeks değil, GoldPulse’a özgü bir göstergedir.',
  fg_history: 'Korku & Açgözlülük geçmişi (2 yıl)', component: 'Bileşen', score: 'Puan', what_it_measures: 'Neyi ölçer',
  drv_rose: 'Altın yükseldi', drv_fell: 'Altın düştü', drv_flat: 'Altın yatay', drv_top: 'En büyük etken: {f} ({v})',
  f_dxy: 'ABD doları', f_realyield: 'Reel faizler', f_oil: 'Petrol', f_spx: 'Hisseler', f_other: 'Altına özgü / diğer',
  drivers_title: 'Altın neden hareket eder', drivers_sub: 'Altın fiyatındaki günlük hareketin makro etkenlere ayrıştırılması ve şeffaf bir adil değer modeli.',
  drv_today: 'Günlük ayrıştırma', drv_model: 'Günlük altın getirilerinin dolar endeksi, 10 yıllık reel faiz, petrol ve S&P 500 üzerine kayan {w} günlük regresyonu. Model bu dönemde günlük hareketlerin yaklaşık %{r2}’sini açıkladı.',
  factor: 'Etken', beta: 'Duyarlılık (β)', beta_meaning: 'Anlamı', bm_pct: '{f} %1 değişirse altın %{v}', bm_ry: 'Reel faizde +0,10 puan → altında {v}',
  drv_history: 'Son 60 işlem günü', drv_history_note: 'Her çubuk, günlük hareketin ne kadarını hangi etkenin açıkladığını gösterir. Çizgi gerçek harekettir. Gri kısım makro etkenlerin açıklamadığı bölümdür (fon akışları, merkez bankası alımları, jeopolitik, haberler).',
  drv_total: 'Gerçek hareket', nar: '{dir} ({v}). {parts}. Kalan kısım ({o}) fon akışları, fiziki talep veya haberler gibi altına özgü etkenlerden geldi.', nar_part: '{f} {v} katkı yaptı', and: ', ',
  fv_title: 'Altın adil değer modeli', fv_sub: 'Reel faizler, ABD doları ve yavaş değişen yapısal eğilime göre altının “olması gereken” fiyatı.',
  price: 'Fiyat', fair_value: 'Adil değer', fv_band: 'Adil aralık (±1,5σ)', fv_verdict: 'Sonuç', fv_cheap: 'Ucuz', fv_fair: 'Makul', fv_expensive: 'Pahalı',
  actual: 'Altın', fv_adaptive: 'Uyarlanabilir model (5 yıllık pencere)', fv_classic: 'Klasik model (2006–2021)',
  p_a: 'Sabit', p_real_yield: 'Reel faiz (puan başına)', p_log_dxy: 'log(Dolar endeksi)', p_trend: 'Eğilim (yıllık)',
  fv_explain: 'Klasik model (kırmızı) ders kitabındaki ilişkiyi yansıtır: yüksek reel faiz ve güçlü dolar altını aşağı iter. 2022’den beri altın bu modelin çok üzerine çıktı, çünkü merkez bankaları ve Asyalı alıcılar yüksek faize rağmen almaya devam etti. Uyarlanabilir model (mavi) son 5 yılla yeniden tahmin edilir ve bir eğilim terimi içerir, böylece bu yapısal değişimi takip edebilir. İkisi arasındaki farkı “yeni talep” primi olarak okuyabilirsiniz.',
  news_title: 'Altın haberleri', news_sub: '30 dakikada bir toplanan, altını etkileyen konulara göre etiketlenen ve basit bir duyarlılık modeliyle puanlanan başlıklar.',
  search: 'Başlıklarda ara…', all: 'Tümü', all_languages: 'İki dili de göster', no_news: 'Eşleşen başlık yok.',
  tag_fed: 'Fed & faiz', tag_geopolitics: 'Jeopolitik', tag_centralbanks: 'Merkez bankaları', tag_demand: 'Talep & ETF', tag_dollar: 'Dolar & tahvil', tag_inflation: 'Enflasyon',
  sent_1: 'Olumlu', sent_0: 'Nötr', 'sent_-1': 'Olumsuz', news_sentiment: 'Başlık duyarlılığı (14 gün)', news_sent_note: 'Anahtar kelimeye dayalı: “yükseldi, rekor” ve “düştü, geriledi”.', news_topics: 'Konular',
  sent_title: 'Duyarlılık & pozisyonlar', sent_sub: 'GoldPulse Korku & Açgözlülük endeksi, spekülatif vadeli pozisyonlar ve tahmin piyasalarının beklentisi.',
  cot_title: 'Fon yöneticisi pozisyonları (CFTC)', cot_sub: 'Hedge fonlar ve diğer para yöneticilerinin COMEX altın vadelilerindeki net uzun pozisyonu (bin kontrat).', cot_net_k: 'Net uzun (bin)',
  pm_sub: 'Polymarket altın piyasalarından canlı olasılıklar: kalabalığın her fiyat sonucu için biçtiği olasılık.', pm_none: 'Şu anda Polymarket’te açık altın piyasası yok.', pm_ends: 'Bitiş', volume: 'Hacim',
  crowd_vs_model: 'Kalabalık ve model', cvm_text: 'Adil değer modeli altını <b>{fair}</b> seviyesinde görüyor (adil aralık {lo} – {hi}). Piyasa havası <b>{fg} / 100 ({lbl})</b>. Bunu Polymarket olasılıklarıyla karşılaştırın: kalabalık aşırı duyarlılık dönemlerinde adil aralığın dışında büyük hareketler fiyatlıyorsa, dönüş ihtimali artar.',
  cvm_note: 'Yalnızca bilgi amaçlıdır; tahmin veya yatırım tavsiyesi değildir.',
  ratio: 'Oran', now: 'Şimdi', pct_hist: 'Tarihsel %', pct_hist_tip: 'Bugünkü değerin tüm geçmişteki yüzdelik dilimi', ratio_gold_silver: 'Altın / Gümüş', ratio_gold_oil: 'Altın / Petrol (varil)', ratio_spx_gold: 'S&P 500 / Altın', ratio_dow_gold: 'Dow / Altın', ratio_btc_gold: 'Bitcoin / Altın',
  pig_bigmac: 'Bir Big Mac', pig_oil: 'Bir varil petrol', pig_wage: 'ABD’de bir aylık ortalama maaş', pig_house: 'ABD medyan konut', pig_spx: 'S&P 500 endeksi', pig_dji: 'Dow Jones endeksi', pig_btc: 'Bir Bitcoin',
  pig_title: 'Altın cinsinden dünya', pig_sub: 'Dolar yerine altınla ölçülen fiyatlar. Rakamlar düştükçe altının satın alma gücü artmış demektir.',
  pig_note: 'Değişim 2000’den (veya ilk mevcut tarihten) itibaren hesaplanır. Kaynaklar: The Economist Big Mac endeksi, FRED (medyan konut fiyatı, ortalama haftalık kazanç), Yahoo Finance.',
  tools_title: 'Altın araçları', tools_sub: 'Gerçek geçmiş fiyatlara dayanan hesaplayıcılar.',
  tm_title: 'Altın zaman makinesi', tm_sub: 'Sizin için önemli bir tarihte altın alsaydınız ne olurdu: bir doğum günü, düğün ya da ilk maaşınız?',
  tm_date: 'Alış tarihi', tm_amount: 'Yatırılan tutar', tm_nodata: 'Bu tarih için fiyat verisi yok.', peak: 'zirve', bottom: 'dip',
  tm_hero: '{date} tarihinde {amt} ile <b>{g} g</b> altın alınırdı; bugünkü değeri {now}.',
  tm_gold: 'Altın', tm_cash: 'Nakit (yastık altı)', tm_usdcash: 'ABD doları', tm_spx: 'S&P 500 (yalnız fiyat)', tm_tbill: 'ABD hazine bonosu', tm_inflation: 'Enflasyon (alım gücünü korumak için)', cagr: 'yıllık',
  tm_infl_note: 'O gün paranızla alabildiğinizi bugün almak için {v} gerekir.',
  dca_title: 'Birikim planı testi', dca_sub: 'Her ay sabit bir tutar yatırın. Altını, S&P 500’ü ve tüm parayı başta yatırmayı karşılaştırın.',
  dca_start: 'Başlangıç', dca_monthly: 'Aylık tutar', dca_invested: 'Toplam yatırılan', dca_gold_value: 'Altın planı değeri', dca_grams: 'Biriken altın', dca_spx_value: 'S&P 500 planı değeri', dca_lump: 'Başta toplu altın alımı',
  dca_note: 'Her ayın ilk işlem gününde kapanış fiyatından alım yapılır; komisyon, makas ve vergi yoktur. S&P 500 yalnız fiyattır (temettü hariç).',
  jw_title: 'Mücevher & hurda hesaplayıcı', jw_sub: 'Altın takının ayar ve ağırlığa göre eritme değeri ve kuyumcuların genelde ödediği fiyat.',
  jw_weight: 'Ağırlık (gram)', jw_karat: 'Ayar', jw_dealer: 'Kuyumcu öder (eritme %’si)', jw_labor: 'Perakende işçilik / kâr (%)', jw_melt: 'Eritme değeri', jw_dealer_pays: 'Kuyumcu teklifi', jw_retail: 'Tipik satış fiyatı',
  jw_note: 'Hurda alıcılar genelde eritme değerinin %70–95’ini öder. Mağaza fiyatlarına işçilik, tasarım ve kâr eklenir. Canlı spot fiyat kullanılır.', jw_table: 'Ayara göre gram fiyatı', jw_purity: 'Saflık', per_gram: 'Gram başına', fine_gold: 'saf altın',
  world_title: 'Altının dünyası', world_sub: 'Aldığımız şeylere göre altın, onu kimlerin tuttuğu ve ne kadar az olduğu.',
  cb_title: 'Merkez bankası altın rezervleri', cb_top: 'En büyük sahipler (ton)', cb_highlights: 'Son hareketler', cb_notlisted: 'Listemizde yok', asof: 'tarih:',
  cube_title: 'Bugüne kadar çıkarılmış tüm altın', cube_mini: 'Yer üstünde ≈{t} ton altın var. Hepsi eritilse bu genişlikte bir küp oluşurdu.',
  cube_text: 'İnsanlık tarih boyunca yaklaşık <b>{t} ton</b> altın çıkardı. Altın o kadar yoğundur ki (19,3 t/m³) tamamı her kenarı <b>{s} m</b> olan tek bir küpe sığar. Bu yaklaşık {v} m³, yani kabaca {p} olimpik yüzme havuzu eder. Küpün yanındaki küçük figür 1,75 m boyunda bir insandır.',
  cube_share: 'Eşit paylaştırılsa dünyadaki her insana yaklaşık <b>{g} g</b> düşer.', cube_mine: 'Sizin altınınız (gram)', cube_your_side: 'Küpünüzün kenarı', cube_your_share: 'Tüm altındaki payınız', value: 'Değer',
  cube_src: 'Kaynak: Dünya Altın Konseyi, yer üstü stoklar (2026 3. çeyrek sonu: 224.200 ton).',
  tr_title: 'Türkiye altın fiyatları', tr_sub: 'Serbest piyasada gram altın, çeyrek ve Cumhuriyet altını; liraya çevrilmiş uluslararası fiyatla karşılaştırmalı.',
  tr_prices: 'Serbest piyasa fiyatları (₺)', buy: 'Alış', sell: 'Satış', change: 'Değişim', premium: 'Prim', tr_fine_value: 'Saf altın değeri',
  tr_gram: 'Gram altın', tr_ceyrek: 'Çeyrek altın', tr_yarim: 'Yarım altın', tr_tam: 'Tam altın', tr_cumhuriyet: 'Cumhuriyet altını', tr_ata: 'Ata altın', tr_ayar22: '22 ayar (g)', tr_ayar18: '18 ayar (g)', tr_ayar14: '14 ayar (g)', tr_gumus: 'Gümüş (g)',
  tr_src: 'Yerel fiyatlar: Truncgil Finans (serbest piyasa).', tr_unavailable: 'Yerel fiyatlar şu anda alınamıyor.',
  tr_premium_title: 'Kapalıçarşı prim göstergesi', tr_premium_sub: 'Yerel gram fiyatının, liraya çevrilmiş uluslararası fiyatın ne kadar üstünde veya altında olduğu.',
  tr_parity: 'Uluslararası parite (gram)', tr_gram_market: 'Yerel gram fiyatı', tr_premium_hist: 'Prim geçmişi',
  tr_premium_explain: '%0–1,5 arası prim normaldir (rafinaj, taşıma, kuyumcu kârı). Yüksek prim, kur endişesi veya ithalat kısıtları gibi nedenlerle güçlü yerel talebe işaret eder. İskonto ise yerel satış baskısı demektir. Ziynet altınların primi darp maliyetini de içerir.',
  tr_gram_hist: 'Lira cinsinden gram altın (log ölçek)', tr_gram_hist_sub: 'Gram altın (₺) ve USD/TRY kuru. Lira bazında altın, birikimleri kur kaybına karşı korudu.',
  tr_10y: 'On yıl önce bir gram altın yaklaşık {a} idi; bugün {b}, yani {x} kat.',
  seas_title: 'Mevsimsellik laboratuvarı', seas_sub: 'Altının sevdiği aylar var mı? Aylara ve haftanın günlerine göre ortalama getiriler ve her ayın getirisi bir ısı haritasında.',
  seas_monthly: 'Aylara göre ortalama getiri', seas_weekday: 'Haftanın günlerine göre ortalama günlük getiri', seas_heatmap: 'Aylık getiri ısı haritası', period: 'Dönem', last_n_years: 'Son {n} yıl',
  avg_return: 'Ortalama getiri', pct_positive: 'Pozitif ay oranı', average: 'Ort.', year: 'Yıl',
  seas_note: 'Mevsimsel kalıplar ortalamadır; tek bir yıl için zayıf ve güvenilmezdir.',
  ev_cny: 'Çin Yeni Yılı alımları', ev_akshaya: 'Akshaya Tritiya (Hindistan)', ev_diwali: 'Diwali ve Dhanteras', ev_wedding: 'Hindistan düğün sezonu',
  play_title: 'Yükselir mi, düşer mi?', play_sub: 'Tarihi gizlenmiş gerçek bir altın grafiğinin 6 ayını görüyorsunuz. 20 işlem günü sonra altın daha yüksek mi olacak, daha düşük mü? Tarih tahmininizden sonra açıklanır.',
  hl_daily: 'Günlük meydan okuma', hl_endless: 'Sonsuz', hl_round: 'Tur', hl_streak: 'Seri', hl_best: 'En iyi', hl_acc: 'İsabet',
  hl_question: '{n} işlem günü sonra altın nerede olacak?', hl_higher: 'Yükselir', hl_lower: 'Düşer', hl_right: 'Doğru!', hl_wrong: 'Bu sefer olmadı',
  hl_reveal: 'Bu grafik {a} tarihinde başladı. {b} itibarıyla altın {c} değişti ({p0} → {p1}).', hl_next: 'Sonraki grafik',
  hl_daily_done: 'Bugünkü puanınız: {s} / 5', hl_come_back: 'Yarın yeni bir günlük meydan okuma var. Herkes aynı 5 grafiği görür.', hl_play_endless: 'Sonsuz modda oyna',
  about_title: 'GoldPulse hakkında', data_status: 'Veri akışı durumu', status_line: 'Son çalışmada {all} veri kaynağından {ok} tanesi başarıyla alındı ({ago}).', details: 'Ayrıntılar',
  about_html: `<p><b>GoldPulse</b>, tamamen GitHub Pages üzerinde çalışan açık kaynaklı bir altın piyasası sitesidir. Bir GitHub Actions görevi 30 dakikada bir çalışır: ücretsiz kamu verilerini indirir, analizleri hesaplar ve siteyi yayınlar. Tarayıcınız da canlı spot fiyatı 20 saniyede bir doğrudan alır.</p>
  <h3>Veri kaynakları</h3><ul>
  <li><b>Canlı spot fiyat</b>: gold-api.com (XAU/USD), tarayıcınızda 20 saniyede bir.</li>
  <li><b>Fiyat geçmişi</b>: Yahoo Finance üzerinden COMEX altın vadelisi (GC=F), gümüş, dolar endeksi, S&P 500, petrol, Bitcoin ve kurlar. Uzun dönem altın verisi Stooq’tan.</li>
  <li><b>Makro</b>: FRED (10 yıllık TIPS reel faizi, hazine bonoları, ABD TÜFE, medyan konut fiyatı, kazançlar, Türkiye TÜFE).</li>
  <li><b>Pozisyonlar</b>: CFTC Commitments of Traders (ayrıştırılmış, fon yöneticileri).</li>
  <li><b>Haberler</b>: Google Haberler RSS, İngilizce ve Türkçe. Etiketleme ve duyarlılık basit anahtar kelime kurallarıyla yapılır.</li>
  <li><b>Tahmin piyasaları</b>: Polymarket açık API.</li>
  <li><b>Türkiye</b>: Truncgil Finans (serbest piyasa gram, ziynet ve ayar fiyatları).</li>
  <li><b>Rezervler ve yer üstü stoklar</b>: Dünya Altın Konseyi.</li></ul>
  <h3>Yöntem</h3><ul>
  <li><b>Altın neden hareket etti</b>: altının günlük log getirilerinin dolar endeksi, petrol ve S&P 500 log getirileri ile 10 yıllık reel faizdeki günlük değişim üzerine kayan 250 günlük EKK regresyonu. Her etkenin katkısı β × bugünkü hareketidir; kalan kısım “altına özgü”dür.</li>
  <li><b>Adil değer</b>: aylık log(altın), reel faiz ve log(DXY) üzerine regresyonla hesaplanır. Klasik model 2006–2021 verisiyle, uyarlanabilir model eğilim terimiyle kayan 5 yıllık pencereyle tahmin edilir.</li>
  <li><b>Korku & Açgözlülük</b>: yüzdelik dilime göre ölçeklenen en fazla 7 bileşenin ortalaması (momentum, RSI, 52 haftalık aralık, GVZ oynaklığı, altın/gümüş oranı, güvenli liman talebi, CFTC pozisyonları).</li>
  <li><b>Fiyat notu</b>: grafikler spot fiyatın biraz üzerinde işlem gören COMEX ön ay vadelisini kullanır; ana fiyat spottur.</li></ul>
  <p class="muted">Bu sitedeki hiçbir içerik yatırım tavsiyesi değildir. Veriler gecikmeli, revize edilmiş veya hatalı olabilir. İşlem yapmadan önce bankanıza veya kuyumcunuza danışın.</p>`,
};

const DICTS = { en: EN, tr: TR };
let lang = (() => {
  try { const s = JSON.parse(localStorage.getItem('gp_lang')); if (s) return s; } catch { /* */ }
  return (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
})();

export function getLang() { return lang; }
export function setLang(l) { lang = l; try { localStorage.setItem('gp_lang', JSON.stringify(l)); } catch { /* */ } }
export function t(key, vars) {
  let s = DICTS[lang][key] ?? EN[key];
  if (s == null) { console.warn('missing i18n', key); return key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}
export const _dicts = DICTS;
