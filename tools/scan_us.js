// 美股候選產生器 v6（2026-10-08 三方簽字規則 §3）：族群熱度（3/6 月相對強度）→ 候選池 → 主排序（3/6 月 RS 前 20% ＋ 距 52 週高 <5%）→ 剔除 → 進場價/停損/ATR
// 用法：node tools/scan_us.js [前N族群=3] [輸出檔數=12]
// 不吃任何本地 watchlist；day_gainers/trending 只做提醒不計分。資料用前一完整交易日。
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url) { return new Promise((resolve, reject) => { https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept': 'application/json,text/plain,*/*' } }, res => { const c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve({ s: res.statusCode, t: Buffer.concat(c).toString('utf8') })); }).on('error', reject); }); }
async function json(url) { for (let i = 0; i < 3; i++) { try { const r = await get(url); if (r.s === 200) return JSON.parse(r.t); } catch (e) {} await sleep(700); } return null; }
async function chart(sym, range = '1y') {
  const j = await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`);
  const r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r) return null;
  const q = r.indicators.quote[0]; const ts = r.timestamp || []; const today = new Date().toISOString().slice(0, 10);
  const rows = ts.map((x, i) => ({ d: new Date(x * 1000).toISOString().slice(0, 10), o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] })).filter(x => x.c != null && x.d !== today);
  return rows;
}
const pct = (a, b) => (a / b - 1) * 100; const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1); const f2 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(2);
const ma = (a, n) => a.length >= n ? a.slice(-n).reduce((x, y) => x + y, 0) / n : null;
function atr(rows, n = 20) { if (rows.length < n + 1) return null; const tr = []; for (let i = rows.length - n; i < rows.length; i++) tr.push(Math.max(rows[i].h - rows[i].l, Math.abs(rows[i].h - rows[i - 1].c), Math.abs(rows[i].l - rows[i - 1].c))); return tr.reduce((a, b) => a + b, 0) / n; }
const THEMES = { XLK: '科技', XLC: '通訊', XLY: '非必需消費', XLP: '必需消費', XLE: '能源', XLF: '金融', XLV: '醫療', XLI: '工業', XLB: '原物料', XLRE: '不動產', XLU: '公用', SMH: '半導體', XBI: '生技', IGV: '軟體', CIBR: '資安', ARKX: '太空', ITA: '國防', URA: '鈾核能', XME: '金屬礦業', COPX: '銅', GDX: '金礦', XOP: '油氣探勘', OIH: '油服', KWEB: '中概', TAN: '太陽能', ICLN: '潔淨能源', LIT: '鋰電', BOTZ: '機器人AI', XHB: '營建', KRE: '區域銀行', JETS: '航空', IBIT: '比特幣', IWM: '小型股', QQQ: '那斯達克100' };
(async () => {
  const TOPN = parseInt(process.argv[2] || '3'), OUTN = parseInt(process.argv[3] || '12');
  const spy = await chart('SPY'); const sc = spy.map(r => r.c); const s3 = pct(sc.at(-1), sc.at(-64)), s6 = pct(sc.at(-1), sc.at(-127));
  console.log(`=== ① 族群熱度（3 月／6 月相對 SPY；資料至 ${spy.at(-1).d}；SPY 3m ${f1(s3)}% / 6m ${f1(s6)}%）===`);
  const th = [];
  for (const [sym, name] of Object.entries(THEMES)) { const c = await chart(sym); if (!c || c.length < 130) continue; const cl = c.map(r => r.c); const r3 = pct(cl.at(-1), cl.at(-64)), r6 = pct(cl.at(-1), cl.at(-127)); th.push({ sym, name, r3, r6, rs: (r3 - s3) + 0.5 * (r6 - s6), above20: cl.at(-1) > ma(cl, 20) }); await sleep(200); }
  th.sort((a, b) => b.rs - a.rs);
  for (const t of th) console.log(`${t.sym.padEnd(5)} ${t.name.padEnd(7, '　')} 3m ${f1(t.r3).padStart(6)}%  6m ${f1(t.r6).padStart(6)}%  RS ${f1(t.rs).padStart(6)}  ${t.above20 ? 'MA20上' : 'MA20下'}`);
  const hot = th.slice(0, TOPN).map(t => t.sym); console.log(`→ 熱族群前 ${TOPN}：${th.slice(0, TOPN).map(t => `${t.sym}(${t.name})`).join('、')}；最冷：${th.slice(-3).map(t => t.sym).join('、')}`);
  // ② 候選池（提醒來源，不計分）
  const pool = new Map(); const add = (q, src) => { if (!q || !q.symbol || /[\.\-=^]/.test(q.symbol)) return; const e = pool.get(q.symbol) || { sym: q.symbol, src: new Set(), q: {} }; e.src.add(src); Object.assign(e.q, q); pool.set(q.symbol, e); };
  const tr = await json('https://query1.finance.yahoo.com/v1/finance/trending/US?count=30'); if (tr && tr.finance && tr.finance.result && tr.finance.result[0]) for (const q of tr.finance.result[0].quotes) add({ symbol: q.symbol }, 'trending');
  for (const id of ['day_gainers', 'most_actives', 'growth_technology_stocks', 'small_cap_gainers', 'undervalued_growth_stocks', 'aggressive_small_caps', 'undervalued_large_caps']) { const j = await json(`https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${id}&count=80`); const qs = j && j.finance && j.finance.result && j.finance.result[0] && j.finance.result[0].quotes; if (qs) for (const q of qs) add(q, id); else console.log(`(screener ${id} 取不到)`); await sleep(400); }
  const need = [...pool.values()].filter(e => !e.q.regularMarketPrice).map(e => e.sym);
  for (let i = 0; i < need.length; i += 40) { const j = await json(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${need.slice(i, i + 40).join(',')}`); const qs = j && j.quoteResponse && j.quoteResponse.result; if (qs) for (const q of qs) { const e = pool.get(q.symbol); if (e) Object.assign(e.q, q); } await sleep(400); }
  const cands = [...pool.values()].filter(e => e.q.quoteType === 'EQUITY' && e.q.regularMarketPrice > 10 && (e.q.averageDailyVolume3Month || 0) * e.q.regularMarketPrice >= 2e7);
  console.log(`=== ② 候選池 ${pool.size} 檔 → 流動性門檻（價 >$10、20 日均成交額 ≥$20M）後 ${cands.length} 檔；逐檔抓 1 年 K ===`);
  const rows = [];
  for (const e of cands.slice(0, 120)) { const c = await chart(e.sym); if (!c || c.length < 130) continue; const cl = c.map(r => r.c); const last = c.at(-1); const a = atr(c); const m20 = ma(cl, 20), m10 = ma(cl, 10), m50 = ma(cl, 50); const hi52 = Math.max(...c.slice(-252).map(r => r.h)); const p20 = Math.max(...c.slice(-21, -1).map(r => r.h)); const v20 = ma(c.slice(0, -1).map(r => r.v), 20); const lo10 = Math.min(...c.slice(-10).map(r => r.l)); const stop = Math.max(lo10, last.c - 2 * a); const stopPct = (1 - stop / last.c) * 100; rows.push({ stop, stopPct, lo10, sym: e.sym, name: (e.q.shortName || '').slice(0, 16), sector: (e.q.sector || '-').slice(0, 14), price: last.c, r3: pct(cl.at(-1), cl.at(-64)), r6: pct(cl.at(-1), cl.at(-127)), r5: pct(cl.at(-1), cl.at(-6)), near52: pct(last.c, hi52), atr: a, atrN: (last.c - m20) / a, m10, m20, m50, p20, volRatio: last.v / v20, src: [...e.src].join('+'), earn: e.q.earningsTimestamp ? new Date(e.q.earningsTimestamp * 1000).toISOString().slice(0, 10) : '' }); await sleep(200); }
  // ③ 主排序：3/6 月 RS 前 20% ＋ 距 52 週高 <5%
  rows.forEach(r => r.rsScore = (r.r3 - s3) + 0.5 * (r.r6 - s6)); rows.sort((a, b) => b.rsScore - a.rsScore);
  const cut = rows[Math.floor(rows.length * 0.2)]?.rsScore ?? -Infinity;
  const out = rows.filter(r => r.rsScore >= cut && r.near52 > -5);
  const excl = []; const final = [];
  for (const r of out) { if (r.r5 >= 25) { excl.push([r.sym, '5 日漲 ≥25%']); continue; } r.mode = r.atrN > 2 ? '只等回測' : (r.price >= r.p20 ? '突破' : '回測/突破皆可'); final.push(r); }
  for (const r of final) { if (r.sector === '-' || !r.sector) { const j = await json(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(r.sym)}&quotesCount=3&newsCount=0`); const q = j && j.quotes && j.quotes.find(x => x.symbol === r.sym); if (q) { r.sector = (q.sector || q.industry || '-').slice(0, 14); r.industry = (q.industry || '').slice(0, 18); } await sleep(250); } }
  const bySector = {}; const picked = [];
  for (const r of final) { bySector[r.sector] = (bySector[r.sector] || 0) + 1; if (bySector[r.sector] <= 2) picked.push(r); else excl.push([r.sym, `${r.sector} 已 2 檔`]); }
  console.log(`=== ③ 主排序通過（RS 前 20% 門檻 ${f1(cut)} 且距 52W 高 >−5%）：${out.length} 檔；每族群 ≤2 → ${picked.length} 檔 ===`);
  console.log('sym    名稱             產業(sector)   價      3m%   6m%   5d%  距52W  ATR倍(距MA20) 進場方式     突破單(p20+0.1ATR)  回測單(MA20)  停損max(10日低,−2ATR) 量比  財報      來源');
  for (const r of picked.slice(0, OUTN)) console.log(`${r.sym.padEnd(6)} ${r.name.padEnd(16)} ${r.sector.padEnd(14)} ${f2(r.price).padStart(8)} ${f1(r.r3).padStart(5)} ${f1(r.r6).padStart(5)} ${f1(r.r5).padStart(5)} ${f1(r.near52).padStart(5)} ${f1(r.atrN).padStart(6)}        ${r.mode.padEnd(10, '　').slice(0, 10)} ${f2(r.p20 + 0.1 * r.atr).padStart(10)}（限價≤${f2(r.p20 + 0.35 * r.atr)}） ${f2(r.m20).padStart(8)} ${f2(r.stop).padStart(9)}（${f1(r.stopPct)}%${r.stopPct < 3 || r.stopPct > 8 ? '⚠️' : ''}） ${f1(r.volRatio).padStart(4)} ${(r.earn || '').padEnd(10)} ${r.industry || ''} ${r.src}`);
  console.log(`\n剔除：${excl.slice(0, 15).map(x => x.join('=')).join('；')}${excl.length > 15 ? '…' : ''}`);
  console.log(`影子 R 追蹤（被剔除前 5）：${excl.slice(0, 5).map(x => x[0]).join('、')}`);
  console.log(`\n→ 用法：停損需落在 3–8%；財報前 3 交易日不開新倉；突破單有效 2 日、回測單 5 日；族群不在熱榜前 ${TOPN} 者註明「非熱族群」。`);
})();
