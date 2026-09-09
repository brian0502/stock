// TWSE official data: index MA, stock MA, T86 institutional
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.twse.com.tw/zh/' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}
async function getJson(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const t = await get(url);
      if (t && t.trim().startsWith('{')) return JSON.parse(t);
    } catch (e) {}
    await sleep(2500);
  }
  return null;
}
// usage: node tools/twse.js T86日期(逗號,YYYYMMDD) 股票清單(逗號)  例: node tools/twse.js 20260908,20260909 2330,2317,0050
const now = new Date(); const months = [3,2,1,0].map(k => { const d = new Date(now.getFullYear(), now.getMonth()-k, 1); return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + '01'; });
const T86DATES = (process.argv[2] || '').split(',').filter(Boolean);
const toNum = s => parseFloat(String(s).replace(/,/g, ''));
function ma(arr, n) { if (arr.length < n) return null; const s = arr.slice(-n); return s.reduce((a, b) => a + b, 0) / n; }
function fmt(x, d = 2) { return x == null ? 'NA' : x.toFixed(d); }
(async () => {
  // Index
  const idx = [];
  for (const m of months) {
    const j = await getJson(`https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?date=${m}&response=json`);
    if (j && j.data) for (const r of j.data) idx.push({ d: r[0], vol: toNum(r[2]) / 1e8, close: toNum(r[4]), chg: toNum(r[5]) });
    await sleep(1800);
  }
  console.log('=== INDEX last 4 days ===');
  for (const r of idx.slice(-4)) console.log(r.d, r.close, r.chg, 'vol', fmt(r.vol, 1), '億');
  const closes = idx.map(r => r.close);
  for (let k = 0; k < 3; k++) {
    const sub = closes.slice(0, closes.length - k);
    console.log(`IDX asof ${idx[idx.length - 1 - k].d}: MA5 ${fmt(ma(sub, 5))} MA10 ${fmt(ma(sub, 10))} MA20 ${fmt(ma(sub, 20))} MA60 ${fmt(ma(sub, 60))} n=${sub.length}`);
  }
  // next-day MA60 threshold: (sum of last 59) / 60 ... need close >= 60*MA60_next - sum(last 59)
  const last59 = closes.slice(-59).reduce((a, b) => a + b, 0);
  console.log('Tomorrow MA60 threshold (close c >= (last59+c)/60 => c >= last59/59):', fmt(last59 / 59));
  const hi60 = Math.max(...closes.slice(-60)); console.log('60d high', hi60, 'alltime-ish max in data', Math.max(...closes));

  // Stocks
  const stocks = (process.argv[3] || '2330,2317,0050,3231,2454,2303,2705').split(',');
  const out = {};
  for (const s of stocks) {
    const rows = [];
    for (const m of months) {
      const j = await getJson(`https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${m}&stockNo=${s}&response=json`);
      if (j && j.data) for (const r of j.data) rows.push({ d: r[0], vol: toNum(r[1]) / 1000, o: toNum(r[3]), h: toNum(r[4]), l: toNum(r[5]), c: toNum(r[6]), chg: r[7] });
      await sleep(1800);
    }
    out[s] = rows;
    const cl = rows.map(r => r.c);
    console.log(`=== ${s} ===`);
    for (const r of rows.slice(-3)) console.log(r.d, 'O', r.o, 'H', r.h, 'L', r.l, 'C', r.c, 'chg', r.chg, 'vol', fmt(r.vol, 0), '張');
    for (let k = 0; k < 2; k++) {
      const sub = cl.slice(0, cl.length - k);
      console.log(`  asof ${rows[rows.length - 1 - k].d}: MA5 ${fmt(ma(sub, 5))} MA10 ${fmt(ma(sub, 10))} MA20 ${fmt(ma(sub, 20))} MA60 ${fmt(ma(sub, 60))}`);
    }
    const l59 = cl.slice(-59).reduce((a, b) => a + b, 0);
    console.log('  tomorrow MA60 threshold', fmt(l59 / 59), '60d high', Math.max(...cl.slice(-60)), '60d low', Math.min(...cl.slice(-60)));
  }
  // T86
  for (const d of T86DATES) {
    const j = await getJson(`https://www.twse.com.tw/rwd/zh/fund/T86?date=${d}&selectType=ALLBUT0999&response=json`);
    await sleep(2000);
    if (!j || !j.data) { console.log('T86', d, 'NO DATA'); continue; }
    console.log('=== T86', d, 'fields:', JSON.stringify(j.fields));
    // fields: 0 code,1 name,2 外陸資買進,3 賣出,4 買賣超, 5 外資自營買,6,7, 8 投信買進,9 賣出,10 買賣超, 11 自營商買賣超, ... last = 三大法人買賣超
    const rows = j.data.map(r => ({ code: r[0].trim(), name: r[1].trim(), f: toNum(r[4]) / 1000, it: toNum(r[10]) / 1000, dl: toNum(r[11]) / 1000, tot: toNum(r[r.length - 1]) / 1000 }));
    const byIt = [...rows].sort((a, b) => b.it - a.it);
    console.log('-- 投信買超 top20 (張) [code name 投信 外資 自營 合計]');
    for (const r of byIt.slice(0, 20)) console.log(r.code, r.name, fmt(r.it, 0), fmt(r.f, 0), fmt(r.dl, 0), fmt(r.tot, 0));
    console.log('-- 投信賣超 top10');
    for (const r of byIt.slice(-10).reverse()) console.log(r.code, r.name, fmt(r.it, 0), fmt(r.f, 0), fmt(r.dl, 0), fmt(r.tot, 0));
    const byF = [...rows].sort((a, b) => b.f - a.f);
    console.log('-- 外資買超 top15');
    for (const r of byF.slice(0, 15)) console.log(r.code, r.name, '投信', fmt(r.it, 0), '外資', fmt(r.f, 0), '自營', fmt(r.dl, 0));
    console.log('-- 外資賣超 top10');
    for (const r of byF.slice(-10).reverse()) console.log(r.code, r.name, '投信', fmt(r.it, 0), '外資', fmt(r.f, 0), '自營', fmt(r.dl, 0));
    console.log('-- watch stocks');
    for (const s of stocks) { const r = rows.find(x => x.code === s); if (r) console.log(r.code, r.name, '投信', fmt(r.it, 0), '外資', fmt(r.f, 0), '自營', fmt(r.dl, 0), '合計', fmt(r.tot, 0)); }
    // aggregate
    const sumF = rows.reduce((a, r) => a + r.f, 0);
    console.log('sum foreign (張, approx):', fmt(sumF, 0));
  }
  
})();
