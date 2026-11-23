# GoldPulse

**Live site:** https://halilozt.github.io/goldpulse/

GoldPulse is a website about the gold market (English / Türkçe). It runs entirely on GitHub Pages and GitHub Actions, with free and keyless data sources.

## Features
- **Interactive dashboard**: drag, resize, add and remove panels; your layout is saved. Global currency (USD, EUR, TRY, GBP, CHF, JPY, INR, CNY, AUD) and unit (oz / g / kg) switches.
- **Live spot price** (refreshed every 20 s in the browser) and a TradingView live chart panel.
- **Interactive chart**: ranges from 1D to Max; compare with silver, the dollar index, S&P 500, Bitcoin, oil and real yields; SMA, Bollinger, RSI and log scale; news and event markers; click any day to see its news, drivers and sentiment.
- **Why did gold move today?** A rolling-regression attribution to the dollar, real yields, oil and stocks.
- **Fair-value model**: classic (2006–2021) and adaptive (5-year window plus trend) models.
- **Gold Fear & Greed index**: 7 components, including CFTC positioning and GVZ.
- **News**: Google News in EN and TR, tagged by topic and scored for sentiment.
- **Prediction markets**: live Polymarket gold odds.
- **The world priced in gold**, **central-bank reserves map**, and **all the gold ever mined** cube.
- **Tools**: gold time machine, savings-plan backtester, jewelry and scrap calculator.
- **Türkiye**: gram, çeyrek, yarım, tam, Cumhuriyet and Ata prices, plus a Grand Bazaar (Kapalıçarşı) premium meter.
- **Seasonality lab** and a **Higher or Lower** game with a daily challenge.

## How it works
`.github/workflows/update-and-deploy.yml` runs every 30 minutes. It runs `scripts/update_data.py`, which fetches data from Yahoo Finance, Stooq, FRED, CFTC, Google News, Polymarket, Truncgil and gold-api.com, and computes the analytics into `data/*.json`. It then deploys the site to GitHub Pages. To make the Turkish premium history and the news archive accumulate, each run reads the previous files back from the live site.

Run locally: `pip install -r scripts/requirements.txt && python scripts/update_data.py` (or `--mock` for synthetic data), then `python -m http.server`.

*Information only, not investment advice.*
