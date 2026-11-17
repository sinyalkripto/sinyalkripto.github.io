# Port of sinyalkripto engine.js (1h: pullback + breakout-retest) for a freqtrade cross-check.
import numpy as np, pandas as pd
from datetime import datetime
from freqtrade.strategy import IStrategy, informative
from freqtrade.persistence import Trade

def ewm(s, alpha): return s.ewm(alpha=alpha, adjust=False).mean()

class TitikMasuk(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = "1h"
    can_short = True
    minimal_roi = {"0": 100}
    stoploss = -0.25
    use_custom_stoploss = True
    process_only_new_candles = True
    startup_candle_count = 400
    ADX_MIN = 25; TP = 1.25; SL = 2.0; BE = 0.4; EMA4H200 = True; MAX_HOLD = 48

    @informative("4h")
    def populate_indicators_4h(self, df, metadata):
        df["ef"] = df["close"].ewm(span=20, adjust=False).mean()
        df["es"] = df["close"].ewm(span=50, adjust=False).mean()
        df["e200"] = df["close"].ewm(span=200, adjust=False).mean()
        return df

    def populate_indicators(self, df, metadata):
        c = df["close"]
        df["ef"] = c.ewm(span=20, adjust=False).mean(); df["es"] = c.ewm(span=50, adjust=False).mean(); df["et"] = c.ewm(span=200, adjust=False).mean()
        d = c.diff(); g = ewm(d.clip(lower=0), 1/14); l = ewm((-d).clip(lower=0), 1/14); df["rsi"] = 100 - 100/(1+g/l)
        pc = c.shift(); tr = pd.concat([df.high-df.low, (df.high-pc).abs(), (df.low-pc).abs()], axis=1).max(axis=1); tr.iloc[0] = df.high.iloc[0]-df.low.iloc[0]
        df["atr"] = ewm(tr, 1/14)
        up = df.high.diff(); dn = -df.low.diff()
        pdm = np.where((up > dn) & (up > 0), up, 0.0); mdm = np.where((dn > up) & (dn > 0), dn, 0.0)
        a = df["atr"]; p = 100*ewm(pd.Series(pdm, index=df.index), 1/14)/a; m = 100*ewm(pd.Series(mdm, index=df.index), 1/14)/a
        dx = (100*(p-m).abs()/(p+m)).fillna(0); df["adx"] = ewm(dx, 1/14)
        return df

    def populate_entry_trend(self, df, metadata):
        n = len(df); el = np.zeros(n, bool); es_ = np.zeros(n, bool)
        H, L, C, O = df.high.values, df.low.values, df.close.values, df.open.values
        ef, es, et, r, a, x = df.ef.values, df.es.values, df.et.values, df.rsi.values, df.atr.values, df.adx.values
        t4u = (df.ef_4h > df.es_4h).to_numpy().copy(); t4d = (df.ef_4h < df.es_4h).to_numpy().copy()
        if self.EMA4H200:
            t4u &= (df.close_4h > df.e200_4h).values; t4d &= (df.close_4h < df.e200_4h).values
        upL = dnL = np.nan; upAt = dnAt = -10**9
        for i in range(n):
            warm = i >= 200; strong = x[i] >= self.ADX_MIN
            tu = ef[i] > es[i] and t4u[i]; td = ef[i] < es[i] and t4d[i]
            ok = warm and strong and self.TP*a[i]/C[i]*100 >= 0.6 and self.SL*a[i]/C[i]*100 <= 8
            if ok and tu and C[i] > et[i] and r[i-1] < 40 <= r[i]: el[i] = True
            if ok and td and C[i] < et[i] and r[i-1] > 60 >= r[i]: es_[i] = True
            if i >= 20:
                hh = H[i-20:i].max(); ll = L[i-20:i].min(); bu = C[i] > hh; bd = C[i] < ll; tol = 0.25*a[i]
                rtu = (not bu) and 1 <= i-upAt <= 12 and L[i] <= upL+tol and C[i] > upL and C[i] > O[i]
                rtd = (not bd) and 1 <= i-dnAt <= 12 and H[i] >= dnL-tol and C[i] < dnL and C[i] < O[i]
                if rtu: upAt = -10**9
                if rtd: dnAt = -10**9
                if bu: upL, upAt = hh, i
                if bd: dnL, dnAt = ll, i
                if ok and rtu and tu: el[i] = True
                if ok and rtd and td: es_[i] = True
        df["enter_long"] = el.astype(int); df["enter_short"] = es_.astype(int)
        return df

    def populate_exit_trend(self, df, metadata):
        df["exit_long"] = 0; df["exit_short"] = 0; return df

    def _levels(self, pair, trade):
        df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        row = df[df.date < trade.open_date_utc].iloc[-1]  # signal candle
        return row.atr
    def custom_exit(self, pair, trade, current_time, current_rate, current_profit, **kw):
        a = trade.get_custom_data("atr")
        if a is None:
            a = self._levels(pair, trade); trade.set_custom_data("atr", float(a))
        e = trade.open_rate; s = -1 if trade.is_short else 1
        tp = e + s*self.TP*a
        if (current_rate - tp)*s >= 0: return "tp"
        if (current_time - trade.open_date_utc).total_seconds() >= self.MAX_HOLD*3600: return "waktu"
    def custom_stoploss(self, pair, trade, current_time, current_rate, current_profit, after_fill, **kw):
        a = trade.get_custom_data("atr")
        if a is None:
            a = self._levels(pair, trade); trade.set_custom_data("atr", float(a))
        e = trade.open_rate; s = -1 if trade.is_short else 1
        be = trade.get_custom_data("be")
        if not be:
            df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            w = df[(df.date >= trade.open_date_utc) & (df.date + pd.Timedelta(hours=1) <= current_time)]
            if len(w):
                best = w.high.max() if not trade.is_short else w.low.min()
                if (best - e)*s >= self.BE*self.TP*a: be = True; trade.set_custom_data("be", True)
        if be:
            sl = e*(1+s*0.0012)
        else:
            sl = e - s*self.SL*a
        from freqtrade.strategy import stoploss_from_absolute
        return stoploss_from_absolute(sl, current_rate, is_short=trade.is_short, leverage=trade.leverage)

class TitikMasukLama(TitikMasuk):
    ADX_MIN = 20; TP = 1.5; SL = 2.0; BE = 0.5; EMA4H200 = False
