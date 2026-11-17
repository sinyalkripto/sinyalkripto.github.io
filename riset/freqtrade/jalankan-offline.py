import sys
from freqtrade.exchange import exchange as ex
import json
pairs=json.load(open("/home/user/ft/config.json"))["exchange"]["pair_whitelist"]
def mk(p):
    b=p.split("/")[0]
    return {'id':b+'USDT','symbol':p,'base':b,'quote':'USDT','settle':'USDT','baseId':b,'quoteId':'USDT','settleId':'USDT','type':'swap','spot':False,'margin':False,'swap':True,'future':False,'option':False,'active':True,'contract':True,'linear':True,'inverse':False,'contractSize':1.0,
      'precision':{'amount':1e-8,'price':1e-8},'limits':{'amount':{'min':1e-8,'max':1e12},'cost':{'min':1,'max':None},'leverage':{'min':1,'max':20},'price':{'min':None,'max':None},'market':{'min':None,'max':None}},'info':{}}
M={p:mk(p) for p in pairs}
def fake(self, retries=0):
    self._markets=M; self._api._markets=M if hasattr(self._api,'_markets') else None
    try: self._api.markets=M; self._api_async.markets=M
    except Exception: pass
    import time; self._last_markets_refresh=int(time.time())
ex.Exchange.reload_markets=lambda self, force=False, *, load_leverage_tiers=True: fake(self)
ex.Exchange._load_async_markets=lambda self, reload=False: fake(self)
from freqtrade.main import main
sys.argv=["freqtrade"]+sys.argv[1:]
main()
