// 位階表（v6 §3-6）：權值股／舊 watchlist／既有部位的 MA5/10/20/60、ATR20、前 20 日高、突破單、回測單、停損。不佔候選席次。
// 用法：node tools/levels.js 2330.TW,2317.TW,2454.TW,0050.TW,NVDA,VOO,SPCX   （台股用 .TW/.TWO；美股取前一完整交易日＋即時價）
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url) { return new Promise((resolve, reject) => { const q = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => { const c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); }); q.on('error', reject); q.setTimeout(15000, () => q.destroy(new Error('timeout'))); }); }
const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1); const f2 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(2);
const ma = (a, n) => a.length >= n ? a.slice(-n).reduce((x, y) => x + y, 0) / n : null;
(async () => {
  const syms = (process.argv[2] || '').split(',').filter(Boolean); if (!syms.length) { console.log('需要代號清單'); process.exit(1); }
  console.log('sym        收(日期)        即時/盤後      MA5     MA10    MA20    MA60   ATR20  距MA20  前20日高  突破單(+0.1ATR)  回測單(MA20)  停損max(10日低,−2ATR)  5日%   位階');
  for (const s of syms) {
    try {
      const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=6mo&interval=1d&includePrePost=true`)); const r = j.chart.result[0]; const q = r.indicators.quote[0]; const m = r.meta; const today = new Date().toISOString().slice(0, 10);
      const isUS = !/\.(TW|TWO)$/.test(s);
      let rows = (r.timestamp || []).map((t, k) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), h: q.high[k], l: q.low[k], c: q.close[k], v: q.volume[k] })).filter(x => x.c != null && x.h != null);
      const live = isUS ? (m.postMarketPrice || m.regularMarketPrice) : null; const liveTag = isUS ? (m.postMarketPrice ? `盤後 ${f2(m.postMarketPrice)}` : `即時 ${f2(m.regularMarketPrice)}`) : '—';
      if (isUS && rows.at(-1).d === today) rows = rows.slice(0, -1); // 完整日
      const cl = rows.map(x => x.c); const last = rows.at(-1); const tr = []; for (let i = rows.length - 20; i < rows.length; i++) tr.push(Math.max(rows[i].h - rows[i].l, Math.abs(rows[i].h - rows[i - 1].c), Math.abs(rows[i].l - rows[i - 1].c))); const A = tr.reduce((a, b) => a + b, 0) / 20;
      const m5 = ma(cl, 5), m10 = ma(cl, 10), m20 = ma(cl, 20), m60 = ma(cl, 60), p20 = Math.max(...rows.slice(-21, -1).map(x => x.h)), lo10 = Math.min(...rows.slice(-10).map(x => x.l));
      const stop = Math.max(lo10, last.c - 2 * A); const stopPct = (1 - stop / last.c) * 100; const atrN = (last.c - m20) / A; const r5 = (last.c / cl.at(-6) - 1) * 100;
      const pos = last.c > m5 && m5 > m20 ? '多頭' : last.c < m20 && last.c < m60 ? '空頭' : last.c < m20 ? '破月線' : '月線上';
      console.log(`${s.padEnd(10)} ${f2(last.c).padStart(8)}(${last.d.slice(5)}) ${liveTag.padEnd(13)} ${f1(m5).padStart(7)} ${f1(m10).padStart(7)} ${f1(m20).padStart(7)} ${f1(m60).padStart(7)} ${f1(A).padStart(6)} ${f1(atrN).padStart(5)}ATR ${f2(p20).padStart(9)} ${f2(p20 + 0.1 * A).padStart(14)} ${f2(m20).padStart(12)} ${f2(stop).padStart(10)}（${f1(stopPct)}%） ${f1(r5).padStart(5)}  ${pos}`);
    } catch (e) { console.log(s, 'ERR', e.message); }
    await sleep(300);
  }
})();
