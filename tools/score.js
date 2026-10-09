// 計分板 v6（規則 §6）：scorecard.json 每筆建議（入選 pick／剔除 excluded 影子／不進場 no_entry）自動補 成交／T+5／T+20／觸停損／R，輸出成交率、勝率、平均淨 R（含成本）
// 用法：node tools/score.js [--dry]
// 規則：pullback＝有效期內最低價 ≤ entry 視為成交（成交價 entry）；breakout＝最高價 ≥ entry 視為成交（成交價 min(entry+滑價, limit)）；同日觸買與觸停損取不利路徑（先成交後停損）。
//       成交後任一日最低價 ≤ stop＝出場 stop；否則 T+20 收盤。R＝(出場 − entry − 成本)/(entry − stop)。≥50 筆才改參數。
const fs = require('fs'); const path = require('path'); const https = require('https');
const FILE = path.resolve(__dirname, '..', 'scorecard.json'); const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url) { return new Promise((resolve, reject) => { https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => { const c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); }).on('error', reject); }); }
async function chart(sym) { for (let i = 0; i < 3; i++) { try { const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d`)); const r = j.chart.result[0]; const q = r.indicators.quote[0]; const today = new Date().toISOString().slice(0, 10); return (r.timestamp || []).map((t, k) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), o: q.open[k], h: q.high[k], l: q.low[k], c: q.close[k] })).filter(x => x.c != null && x.d !== today); } catch (e) { await sleep(800); } } return null; }
const ysym = p => p.market === 'TW' ? `${p.symbol}.${p.exchange === 'TPEx' ? 'TWO' : 'TW'}` : p.symbol;
const COST = { TW: 0.006, US: 0.001 }; // 來回成本率（台股 0.1425%×2×折扣＋0.3% 稅 ≈0.6%；美股滑價＋匯費估 0.1%）
(async () => {
  const dry = process.argv.includes('--dry'); const sc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  for (const p of sc.picks) {
    if (p.kind === 'no_entry' || p.status === 'cancelled' || (p.result && p.result.final)) continue;
    const rows = await chart(ysym(p)); if (!rows) { console.log(p.symbol, 'chart ERR'); continue; }
    const start = p.effective || p.date; const after = rows.filter(r => r.d >= start); if (!after.length) continue;
    const valid = p.type === 'breakout' ? 2 : p.type === 'market' ? 1 : 5; const win = after.slice(0, valid); let fi = -1, fill = null;
    if (p.type === 'market' && win.length) { fi = 0; fill = Math.min(win[0].o || win[0].c, p.entry); }
    for (let k = 0; fi < 0 && k < win.length; k++) { if (p.type === 'pullback' && win[k].l <= p.entry) { fi = k; fill = p.entry; break; } if (p.type === 'breakout' && win[k].h >= p.entry) { fi = k; fill = Math.min(p.limit || p.entry * 1.02, Math.max(p.entry, win[k].c > p.entry ? p.entry : p.entry)); break; } }
    const res = { checked: rows.at(-1).d, filled: fi >= 0, fillDate: fi >= 0 ? win[fi].d : null, fill, daysSince: after.length };
    if (fi >= 0) {
      const post = after.slice(fi); let stopIdx = -1; for (let k = 0; k < post.length; k++) if (post[k].l <= p.stop) { stopIdx = k; break; }
      const risk = fill - p.stop; const cost = fill * (COST[p.market] || 0.003);
      res.t5 = post[5] ? post[5].c : null; res.t20 = post[20] ? post[20].c : null; res.last = post.at(-1).c;
      res.stopped = stopIdx >= 0 && (res.t20 == null || stopIdx <= 20); res.stopDate = stopIdx >= 0 ? post[stopIdx].d : null;
      const exit = res.stopped ? p.stop : (res.t20 ?? res.last);
      res.R = +((exit - fill - cost) / risk).toFixed(2); res.retPct = +((exit / fill - 1) * 100).toFixed(2); res.final = res.stopped || res.t20 != null;
    } else if (after.length >= valid) { res.final = true; res.note = `${valid} 日內未成交`; }
    p.result = res; await sleep(300);
  }
  const groups = {}; const key = p => `${p.kind || 'pick'}/${p.market}/${p.type}`;
  for (const p of sc.picks) { if (!p.result || !p.result.filled || p.result.R == null) continue; const g = groups[key(p)] || (groups[key(p)] = { n: 0, w: 0, R: 0 }); g.n++; if (p.result.R > 0) g.w++; g.R += p.result.R; }
  console.log('date       kind     track mkt sym      type      entry     stop  regime  filled stop?     T5      T20      R   src');
  for (const p of sc.picks) { const r = p.result || {}; console.log(`${p.date} ${(p.kind || 'pick').padEnd(8)} ${(p.track || '-').padEnd(5)} ${p.market.padEnd(3)} ${p.symbol.padEnd(8)} ${(p.type || '-').padEnd(9)} ${String(p.entry ?? '-').padStart(8)} ${String(p.stop ?? '-').padStart(8)} ${(p.regime || '-').padEnd(7)} ${String(r.filled ?? '-').padEnd(6)} ${String(r.stopped ?? '-').padEnd(6)} ${String(r.t5 ?? '-').padStart(8)} ${String(r.t20 ?? '-').padStart(8)} ${String(r.R ?? '-').padStart(6)} ${p.source || ''}${r.note ? '  ' + r.note : ''}`); }
  const picks = sc.picks.filter(p => (p.kind || 'pick') === 'pick'); const done = picks.filter(p => p.result && p.result.filled && p.result.R != null); const wins = done.filter(p => p.result.R > 0);
  const avgR = done.length ? done.reduce((a, p) => a + p.result.R, 0) / done.length : null; const unfilled = picks.filter(p => p.result && p.result.final && !p.result.filled).length;
  const line = `近 ${picks.length} 筆建議：成交 ${done.length}／未成交 ${unfilled}、勝率 ${done.length ? (wins.length / done.length * 100).toFixed(0) + '%' : 'NA'}、平均淨 R ${avgR == null ? 'NA' : avgR.toFixed(2)}（≥50 筆才改參數）`;
  console.log('\n' + line); for (const [k, g] of Object.entries(groups)) console.log(`  ${k}: n=${g.n} 勝率 ${(g.w / g.n * 100).toFixed(0)}% 平均 R ${(g.R / g.n).toFixed(2)}`);
  sc.summary = { updated: new Date().toISOString().slice(0, 10), line, groups };
  if (!dry) fs.writeFileSync(FILE, JSON.stringify(sc, null, 2)); console.log(dry ? '(dry run)' : 'scorecard.json 已更新');
})();
