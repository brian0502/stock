// 市況判定 v6（2026-10-08 三方簽字規則 §2）：每次分析第一支跑。決定「該不該在場上」與候選檔數。
// 用法：node tools/regime.js [--night=-1.2] [--fut=-32000]
//   --night ＝ 台指期夜盤相對日盤漲跌 %（TAIFEX 無公開 JSON，手動帶入；未帶＝0 分並註明）
//   --fut   ＝ 台指期外資淨未平倉口數（TAIFEX 需 POST，手動帶入；未帶＝0 分並註明）
// 資料：Yahoo chart（^GSPC ^TWII ^VIX ^SOX RSP SPY BZ=F）、FRED HY OAS（BAMLH0A0HYM2）、TWSE MI_INDEX 漲跌家數（上市）、TPEx（上櫃，取不到則註明）。
// 美股一律用「前一完整交易日」資料；台股用當日收盤。
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url, headers = {}, hops = 0) { return new Promise((resolve, reject) => { const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers } }, res => { if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 3) { res.resume(); return get(new URL(res.headers.location, url).href, headers, hops + 1).then(resolve, reject); } const c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve({ s: res.statusCode, t: Buffer.concat(c).toString('utf8') })); }); req.on('error', reject); req.setTimeout(8000, () => { req.destroy(new Error('timeout ' + url.slice(0, 60))); }); }); }
async function json(url, headers) { for (let i = 0; i < 3; i++) { try { const r = await get(url, headers); if (r.s === 200 && /^[\[{]/.test(r.t.trim())) return JSON.parse(r.t); } catch (e) {} await sleep(900); } return null; }
async function chart(sym, range = '1y') {
  const j = await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`);
  const r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r) return null;
  const q = r.indicators.quote[0]; const out = []; (r.timestamp || []).forEach((t, k) => { if (q.close[k] != null) out.push({ d: new Date(t * 1000).toISOString().slice(0, 10), c: q.close[k] }); });
  return out;
}
const ma = (a, n, off = 0) => { const s = a.slice(a.length - n - off, a.length - off); return s.length === n ? s.reduce((x, y) => x + y, 0) / n : null; };
const pct = (a, b) => (a / b - 1) * 100;
const f1 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(1);
const f2 = x => x == null || isNaN(x) ? 'NA' : (+x).toFixed(2);
const arg = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? parseFloat(a.split('=')[1]) : null; };
// 完整日：美股若最後一筆是今天（盤中），丟掉
function completeDays(rows, isUS) { if (!rows) return rows; const today = new Date().toISOString().slice(0, 10); if (isUS && rows.at(-1).d === today) return rows.slice(0, -1); return rows; }
function trendItem(label, c, off = 0) {
  const last = c.at(-1 - off), m60 = ma(c, 60, off), m20 = ma(c, 20, off), m20b = ma(c, 20, off + 10);
  const up = last > m60 && m20 > m20b, dn = last < m60 && m20 < m20b;
  return { k: `${label} 趨勢（>MA60 且 MA20 斜率）`, v: `${f2(last)} vs MA60 ${f2(m60)}（${f1(pct(last, m60))}%）、MA20 十日斜率 ${f1(pct(m20, m20b))}%`, s: up ? 2 : dn ? -2 : 0 };
}
function tenDay(label, c, off = 0) { const r = pct(c.at(-1 - off), c.at(-11 - off)); return { k: `${label} 10 日漲跌（硬性）`, v: `${f1(r)}%`, s: 0, override: r <= -10 ? `${label} 10 日 ≤−10%：禁個股新單，直到連 2 收盤 >MA20` : null }; }
function grade(items) {
  const score = items.reduce((a, i) => a + i.s, 0); const ov = items.filter(i => i.override).map(i => i.override);
  const g = score >= 4 ? '🟢 進攻' : score >= 1 ? '🟡 中性' : '🟠 防守／🔴 空手';
  return { score, g, ov };
}
function printTable(title, items, g) {
  console.log(`\n=== ${title} ===`);
  for (const i of items) console.log(`${(i.k + '').padEnd(34, '　').slice(0, 34)} ${String(i.v).padEnd(60)} ${String(i.s).padStart(3)}${i.override ? '  ⛔ ' + i.override : ''}`);
  console.log(`合計 ${g.score} → ${g.g}${g.ov.length ? '｜硬性：' + g.ov.join('；') : ''}`);
  const neg = items.filter(i => i.s < 0).map(i => `${i.k}（${i.v}）`); console.log(`扣分項：${neg.length ? neg.join('；') : '無'}`);
}
(async () => {
  const NIGHT = arg('night'), FUT = arg('fut');
  const hyg = completeDays(await chart('HYG'), true), lqd = completeDays(await chart('LQD'), true); const spx = completeDays(await chart('^GSPC'), true), vix = completeDays(await chart('^VIX'), true), rsp = completeDays(await chart('RSP'), true), spy = completeDays(await chart('SPY'), true), brent = completeDays(await chart('BZ=F'), true), sox = completeDays(await chart('^SOX'), true), twii = await chart('^TWII');
  const sc = spx.map(r => r.c), vc = vix.map(r => r.c), tc = twii.map(r => r.c), soxc = sox ? sox.map(r => r.c) : null;
  // HY OAS（FRED CSV）
  let oas = null;
  // FRED API key：process.env.FRED_API_KEY 或 repo 根目錄 .env（gitignored；家裡電腦也放一份）
  let KEY = process.env.FRED_API_KEY; if (!KEY) { try { const env = require('fs').readFileSync(require('path').resolve(__dirname, '..', '.env'), 'utf8'); const m = env.match(/^FRED_API_KEY=(.+)$/m); if (m) KEY = m[1].trim(); } catch (e) {} }
  if (KEY) { try { const j = await json(`https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2&api_key=${KEY}&file_type=json&sort_order=asc&observation_start=2025-01-01`); if (j && j.observations) oas = j.observations.filter(x => x.value !== '.').map(x => ({ d: x.date, v: parseFloat(x.value) * 100 })); } catch (e) {} }
  if (!oas) { try { const r = await get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2'); if (r.s === 200 && /DATE|observation_date/i.test(r.t.slice(0, 40))) { oas = r.t.trim().split('\n').slice(1).map(l => l.split(',')).filter(x => x[1] !== '.').map(x => ({ d: x[0], v: parseFloat(x[1]) * 100 })); } } catch (e) {} }
  if (!oas) console.log(`(FRED OAS 未取得${KEY ? '' : '：無 FRED_API_KEY，見 .env.example'}＝信用項用 HYG/LQD 備援)`);
  const build = (off) => {
    const it = [];
    it.push(trendItem('S&P', sc, off));
    const bd = pct(rsp.at(-1 - off).c / spy.at(-1 - off).c, rsp.at(-21 - off).c / spy.at(-21 - off).c);
    it.push({ k: '廣度（備援 RSP/SPY 20 日；% >MA50 未取得）', v: `${f1(bd)}%`, s: bd >= 0.5 ? 1 : bd <= -1.5 ? -1 : 0 });
    if (oas && oas.length > 21) { const d = oas.at(-1 - off).v - oas.at(-21 - off).v; it.push({ k: '信用 HY OAS 20 日 Δ（FRED）', v: `${f2(oas.at(-1 - off).v / 100)}%（${d >= 0 ? '+' : ''}${f1(d)} bp・${oas.at(-1 - off).d}）`, s: d <= -20 ? 1 : d >= 30 ? -2 : 0 }); } else if (hyg && lqd) { const cr = pct(hyg.at(-1 - off).c / lqd.at(-1 - off).c, hyg.at(-21 - off).c / lqd.at(-21 - off).c); it.push({ k: '信用（備援 HYG/LQD 20 日；FRED OAS 未取得）', v: `${f1(cr)}%`, s: cr >= 0.5 ? 1 : cr <= -1 ? -2 : 0 }); } else it.push({ k: '信用 HY OAS', v: '未取得', s: 0 });
    const v = vc.at(-1 - off); it.push({ k: 'VIX', v: `${f2(v)}`, s: v >= 25 ? -1 : 0, override: v >= 30 ? 'VIX ≥30：禁個股新單；模式 A 逆向分 3 批（共用 20% 額度）' : null });
    const b5 = pct(brent.at(-1 - off).c, brent.at(-6 - off).c); it.push({ k: 'Brent 5 日', v: `$${f2(brent.at(-1 - off).c)}（${f1(b5)}%）`, s: b5 >= 8 ? -1 : 0 });
    it.push(tenDay('S&P', sc, off));
    return it;
  };
  const usNow = build(0), usPrev = build(1); const gN = grade(usNow), gP = grade(usPrev);
  printTable(`🇺🇸 美股市況（資料至 ${spx.at(-1).d}，前一完整交易日）`, usNow, gN);
  console.log(`前一日（${spx.at(-2).d}）合計 ${gP.score} → ${gP.g}；換檔需連 2 收盤確認：${gN.g === gP.g ? '✅ 已確認 ' + gN.g : '⏳ 未確認（維持 ' + gP.g + '）'}`);
  // 🇹🇼
  const buildTW = async (off) => {
    const it = [];
    it.push(trendItem('加權', tc, off));
    // 漲跌家數 5 日（上市 MI_INDEX；上櫃未取得則註明）
    let ups = [], note = '';
    const dates = twii.slice(-5 - off, twii.length - off).map(r => r.d.replace(/-/g, ''));
    for (const d of dates) { const j = await json(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${d}&type=MS&response=json`, { Referer: 'https://www.twse.com.tw/zh/' }); await sleep(1500); const tb = j && (j.tables || []).find(t => /漲跌證券數/.test(JSON.stringify(t.fields || t.title || ''))) || (j && j.tables && j.tables[7]); try { const rows = (tb && tb.data) || []; const cell = r => parseInt(String(r[2]).split('(')[0].replace(/[^\d]/g, '')); const up = cell(rows.find(r => /上漲/.test(r[0]))); const dn = cell(rows.find(r => /下跌/.test(r[0]))); if (up + dn > 0) ups.push(up / (up + dn) * 100); } catch (e) {} }
    if (ups.length) { const avg = ups.reduce((a, b) => a + b, 0) / ups.length; it.push({ k: `廣度 上市 ${ups.length} 日平均上漲家數比（上櫃未取得）`, v: `${f1(avg)}%（${ups.map(f1).join('/')}）`, s: avg >= 60 ? 2 : avg <= 40 ? -2 : 0 }); } else it.push({ k: '廣度 漲跌家數', v: '未取得', s: 0 });
    if (oas && oas.length > 21) { const d = oas.at(-1 - off).v - oas.at(-21 - off).v; it.push({ k: '信用（承美）', v: `${d >= 0 ? '+' : ''}${f1(d)} bp`, s: d <= -20 ? 1 : d >= 30 ? -2 : 0 }); } else if (hyg && lqd) { const cr = pct(hyg.at(-1 - off).c / lqd.at(-1 - off).c, hyg.at(-21 - off).c / lqd.at(-21 - off).c); it.push({ k: '信用（承美・備援 HYG/LQD）', v: `${f1(cr)}%`, s: cr >= 0.5 ? 1 : cr <= -1 ? -2 : 0 }); }
    const v = vc.at(-1 - off); it.push({ k: 'VIX（承美）', v: `${f2(v)}`, s: v >= 25 ? -1 : 0, override: v >= 30 ? 'VIX ≥30 台美同處置：禁個股新單' : null });
    it.push({ k: '台指期夜盤 vs 日盤', v: NIGHT == null ? '未帶入（--night=）' : `${f1(NIGHT)}%`, s: NIGHT != null && NIGHT <= -2 ? -1 : 0 });
    const b5 = pct(brent.at(-1 - off).c, brent.at(-6 - off).c); it.push({ k: 'Brent 5 日（承美）', v: `${f1(b5)}%`, s: b5 >= 8 ? -1 : 0 });
    if (soxc) { const m20 = ma(soxc, 20, off); it.push({ k: 'SOX vs MA20', v: `${f2(soxc.at(-1 - off))} vs ${f2(m20)}`, s: soxc.at(-1 - off) > m20 ? 1 : -1 }); }
    it.push({ k: '外資台指期淨未平倉', v: FUT == null ? '未帶入（--fut=）' : `${FUT} 口`, s: FUT != null && FUT < -30000 ? -1 : 0 });
    it.push(tenDay('加權', tc, off));
    return it;
  };
  const twNow = await buildTW(0); const tN = grade(twNow);
  printTable(`🇹🇼 台股市況（資料至 ${twii.at(-1).d}）`, twNow, tN);
  const twPrev = [trendItem('加權', tc, 1), tenDay('加權', tc, 1)]; const tP = grade(twPrev);
  console.log(`前一日趨勢項（簡算）${tP.score} → 換檔確認需人工比對前次報告檔位`);
  console.log(`\n→ 檔位規則：進攻(≥4)＝0–5 檔可✅、新倉上限 60%；中性(1–3)＝0–3 檔、30%；防守/空手(≤0)＝不進場＋列扣分項與解除門檻。上限只限新增與加碼，不因降檔減碼。`);
  console.log(`→ 本次：🇺🇸 ${gN.g}（${gN.score}）／🇹🇼 ${tN.g}（${tN.score}）`);
})();
