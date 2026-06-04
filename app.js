// ============================================================
//  app.js — shared render logic for all dashboard pages
//  Loaded AFTER data.js (which holds all data + helpers).
//
//  Multi-page support: each page contains only the DOM nodes it
//  needs. The shim below makes getElementById for an absent
//  element return a throwaway node, so the shared render code can
//  run verbatim on every page without guarding each call —
//  writes to missing sections simply go nowhere.
// ============================================================
(function () {
  var native = document.getElementById.bind(document);
  var sink = document.createElement('div');
  document.getElementById = function (id) { return native(id) || sink; };
})();

// ---- Top navigation (injected into every page's <nav id="topNav">) ----
function renderNav() {
  var pages = [
    { key: 'dashboard',    href: 'dashboard.html',    label: '📊 總覽' },
    { key: 'holdings',     href: 'holdings.html',     label: '💼 持股' },
    { key: 'watchlist',    href: 'watchlist.html',    label: '🎯 觀察清單' },
    { key: 'themes',       href: 'themes.html',       label: '🚀 族群追蹤' },
    { key: 'transactions', href: 'transactions.html', label: '📋 交易' },
    { key: 'timeline',     href: 'timeline.html',     label: '🔄 時間軸' },
    { key: 'reports',      href: 'reports.html',      label: '📄 報告' }
  ];
  var active = document.body.getAttribute('data-page') || '';
  document.getElementById('topNav').innerHTML = '<div class="nav-inner">' +
    pages.map(function (p) {
      return '<a href="' + p.href + '" class="nav-link' +
        (p.key === active ? ' active' : '') + '">' + p.label + '</a>';
    }).join('') + '</div>';
}
renderNav();

function renderDefenseTable() {
  const rows = [];
  defOrder.forEach(sym => {
    const d = v4Discipline[sym];
    if (!d) return;
    const p = defPos(sym, d.mkt);
    if (!p) return;
    const cs = defCcy(d.mkt);
    const cur = p.currentPrice;
    const pnlPct = ((cur - p.avgCost) / p.avgCost * 100);
    const pnlColor = pnlPct >= 0 ? '#10b981' : '#ef4444';
    const pnlSign = pnlPct >= 0 ? '+' : '';
    let stopCell, distCell, statusCell;
    if (d.stop === null) {
      const isETF = (sym === 'VOO' || sym === '009816');
      stopCell = '<td style="color:#64748b">不掛<span style="font-size:10px;color:#64748b;margin-left:4px">' + d.stopLabel + '</span></td>';
      distCell = '<td style="color:#64748b">—</td>';
      statusCell = isETF
        ? '<td style="color:#93c5fd;font-weight:600">🔵 指數錨（靠 Layer 2）</td>'
        : '<td style="color:#94a3b8;font-weight:600">⚪ 紀念股（不監控）</td>';
    } else {
      const dist = ((cur - d.stop) / cur * 100);
      let c = '#10b981', icon = '✅ 持有';
      if (dist < 0) { c = '#ef4444'; icon = '🔴 觸發·全出'; }
      else if (dist < 3) { c = '#fbbf24'; icon = '⚠️ 接近'; }
      stopCell = '<td class="def-warn">' + cs + d.stop.toFixed(2) + '<span style="font-size:10px;color:#64748b;margin-left:4px">' + d.stopLabel + '</span></td>';
      distCell = '<td style="color:' + c + ';font-weight:600">' + (dist>=0?'+':'') + dist.toFixed(2) + '%</td>';
      statusCell = '<td style="color:' + c + ';font-weight:600">' + icon + '</td>';
    }
    rows.push('<tr>'
      + '<td>' + defFlag(d.mkt) + ' ' + sym + '</td>'
      + '<td style="font-size:12px;color:#cbd5e1">' + defUnit(p, d.mkt) + '</td>'
      + '<td class="def-cur">' + cs + cur.toFixed(2) + '</td>'
      + '<td style="color:' + pnlColor + ';font-weight:600">' + pnlSign + pnlPct.toFixed(2) + '%</td>'
      + stopCell + distCell + statusCell
      + '</tr>');
  });
  const html = '<div class="def-card">'
    + '<div class="def-header"><span class="pulse"></span>🛡️ 全部位停損監控（v4）'
    + '<span style="margin-left:auto;font-size:11px;color:#94a3b8;font-weight:400">美股＋台股 · 每檔個股全部位掛停損 · 跌破全出</span></div>'
    + '<div style="overflow-x:auto"><table class="def-table"><thead><tr>'
    + '<th>標的</th><th>部位</th><th>現價</th><th>損益</th><th>停損</th><th>距停損</th><th>狀態</th>'
    + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'
    + '<div style="padding:8px 14px;font-size:11px;color:#94a3b8;border-top:1px solid rgba(148,163,184,.15)">'
    + 'v4：每檔個股「全部位」掛 GTC 停損，跌破即全出（不分批、無 Core/Trim）。'
    + 'ETF 指數型例外（VOO／009816 凱基台灣TOP50）：不掛機械停損，靠 Layer 2＋站穩突破/定期定額。'
    + '台股券商無自動停損單→用價格警示手動執行。固定停損不自動上墊，創新高手動上移。</div>'
    + '</div>';
  document.getElementById('defenseTable').innerHTML = html;
}
renderDefenseTable();

// Layer 2 重大事件門檻（達標才警示全清；平時不喊）
const layer2Triggers = [
  '地緣：荷莫茲全面封鎖 / WTI 站上 $100 或單日暴漲 / 戰事重大升級',
  '通膨·利率：Fed 由降息轉升息 / CPI 連 2–3 月重新加速至 4%+',
  '盤勢：VIX 急升破 30 / 主要指數 2 週內跌逾 10% / 信用·流動性事件',
  '個股：持股核心 thesis 被事件直接推翻'
];

function renderObserveAlert() {
  const breached = [], near = [];
  defOrder.forEach(sym => {
    const d = v4Discipline[sym];
    if (!d || d.stop === null) return;
    const p = defPos(sym, d.mkt);
    if (!p) return;
    const cs = defCcy(d.mkt);
    const cur = p.currentPrice;
    const dist = ((cur - d.stop) / cur * 100);
    if (dist < 0) breached.push({ sym, cur, p, d, dist, cs });
    else if (dist < 3) near.push({ sym, cur, p, d, dist, cs });
  });
  let html = '';
  breached.forEach(b => {
    html += '<div class="obs-alert obs-day5">'
      + '<div class="obs-header"><span style="font-size:18px">🔴</span><span>' + defFlag(b.d.mkt) + ' ' + b.sym + ' 跌破停損！</span></div>'
      + '<div class="obs-detail">現價 <strong style="color:#fca5a5">' + b.cs + b.cur.toFixed(2) + '</strong> 已跌破停損 <strong>' + b.cs + b.d.stop.toFixed(2) + '</strong>（' + Math.abs(b.dist).toFixed(2) + '% 下方）</div>'
      + '<div class="obs-action">🚨 <strong>全部位賣出 ' + defUnit(b.p, b.d.mkt) + '</strong>（v4 跌破即全出）。</div>'
      + '</div>';
  });
  near.forEach(n => {
    html += '<div style="border-left:4px solid #fbbf24;background:rgba(251,191,36,.08);padding:12px;border-radius:8px;margin-bottom:8px">'
      + '<div class="obs-header"><span style="font-size:16px">⚠️</span><span>' + defFlag(n.d.mkt) + ' ' + n.sym + ' 接近停損</span></div>'
      + '<div class="obs-detail">現價 <strong style="color:#fbbf24">' + n.cs + n.cur.toFixed(2) + '</strong> 距停損 <strong>' + n.cs + n.d.stop.toFixed(2) + '</strong> 僅 +' + n.dist.toFixed(2) + '%，盯緊。</div>'
      + '</div>';
  });
  if (!breached.length && !near.length) {
    html = '<div style="border-left:4px solid #10b981;background:rgba(16,185,129,.08);padding:12px;border-radius:8px">'
      + '<div class="obs-header"><span style="font-size:16px">✅</span><span>全部位都在停損之上</span></div>'
      + '<div class="obs-detail">無任何部位跌破停損。停損隨新高手動上移。</div>'
      + '</div>';
  }
  html += '<div style="border-left:4px solid #6366f1;background:rgba(99,102,241,.08);padding:12px;border-radius:8px;margin-top:8px">'
    + '<div class="obs-header"><span style="font-size:16px">🌐</span><span>Layer 2 重大事件監看</span></div>'
    + '<div class="obs-detail">當前：伊朗/荷莫茲 <strong>升高中、未達門檻</strong>（市場創高、油價未失控）→ 持續監看，尚不全清。<br>達標才警示全清：'
    + layer2Triggers.join('；') + '。</div>'
    + '</div>';
  document.getElementById('observeAlert').innerHTML = html;
}
renderObserveAlert();

// ===== 指定系列族群追蹤清單 (themeWatch) =====
function renderThemeWatch(){
  if (typeof themeWatch === 'undefined') return;
  const bySeries = {};
  themeWatch.forEach(t => { (bySeries[t.series] = bySeries[t.series] || []).push(t); });
  let html = '';
  Object.keys(bySeries).forEach(series => {
    html += '<tr><td colspan="6" style="background:rgba(99,102,241,.12);color:#a5b4fc;font-weight:700;padding:8px 12px">' + series + '</td></tr>';
    bySeries[series].forEach(t => {
      const cs = t.market === 'TW' ? 'NT$' : '$';
      const priceCell = (t.price == null) ? '<span style="color:#94a3b8">待查</span>' : cs + fmt(t.price, 2);
      const chgCell = (t.chg == null) ? '<span style="color:#94a3b8">—</span>'
        : '<span style="color:' + (t.chg >= 0 ? '#10b981' : '#ef4444') + '">' + (t.chg >= 0 ? '+' : '') + t.chg.toFixed(2) + '%</span>';
      const flag = t.market === 'TW' ? '🇹🇼' : '🇺🇸';
      html += '<tr>'
        + '<td><strong>' + t.symbol + '</strong> <span style="font-size:11px;color:var(--text-dim)">' + t.name + '</span><br><span style="font-size:10px;color:var(--text-dim)">' + flag + ' ' + t.group + '</span></td>'
        + '<td class="mono" style="text-align:right">' + priceCell + '</td>'
        + '<td class="mono" style="text-align:right">' + chgCell + '</td>'
        + '<td style="font-size:12px">' + t.level + '</td>'
        + '<td style="font-size:12px;font-weight:600">' + t.entry + '</td>'
        + '<td style="font-size:12px;color:var(--text-dim)">' + t.note + '</td>'
        + '</tr>';
    });
  });
  document.getElementById('themeWatchBody').innerHTML = html;
}
renderThemeWatch();

// ===== HERO =====
document.getElementById('heroSection').innerHTML = `
  <div class="hero-left">
    <div class="hero-label">總資產（含現金）</div>
    <div class="hero-value">NT$${fmt(grandMarket)}</div>
  </div>
  <div class="hero-right">
    <div class="hero-stat">
      <div class="hs-label">總損益（含已實現）</div>
      <div class="hs-value ${pc(grandPnl)}">NT$${fmt(grandPnl)}</div>
    </div>
    <div class="hero-stat">
      <div class="hs-label">台股市值</div>
      <div class="hs-value">NT$${fmt(twTotal)}</div>
    </div>
    <div class="hero-stat">
      <div class="hs-label">美股市值</div>
      <div class="hs-value">US$${fmt(usTotal,2)}</div>
    </div>
    <div class="hero-stat">
      <div class="hs-label">換算匯率</div>
      <div class="hs-value" style="font-size:16px">USD/TWD ${USDTWD}</div>
    </div>
  </div>`;

// ===== CALENDAR =====
// 注意：TODAY 定義在 data.js（每次分析需更新的欄位集中在 data.js）
const DOW_MAP = ['日','一','二','三','四','五','六'];
// ===== CALENDAR (month tabs) =====
const CAL_MONTH_NAMES = ['','1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const CAL_TAG_LABEL = {geo:'地緣',macro:'總經',earn:'財報',div:'配息',event:'事件'};
let calActiveMonth = '';

function renderCalendar(){
  // Build month list: chronological order (oldest left → newest right)
  const orderedMonths = [...new Set(calendarEvents.map(ev => ev.date.slice(0,7)))].sort();

  // Default to current month, or closest upcoming month
  if(!calActiveMonth || !orderedMonths.includes(calActiveMonth)){
    const cur = TODAY.slice(0,7);
    calActiveMonth = orderedMonths.find(m => m >= cur) || orderedMonths[orderedMonths.length-1] || '';
  }

  // Render tab buttons
  const tabsEl = document.getElementById('calTabs');
  tabsEl.innerHTML = orderedMonths.map(m => {
    const [y,mo] = m.split('-');
    const label = y + '年' + CAL_MONTH_NAMES[parseInt(mo)];
    const isFuture = m >= TODAY.slice(0,7);
    const isActive = m === calActiveMonth;
    const dot = isFuture ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;margin-right:5px;vertical-align:middle"></span>' : '';
    const style = isActive
      ? 'background:var(--blue-bg);border:1px solid var(--blue);color:var(--blue)'
      : 'background:var(--surface2);border:1px solid var(--border);color:var(--text-dim)';
    return `<button style="${style};border-radius:8px;padding:7px 14px;font-size:12px;cursor:pointer;transition:all .15s" onclick="setCalMonth('${m}')">${dot}${label}</button>`;
  }).join('');

  // Render events for active month
  const evs = calendarEvents
    .filter(ev => ev.date.slice(0,7) === calActiveMonth)
    .sort((a,b) => b.date.localeCompare(a.date));

  document.getElementById('calGrid').innerHTML = evs.map(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    const mon = CAL_MONTH_NAMES[d.getMonth()+1];
    const day = d.getDate().toString();
    const dow = DOW_MAP[d.getDay()];
    const isPast = ev.date < TODAY;
    const isToday = ev.date === TODAY;
    const stars = Array.from({length:5},(_,i)=>`<div class="cal-star ${i<ev.stars?'on':'off'}"></div>`).join('');
    return `<div class="cal-item${isPast?' cal-past':''}${isToday?' cal-today':''}">
      <div class="cal-date-col"><div class="cal-month">${mon}</div><div class="cal-day">${day}</div><div class="cal-dow">週${dow}</div></div>
      <div class="cal-info"><div class="cal-title"><span class="cal-tag cal-tag-${ev.tag}">${CAL_TAG_LABEL[ev.tag]||''}</span>${ev.title}</div><div class="cal-desc">${ev.desc}</div><div class="cal-stars">${stars}</div></div>
    </div>`;
  }).join('') || '<div style="padding:20px;color:var(--text-dim);font-size:13px">本月無事件</div>';
}

function setCalMonth(month){
  calActiveMonth = month;
  renderCalendar();
}
renderCalendar();

// ===== TW SUMMARY =====
document.getElementById('twSummary').innerHTML = `
  <div class="summary-card c-amber"><div class="label">持股市值</div><div class="value">NT$${fmt(twStockMarket)}</div><div class="sub">${twData.length} 檔持股</div></div>
  <div class="summary-card c-amber"><div class="label">備用現金</div><div class="value">NT$${fmt(twCash)}</div><div class="sub">佔 ${(twCash/twTotal*100).toFixed(1)}%</div></div>
  <div class="summary-card ${twPnl>=0?'c-green':'c-red'}"><div class="label">未實現損益</div><div class="value ${pc(twPnl)}">NT$${fmt(twPnl)}</div><div class="sub ${pc(twPnl)}">${fmtPct(twPnl/twTotalCost*100)}</div></div>
  <div class="summary-card ${twRealizedPnl>=0?'c-green':'c-red'} realized-card" onclick="openModal('tw')"><div class="label">已實現損益</div><div class="value ${pc(twRealizedPnl)}">NT$${fmt(twRealizedPnl)}</div><div class="realized-hint"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 8.5h4"/></svg>${twRealizedDetail.length} 檔 · 點擊查看明細</div></div>`;

// ===== US SUMMARY =====
document.getElementById('usSummary').innerHTML = `
  <div class="summary-card c-blue"><div class="label">持股市值</div><div class="value">$${fmt(usStockMarket,2)}</div><div class="sub">${usData.length} 檔持股</div></div>
  <div class="summary-card c-blue"><div class="label">剩餘現金</div><div class="value">$${fmt(usCash,2)}</div><div class="sub">佔 ${(usCash/usTotal*100).toFixed(1)}%</div></div>
  <div class="summary-card ${usPnl>=0?'c-green':'c-red'}"><div class="label">未實現損益</div><div class="value ${pc(usPnl)}">$${fmt(usPnl,2)}</div><div class="sub ${pc(usPnl)}">${fmtPct(usPnl/usTotalCost*100)}</div></div>
  <div class="summary-card ${usRealizedPnl>=0?'c-green':'c-red'} realized-card" onclick="openModal('us')"><div class="label">已實現損益</div><div class="value ${pc(usRealizedPnl)}">$${fmt(usRealizedPnl,2)}</div><div class="realized-hint"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 8.5h4"/></svg>${usRealizedDetail.length} 檔 · 點擊查看明細</div></div>`;

// ===== PORTFOLIO TABLES =====
function renderTable(data,tbody,cur,total){
  tbody.innerHTML = data.map(p=>{const pct=p.market/total*100;return `<tr>
    <td><div class="symbol-cell"><div class="symbol-icon" style="background:${p.color}">${p.symbol.slice(0,2)}</div><div><div class="symbol-name">${p.name}</div><div class="symbol-code">${p.symbol}</div></div></div></td>
    <td class="mono">${fmt(p.shares)}</td>
    <td class="mono" style="text-align:right">${cur}${fmt(p.avgCost,2)}</td>
    <td class="mono" style="text-align:right">${cur}${fmt(p.currentPrice,2)}</td>
    <td class="mono" style="text-align:right">${cur}${fmt(p.market)}</td>
    <td style="text-align:right"><span class="pnl-badge ${pc(p.pnl)}">${fmtPct(p.pnlPct)}</span><div style="font-size:10px;color:var(--text-dim);margin-top:1px" class="mono">${p.pnl>=0?'+':''}${cur}${fmt(p.pnl)}</div></td>
    <td><div style="font-size:11px;margin-bottom:3px" class="mono">${pct.toFixed(1)}%</div><div class="bar-container"><div class="bar-fill" style="width:${pct}%;background:${p.color}"></div></div></td>
  </tr>`;}).join('');
}
renderTable(twData,document.getElementById('twTableBody'),'NT$',twTotal);
renderTable(usData,document.getElementById('usTableBody'),'$',usTotal);

// ===== ALLOC CHARTS =====
function renderAlloc(data,cId,lId,total){
  document.getElementById(cId).innerHTML = data.map(p=>`<div class="alloc-segment" style="width:${p.market/total*100}%;background:${p.color}"></div>`).join('');
  document.getElementById(lId).innerHTML = data.map(p=>`<div class="alloc-legend-item"><div class="alloc-dot" style="background:${p.color}"></div>${p.symbol} ${(p.market/total*100).toFixed(1)}%</div>`).join('');
}
renderAlloc(twData,'twAllocChart','twAllocLegend',twTotal);
renderAlloc(usData,'usAllocChart','usAllocLegend',usTotal);

// ===== TRANSACTIONS (paginated + search) =====
let txFilter = 'all', txSearchStr = '', txPage = 0;
const TX_PER_PAGE = 10;

function getFilteredTx(){
  return allTx.filter(t=>{
    if(txFilter==='buy' && t.action!=='buy') return false;
    if(txFilter==='sell' && t.action!=='sell') return false;
    if(txFilter==='us' && t.market!=='US') return false;
    if(txFilter==='tw' && t.market!=='TW') return false;
    if(txSearchStr && !t.symbol.toLowerCase().includes(txSearchStr.toLowerCase())) return false;
    return true;
  });
}

function renderTx(){
  const filtered = getFilteredTx();
  const totalPages = Math.max(1,Math.ceil(filtered.length/TX_PER_PAGE));
  if(txPage >= totalPages) txPage = totalPages-1;
  if(txPage < 0) txPage = 0;
  const start = txPage*TX_PER_PAGE;
  const page = filtered.slice(start,start+TX_PER_PAGE);
  const cur = t => t.market==='TW'?'NT$':'$';

  document.getElementById('txBody').innerHTML = page.length ? page.map(t=>`<tr>
    <td class="mono">${t.date}</td>
    <td><span class="badge ${t.market==='TW'?'badge-tw':'badge-us'}">${t.market==='TW'?'台股':'美股'}</span></td>
    <td><strong>${t.symbol}</strong></td>
    <td><span class="tag tag-${t.action}">${t.action==='buy'?'買入':'賣出'}</span></td>
    <td class="mono" style="text-align:right">${fmt(t.shares)}</td>
    <td class="mono" style="text-align:right">${cur(t)}${fmt(t.price,2)}</td>
    <td class="mono" style="text-align:right">${cur(t)}${fmt(t.amount,2)}</td>
    <td style="font-size:12px;color:var(--text-dim)">${t.note||''}</td>
  </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:24px">沒有符合條件的交易紀錄</td></tr>';

  document.getElementById('txPageInfo').textContent = `${filtered.length} 筆 · 第 ${txPage+1}/${totalPages} 頁`;
  document.getElementById('txPrev').disabled = txPage===0;
  document.getElementById('txNext').disabled = txPage>=totalPages-1;
}

function setTxFilter(f,btn){
  txFilter=f; txPage=0;
  document.querySelectorAll('.tx-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTx();
}
function txChangePage(d){ txPage+=d; renderTx(); }

document.getElementById('txSearch').addEventListener('input',e=>{
  txSearchStr=e.target.value.trim(); txPage=0; renderTx();
});
renderTx();

// ===== TIMELINE =====
const dotCls={setup:'dot-setup',review:'dot-review',trade:'dot-trade'};
document.getElementById('timeline').innerHTML = adjustmentLog.slice().reverse().map(a=>`
  <div class="timeline-item"><div class="timeline-dot ${dotCls[a.type]||'dot-review'}"></div>
  <div class="timeline-date">${a.date}</div><div class="timeline-title">${a.title}</div>
  <div class="timeline-detail">${a.detail}</div></div>`).join('');

// ===== REPORTS =====
document.getElementById('reportsBody').innerHTML = reports.map(r=>`<tr>
  <td class="mono">${r.date}</td>
  <td><span class="badge ${r.tb}">${r.type}</span></td>
  <td style="font-weight:500">${r.title}</td>
  <td style="font-size:12px;color:var(--text-dim);max-width:320px">${r.summary}</td>
  <td>${r.file?`<a href="${REPO_BASE}${r.file}" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;font-size:12px">📎 查看</a>`:'<span style="color:var(--text-dim);font-size:11px">—</span>'}</td>
</tr>`).join('');

// ===== REALIZED PNL MODAL =====
function openModal(market){
  const isUS = market === 'us';
  const data = isUS ? usRealizedDetail : twRealizedDetail;
  const cur = isUS ? '$' : 'NT$';
  const totalPnl = isUS ? usRealizedPnl : twRealizedPnl;
  const title = isUS ? '🇺🇸 美股已實現損益明細' : '🇹🇼 台股已實現損益明細';
  const d = isUS ? 2 : 0;

  document.getElementById('modalTitle').textContent = title;

  const totalHtml = `<div class="modal-total">
    <div class="modal-total-label">合計已實現損益（${data.length} 檔）</div>
    <div class="modal-total-value ${pc(totalPnl)}">${totalPnl>=0?'+':''}${cur}${fmt(totalPnl,d)}</div>
  </div>`;

  const groupsHtml = data.map(stock => {
    const tradesHtml = stock.trades.map(t =>
      `<div class="sg-trade">
        <div class="sg-date">${t.date}</div>
        <div class="sg-action ${t.action}">${t.action==='buy'?'買入':'賣出'}</div>
        <div class="sg-desc">${t.desc}</div>
        <div class="sg-amount">${cur}${fmt(t.amount,d)}</div>
      </div>`
    ).join('');

    return `<div class="stock-group">
      <div class="sg-header">
        <div><span class="sg-symbol">${stock.symbol}</span><span class="sg-name">${stock.name}</span></div>
        <div class="sg-pnl ${pc(stock.pnl)}">${stock.pnl>=0?'+':''}${cur}${fmt(stock.pnl,d)}</div>
      </div>
      <div class="sg-trades">${tradesHtml}</div>
    </div>`;
  }).join('');

  document.getElementById('modalBody').innerHTML = totalHtml + groupsHtml;
  document.getElementById('realizedModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(){
  document.getElementById('realizedModal').classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
