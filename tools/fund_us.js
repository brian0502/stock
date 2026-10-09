// 美股基本面（v6.1 中長線層）：Yahoo quoteSummary（crumb 流程）→ revenueGrowth／毛利率／FCF／EPS_TTM／PE_TTM／g／+1y 營收預估／財報日；每次存檔 tools/data/fund_us/<symbol>.json（累積各季）
// 用法：node tools/fund_us.js PBR,HPE,NVDA,MU
// 判定（v6.1 §A）：中線必要＝revenueGrowth >15%；長線必要＝最近 2 次季報存檔 revenueGrowth 皆 >15%（不足 2 次＝最近 1 次 >15% 且 +1y >15%）、FCF >0、EPS_TTM >0、0 < PE_TTM < 2g。
const https = require('https'); const fs = require('fs'); const path = require('path');
const DIR = path.resolve(__dirname, 'data', 'fund_us'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(u, h = {}) { return new Promise((res, rej) => { const q = https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', ...h }, }, r => { const c = []; r.on('data', x => c.push(x)); r.on('end', () => res({ s: r.statusCode, h: r.headers, t: Buffer.concat(c).toString('utf8') })); }); q.on('error', rej); q.setTimeout(20000, () => q.destroy(new Error('timeout'))); }); }
const raw = x => (x && typeof x === 'object' && 'raw' in x) ? x.raw : (typeof x === 'number' ? x : null);
const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1); const f2 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(2);
(async () => {
  const syms = (process.argv[2] || '').split(',').filter(Boolean); if (!syms.length) { console.log('需要代號清單'); process.exit(1); }
  const a = await get('https://fc.yahoo.com/'); const cookie = (a.h['set-cookie'] || []).map(x => x.split(';')[0]).join('; ');
  const b = await get('https://query2.finance.yahoo.com/v1/test/getcrumb', { Cookie: cookie }); const crumb = encodeURIComponent(b.t.trim());
  if (b.s !== 200 || !crumb) { console.log('crumb 取得失敗＝美股基本面未取得'); process.exit(1); }
  console.log('sym    價      營收YoY  毛利率  FCF(B)  EPS_TTM  PE_TTM   g     PE<2g  +1y營收  財報日      存檔季數  中線必要  長線必要');
  for (const s of syms) {
    try {
      const r = await get(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(s)}?modules=financialData,earningsTrend,defaultKeyStatistics,cashflowStatementHistory,calendarEvents,price&crumb=${crumb}`, { Cookie: cookie });
      const j = JSON.parse(r.t).quoteSummary.result[0]; const fd = j.financialData || {}, ks = j.defaultKeyStatistics || {}, pr = j.price || {};
      const price = raw(pr.regularMarketPrice); const rg = raw(fd.revenueGrowth); const gm = raw(fd.grossMargins); let fcf = raw(fd.freeCashflow);
      const cf = j.cashflowStatementHistory && j.cashflowStatementHistory.cashflowStatements && j.cashflowStatementHistory.cashflowStatements[0];
      if (fcf == null && cf) { const ocf = raw(cf.totalCashFromOperatingActivities), capex = raw(cf.capitalExpenditures); if (ocf != null && capex != null) fcf = ocf + capex; }
      const eps = raw(ks.trailingEps); const pe = eps && eps > 0 && price ? price / eps : null; const g = rg != null ? rg * 100 : null;
      const t1 = ((j.earningsTrend || {}).trend || []).find(x => x.period === '+1y'); const g1y = t1 && t1.revenueEstimate ? raw(t1.revenueEstimate.growth) : null;
      const ed = j.calendarEvents && j.calendarEvents.earnings && j.calendarEvents.earnings.earningsDate && j.calendarEvents.earnings.earningsDate[0]; const earn = ed && raw(ed) ? new Date(raw(ed) * 1000).toISOString().slice(0, 10) : '';
      // 存檔（以最近財報日或今天為 key）
      const file = path.join(DIR, `${s}.json`); const hist = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}; const key = (fd.mostRecentQuarter && raw(fd.mostRecentQuarter)) ? new Date(raw(fd.mostRecentQuarter) * 1000).toISOString().slice(0, 10) : (ks.mostRecentQuarter && raw(ks.mostRecentQuarter) ? new Date(raw(ks.mostRecentQuarter) * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      hist[key] = { asof: new Date().toISOString().slice(0, 10), price, revenueGrowth: rg, grossMargins: gm, fcf, eps, pe, g, g1y, earn }; fs.writeFileSync(file, JSON.stringify(hist, null, 0));
      const qs = Object.keys(hist).sort(); const last2 = qs.slice(-2).map(k => hist[k].revenueGrowth);
      const mid = rg != null && rg > 0.15; const longRev = qs.length >= 2 ? last2.every(x => x != null && x > 0.15) : (rg != null && rg > 0.15 && g1y != null && g1y > 0.15);
      const long = longRev && fcf != null && fcf > 0 && eps != null && eps > 0 && pe != null && g != null && pe > 0 && pe < 2 * g;
      console.log(`${s.padEnd(6)} ${f2(price).padStart(7)} ${f1(rg * 100).padStart(7)}% ${f1(gm * 100).padStart(6)}% ${f1(fcf / 1e9).padStart(7)} ${f2(eps).padStart(8)} ${f1(pe).padStart(7)} ${f1(g).padStart(5)} ${(pe != null && g != null && pe > 0 && pe < 2 * g ? '✅' : '—').padStart(5)} ${f1(g1y * 100).padStart(7)}% ${earn.padEnd(11)} ${String(qs.length).padStart(5)}     ${mid ? '✅' : '❌'}        ${long ? '✅' : '❌'}`);
    } catch (e) { console.log(s, 'ERR', e.message); }
    await sleep(400);
  }
  console.log('\n→ 必要欄位缺＝該檔剔除；選用（毛利率同比、+1y）缺＝略過。中長線再套趨勢（>MA60 且 MA60 向上）、族群 RS、敘事階段。');
})();
