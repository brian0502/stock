// 台股候選產生器 v6（2026-10-08 三方簽字規則 §3）：上市＋上櫃
// 族群熱度＝法人 5 日有效淨買÷5 日成交額（外資需連 3 日買、季末投信×0.5、漲停權重 0）＋ 類指數 5 日動能 → 熱族群內候選 → 技術確認（Yahoo K：ATR、突破/回測單、停損 4–8%）
// 用法：node tools/scan_tw.js 20261008 [前N族群=3] [每族群=2]
// 來源：TWSE T86／MI_INDEX(ALLBUT0999：全市場收盤＋類指數)／t187ap03_L／注意·處置公告；TPEx dailyTrade／stk_quote_result／mopsfin_t187ap03_O；Yahoo chart(.TW/.TWO)
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url, ref) { return new Promise((resolve, reject) => { const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': ref || 'https://www.twse.com.tw/zh/', 'Accept': 'application/json' } }, res => { const c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve({ s: res.statusCode, t: Buffer.concat(c).toString('utf8') })); }); req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('timeout'))); }); }
async function json(url, ref) { for (let i = 0; i < 3; i++) { try { const r = await get(url, ref); if (r.s === 200 && /^[\[{]/.test(r.t.trim())) return JSON.parse(r.t); } catch (e) {} await sleep(1200); } return null; }
const IND = { '01': '水泥', '02': '食品', '03': '塑膠', '04': '紡織', '05': '電機機械', '06': '電器電纜', '08': '玻璃', '09': '造紙', '10': '鋼鐵', '11': '橡膠', '12': '汽車', '14': '建材營造', '15': '航運', '16': '觀光餐旅', '17': '金融保險', '18': '貿易百貨', '19': '綜合', '20': '其他', '21': '化學', '22': '生技醫療', '23': '油電燃氣', '24': '半導體', '25': '電腦週邊', '26': '光電', '27': '通信網路', '28': '電子零組件', '29': '電子通路', '30': '資訊服務', '31': '其他電子', '32': '文創', '33': '農業科技', '34': '電子商務', '35': '綠能環保', '36': '數位雲端', '37': '運動休閒', '38': '居家生活' };
const IDXNAME = { '水泥': '水泥類指數', '食品': '食品類指數', '塑膠': '塑膠類指數', '紡織': '紡織纖維類指數', '電機機械': '電機機械類指數', '電器電纜': '電器電纜類指數', '玻璃': '玻璃陶瓷類指數', '造紙': '造紙類指數', '鋼鐵': '鋼鐵類指數', '橡膠': '橡膠類指數', '汽車': '汽車類指數', '建材營造': '建材營造類指數', '航運': '航運類指數', '觀光餐旅': '觀光餐旅類指數', '金融保險': '金融保險類指數', '貿易百貨': '貿易百貨類指數', '其他': '其他類指數', '化學': '化學類指數', '生技醫療': '生技醫療類指數', '油電燃氣': '油電燃氣類指數', '半導體': '半導體類指數', '電腦週邊': '電腦及週邊設備類指數', '光電': '光電類指數', '通信網路': '通信網路類指數', '電子零組件': '電子零組件類指數', '電子通路': '電子通路類指數', '資訊服務': '資訊服務類指數', '其他電子': '其他電子類指數', '綠能環保': '綠能環保類指數', '數位雲端': '數位雲端類指數', '運動休閒': '運動休閒類指數', '居家生活': '居家生活類指數' };
const toNum = s => { const v = parseFloat(String(s).replace(/,/g, '').replace(/<[^>]+>/g, '')); return isNaN(v) ? null : v; };
const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1); const f2 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(2);
const ma = (a, n) => a.length >= n ? a.slice(-n).reduce((x, y) => x + y, 0) / n : null;
const roc = ymd => `${+ymd.slice(0, 4) - 1911}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`; const slash = ymd => `${ymd.slice(0, 4)}/${ymd.slice(4, 6)}/${ymd.slice(6, 8)}`;
function prevDates(ymd, n) { const out = []; let d = new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)); while (out.length < n) { const w = d.getDay(); if (w !== 0 && w !== 6) out.push(d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')); d.setDate(d.getDate() - 1); } return out; }
function nearQuarterEnd(ymd) { const m = +ymd.slice(4, 6), d = +ymd.slice(6, 8); return ((m % 3 === 0) && d >= 17) || ((m % 3 === 1) && d <= 14); }
async function ychart(sym) { const j = await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d`, 'https://finance.yahoo.com/'); const r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r) return null; const q = r.indicators.quote[0]; return (r.timestamp || []).map((t, k) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), o: q.open[k], h: q.high[k], l: q.low[k], c: q.close[k], v: q.volume[k] })).filter(x => x.c != null && x.h != null); }
(async () => {
  const DATE = process.argv[2]; if (!DATE) { console.log('需要日期 YYYYMMDD'); process.exit(1); }
  const TOPS = parseInt(process.argv[3] || '3'), PER = parseInt(process.argv[4] || '2'); const trW = nearQuarterEnd(DATE) ? 0.5 : 1;
  // 產業別
  const ind = {}, ex = {};
  const bL = await json('https://openapi.twse.com.tw/v1/opendata/t187ap03_L'); if (bL) for (const r of bL) { ind[r['公司代號']] = IND[r['產業別']] || '未分類'; ex[r['公司代號']] = 'TWSE'; }
  const bO = await json('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O', 'https://www.tpex.org.tw/'); if (bO) for (const r of bO) { ind[r.SecuritiesCompanyCode] = IND[r.SecuritiesIndustryCode] || '未分類'; ex[r.SecuritiesCompanyCode] = 'TPEx'; }
  // 注意／處置（上市）
  const excl = new Set(); try { const n = await json('https://www.twse.com.tw/rwd/zh/announcement/notice?response=json'); if (n && n.data) for (const r of n.data) excl.add(String(r[1]).trim()); const p = await json('https://www.twse.com.tw/rwd/zh/announcement/punish?response=json'); if (p && p.data) for (const r of p.data) excl.add(String(r[2] || r[1]).trim()); } catch (e) {}
  // 5 日：T86（上市）＋ TPEx 法人 ＋ MI_INDEX（類指數％、各股成交金額；DATE 當日另取收盤）
  const dates = prevDates(DATE, 8); const T = {}, got = [], secMom = {}, turnover = {}; let P = null; let tpexOK = 0;
  for (const d of dates) {
    if (got.length >= 5) break;
    const j = await json(`https://www.twse.com.tw/rwd/zh/fund/T86?date=${d}&selectType=ALL&response=json`); await sleep(1200); if (!j || !j.data) continue; got.push(d);
    const F = j.fields, iF = F.indexOf('外陸資買賣超股數(不含外資自營商)'), iT = F.indexOf('投信買賣超股數');
    for (const r of j.data) { const code = String(r[0]).trim(); if (!/^\d{4}$/.test(code) || code.startsWith('00')) continue; const e = T[code] || (T[code] = { fo: [], tr: [], name: String(r[1]).trim() }); e.fo.push(toNum(r[iF]) / 1000); e.tr.push(toNum(r[iT]) / 1000); }
    const o = await json(`https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?type=Daily&date=${slash(d)}&response=json`, 'https://www.tpex.org.tw/'); await sleep(800);
    const tb = o && o.tables && o.tables[0]; if (tb && tb.data && tb.data.length) { tpexOK++; for (const r of tb.data) { const code = String(r[0]).trim(); if (!/^\d{4}$/.test(code) || code.startsWith('00')) continue; const e = T[code] || (T[code] = { fo: [], tr: [], name: String(r[1]).trim() }); e.fo.push(toNum(r[4]) / 1000); e.tr.push(toNum(r[13]) / 1000); } }
    const m = await json(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${d}&type=ALLBUT0999&response=json`); await sleep(1200);
    if (m && m.tables) { const t0 = m.tables.find(t => /價格指數\(臺灣證券交易所\)/.test(t.title || '')); if (t0) { const ip = t0.fields.findIndex(f => /百分比/.test(f)); for (const r of t0.data) { const nm = String(r[0]).trim(); (secMom[nm] = secMom[nm] || []).push(toNum(r[ip]) || 0); } }
      const t8 = m.tables.find(t => (t.data || []).length > 500); if (t8) { const iv = t8.fields.indexOf('成交金額'), ic = t8.fields.indexOf('收盤價'), ih = t8.fields.indexOf('最高價'), il = t8.fields.indexOf('最低價'), is = t8.fields.indexOf('成交股數'), ig = t8.fields.indexOf('漲跌價差'), isg = t8.fields.indexOf('漲跌(+/-)'); for (const r of t8.data) { const code = String(r[0]).trim(); if (!/^\d{4}$/.test(code)) continue; turnover[code] = (turnover[code] || 0) + (toNum(r[iv]) || 0) / 1e8; if (d === got[0] && !P) {} if (d === DATE) { P = P || {}; const sign = /color:green/.test(String(r[isg])) ? -1 : /color:red|\+/.test(String(r[isg])) ? 1 : 0; P[code] = { name: String(r[1]).trim(), c: toNum(r[ic]), chg: sign * (toNum(r[ig]) || 0), val: (toNum(r[iv]) || 0) / 1e8, v: (toNum(r[is]) || 0) / 1000, h: toNum(r[ih]), l: toNum(r[il]) }; } } } }
  }
  // TPEx 當日收盤
  let tpexPx = 0; { const q = await json(`https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&d=${roc(DATE)}&o=json`, 'https://www.tpex.org.tw/'); const tb = q && q.tables && q.tables[0]; if (tb && tb.data) { const F = tb.fields.map(x => String(x).trim()); const ic = F.findIndex(f => /^收盤/.test(f)), ig = F.findIndex(f => /^漲跌/.test(f)), ih = F.findIndex(f => /^最高/.test(f)), il = F.findIndex(f => /^最低/.test(f)), iv = F.findIndex(f => /成交金額/.test(f)), is = F.findIndex(f => /成交股數/.test(f)); P = P || {}; for (const r of tb.data) { const code = String(r[0]).trim(); if (!/^\d{4}$/.test(code) || code.startsWith('00')) continue; const c = toNum(r[ic]); if (!c) continue; tpexPx++; P[code] = { name: String(r[1]).trim(), c, chg: toNum(r[ig]) || 0, val: (toNum(r[iv]) || 0) / 1e8, v: (toNum(r[is]) || 0) / 1000, h: toNum(r[ih]), l: toNum(r[il]) }; if (!turnover[code]) turnover[code] = P[code].val * got.length; } } }
  console.log(`資料：T86 ${got.length} 日（${got.join(',')}）；TPEx 法人 ${tpexOK} 日、TPEx 收盤 ${tpexPx} 檔；上市收盤 ${P ? Object.keys(P).length - tpexPx : 0} 檔；注意/處置 ${excl.size} 檔（上櫃注意股未取得＝人工確認）${trW < 1 ? '；⚠️ 季末前後＝投信 ×0.5' : ''}`);
  if (!P) { console.log('當日收盤未取得（TWSE/TPEx 尚未更新）'); process.exit(1); }
  // 個股有效流量
  const rows = [];
  for (const [code, e] of Object.entries(T)) { const p = P[code]; if (!p || !p.c) continue; const fo5 = e.fo.reduce((a, b) => a + b, 0), tr5 = e.tr.reduce((a, b) => a + b, 0); const fo3 = e.fo.length >= 3 && e.fo.slice(0, 3).every(x => x > 0); const amt = ((fo3 ? fo5 : 0) + tr5 * trW) * 1000 * p.c / 1e8; const prev = p.c - p.chg; rows.push({ code, name: p.name, ex: ex[code] || (tpexPx && !ind[code] ? 'TPEx' : 'TWSE'), ind: ind[code] || '未分類', c: p.c, chgPct: prev ? (p.c / prev - 1) * 100 : 0, val: p.val, to5: turnover[code] || p.val * 5, fo5, tr5, fo3, amt, notice: excl.has(code) }); }
  const G = {}; for (const r of rows) { const g = G[r.ind] || (G[r.ind] = { ind: r.ind, n: 0, amt: 0, to5: 0, chg: 0, items: [] }); g.n++; g.amt += r.amt; g.to5 += r.to5; g.chg += r.chgPct; g.items.push(r); }
  const mom = nm => { const a = secMom[nm]; if (!a) return null; return (a.reduce((p, x) => p * (1 + x / 100), 1) - 1) * 100; };
  let gs = Object.values(G).filter(g => g.n >= 3 && g.ind !== '未分類' && g.to5 >= 50).map(g => ({ ...g, ratio: g.amt / g.to5 * 100, mom5: mom(IDXNAME[g.ind]), avgChg: g.chg / g.n }));
  const rank = (arr, key) => { const s = [...arr].filter(x => x[key] != null).sort((a, b) => b[key] - a[key]); const m = new Map(); s.forEach((x, i) => m.set(x.ind, i + 1)); return m; };
  const rR = rank(gs, 'ratio'), rM = rank(gs, 'mom5');
  for (const g of gs) g.score = (gs.length - (rR.get(g.ind) || gs.length)) + (gs.length - (rM.get(g.ind) || gs.length));
  gs.sort((a, b) => b.score - a.score);
  console.log(`=== ① 族群熱度 ${DATE}（上市＋上櫃；分數＝法人流量排名＋類指數 5 日動能排名；族群 5 日成交 ≥50 億才列）===`);
  console.log('族群         家數  有效淨買(億) 5日成交(億) 淨買/成交%  類指數5日%  今日平均');
  for (const g of gs.slice(0, 12)) console.log(`${g.ind.padEnd(6, '　')} ${String(g.n).padStart(5)} ${f1(g.amt).padStart(12)} ${f1(g.to5).padStart(11)} ${f2(g.ratio).padStart(10)}% ${f1(g.mom5).padStart(9)}% ${f1(g.avgChg).padStart(7)}%`);
  console.log('最冷：' + gs.slice(-3).map(g => `${g.ind}(流量 ${f2(g.ratio)}%／動能 ${f1(g.mom5)}%)`).join('、'));
  // ② 熱族群候選
  console.log(`=== ② 熱族群前 ${TOPS}（每族群 ${PER} 檔＋2 檔候補；門檻 5 日均成交額 ≥NT$1 億、價 ≥20、非注意/處置）===`);
  const sel = [];
  for (const g of gs.slice(0, TOPS)) { const it = g.items.filter(r => r.to5 / 5 >= 1 && r.c >= 20 && !r.notice && r.amt > 0).map(r => ({ ...r, s: r.amt / r.to5 * 100 })).sort((a, b) => b.s - a.s); console.log(`-- ${g.ind}（類指數 5 日 ${f1(g.mom5)}%）`); for (const r of it.slice(0, PER + 2)) console.log(`   ${r.code} ${r.name.padEnd(6, '　')}${r.ex === 'TPEx' ? '櫃' : '市'} 收 ${String(r.c).padStart(7)} ${f1(r.chgPct).padStart(6)}% 5日成交 ${f1(r.to5).padStart(7)} 億 外資5日 ${f1(r.fo5).padStart(8)} 張${r.fo3 ? '★連3' : '（未連3不計）'} 投信5日 ${f1(r.tr5).padStart(7)} 張 有效淨買 ${f1(r.amt).padStart(6)} 億（${f2(r.s)}%）`); sel.push(...it.slice(0, PER)); }
  // ③ 技術確認（Yahoo）
  console.log('=== ③ 技術確認（Yahoo 日 K；ATR20；突破單＝前 20 日高 +0.1ATR 且收盤站上、量 ≥1.5×20 日均量，次日限價 ≤pivot+2%；回測單＝MA20；停損＝max(10 日低, −2ATR) 且 4–8%）===');
  for (const r of sel) {
    const K = await ychart(`${r.code}.${r.ex === 'TPEx' ? 'TWO' : 'TW'}`); await sleep(300);
    if (!K || K.length < 25) { console.log(`   ${r.code} ${r.name} K 線不足`); continue; }
    const cl = K.map(x => x.c); const tr = []; for (let i = K.length - 20; i < K.length; i++) tr.push(Math.max(K[i].h - K[i].l, Math.abs(K[i].h - K[i - 1].c), Math.abs(K[i].l - K[i - 1].c))); const A = tr.reduce((a, b) => a + b, 0) / 20;
    const m5 = ma(cl, 5), m10 = ma(cl, 10), m20 = ma(cl, 20), p20 = Math.max(...K.slice(-21, -1).map(x => x.h)), v20 = ma(K.slice(0, -1).map(x => x.v), 20), last = K.at(-1);
    const atrN = (last.c - m20) / A; const r5 = (last.c / cl.at(-6) - 1) * 100; const lo10 = Math.min(...K.slice(-10).map(x => x.l));
    let stop = Math.min(Math.max(lo10, last.c - 2 * A), last.c * 0.96); const stopPct = (1 - stop / last.c) * 100;
    const brk = last.c >= p20 && last.v >= 1.5 * v20;
    const flags = [r5 >= 25 ? '❌5日≥25%剔除' : '', atrN > 2 ? '⚠️距MA20>2ATR＝只等回測' : '', stopPct > 8 ? `❌停損${f1(stopPct)}%>8%不做` : '', last.d !== `${DATE.slice(0, 4)}-${DATE.slice(4, 6)}-${DATE.slice(6, 8)}` ? `(K 至 ${last.d})` : ''].filter(Boolean).join(' ');
    console.log(`   ${r.code} ${r.name.padEnd(6, '　')} 收 ${f2(last.c)} MA5 ${f1(m5)} MA10 ${f1(m10)} MA20 ${f1(m20)} ATR ${f1(A)} 距MA20 ${f1(atrN)}ATR 5日 ${f1(r5)}% 前20日高 ${f2(p20)} ${brk ? '✅突破且量≥1.5x' : '—'} 量比 ${f1(last.v / v20)}x → 突破單 ${f1(p20 + 0.1 * A)}（次日限價≤${f1(p20 * 1.02)}）／回測單 ${f1(m20)}／停損 ${f1(stop)}（${f1(stopPct)}%） ${flags}`);
  }
  console.log('\n→ 候選 ≥3 檔由本腳本產生；前 2 檔再跑 tools/branch.js（T+1 分點）；財報前 3 交易日不開新倉；每族群 ≤2 檔。');
})();
