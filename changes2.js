// 2026-10-12 補跑：changes.js 在 dashboard 正則處中斷（lastUpdated 內含 <b>），data.js／current_strategy 已寫入；本檔只做 dashboard／scorecard／episodes 三步
module.exports = function (api) {
  const { rd, wr, repRe } = api;
  const insertAfter = (s, marker, text) => { const a = s.indexOf(marker); if (a < 0) throw new Error('marker not found: ' + marker); return s.slice(0, a + marker.length) + text + s.slice(a + marker.length); };

  // ===== dashboard.html =====
  let h = rd('dashboard.html');
  h = repRe(h, /(<div class="mono" id="lastUpdated">)[\s\S]*?(<\/div>)/, (m, a, b) => a + '2026-10-12 週一・🧭 v6.1 第 2 次（台股 10/12 收盤・美股 10/9 收盤）＝<b>🇹🇼 防守 0</b>（官方外資期貨淨空 −82,806 口補入）／<b>🇺🇸 防守 −1</b>＝建議清單皆空；10/9 三筆若成交＝守 72.3／472.8／2,060' + b);
  wr('dashboard.html', h);

  // ===== scorecard.json =====
  const sc = JSON.parse(rd('scorecard.json'));
  if (sc.picks.some(p => p.id === 'N004')) throw new Error('scorecard 已含 N004，勿重複');
  for (const p of sc.picks) { if (['T001', 'T002', 'T003'].includes(p.id)) p.note = (p.note || '') + '｜10/12 官方外資期貨 −82,806 口補入＝台股 0 防守＝10/9 中性未經連 2 確認；若未掛＝視同影子'; }
  const add = (o) => sc.picks.push(o);
  add({ id: 'N004', date: '2026-10-12', kind: 'no_entry', market: 'TW', symbol: '-', name: '台股不進場', type: '-', regime: '防守(0)', source: 'regime', note: '外資 TX 淨空 −82,806 口 −1；OAS +45bp −2；趨勢 +2；SOX +1；廣度 48.5%' });
  add({ id: 'N005', date: '2026-10-12', kind: 'no_entry', market: 'US', symbol: '-', name: '美股不進場', type: '-', regime: '防守(−1)', source: 'regime', note: 'OAS 3.15% +45bp −2；RSP/SPY −2.7% −1；趨勢 +2（10/8、10/9 連 2 日）' });
  add({ id: 'S008', date: '2026-10-12', effective: '2026-10-13', kind: 'excluded', track: 'mid', market: 'TW', symbol: '2408', name: '南亞科', type: 'market', entry: 532.27, stop: 472.61, regime: '防守(0)', source: 'tracks 中線 ✅', note: '檔位 0 未掛；法說毛利 85.7% 利多不漲' });
  add({ id: 'S009', date: '2026-10-12', effective: '2026-10-13', kind: 'excluded', track: 'long', market: 'TW', symbol: '2330', name: '台積電', type: 'market', entry: 2565.4, stop: 2052.32, regime: '防守(0)', source: 'tracks 長線 ✅', note: '檔位 0 未掛；法說 10/15' });
  add({ id: 'S010', date: '2026-10-12', effective: '2026-10-13', kind: 'excluded', track: 'short', market: 'TW', symbol: '1326', name: '台化', type: 'market', entry: 77.57, stop: 71.58, regime: '防守(0)', source: 'tracks 短線 ✅', note: '檔位 0 未掛；分點外資淨賣 −5,555、塑膠族群熱度第 5' });
  add({ id: 'S011', date: '2026-10-12', effective: '2026-10-12', kind: 'excluded', track: 'short', market: 'US', symbol: 'TEAM', name: 'Atlassian', type: 'market', entry: 208.86, stop: 191.56, regime: '防守(−1)', source: 'scan_us 軟體 #2', note: '檔位 −1 未掛' });
  add({ id: 'S012', date: '2026-10-12', effective: '2026-10-12', kind: 'excluded', track: 'short', market: 'US', symbol: 'DDOG', name: 'Datadog', type: 'market', entry: 296.19, stop: 273.08, regime: '防守(−1)', source: 'scan_us 軟體', note: '檔位 −1 未掛；乖離 2.9 ATR 減半' });
  add({ id: 'S013', date: '2026-10-12', effective: '2026-10-12', kind: 'excluded', track: 'mid', market: 'US', symbol: 'HPE', name: 'HPE', type: 'market', entry: 74.19, stop: 65.29, regime: '防守(−1)', source: 'fund_us 中線 ✅', note: '檔位 −1 未掛' });
  add({ id: 'S014', date: '2026-10-12', effective: '2026-10-12', kind: 'excluded', track: 'mid', market: 'US', symbol: 'DELL', name: 'Dell', type: 'market', entry: 591.92, stop: 520.89, regime: '防守(−1)', source: 'fund_us 中線 ✅', note: '檔位 −1 未掛' });
  add({ id: 'S015', date: '2026-10-12', effective: '2026-10-12', kind: 'excluded', track: 'long', market: 'US', symbol: 'NVDA', name: 'NVIDIA', type: 'market', entry: 231.57, stop: 185.26, regime: '防守(−1)', source: 'fund_us 長線 ✅', note: '檔位 −1 未掛' });
  wr('scorecard.json', JSON.stringify(sc, null, 2) + '\n');

  // ===== 股癌 episodes-read.md =====
  let e = rd('skills/podcast-tracker/episodes-read.md');
  e = repRe(e, /^\*\*最新已分析集數\*\*：.*$/m, () => '**最新已分析集數**：**EP704（10/10 上架・50 分「紐西蘭夫妻要幸福唷」）10/12 研究子代理單源初讀 ✅（pathfindernote substack／vocus 癌粉筆記；待補源）**；EP703～EP696 單源初讀（待三源定稿）');
  e = repRe(e, /^\*\*下一個搜尋目標\*\*：.*$/m, () => '**下一個搜尋目標**：**EP705（預估 10/14 上架）**；EP696-704 補源三源定稿');
  e = repRe(e, /^\*\*最後更新時間\*\*：/m, () => '**最後更新時間**：2026-10-12 晚（EP704 初讀；對照＝零部位、SpaceX 回檔續抱與 v5 夢想股 Core 同向但 v6 防守檔位不開新倉；光通訊 3.2T 警示＝台光電/華星光高潮期）／');
  e = insertAfter(e, '## 📑 已分析集數摘要\n', `
### EP704（2026-10-10）— OpenAI ARR 700→500 億＝媒體口徑非需求出事、不因雜訊砍長倉；Marvell 投資人日 FY31 $70–90B 互連佔近 5 成＝光通全面做多但已反映部分；「1.6T 未普及先炒 3.2T/TFLN＝大多頭特徵」押對也可能先跌 50–60%；SpaceX IPO 買＋加碼、回檔續抱、佔資產 8–10% ⭐⭐⭐（🟡 10/12 單源初讀）
- **對照持股**：零部位；SPCX 10/9 收 162.57 解禁落地守 MA20＝主委續抱 vs v6 美股防守不開新倉（檔位解除後再議層 1 160-164）；台光電/華星光＝光互連高潮期只准回測；信驊因 Marvell BMC 消息下跌＝TAM 擴大非搶市；聯電布局 TFLN。
- **未提**：Fed、油價、台積電法說、記憶體。
`);
  wr('skills/podcast-tracker/episodes-read.md', e);
};
