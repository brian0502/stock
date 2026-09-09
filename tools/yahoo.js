const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}
const tickers = ['^GSPC', '^IXIC', '^DJI', '^VIX', '^TNX', 'ES=F', 'NQ=F', 'CL=F', 'BZ=F', 'GC=F', 'DX-Y.NYB', 'TWD=X', 'NVDA', 'SPCX', 'TSM', 'MU', 'GOOGL', 'AAPL', 'MSFT', 'VOO', 'AVGO', 'TSLA', 'RKLB', 'PL', 'BKSY', 'VOYG', 'SPIR', 'ORCL', 'AMD'];
(async () => {
  for (const t of tickers) {
    try {
      const txt = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=5d&interval=1d&includePrePost=true`);
      const j = JSON.parse(txt);
      const r = j.chart.result[0];
      const m = r.meta;
      const q = r.indicators.quote[0];
      const ts = r.timestamp || [];
      const rows = ts.map((x, i) => ({ d: new Date(x * 1000).toISOString().slice(0, 10), o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] })).filter(x => x.c != null);
      const last = rows.slice(-3).map(x => `${x.d} O${x.o?.toFixed(2)} H${x.h?.toFixed(2)} L${x.l?.toFixed(2)} C${x.c?.toFixed(2)} V${x.v}`).join(' | ');
      console.log(`${t}: price=${m.regularMarketPrice} prevClose=${m.previousClose ?? m.chartPreviousClose} dayH=${m.regularMarketDayHigh} dayL=${m.regularMarketDayLow} vol=${m.regularMarketVolume} time=${new Date(m.regularMarketTime * 1000).toISOString()} post=${m.postMarketPrice ?? ''} pre=${m.preMarketPrice ?? ''} || ${last}`);
    } catch (e) { console.log(t, 'ERR', e.message); }
    await sleep(400);
  }
})();
