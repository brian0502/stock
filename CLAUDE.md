# Stock Analysis Project

此專案用於美股與台股持股分析，提供買進、賣出或加碼建議。

## 投資哲學（Investment Philosophy）— v4（2026-06-02 改版）

**停利優先：不讓賺的 round-trip 變賠的。本版已全面汰換先前所有舊框架。**

> 改版起因：NFLX 曾因「長線抱著不停利」由賺轉賠、最後小虧出場。長期不停利做法最大的痛點就是讓獲利回吐成虧損，故改為主動的停利保護。

### 核心原則（v4）

1. **每檔個股全部位都掛保護性停損（GTC）**，平時自動執行；個股不留無保護裸倉（VOO 指數除外，見原則 3）。
2. **雙層防護**：
   - **Layer 1（移動停利）**：機械式停損，平時靠這個。固定停損不會自動上墊，創新高時**手動上移**鎖利。
   - **Layer 2（重大事件全清警示）**：Claude 監看國際情勢/盤勢；**平時不喊賣**，只有達重大事件門檻才主動警示「**是否全清、在什麼價位**」，用戶決定、Claude 不代下單。
3. **VOO（指數 ETF）例外**：不掛機械停損（分散+長期向上，不像個股會 round-trip 成永久虧損），但仍受 Layer 2 監看。
4. **thesis（買進理由）是「持有什麼」的依據**；若被事件直接推翻 → 屬 Layer 2 個股觸發。
5. **無法盯盤** → 一律靠掛單（GTC、市價 Stop）自動執行，避免 Stop-Limit 跳空不成交。

### Layer 2 重大事件門檻（達標才警示全清；平時不喊）

- **地緣**：荷莫茲全面封鎖確認 / WTI 站上 $100 或單日暴漲 / 戰事重大升級
- **通膨·利率**：Fed 由降息轉「升息」 / CPI 連 2–3 月重新加速至 4%+
- **盤勢**：VIX 急升破 30 / 主要指數 2 週內跌逾 10% / 信用·流動性事件
- **個股**：持股核心 thesis 被事件直接推翻（財報崩、需求反轉）

完整框架見 `current_strategy.md`（每次 session 必讀）。

## Skills

- `/stock-analysis` - 分析美股與台股持股，提供投資建議（主要 Skill，涵蓋所有操作流程）
- Skill 檔案位置：`.claude/skills/stock-analysis.md`

**每次操作前請先閱讀 Skill 檔案，確保遵循完整流程。**

## 持股檔案格式

### 美股

將你的持股資訊放在 `portfolio.json` 中，格式如下：

```json
{
  "portfolio": [
    {
      "symbol": "AAPL",
      "shares": 100,
      "avg_cost": 150.00
    }
  ]
}
```

或使用 `portfolio.csv`：

```
symbol,shares,avg_cost
AAPL,100,150.00
```

### 台股

將你的台股持股資訊放在 `tw_portfolio.json` 中，格式如下：

```json
{
  "portfolio": [
    {
      "symbol": "2330",
      "name": "台積電",
      "shares": 1000,
      "avg_cost": 800.00
    }
  ]
}
```

或使用 `tw_portfolio.csv`：

```
symbol,name,shares,avg_cost
2330,台積電,1000,800.00
```

## 工作流程規則

### 交易紀錄（最重要）
- **每次用戶報告交易（買入/賣出），必須：**
  1. 先寫入 `transactions.json`（含日期、標的、動作、股數、價格、金額、佣金、原因）
  2. 從交易紀錄重新計算並更新 `portfolio.json`（持股數量、均價）
  3. 更新 `data.js` 中的持股數據與交易紀錄（`twPortfolio`/`usPortfolio`/`allTx`/`adjustmentLog`/`reports`/現金）；`dashboard.html` 只改頁首 lastUpdated
  4. 如果是已清倉的部位，記錄到 `closed_positions`
  5. 更新 `adjustment_log` 時間軸
  6. Commit 並 push

### 均價計算規則
- 買入：加權平均 = (原持股×原均價 + 新股數×新價格) / 總股數
- 賣出：均價不變，只減少股數
- 已實現損益 = 賣出金額 - (賣出股數 × 均價)

### 分析報告
- 每次分析完成後，產生 markdown 報告存入 `reports/` 資料夾
- 報告命名格式：`YYYY-MM-DD.md`（綜合）或 `tw-YYYY-MM-DD.md`（台股專項）
- 更新 `data.js` 的 `reports` 報告列表
- 每份報告必須包含：國際情勢背景、個股分析、操作建議、風險提示

### Git 操作
- **固定分支：`claude/stock-analysis-skill-J09An`** — 所有 session 統一使用此分支，**絕對不要另開新分支**
- **每次操作前先 `git checkout claude/stock-analysis-skill-J09An && git pull origin claude/stock-analysis-skill-J09An`**
- 每次對檔案進行新增或修改後，必須自動 commit 並 push 到 `claude/stock-analysis-skill-J09An`，不需要額外詢問使用者確認
- Commit message 應清楚說明變動內容（交易紀錄 / 分析報告 / 持股更新）
- **token 由用戶常駐設定在 remote URL（origin）中，push 後「不要」清除、不要動 remote URL**（2026-06-04 用戶確認）。直接 `git push origin claude/stock-analysis-skill-J09An` 即可，全程不需 set-url。

### 策略一致性（跨 Session 最重要的規則）

**每次新 session 開始分析前，必須先讀取 `current_strategy.md`，了解上一次的策略基準。**

#### 核心原則
1. **延續性優先**：每次分析建議必須以 `current_strategy.md` 中記錄的策略為基準，不得無故偏離
2. **可以調整，但必須說明原因**：如果因為重大因素（市場環境劇變、基本面惡化、觸發停損/停利等）需要調整策略，必須在報告中明確列出：
   - 「與前次策略的差異」
   - 「調整原因（發生了什麼重大變化）」
   - 「新策略內容」
3. **調整後必須同步更新 `current_strategy.md`**：確保下一次 session 能夠參照最新策略
4. **不允許靜默改變**：如果建議與前次不同卻沒有說明原因，視為錯誤

#### 什麼情況可以觸發策略調整
- 持股觸及停損或停利價位
- 重大地緣政治事件（戰爭升級/停火、制裁等）
- 央行政策重大轉向（突然升息/降息）
- 個股基本面惡化（財報大幅不及預期、重大醜聞等）
- 市場結構性變化（VIX 持續 > 35、系統性風險事件等）

#### 每次分析報告必須包含的新區塊
```markdown
## 策略對照（Strategy Alignment Check）

### 前次策略基準（來自 current_strategy.md）
- [列出前次各標的的策略]

### 本次建議
- [列出本次各標的的建議]

### 是否有差異？
- ✅ 一致 / ⚠️ 有調整

### 調整原因（如有）
- [具體說明發生了什麼導致需要調整]
```

#### 檔案位置
- `current_strategy.md` — 當前生效的策略文件（每次調整後更新）

### 衝突處理
- 如果發現 portfolio.json 數據與 transactions.json 不一致 → 以 transactions.json 重新計算
- 如果用戶提供券商截圖 → 以券商數據為最終真實來源
- **永遠不要直接手改 portfolio.json**，它是從 transactions.json 衍生出來的

### 檔案結構
```
portfolio.json        ← 美股當前持股（由交易紀錄計算）
tw_portfolio.json     ← 台股當前持股
transactions.json     ← 所有歷史交易紀錄（唯一真實來源）
current_strategy.md   ← 當前生效的投資策略（每次 session 必讀、調整後必更新）
data.js               ← ⭐ dashboard 所有資料（持股/交易/報告/行事曆/停損/匯率/現金/TODAY/themeWatch 族群追蹤）。要更新數據改這檔
themes.html           ← 🚀 指定系列族群追蹤清單（用戶額外關注的族群；每次分析查位階/價格/可否進場；資料在 data.js `themeWatch`；只有用戶說移除才移除）
app.js / styles.css   ← dashboard 共用 render 邏輯 + 樣式（很少動）
dashboard.html        ← 總覽頁(監控/行事曆/總損益)；另有 holdings/transactions/timeline/reports.html 多頁
reports/              ← 分析報告
```
> **多頁改版（2026-06-04）**：dashboard 拆成多頁 + GitHub Pages 託管。**資料全在 `data.js`**，各 .html 只放版面。更新數據→改 `data.js`；頁首 lastUpdated→改 `dashboard.html`。

---

## 📌 回覆格式與固定流程規範（2026-06-02 由用戶確立，每個 session 適用）

> 此區為用戶跨 session 的固定要求。新 session 讀完即視同已套用，不需重新詢問或重新被提醒。

### A. 每次股票分析回覆必含三塊（缺一不可）

| # | 區塊 | 對應 SKILL | 說明 |
|---|------|-----------|------|
| 1 | 股癌（Gooaye）最新集數是否有新分析 | podcast-tracker | 先讀 episodes-read.md；距上次已讀 >3 天就搜新集；有新集就 paraphrase 重點並對照持股 |
| 2 | 五檔「剛突破＋基本面強」建議標的 | market-opportunity-scan v2.0 | 逐檔附：即時價／技術型態／基本面／進場參考價／停損；讓用戶自行決定，Claude 不代下單；沒有符合三條件的就直說，不硬湊。**🆕 必先逐檔複查既有 watchlist（重抓即時價→keep/remove，崩跌/跌破買價/失突破動能者剔除、不沿用舊價，台股美股都做）；台股候選用「投信買超＋主動式 ETF 近期增持」當漏斗。詳 current_strategy.md ②。** |
| 3 | 當前投資組合分析＋**持股動態評估(雙向)**＋全部位停損 + Layer 2 狀態 | current_strategy.md v4 | 逐檔：thesis 狀態、損益、即時價；**上漲倉用「順勢突破金字塔」判可否加碼，下跌倉用「跌勢持股處理」判續抱/認賠**；列每檔停損點與距現價幅度；報 Layer 2（平時「✅ 無重大事件，依停損」／達門檻則發全清警示）。**美股台股同一套流程**，見 current_strategy.md「每次 session 固定產出」 |

### B. 呈現格式

- **資訊類內容一律優先用「表格」**：個股清單、持股狀態、停利點、比較、數據。
- 純結論或敘述推理可用短句。

### C. 股價資料來源（對應 price-data-integrity v2.0）

- 美股盤中即時價：**先用 browser MCP 直開 Yahoo（finance.yahoo.com）**，web_search／web_fetch 僅作備援（會延遲）。
- 一律以 **Yahoo 股市網頁**為準，**不用其他網站的快取盤中價**。
- 主報價讀 `[data-testid="qsp-price"]`；實測 `fin-streamer` 會抓到頁面其他小工具的錯誤數字（曾抓到 $16.63），**勿用**。
- **價格一律給數字、禁用「待抓/待查」佔位（2026-06-04 用戶定案，推薦清單與族群追蹤清單都適用）**：有開盤用即時價；沒開盤（休市/盤前）就用「前一交易日收盤價」並註明，**不可留「待開盤抓」「待查」空白**。

### D. 出場框架（v4，對應 current_strategy.md）

- **每檔個股全部位掛 GTC 市價 Stop（Layer 1）**：個股不留無保護裸倉。
- **Layer 1 移動停利（平時）**：NVDA $210 / HPE $48（皆全部位；MSFT 已於 6/3 觸 $430 停損全清出場）；固定停損不自動上墊，創新高時手動上移。
- **Layer 2 重大事件全清（例外）**：Claude 平時不喊賣，只有達重大事件門檻才主動警示「是否全清、在什麼價位」，用戶決定、不代下單。**VOO 無機械停損，靠 Layer 2 顧。**
- 用戶習慣台灣時間約 **23:00** 檢視；無法盯盤，靠掛單自動執行。
- 每次分析第 ③ 塊改列「**全部位停損表 + Layer 2 狀態**」（平時「✅ 無重大事件」/ 觸發則發警示）。

