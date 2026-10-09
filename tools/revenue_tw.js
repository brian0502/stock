// 台股月營收累積檔（v6.1 中長線基本面層）：每次跑就把 TWSE＋TPEx 最新月營收存進 tools/data/revenue/YYYYMM.json，並輸出基本面篩選
// 用法：node tools/revenue_tw.js            → 抓最新一期、存檔、印篩選（YoY >15%、累計 YoY、連續正成長月數〔以累積檔計〕）
//       node tools/revenue_tw.js 2330,2383  → 只印指定股
// 來源：https://openapi.twse.com.tw/v1/opendata/t187ap05_L（上市）、https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O（上櫃）
const https = require('https'); const fs = require('fs'); const path = require('path');
const DIR = path.resolve(__dirname, 'data', 'revenue'); fs.mkdirSync(DIR, { recursive: true });
function get(url) { return new Promise((resolve, reject) => { const q = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, res => { const c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); }); q.on('error', reject); q.setTimeout(30000, () => q.destroy(new Error('timeout'))); }); }
const num = s => { const v = parseFloat(String(s).replace(/,/g, '')); return isNaN(v) ? null : v; };
const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1);
(async () => {
  const only = (process.argv[2] || '').split(',').filter(Boolean);
  const out = {};
  for (const [url, ex] of [['https://openapi.twse.com.tw/v1/opendata/t187ap05_L', 'TWSE'], ['https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O', 'TPEx']]) {
    try { const j = JSON.parse(await get(url)); for (const r of j) { const code = String(r['公司代號'] || r.SecuritiesCompanyCode || '').trim(); if (!/^\d{4}$/.test(code)) continue; const ym = String(r['資料年月'] || r.Date || '').trim(); out[code] = { code, name: (r['公司名稱'] || r.CompanyName || '').trim(), ex, ym, ind: r['產業別'] || '', cur: num(r['營業收入-當月營收'] ?? r.Revenue), prev: num(r['營業收入-上月營收']), ly: num(r['營業收入-去年當月營收']), mom: num(r['營業收入-上月比較增減(%)']), yoy: num(r['營業收入-去年同月增減(%)']), ytd: num(r['累計營業收入-當月累計營收']), ytdLy: num(r['累計營業收入-去年累計營收']), ytdYoy: num(r['累計營業收入-前期比較增減(%)']) }; } } catch (e) { console.log(ex, '取得失敗', e.message); }
  }
  const yms = [...new Set(Object.values(out).map(r => r.ym))].sort(); const ym = yms.at(-1);
  if (ym) { const file = path.join(DIR, `${ym}.json`); fs.writeFileSync(file, JSON.stringify(out, null, 0)); console.log(`存檔 ${file}（${Object.keys(out).length} 檔；資料年月 ${yms.join('/')}）`); }
  // 累積檔 → 連續 YoY>0 月數
  const files = fs.readdirSync(DIR).filter(f => /^\d{5}\.json$/.test(f)).sort();
  const hist = {}; for (const f of files) { const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); for (const [c, r] of Object.entries(j)) (hist[c] = hist[c] || {})[r.ym] = r.yoy; }
  const streak = c => { const h = hist[c] || {}; const ks = Object.keys(h).sort().reverse(); let n = 0; for (const k of ks) { if (h[k] != null && h[k] > 0) n++; else break; } return { n, months: ks.length }; };
  console.log(`累積檔月份：${files.map(f => f.slice(0, 5)).join(',') || '無'}（連續月數需 ≥2 個月累積才有意義；本月之前的月份＝未取得）`);
  const rows = Object.values(out).filter(r => r.yoy != null && r.cur != null && (!only.length || only.includes(r.code)));
  if (only.length) { for (const r of rows) { const s = streak(r.code); console.log(`${r.code} ${r.name} ${r.ex} ${r.ym}：當月 ${f1(r.cur / 1e5)} 億 YoY ${f1(r.yoy)}% MoM ${f1(r.mom)}% 累計 YoY ${f1(r.ytdYoy)}% 連續正成長 ${s.n}/${s.months} 月`); } return; }
  // 篩選：中線門檻（YoY >15%）與長線門檻（YoY >20% 且累計 YoY >20%）
  const mid = rows.filter(r => r.yoy > 15 && r.cur >= 1e5).sort((a, b) => b.yoy - a.yoy);
  const long = rows.filter(r => r.yoy > 20 && r.ytdYoy > 20 && r.cur >= 3e5).sort((a, b) => b.ytdYoy - a.ytdYoy);
  console.log(`\n=== 中線基本面候選（當月 YoY >15%、月營收 ≥1 億；共 ${mid.length} 檔，列前 40）===`);
  for (const r of mid.slice(0, 40)) console.log(`${r.code} ${r.name.padEnd(6, '　')} ${r.ex} ${r.ym} 當月 ${f1(r.cur / 1e5).padStart(8)} 億 YoY ${f1(r.yoy).padStart(7)}% MoM ${f1(r.mom).padStart(6)}% 累計YoY ${f1(r.ytdYoy).padStart(7)}% 連續 ${streak(r.code).n} 月`);
  console.log(`\n=== 長線基本面候選（當月 YoY >20% 且累計 YoY >20%、月營收 ≥3 億；共 ${long.length} 檔，列前 40）===`);
  for (const r of long.slice(0, 40)) console.log(`${r.code} ${r.name.padEnd(6, '　')} ${r.ex} ${r.ym} 當月 ${f1(r.cur / 1e5).padStart(8)} 億 YoY ${f1(r.yoy).padStart(7)}% 累計YoY ${f1(r.ytdYoy).padStart(7)}% 連續 ${streak(r.code).n} 月`);
  console.log('\n→ 中長線軌再套：趨勢（>MA60 且 MA60 向上）、法人 20 日淨買、族群 RS、敘事階段；季報毛利率同比另查（取不到不列條件）。');
})();
