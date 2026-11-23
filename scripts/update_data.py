#!/usr/bin/env python3
"""
GoldPulse data pipeline.

Runs on GitHub Actions (every ~30 min). Fetches free, keyless public data,
computes the analytics (driver attribution, fair value, fear & greed) and
writes JSON files into ./data, which the static site reads.

Usage:
    python scripts/update_data.py            # live run
    python scripts/update_data.py --mock     # synthetic data (for local testing)
"""
from __future__ import annotations

import io
import json
import math
import os
import re
import sys
import time
import traceback
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

import numpy as np
import pandas as pd

try:
    import requests
except ImportError:  # mock mode does not need requests
    requests = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SITE_URL = os.environ.get("SITE_URL", "").rstrip("/")
MOCK = "--mock" in sys.argv
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}
OZ_G = 31.1034768

status: dict = {"sources": {}, "errors": []}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def log(name: str, ok: bool, info: str = "") -> None:
    status["sources"][name] = {"ok": ok, "info": info[:200]}
    print(("OK   " if ok else "FAIL ") + name + (" - " + info if info else ""), flush=True)


def http_get(url: str, params=None, tries: int = 2, timeout: int = 25, headers=None):
    last = None
    for i in range(tries):
        try:
            r = requests.get(url, params=params, headers={**UA, **(headers or {})}, timeout=timeout)
            if r.status_code == 200:
                return r
            last = f"HTTP {r.status_code}"
        except Exception as e:  # noqa: BLE001
            last = str(e)
        if i < tries - 1:
            time.sleep(2 + 3 * i)
    raise RuntimeError(f"{url}: {last}")


def write_json(name: str, obj) -> None:
    path = os.path.join(DATA, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def clean(x, nd=4):
    """Round floats and turn NaN/inf into None (JSON safe)."""
    if x is None:
        return None
    try:
        xf = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(xf) or math.isinf(xf):
        return None
    return round(xf, nd)


def prev_archive(name: str, default):
    """Load the previous copy of an accumulating file (from the live site, else repo)."""
    if SITE_URL and not MOCK:
        try:
            r = http_get(f"{SITE_URL}/data/{name}", tries=2, timeout=20)
            return r.json()
        except Exception as e:  # noqa: BLE001
            print("prev archive from site failed:", name, e)
    path = os.path.join(DATA, name)
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:  # noqa: BLE001
            pass
    return default


# ---------------------------------------------------------------- fetchers

def yahoo(symbol: str, rng: str = "max", interval: str = "1d") -> pd.Series:
    last_err = None
    for host in ("query1", "query2"):
        try:
            r = http_get(
                f"https://{host}.finance.yahoo.com/v8/finance/chart/{symbol}",
                params={"range": rng, "interval": interval, "includePrePost": "false"},
            )
            res = r.json()["chart"]["result"][0]
            ts = res["timestamp"]
            close = res["indicators"]["quote"][0]["close"]
            idx = pd.to_datetime(ts, unit="s", utc=True)
            s = pd.Series(close, index=idx, dtype="float64").dropna()
            if interval == "1d":
                gmt = res.get("meta", {}).get("gmtoffset", 0) or 0
                s.index = (s.index + pd.Timedelta(seconds=gmt)).tz_localize(None).normalize()
                s = s[~s.index.duplicated(keep="last")]
            return s
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"yahoo {symbol}: {last_err}")


def stooq(symbol: str) -> pd.Series:
    r = http_get("https://stooq.com/q/d/l/", params={"s": symbol, "i": "d"})
    df = pd.read_csv(io.StringIO(r.text))
    if "Close" not in df.columns:
        raise RuntimeError("stooq: no data")
    s = pd.Series(df["Close"].values, index=pd.to_datetime(df["Date"]), dtype="float64").dropna()
    return s


def fred(series_id: str) -> pd.Series:
    r = http_get("https://fred.stlouisfed.org/graph/fredgraph.csv", params={"id": series_id})
    df = pd.read_csv(io.StringIO(r.text))
    dcol = df.columns[0]
    vals = pd.to_numeric(df[series_id], errors="coerce")
    return pd.Series(vals.values, index=pd.to_datetime(df[dcol])).dropna()


def yf_bulk(tickers, period="max", interval="1d"):
    """Download close prices with yfinance (handles Yahoo cookies/crumb). Returns {ticker: Series}."""
    import yfinance as yf
    out = {}
    df = yf.download(list(tickers), period=period, interval=interval, auto_adjust=False, progress=False,
                     threads=False, group_by="column")
    if df is None or df.empty:
        return out
    close = df["Close"] if "Close" in df.columns.get_level_values(0) else df
    if isinstance(close, pd.Series):
        close = close.to_frame(name=list(tickers)[0])
    for tk in close.columns:
        sr = close[tk].dropna().astype("float64")
        if not len(sr):
            continue
        idx = sr.index
        if interval == "1d":
            idx = pd.DatetimeIndex(idx).tz_localize(None) if getattr(idx, "tz", None) is not None else pd.DatetimeIndex(idx)
            sr.index = idx.normalize()
            sr = sr[~sr.index.duplicated(keep="last")]
        out[tk] = sr
    return out


def treasury(kind: str, col_match: str, start_year: int = 2003) -> pd.Series:
    """US Treasury daily rates CSV (keyless). kind: daily_treasury_real_yield_curve | daily_treasury_bill_rates"""
    parts = []
    for y in range(start_year, datetime.now().year + 1):
        try:
            r = http_get(f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{y}/all",
                         params={"type": kind, "field_tdr_date_value": str(y), "page": "", "_format": "csv"}, tries=2, timeout=30)
            df = pd.read_csv(io.StringIO(r.text))
            col = next(c for c in df.columns if col_match.lower() in c.lower())
            parts.append(pd.Series(pd.to_numeric(df[col], errors="coerce").values, index=pd.to_datetime(df["Date"])))
        except Exception as e:  # noqa: BLE001
            print("treasury", kind, y, e)
    if not parts:
        raise RuntimeError("treasury: no data")
    return pd.concat(parts).dropna().sort_index()


def bls(series_id: str, start: int = 1990) -> pd.Series:
    """Monthly series from the keyless BLS v1 API (10-year chunks). Placeholder values like '-' are skipped."""
    vals = {}
    now = datetime.now().year
    for y0 in range(start, now + 1, 10):
        r = requests.post("https://api.bls.gov/publicAPI/v1/timeseries/data/", json={
            "seriesid": [series_id], "startyear": str(y0), "endyear": str(min(y0 + 9, now))}, headers=UA, timeout=30)
        for d in r.json()["Results"]["series"][0]["data"]:
            if d["period"].startswith("M") and d["period"] != "M13":
                try:
                    vals[pd.Timestamp(int(d["year"]), int(d["period"][1:]), 1)] = float(d["value"])
                except ValueError:
                    continue
    if not vals:
        raise RuntimeError("bls: no data")
    return pd.Series(vals).sort_index()


def macro_from_prev(key: str):
    """Re-use a monthly series from the previous run (BLS allows few keyless calls per day)."""
    prev = prev_archive("macro.json", {})
    m = prev.get(key)
    if not m:
        return None
    return pd.Series(m["values"], index=pd.to_datetime(m["dates"]), dtype="float64").dropna()


# ---------------------------------------------------------------- mock data

def mock_series(start: str, mu: float, sig: float, s0: float, seed: int, freq="B") -> pd.Series:
    rng = np.random.default_rng(seed)
    idx = pd.date_range(start, pd.Timestamp.today().normalize(), freq=freq)
    r = rng.normal(mu, sig, len(idx))
    return pd.Series(s0 * np.exp(np.cumsum(r)), index=idx)


def mock_all():
    m = {}
    m["gold"] = mock_series("1990-01-01", 0.0003, 0.010, 400, 1)
    m["silver"] = m["gold"] / mock_series("1990-01-01", 0.0, 0.006, 75, 2)
    m["dxy"] = mock_series("1990-01-01", 0.0, 0.004, 100, 3)
    m["spx"] = mock_series("1990-01-01", 0.0003, 0.011, 330, 4)
    m["dji"] = m["spx"] * 8
    m["btc"] = mock_series("2014-09-17", 0.0015, 0.04, 450, 5, freq="D")
    m["oil"] = mock_series("2000-08-23", 0.0001, 0.02, 30, 6)
    m["tnx"] = 4 + mock_series("1990-01-01", 0, 0.01, 1, 7) - 1
    m["gvz"] = 16 * mock_series("2008-06-03", 0, 0.03, 1, 8)
    m["realyield"] = mock_series("2003-01-02", 0, 0.01, 1.5, 9) - 0.5
    fx = {"EUR": 0.92, "GBP": 0.79, "TRY": 1.0, "JPY": 150, "INR": 83, "CNY": 7.2, "CHF": 0.88, "AUD": 1.5}
    for k, v in fx.items():
        m["fx_" + k] = mock_series("2003-12-01", 0.0002 if k == "TRY" else 0, 0.005, v, 10 + len(k) + int(v))
    m["fx_TRY"] = m["fx_TRY"] * 1.5
    m["tbill"] = mock_series("1990-01-01", 0, 0.005, 2.5, 20)
    m["cpi_us"] = mock_series("1990-01-01", 0.0022, 0.001, 130, 21, freq="MS")
    m["cpi_tr"] = mock_series("2003-01-01", 0.015, 0.005, 40, 22, freq="MS")
    m["house"] = mock_series("1990-01-01", 0.011, 0.02, 120000, 23, freq="QS")
    m["wage"] = mock_series("2006-03-01", 0.003, 0.002, 700, 24, freq="MS")
    m["bigmac"] = mock_series("2000-04-01", 0.016, 0.01, 2.5, 25, freq="6MS")
    return m


# ---------------------------------------------------------------- collection

YAHOO = {
    "gold": "GC=F", "silver": "SI=F", "dxy": "DX-Y.NYB", "spx": "^GSPC", "dji": "^DJI",
    "btc": "BTC-USD", "oil": "CL=F", "tnx": "^TNX", "gvz": "^GVZ",
    "fx_EUR": "EURUSD=X", "fx_GBP": "GBPUSD=X", "fx_TRY": "TRY=X", "fx_JPY": "JPY=X",
    "fx_INR": "INR=X", "fx_CNY": "CNY=X", "fx_CHF": "CHF=X", "fx_AUD": "AUDUSD=X",
}
INVERT = {"fx_EUR", "fx_GBP", "fx_AUD"}  # quoted as X/USD -> we want USD->X
STOOQ_FALLBACK = {"gold": "xauusd", "silver": "xagusd", "spx": "^spx", "dji": "^dji", "btc": "btcusd",
                  "fx_TRY": "usdtry", "fx_EUR": "eurusd", "fx_GBP": "gbpusd", "fx_JPY": "usdjpy"}
FRED = {"realyield": "DFII10", "tbill": "DTB3", "cpi_us": "CPIAUCSL", "house": "MSPUS",
        "wage": "CES0500000011", "cpi_tr": "TURCPIALLMINMEI"}


def collect():
    if MOCK:
        m = mock_all()
        for k in m:
            log(k, True, "mock")
        return m
    m = {}
    # 1) yfinance bulk (primary)
    try:
        got = yf_bulk(YAHOO.values())
        for key, sym in YAHOO.items():
            if sym in got and len(got[sym]) > 20:
                sr = got[sym]
                m[key] = 1.0 / sr if key in INVERT else sr
                log(key, True, f"yfinance {sym} {len(sr)} rows")
    except Exception as e:  # noqa: BLE001
        log("yfinance", False, str(e))
    # 2) raw Yahoo chart API for anything missing
    for key, sym in YAHOO.items():
        if key in m:
            continue
        try:
            sr = yahoo(sym)
            m[key] = 1.0 / sr if key in INVERT else sr
            log(key, True, f"yahoo {sym} {len(sr)} rows")
        except Exception as e:  # noqa: BLE001
            log(key, False, str(e)[:120])
        time.sleep(0.5)
    # 3) macro: FRED first (short timeout), then official fallbacks
    for key, sid in FRED.items():
        try:
            r = http_get("https://fred.stlouisfed.org/graph/fredgraph.csv", params={"id": sid}, tries=1, timeout=40)
            df = pd.read_csv(io.StringIO(r.text))
            vals = pd.to_numeric(df[sid], errors="coerce")
            m[key] = pd.Series(vals.values, index=pd.to_datetime(df[df.columns[0]])).dropna()
            log(key, True, f"FRED {sid} {len(m[key])} rows")
        except Exception as e:  # noqa: BLE001
            log(key, False, "FRED " + str(e)[:100])
    fallbacks = {
        "realyield": lambda: treasury("daily_treasury_real_yield_curve", "10 YR"),
        "tbill": lambda: treasury("daily_treasury_bill_rates", "13 WEEKS COUPON EQUIVALENT", 2003),
        "cpi_us": lambda: bls("CUUR0000SA0"),
        "wage": lambda: bls("CES0500000011", 2006),
    }
    refresh_monthly = datetime.now(timezone.utc).hour in (6, 18)
    for key, fn in fallbacks.items():
        if key in m:
            continue
        if key in ("cpi_us", "wage") and not refresh_monthly:
            prev = macro_from_prev(key)
            if prev is not None and len(prev):
                m[key] = prev
                log(key, True, f"kept from previous run ({len(prev)} rows)")
                continue
        try:
            m[key] = fn()
            log(key, True, f"fallback {len(m[key])} rows")
        except Exception as e:  # noqa: BLE001
            log(key + "_fallback", False, str(e)[:150])
    try:
        r = http_get("https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv")
        df = pd.read_csv(io.StringIO(r.text))
        us = df[df["iso_a3"] == "USA"]
        m["bigmac"] = pd.Series(us["dollar_price"].values, index=pd.to_datetime(us["date"]))
        log("bigmac", True, f"{len(us)} rows")
    except Exception as e:  # noqa: BLE001
        log("bigmac", False, str(e))
    return m


# ---------------------------------------------------------------- outputs

def build_history(m):
    gold = m["gold"].sort_index()
    idx = gold.index
    out = {"updated": now_iso(), "dates": [d.strftime("%Y-%m-%d") for d in idx], "series": {}}
    keys = ["gold", "silver", "dxy", "spx", "dji", "btc", "oil", "tnx", "gvz", "realyield", "tbill"]
    keys += [k for k in m if k.startswith("fx_")]
    for k in keys:
        if k not in m:
            continue
        s = m[k].sort_index()
        s = s[~s.index.duplicated(keep="last")]
        a = s.reindex(idx.union(s.index)).ffill(limit=7).reindex(idx)
        nd = 2 if k in ("gold", "spx", "dji", "btc") else 4
        out["series"][k] = [clean(v, nd) for v in a.values]
    write_json("history.json", out)
    return out


def monthly(s: pd.Series) -> pd.Series:
    return s.sort_index().resample("MS").last().dropna()


def build_macro(m):
    out = {"updated": now_iso()}
    for k in ("cpi_us", "cpi_tr", "house", "wage", "bigmac"):
        if k in m:
            s = monthly(m[k]) if k != "bigmac" else m[k].sort_index()
            out[k] = {"dates": [d.strftime("%Y-%m-%d") for d in s.index], "values": [clean(v, 3) for v in s.values]}
    write_json("macro.json", out)


def build_intraday(m):
    out = {"updated": now_iso(), "series": {}}
    if MOCK:
        g = m["gold"].iloc[-1]
        idx = pd.date_range(end=pd.Timestamp.now("UTC").floor("15min"), periods=5 * 96, freq="15min")
        rng = np.random.default_rng(7)
        vals = g * np.exp(np.cumsum(rng.normal(0, 0.0012, len(idx))))
        out["series"]["gold"] = [[int(t.timestamp()), clean(v, 2)] for t, v in zip(idx, vals)]
        log("intraday", True, "mock")
    else:
        got = {}
        try:
            got = yf_bulk(["GC=F", "SI=F"], period="5d", interval="15m")
        except Exception as e:  # noqa: BLE001
            log("intraday_yf", False, str(e)[:120])
        for key, sym in (("gold", "GC=F"), ("silver", "SI=F")):
            try:
                s = got.get(sym)
                if s is None or not len(s):
                    s = yahoo(sym, "5d", "15m")
                out["series"][key] = [[int(t.timestamp()), clean(v, 3)] for t, v in s.items()]
                log("intraday_" + key, True, f"{len(s)} pts")
            except Exception as e:  # noqa: BLE001
                log("intraday_" + key, False, str(e))
    write_json("intraday.json", out)
    return out


def build_latest(m, intraday):
    g = m["gold"].dropna()
    last_close = float(g.iloc[-1])
    prev_close = float(g.iloc[-2])
    price = last_close
    pts = intraday["series"].get("gold") or []
    if pts:
        price = float(pts[-1][1])
        # previous close = last daily close before today's session
        today = datetime.fromtimestamp(pts[-1][0], tz=timezone.utc).date()
        gd = g[g.index.date < today]
        if len(gd):
            prev_close = float(gd.iloc[-1])
    fx = {"USD": 1.0}
    for k in m:
        if k.startswith("fx_"):
            fx[k[3:]] = clean(m[k].dropna().iloc[-1], 5)
    out = {
        "updated": now_iso(),
        "gold": clean(price, 2), "prev_close": clean(prev_close, 2),
        "change": clean(price - prev_close, 2), "change_pct": clean((price / prev_close - 1) * 100, 3),
        "silver": clean(m["silver"].dropna().iloc[-1], 3) if "silver" in m else None,
        "fx": fx,
        "ath": clean(g.max(), 2), "ath_date": g.idxmax().strftime("%Y-%m-%d"),
        "high_52w": clean(g.iloc[-252:].max(), 2), "low_52w": clean(g.iloc[-252:].min(), 2),
    }
    for k in ("spx", "btc", "oil", "dxy", "tnx", "realyield"):
        if k in m and len(m[k].dropna()) > 1:
            s = m[k].dropna()
            out[k] = clean(s.iloc[-1], 3)
            out[k + "_chg"] = clean((s.iloc[-1] / s.iloc[-2] - 1) * 100, 3) if k not in ("tnx", "realyield") else clean(s.iloc[-1] - s.iloc[-2], 3)
    # live spot reference (gold-api.com) so the browser can compute a consistent day change
    try:
        if MOCK:
            spot = price * 0.99
        else:
            spot = float(http_get("https://api.gold-api.com/price/XAU", tries=2).json()["price"])
        basis = price / spot if spot else 1.0
        out["spot"] = clean(spot, 2)
        out["basis"] = clean(basis, 5)
        out["spot_prev_close"] = clean(prev_close / basis, 2)
        log("spot", True, f"spot {spot} basis {basis:.4f}")
    except Exception as e:  # noqa: BLE001
        log("spot", False, str(e))
    write_json("latest.json", out)
    return out


# ------------------------------------------------ analytics: drivers (rolling OLS)

def build_drivers(m):
    g = m["gold"]
    df = pd.DataFrame({"gold": np.log(g)})
    factors = {}
    if "dxy" in m:
        df["dxy"] = np.log(m["dxy"]); factors["dxy"] = "log"
    if "realyield" in m:
        df["realyield"] = m["realyield"]; factors["realyield"] = "diff"
    elif "tnx" in m:
        df["realyield"] = m["tnx"]; factors["realyield"] = "diff"
    if "oil" in m:
        df["oil"] = np.log(m["oil"].where(m["oil"] > 0)); factors["oil"] = "log"
    if "spx" in m:
        df["spx"] = np.log(m["spx"]); factors["spx"] = "log"
    df = df.sort_index().ffill(limit=3).dropna()
    df = df[df.index >= df.index.max() - pd.Timedelta(days=365 * 6)]
    r = df.diff().dropna()
    r = r[(r["gold"].abs() < 0.15)]
    fx = list(factors)
    win = 250
    rows = []
    betas_last = None
    r2_last = None
    for i in range(max(win, len(r) - 60), len(r)):
        w = r.iloc[i - win:i]  # estimate on the previous 250 days (out-of-sample for day i)
        X = np.column_stack([np.ones(len(w))] + [w[f].values for f in fx])
        y = w["gold"].values
        beta, *_ = np.linalg.lstsq(X, y, rcond=None)
        resid = y - X @ beta
        r2 = 1 - resid.var() / y.var() if y.var() > 0 else 0
        today = r.iloc[i]
        contrib = {f: float(beta[j + 1] * today[f]) * 100 for j, f in enumerate(fx)}
        total = float(today["gold"]) * 100
        contrib["other"] = total - sum(contrib.values())
        rows.append({"date": r.index[i].strftime("%Y-%m-%d"), "total": clean(total, 3),
                     "contrib": {k: clean(v, 3) for k, v in contrib.items()},
                     "moves": {f: clean(today[f] * (100 if factors[f] == "log" else 1), 4) for f in fx}})
        betas_last, r2_last = beta, r2
    out = {"updated": now_iso(), "window": win, "factors": fx,
           "betas": {f: clean(betas_last[j + 1], 4) for j, f in enumerate(fx)} if betas_last is not None else {},
           "r2": clean(r2_last, 3), "days": rows}
    write_json("drivers.json", out)
    log("drivers", True, f"{len(rows)} days")


# ------------------------------------------------ analytics: fair value

def ols(y, X):
    X1 = np.column_stack([np.ones(len(X))] + [X[:, j] for j in range(X.shape[1])])
    b, *_ = np.linalg.lstsq(X1, y, rcond=None)
    fit = X1 @ b
    res = y - fit
    r2 = 1 - res.var() / y.var()
    return b, fit, res, r2


def build_fairvalue(m):
    if "realyield" not in m or "dxy" not in m:
        log("fairvalue", False, "missing inputs")
        return
    df = pd.DataFrame({"gold": monthly(m["gold"]), "ry": monthly(m["realyield"]), "dxy": monthly(m["dxy"])}).dropna()
    # trend term captures slow structural demand (EM central banks etc.)
    df["t"] = (df.index - df.index[0]).days / 365.25
    y = np.log(df["gold"].values)
    out = {"updated": now_iso(), "dates": [d.strftime("%Y-%m-%d") for d in df.index],
           "actual": [clean(v, 2) for v in df["gold"].values], "models": {}}
    # classic model: real yield + dollar, estimated on 2006-2021 (pre-break)
    mask = (df.index >= "2006-01-01") & (df.index < "2022-01-01")
    if mask.sum() > 60:
        Xc = df[["ry", "dxy"]].values.copy(); Xc[:, 1] = np.log(Xc[:, 1])
        b, _, res, r2 = ols(y[mask], Xc[mask])
        fit_all = b[0] + Xc @ b[1:]
        sd = res.std()
        out["models"]["classic"] = {
            "desc": "log(gold) = a + b1*real10y + b2*log(DXY), fit 2006-2021",
            "params": {"a": clean(b[0], 4), "real_yield": clean(b[1], 4), "log_dxy": clean(b[2], 4)},
            "r2": clean(r2, 3), "sd": clean(sd, 4),
            "fair": [clean(math.exp(v), 2) for v in fit_all]}
    # adaptive model: same + trend, rolling 5-year window ending today
    win = 60
    if len(df) > win + 5:
        Xa = np.column_stack([df["ry"].values, np.log(df["dxy"].values), df["t"].values])
        b, _, res, r2 = ols(y[-win:], Xa[-win:])
        fit_all = b[0] + Xa @ b[1:]
        sd = res.std()
        fair_now = math.exp(fit_all[-1])
        out["models"]["adaptive"] = {
            "desc": "log(gold) = a + b1*real10y + b2*log(DXY) + b3*trend, rolling 5y window",
            "params": {"a": clean(b[0], 4), "real_yield": clean(b[1], 4), "log_dxy": clean(b[2], 4), "trend": clean(b[3], 4)},
            "r2": clean(r2, 3), "sd": clean(sd, 4),
            "fair": [clean(math.exp(v), 2) for v in fit_all],
            "start": df.index[-win].strftime("%Y-%m-%d")}
        last = float(m["gold"].dropna().iloc[-1])
        z = (math.log(last) - math.log(fair_now)) / sd if sd > 0 else 0
        out["now"] = {"price": clean(last, 2), "fair": clean(fair_now, 2), "z": clean(z, 2),
                      "band_lo": clean(fair_now * math.exp(-1.5 * sd), 2), "band_hi": clean(fair_now * math.exp(1.5 * sd), 2)}
    write_json("fairvalue.json", out)
    log("fairvalue", True, "")


# ------------------------------------------------ COT positioning

def fetch_cot():
    if MOCK:
        idx = pd.date_range(end=pd.Timestamp.today(), periods=400, freq="W-TUE")
        rng = np.random.default_rng(3)
        net = 150000 + np.cumsum(rng.normal(0, 8000, len(idx)))
        oi = 500000 + rng.normal(0, 20000, len(idx))
        log("cot", True, "mock")
        return pd.DataFrame({"net": net, "oi": oi}, index=idx)
    try:
        r = http_get("https://publicreporting.cftc.gov/resource/72hh-3qpy.json", params={
            "cftc_contract_market_code": "088691", "$order": "report_date_as_yyyy_mm_dd DESC", "$limit": "800"})
        rows = r.json()
        recs = []
        for x in rows:
            try:
                recs.append((pd.to_datetime(x["report_date_as_yyyy_mm_dd"][:10]),
                             float(x["m_money_positions_long_all"]) - float(x["m_money_positions_short_all"]),
                             float(x["open_interest_all"])))
            except Exception:  # noqa: BLE001
                continue
        df = pd.DataFrame(recs, columns=["d", "net", "oi"]).set_index("d").sort_index()
        df = df[~df.index.duplicated()]
        log("cot", True, f"{len(df)} weeks")
        return df
    except Exception as e:  # noqa: BLE001
        log("cot", False, str(e))
        return None


# ------------------------------------------------ Fear & Greed

def pct_rank(s: pd.Series, win: int) -> pd.Series:
    return s.rolling(win, min_periods=int(win * 0.5)).apply(lambda a: (a[:-1] < a[-1]).mean() * 100 if len(a) > 1 else np.nan, raw=True)


def rsi(s: pd.Series, n=14) -> pd.Series:
    d = s.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + up / dn)


def build_feargreed(m, cot):
    g = m["gold"].dropna()
    g = g[g.index >= g.index.max() - pd.Timedelta(days=365 * 8)]
    comp = {}
    comp["momentum"] = pct_rank(g / g.rolling(125).mean() - 1, 756)
    comp["rsi"] = rsi(g)
    hi, lo = g.rolling(252).max(), g.rolling(252).min()
    comp["range"] = (g - lo) / (hi - lo) * 100
    if "gvz" in m:
        v = m["gvz"].reindex(g.index).ffill(limit=5)
        comp["volatility"] = 100 - pct_rank(v, 756)
    if "silver" in m:
        ratio = g / m["silver"].reindex(g.index).ffill(limit=5)
        comp["gsratio"] = 100 - pct_rank(ratio, 756)
    if "spx" in m:
        rel = np.log(g).diff(20) - np.log(m["spx"].reindex(g.index).ffill(limit=5)).diff(20)
        comp["haven"] = pct_rank(rel, 756)
    if cot is not None and len(cot) > 30:
        pos = (cot["net"] / cot["oi"])
        pr = pct_rank(pos, 156)
        comp["positioning"] = pr.reindex(g.index.union(pr.index)).ffill().reindex(g.index)
    df = pd.DataFrame(comp)
    score = df.mean(axis=1, skipna=True)
    last = df.iloc[-1]

    def label(v):
        return "extreme_fear" if v < 20 else "fear" if v < 40 else "neutral" if v < 60 else "greed" if v < 80 else "extreme_greed"

    hist = score.dropna().iloc[-504:]
    out = {"updated": now_iso(), "score": clean(score.iloc[-1], 1), "label": label(score.iloc[-1]),
           "components": {k: clean(v, 1) for k, v in last.items()},
           "ago": {"week": clean(score.iloc[-6], 1), "month": clean(score.iloc[-22], 1), "year": clean(score.iloc[-253], 1) if len(score) > 253 else None},
           "history": {"dates": [d.strftime("%Y-%m-%d") for d in hist.index], "values": [clean(v, 1) for v in hist.values]}}
    write_json("feargreed.json", out)
    if cot is not None:
        c = cot.iloc[-260:]
        write_json("cot.json", {"updated": now_iso(), "dates": [d.strftime("%Y-%m-%d") for d in c.index],
                                "net": [clean(v, 0) for v in c["net"].values], "oi": [clean(v, 0) for v in c["oi"].values]})
    log("feargreed", True, f"score {out['score']}")


# ------------------------------------------------ News

NEWS_FEEDS = [
    ("en", "gold price"), ("en", "gold market"), ("en", "central bank gold"), ("en", "gold ETF"),
    ("tr", "altın fiyatları"), ("tr", "gram altın"), ("tr", "ons altın"),
]
TAGS = {
    "fed": ["fed ", "federal reserve", "powell", "rate cut", "rate hike", "interest rate", "fomc", "faiz", "fed'"],
    "geopolitics": ["war", "iran", "israel", "russia", "ukraine", "tension", "conflict", "tariff", "sanction", "savaş", "gerilim", "jeopolitik", "gümrük"],
    "centralbanks": ["central bank", "pboc", "reserves", "merkez bankası", "rezerv", "tcmb"],
    "demand": ["india", "china", "jewel", "wedding", "etf", "demand", "buying", "talep", "kuyum", "mücevher"],
    "dollar": ["dollar", "dolar", "dxy", "yield", "treasur", "tahvil", "getiri"],
    "inflation": ["inflation", "cpi", "pce", "enflasyon", "tüfe"],
}
POS = ["rise", "rises", "rose", "gain", "jump", "record", "rally", "surge", "climb", "soar", "higher", "high", "up ", "rebound", "boost",
       "yüksel", "art", "rekor", "zirve", "tırman", "prim"]
NEG = ["fall", "falls", "fell", "drop", "slide", "slump", "plunge", "tumble", "lower", "retreat", "sink", "down ", "loss", "decline", "slip", "weak",
       "düş", "geriledi", "geril", "kayb", "değer kaybı", "sert düşüş"]
MAJOR = ["record", "all-time", "plunge", "surge", "crash", "soar", "rekor", "tarihi zirve", "sert", "çakıldı", "war", "savaş"]


def tag_news(title: str):
    t = " " + title.lower() + " "
    tags = [k for k, words in TAGS.items() if any(w in t for w in words)]
    p = sum(1 for w in POS if w in t)
    n = sum(1 for w in NEG if w in t)
    sent = 1 if p > n else -1 if n > p else 0
    major = any(w in t for w in MAJOR)
    return tags, sent, major


def build_news():
    archive = prev_archive("news.json", {"items": []}).get("items", [])
    seen = {x["title"].lower() for x in archive}
    new = []
    if MOCK:
        base = datetime.now(timezone.utc)
        samples = ["Gold rises to record as Fed signals rate cuts", "Gold falls as dollar strengthens", "Central banks keep buying gold - WGC",
                   "Gold ETF inflows jump in Asia", "Gram altın rekor kırdı", "Ons altın geriledi, dolar güçlendi",
                   "Gold slips ahead of US inflation data", "Geopolitical tension lifts gold demand"]
        for i, s in enumerate(samples * 3):
            d = base - timedelta(hours=7 * i)
            tags, sent, major = tag_news(s)
            new.append({"title": f"{s} ({i})", "link": "https://example.com", "source": "Mock News", "date": d.replace(microsecond=0).isoformat(),
                        "lang": "tr" if any(c in s for c in "ığşçöü") else "en", "tags": tags, "sent": sent, "major": major})
        log("news", True, "mock")
    else:
        for lang, q in NEWS_FEEDS:
            hl, gl, ceid = ("en-US", "US", "US:en") if lang == "en" else ("tr", "TR", "TR:tr")
            try:
                r = http_get("https://news.google.com/rss/search", params={"q": q + " when:7d", "hl": hl, "gl": gl, "ceid": ceid})
                root = ET.fromstring(r.content)
                cnt = 0
                for it in root.iter("item"):
                    title = (it.findtext("title") or "").strip()
                    src_el = it.find("source")
                    source = (src_el.text if src_el is not None else "") or ""
                    if source and title.endswith(" - " + source):
                        title = title[: -len(source) - 3]
                    if not title or title.lower() in seen:
                        continue
                    try:
                        d = parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc)
                    except Exception:  # noqa: BLE001
                        d = datetime.now(timezone.utc)
                    tags, sent, major = tag_news(title)
                    seen.add(title.lower())
                    new.append({"title": title, "link": it.findtext("link") or "", "source": source,
                                "date": d.replace(microsecond=0).isoformat(), "lang": lang, "tags": tags, "sent": sent, "major": major})
                    cnt += 1
                log(f"news_{lang}_{q}", True, f"{cnt} new")
            except Exception as e:  # noqa: BLE001
                log(f"news_{lang}_{q}", False, str(e))
    items = sorted(new + archive, key=lambda x: x["date"], reverse=True)
    # keep 400 most recent of each language + all "major" items for chart markers (max 1500)
    keep, counts = [], {"en": 0, "tr": 0}
    for x in items:
        lang = x.get("lang", "en")
        if counts.get(lang, 0) < 400 or (x.get("major") and len(keep) < 1500):
            keep.append(x)
            counts[lang] = counts.get(lang, 0) + 1
    write_json("news.json", {"updated": now_iso(), "items": keep})


# ------------------------------------------------ Polymarket

def build_polymarket():
    out = {"updated": now_iso(), "events": []}
    if MOCK:
        out["events"] = [{"title": "What will Gold (GC) hit by end of December?", "slug": "mock", "endDate": "2026-12-31T00:00:00Z", "volume": 120000,
                          "markets": [{"label": f"↑ ${p}", "prob": pr, "volume": 10000} for p, pr in ((3800, 0.32), (4000, 0.14), (4200, 0.05))]
                          + [{"label": f"↓ ${p}", "prob": pr, "volume": 8000} for p, pr in ((3300, 0.22), (3100, 0.08))]}]
        write_json("polymarket.json", out)
        log("polymarket", True, "mock")
        return
    try:
        evs = []
        for q in ("gold", "gold price", "XAUUSD"):
            r = http_get("https://gamma-api.polymarket.com/public-search", params={"q": q, "limit_per_type": 30, "events_status": "active"})
            evs += r.json().get("events", []) or []
        seen = set()
        for e in evs:
            title = e.get("title") or ""
            if e.get("id") in seen or e.get("closed") or not re.search(r"\bgold\b|xau|\(gc\)", title, re.I):
                continue
            if re.search(r"alchemy|fusion|medal|olymp|golden|goldman|cup|card", title, re.I):
                continue
            # skip intraday micro-markets ("Up or Down - Nov 23, 3:00AM-3:15AM ET")
            if re.search(r"\d{1,2}:\d{2}\s*[AP]M\s*-", title, re.I):
                continue
            if float(e.get("volume") or 0) < 1000:
                continue
            seen.add(e.get("id"))
            mk = []
            for mm in e.get("markets") or []:
                if mm.get("closed"):
                    continue
                try:
                    prices = json.loads(mm.get("outcomePrices") or "[]")
                    outcomes = json.loads(mm.get("outcomes") or "[]")
                    yes = float(prices[outcomes.index("Yes")]) if "Yes" in outcomes else float(prices[0])
                except Exception:  # noqa: BLE001
                    continue
                mk.append({"label": mm.get("groupItemTitle") or mm.get("question") or "", "question": mm.get("question") or "",
                           "prob": clean(yes, 4), "volume": clean(mm.get("volumeNum") or mm.get("volume") or 0, 0)})
            if mk:
                out["events"].append({"title": title, "slug": e.get("slug"), "endDate": e.get("endDate"),
                                      "volume": clean(e.get("volume") or 0, 0), "markets": mk[:20]})
        # price-level markets first, then by volume
        out["events"].sort(key=lambda x: (0 if re.search(r"hit|above|below|settle|close|price", x["title"], re.I) else 1, -(x.get("volume") or 0)))
        out["events"] = out["events"][:8]
        log("polymarket", True, f"{len(out['events'])} events")
    except Exception as e:  # noqa: BLE001
        log("polymarket", False, str(e))
    write_json("polymarket.json", out)


# ------------------------------------------------ Turkey

TR_ITEMS = {  # key: (feed key, gross grams, purity)
    "gram": ("GRA", 1.0, 0.995), "ceyrek": ("CEYREKALTIN", 1.754, 0.916), "yarim": ("YARIMALTIN", 3.508, 0.916),
    "tam": ("TAMALTIN", 7.016, 0.916), "cumhuriyet": ("CUMHURIYETALTINI", 7.216, 0.916), "ata": ("ATAALTIN", 7.216, 0.916),
    "ayar22": ("YIA", 1.0, 0.916), "ayar18": ("18AYARALTIN", 1.0, 0.750), "ayar14": ("14AYARALTIN", 1.0, 0.585),
    "gumus": ("GUMUS", 1.0, 1.0),
}


def tr_num(v):
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace("%", "").replace("$", "")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def build_turkey(latest):
    hist = prev_archive("turkey.json", {}).get("history", [])
    out = {"updated": now_iso(), "items": {}, "source": "truncgil", "history": hist}
    try:
        if MOCK:
            usdtry = latest["fx"].get("TRY") or 34
            parity = latest["gold"] * usdtry / OZ_G
            feed = {k: {"Buying": parity * g * p * 1.01 if k != "GUMUS" else 40, "Selling": parity * g * p * 1.03 if k != "GUMUS" else 41, "Change": 0.4}
                    for _, (k, g, p) in TR_ITEMS.items()}
            feed["ONS"] = {"Selling": latest["gold"]}; feed["USD"] = {"Selling": usdtry}
            feed["Update_Date"] = now_iso()
        else:
            feed = http_get("https://finans.truncgil.com/v4/today.json").json()
        ons = tr_num((feed.get("ONS") or {}).get("Selling")) or latest["gold"]
        usd = tr_num((feed.get("USD") or {}).get("Selling")) or latest["fx"].get("TRY")
        parity_gram = ons * usd / OZ_G  # 24k fine gold per gram in TRY
        out["parity_gram"] = clean(parity_gram, 2)
        out["usdtry"] = clean(usd, 4)
        out["ons"] = clean(ons, 2)
        out["feed_time"] = feed.get("Update_Date")
        for key, (fk, grams, purity) in TR_ITEMS.items():
            e = feed.get(fk) or {}
            buy, sell = tr_num(e.get("Buying")), tr_num(e.get("Selling"))
            if sell is None:
                continue
            fair = parity_gram * grams * purity if key != "gumus" else None
            out["items"][key] = {"buy": clean(buy, 2), "sell": clean(sell, 2), "change": clean(tr_num(e.get("Change")), 2),
                                 "fine_value": clean(fair, 2), "premium": clean((sell / fair - 1) * 100, 2) if fair else None}
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if "gram" in out["items"]:
            snap = {"d": day, "gram": out["items"]["gram"]["sell"], "parity": out["parity_gram"],
                    "ceyrek": out["items"].get("ceyrek", {}).get("sell")}
            hist = [h for h in hist if h.get("d") != day] + [snap]
            out["history"] = hist[-1000:]
        log("turkey", True, f"gram {out['items'].get('gram', {}).get('sell')}")
    except Exception as e:  # noqa: BLE001
        log("turkey", False, str(e))
        # computed fallback from international price
        usd = latest["fx"].get("TRY")
        if usd:
            pg = latest["gold"] * usd / OZ_G
            out["parity_gram"] = clean(pg, 2)
            out["usdtry"] = clean(usd, 4)
            out["source"] = "computed"
    write_json("turkey.json", out)


# ---------------------------------------------------------------- main

def main():
    os.makedirs(DATA, exist_ok=True)
    started = time.time()
    m = collect()
    if "gold" not in m or len(m["gold"]) < 300:
        status["errors"].append("gold history unavailable - keeping previous data")
        write_json("status.json", {"updated": now_iso(), **status})
        print("FATAL: no gold data")
        return 1
    steps = [
        ("history", lambda: build_history(m)),
        ("macro", lambda: build_macro(m)),
    ]
    for name, fn in steps:
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            status["errors"].append(f"{name}: {e}"); traceback.print_exc()
    intraday = {"series": {}}
    try:
        intraday = build_intraday(m)
    except Exception as e:  # noqa: BLE001
        status["errors"].append(f"intraday: {e}")
    latest = build_latest(m, intraday)
    cot = fetch_cot()
    for name, fn in [("drivers", lambda: build_drivers(m)), ("fairvalue", lambda: build_fairvalue(m)),
                     ("feargreed", lambda: build_feargreed(m, cot)), ("news", build_news),
                     ("polymarket", build_polymarket), ("turkey", lambda: build_turkey(latest))]:
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            status["errors"].append(f"{name}: {e}"); traceback.print_exc()
    write_json("status.json", {"updated": now_iso(), "seconds": round(time.time() - started, 1), "mock": MOCK, **status})
    print("done in", round(time.time() - started, 1), "s; errors:", status["errors"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
