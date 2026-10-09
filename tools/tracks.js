// 三軌計算（v6.1 §A）：給定各軌候選代號，算「現在就能買」的買價（限價 ≤報價×1.01）、防守價、距離檢查、股數、金額、乖離、財報距離、基本面必要欄位
// 用法：node tools/tracks.js --tw-short=1477,8926 --tw-mid=1326 --tw-long=2383 --us-short=PBR --us-mid=HPE --us-long=NVDA --acct-tw=534435 --acct-us=25089 --grade-tw=中性 --grade-us=防守 [--date=20261008]
// 基本面來源：tools/data/revenue/*.json（台，revenue_tw.js 產生）、tools/data/fund_us/<sym>.json（美，fund_us.js 產生）
const https = require('https'); const fs = require('fs'); const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(u) { return new Promise((res, rej) => { const q = https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => { const c = []; r.on('data', x => c.push(x)); r.on('end', () => res(Buffer.concat(c).toString('utf8'))); }); q.on('error', rej); q.setTimeout(15000, () => q.destroy(new Error('timeout'))); }); }
const arg = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : ''; };
const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1); const f2 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(2);
const ma = (a, n, off = 0) => { const s = a.slice(a.length - n - off, a.length - off); return s.length === n ? s.reduce((x, y) => x + y, 0) / n : null; };
const RISK = { 進攻: { short: 1, mid: 1, long: 1.5 }, 中性: { short: 0.5, mid: 0.5, long: 0.75 }, 防守: { short: 0, mid: 0, long: 0 } };
const COST = { TW: 0.006, US: 0.001 };
async function chart(sym, isUS) {
  const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`)); const r = j.chart.result[0]; const q = r.indicators.quote[0]; const today = new Date().toISOString().slice(0, 10);
  let rows = (r.timestamp || []).map((t, k) => ({ d: new Date(t * 1000).toISOString().slice(0, 10), h: q.high[k], l: q.low[k], c: q.close[k], v: q.volume[k] })).filter(x => x.c != null && x.h != null);
  if (isUS && rows.at(-1).d === today) rows = rows.slice(0, -1);
  return { rows, live: r.meta.regularMarketPrice, name: r.meta.shortName || r.meta.longName || '' };
}
function revTW(code) { const dir = path.resolve(__dirname, 'data', 'revenue'); if (!fs.existsSync(dir)) return null; const files = fs.readdirSync(dir).filter(f => /^\d{5}\.json$/.test(f)).sort(); if (!files.length) return null; const latest = JSON.parse(fs.readFileSync(path.join(dir, files.at(-1)), 'utf8'))[code]; if (!latest) return null; let streak = 0; for (const f of [...files].reverse()) { const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))[code]; if (r && r.yoy > 0) streak++; else break; } return { ...latest, streak, months: files.length }; }
function fundUS(sym) { const f = path.resolve(__dirname, 'data', 'fund_us', `${sym}.json`); if (!fs.existsSync(f)) return null; const h = JSON.parse(fs.readFileSync(f, 'utf8')); const ks = Object.keys(h).sort(); const last = h[ks.at(-1)]; const last2 = ks.slice(-2).map(k => h[k].revenueGrowth); return { ...last, n: ks.length, last2 }; }
(async () => {
  const acct = { TW: parseFloat(arg('acct-tw') || '0'), US: parseFloat(arg('acct-us') || '0') }; const grade = { TW: arg('grade-tw') || '中性', US: arg('grade-us') || '中性' };
  const tracks = [['TW', 'short', arg('tw-short')], ['TW', 'mid', arg('tw-mid')], ['TW', 'long', arg('tw-long')], ['US', 'short', arg('us-short')], ['US', 'mid', arg('us-mid')], ['US', 'long', arg('us-long')]];
  const TN = { short: '短線（1–3 週）', mid: '中線（1–3 月）', long: '長線（6 月+）' };
  for (const [mkt, tr, list] of tracks) {
    const syms = list.split(',').filter(Boolean); if (!syms.length) continue;
    const riskPct = (RISK[grade[mkt]] || RISK['中性'])[tr]; const riskAmt = acct[mkt] * riskPct / 100;
    console.log(`\n=== ${mkt === 'TW' ? '🇹🇼' : '🇺🇸'} ${TN[tr]}｜市況 ${grade[mkt]}｜單筆風險 ${riskPct}%＝${mkt === 'TW' ? 'NT$' : '$'}${Math.round(riskAmt).toLocaleString()}${riskPct === 0 ? '（防守＝建議清單為空，以下僅供位階表）' : ''} ===`);
    for (const s of syms) {
      try {
        const isUS = mkt === 'US'; const ysym = isUS ? s : (/^\d{4}$/.test(s) ? `${s}.TW` : s); let ch = null; try { ch = await chart(ysym, isUS); } catch (e) {} if (!isUS && (!ch || ch.rows.length < 70) && /^\d{4}$/.test(s)) { try { ch = await chart(`${s}.TWO`, false); } catch (e) {} } if (!ch) throw new Error('chart 取不到');
        const K = ch.rows, cl = K.map(x => x.c), last = K.at(-1); const px = isUS ? last.c : last.c; const limit = px * 1.01;
        const tr20 = []; for (let i = K.length - 20; i < K.length; i++) tr20.push(Math.max(K[i].h - K[i].l, Math.abs(K[i].h - K[i - 1].c), Math.abs(K[i].l - K[i - 1].c))); const A = tr20.reduce((a, b) => a + b, 0) / 20;
        const m10 = ma(cl, 10), m20 = ma(cl, 20), m60 = ma(cl, 60), m60b = ma(cl, 60, 10), lo10 = Math.min(...K.slice(-10).map(x => x.l)); const atrN = (px - m20) / A; const r5 = (px / cl.at(-6) - 1) * 100; const hi52 = Math.max(...K.slice(-252).map(x => x.h));
        let stop, lo, hi, exitRule;
        if (tr === 'short') { stop = Math.max(lo10, limit - 2 * A); lo = 6; hi = 10; exitRule = '第 15 日未達 +1R 且 ≤兩平價→出；15 日內有財報不開'; }
        else if (tr === 'mid') { stop = Math.max(m60 * 0.98, limit * 0.88); lo = 6; hi = 12; exitRule = '收盤破 MA60 連 2 日→出；第 30 日未達 +0.5R 且 ≤兩平→出'; }
        else { stop = limit * 0.80; lo = 20; hi = 20; exitRule = '災難線 −20%；月營收 YoY 連 2 月轉負／毛利率連 2 季降→出'; }
        const stopPct = (1 - stop / limit) * 100; const inRange = tr === 'long' ? true : (stopPct >= lo - 0.05 && stopPct <= hi + 0.05);
        const perShare = limit - stop + limit * COST[mkt]; let shares = riskAmt > 0 ? Math.floor(Math.min(riskAmt / perShare, 0.15 * acct[mkt] / limit)) : 0;
        if (tr === 'short' && atrN > 2 && atrN <= 3) shares = Math.floor(shares / 2);
        const flags = [];
        if (tr === 'short' && atrN > 3) flags.push('❌距MA20>3ATR（只掛 MA10 回測）'); if (tr === 'short' && r5 >= 25) flags.push('❌5日≥25%'); if (tr !== 'short' && r5 >= 25) flags.push('⏸5日≥25%＝第1批暫停5日');
        if (!inRange) flags.push(`❌防守距離 ${f1(stopPct)}% 不在 ${lo}–${hi}%`); if (tr !== 'short' && !(px > m60 && m60 > m60b)) flags.push('❌未在 MA60 上或 MA60 未向上');
        // 基本面
        let fund = '—';
        if (tr !== 'short') { if (isUS) { const f = fundUS(s); if (!f) { fund = '❌美股基本面未取得（跑 fund_us.js）'; flags.push('❌必要欄位缺'); } else { const rg = f.revenueGrowth; const okMid = rg != null && rg > 0.15; const longRev = f.n >= 2 ? f.last2.every(x => x != null && x > 0.15) : (rg > 0.15 && f.g1y != null && f.g1y > 0.15); const okLong = longRev && f.fcf > 0 && f.eps > 0 && f.pe != null && f.pe > 0 && f.pe < 2 * f.g; fund = `revenueGrowth ${f1(rg * 100)}%／FCF ${f1(f.fcf / 1e9)}B／EPS ${f2(f.eps)}／PE ${f1(f.pe)} vs 2g ${f1(2 * f.g)}／+1y ${f.g1y == null ? '無資料，略過' : f1(f.g1y * 100) + '%'}／季數 ${f.n}／財報 ${f.earn || '?'}`; if (tr === 'mid' && !okMid) flags.push('❌中線必要：revenueGrowth ≤15%'); if (tr === 'long' && !okLong) flags.push('❌長線必要未全過'); if (f.earn) { const d = (new Date(f.earn) - new Date(last.d)) / 864e5; if (tr === 'short' && d >= 0 && d <= 21) flags.push(`❌財報 ${f.earn} 在持有期內`); } } }
          else { const r = revTW(s); if (!r) { fund = '❌台股月營收未取得（跑 revenue_tw.js）'; flags.push('❌必要欄位缺'); } else { fund = `${r.ym} 月營收 YoY ${f1(r.yoy)}%／累計 YoY ${f1(r.ytdYoy)}%／連續正成長 ${r.streak}/${r.months} 月${r.months < 2 ? '（累積不足，略過）' : ''}`; if (tr === 'mid' && !(r.yoy > 15)) flags.push('❌中線必要：月營收 YoY ≤15%'); if (tr === 'long' && !(r.yoy > 20 && r.ytdYoy > 20)) flags.push('❌長線必要：YoY/累計 YoY ≤20%'); } } }
        const ok = !flags.some(x => x.startsWith('❌')) && riskPct > 0;
        console.log(`${ok ? '✅' : '—'} ${s.padEnd(6)} ${ch.name.slice(0, 14).padEnd(14)} 收 ${f2(px)}（${last.d.slice(5)}）${isUS && ch.live ? ' 即時 ' + f2(ch.live) : ''}｜買價 ≤${f2(limit)}｜防守 ${f2(stop)}（−${f1(stopPct)}%）｜股數 ${shares}（${mkt === 'TW' ? 'NT$' : '$'}${Math.round(shares * limit).toLocaleString()}）｜MA20 ${f1(m20)}／MA60 ${f1(m60)}${m60 > m60b ? '↑' : '↓'}｜ATR ${f1(A)} 乖離 ${f1(atrN)}x｜5日 ${f1(r5)}%｜距52W高 ${f1((px / hi52 - 1) * 100)}%｜${fund}｜${exitRule}${flags.length ? '｜' + flags.join(' ') : ''}`);
      } catch (e) { console.log(s, 'ERR', e.message); }
      await sleep(300);
    }
  }
  console.log('\n→ ✅＝符合該軌全部必要條件且市況允許；清單只放 ✅。推薦原因欄另補：族群與法人數字、敘事階段、主要風險。');
})();
