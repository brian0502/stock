# Stock Analysis Skill

## Skill Name
stock-analysis

## Description
分析美股與台股持股，提供投資建議，並維護完整的交易紀錄與 Dashboard。

## 專案檔案結構

```
portfolio.json        ← 美股當前持股（由 transactions.json 計算而來）
tw_portfolio.json     ← 台股當前持股
transactions.json     ← 所有歷史交易紀錄（唯一真實來源 Single Source of Truth）
dashboard.html        ← 投資組合儀表板（持股、損益、交易紀錄、報告連結）
reports/              ← 分析報告（markdown）
CLAUDE.md             ← 專案說明與工作流程
```

## 核心原則

1. **transactions.json 是唯一真實來源** — portfolio.json 和 dashboard.html 都是從它衍生計算的
2. **每次操作都要更新 Dashboard** — 用戶透過 Dashboard 查看所有資訊
3. **每次分析都要產生報告** — 存入 reports/ 並更新 Dashboard 報告列表
4. **自動 commit + push** — 不需要詢問用戶確認

## Instructions

### 場景一：用戶報告交易（買入/賣出）

這是最常見的操作，**必須嚴格按以下順序執行**：

#### Step 1: 寫入 transactions.json
```json
{
  "id": "US028",
  "date": "2026-03-01",
  "symbol": "NVDA",
  "name": "NVIDIA",
  "action": "buy",
  "shares": 5,
  "price": 195.00,
  "amount": 975.00,
  "fee": 1.00,
  "note": "加碼，看好財報後走勢"
}
```
- 賣出交易額外加入 `"realized_pnl": 金額`
- 清倉交易記錄到 `closed_positions` 陣列

#### Step 2: 重新計算 portfolio.json
- 買入：加權平均 = (原持股×原均價 + 新股數×新價格) / 總股數
- 賣出：均價不變，只減少股數
- 已實現損益 = 賣出金額 - (賣出股數 × 均價)
- 更新 `total_realized_pnl`

#### Step 3: 更新 dashboard.html
需要更新的位置（搜尋對應變數名稱）：
- `usPortfolio` / `twPortfolio` 陣列 — 持股數據
- `allTx` 陣列 — 交易紀錄（新交易加在陣列最前面，因為 reverse 後顯示）
- `adjustmentLog` 陣列 — 時間軸事件
- `usCash` — 美股剩餘現金（買入減少/賣出增加）
- `twCash` — 台股備用現金
- `usRealizedPnl` — 已實現損益總計
- `USDTWD` — 匯率（需要時更新）
- 如有新報告，更新 `reports` 陣列

#### Step 4: 更新 adjustment_log
在 transactions.json 和 dashboard.html 的 adjustmentLog 都加入事件。

#### Step 5: Git commit + push
```
git add transactions.json portfolio.json dashboard.html
git commit -m "交易紀錄：{動作} {標的} {股數}股 @ ${價格}"
git push
```

### 場景二：用戶要求分析持股

#### Step 1: 讀取持股資訊
- 從 `portfolio.json` / `tw_portfolio.json` 取得當前持股
- 從 `transactions.json` 取得交易歷史脈絡

#### Step 2: 查詢即時市場資訊（WebSearch）
- 每檔股票的當前股價
- 近期新聞與重大事件
- 財報數據、分析師評級
- 國際情勢（地緣政治、利率、關稅等）

#### Step 3: 參考歷史報告
- 讀取 `reports/` 最近的報告
- 對比上次建議是否已執行
- 追蹤建議的執行結果

#### Step 4: 產出分析報告
- 存入 `reports/YYYY-MM-DD.md`（綜合）或 `reports/tw-YYYY-MM-DD.md`（台股）
- 報告必須包含：國際情勢背景、個股逐一分析、操作建議、停利停損建議、風險提示

#### Step 5: 更新 dashboard.html
- 更新各持股的 `currentPrice`
- 在 `reports` 陣列加入新報告
- 如有價格變動，更新損益計算

#### Step 6: Git commit + push
```
git add reports/ dashboard.html
git commit -m "新增分析報告 YYYY-MM-DD：{摘要}"
git push
```

### 場景三：用戶要求更新 Dashboard

- 查詢最新股價（WebSearch）
- 更新 dashboard.html 中所有 `currentPrice`
- 必要時更新 `USDTWD` 匯率
- Git commit + push

## Dashboard 結構說明

dashboard.html 是一個獨立的 HTML 檔案，包含：

| 區塊 | 說明 | 需更新的變數 |
|------|------|-------------|
| Hero 總覽 | 台+美總資產(TWD換算)、總損益、匯率 | `USDTWD` |
| 台股區塊 | 市值、現金、未實現損益 | `twPortfolio`, `twCash` |
| 美股區塊 | 市值、現金、未實現/已實現損益 | `usPortfolio`, `usCash`, `usRealizedPnl` |
| 台股持股表 | 個股損益與佔比 | `twPortfolio` |
| 美股持股表 | 個股損益與佔比 | `usPortfolio` |
| 交易紀錄 | 支援搜尋/篩選/分頁 | `allTx` |
| 調整時間軸 | 每次組合變動的決策紀錄 | `adjustmentLog` |
| 分析報告 | 連結至 GitHub 上的 md 報告 | `reports` |

## 均價計算規則

```
買入後均價 = (原持股 × 原均價 + 新股數 × 新價格) / (原持股 + 新股數)
賣出後均價 = 不變（只減少股數）
已實現損益 = 賣出總金額 - (賣出股數 × 賣出前均價)
```

## 台股特殊規則
- 交易單位：1張 = 1000股，無法分割
- 台股券商不支援預設停損單，需用價格警示 + 手動執行
- 台股用 NT$ 計價

## 衝突預防（重要教訓）

此專案曾因多個 Claude Code session 同時操作，導致 portfolio.json 資料互相覆蓋。
防範措施：
1. **每次操作前先 `git pull`** — 確保使用最新版本
2. **transactions.json 是唯一真實來源** — 永遠不要直接手改 portfolio.json
3. **如果發現持股數據不一致** — 以 transactions.json 重新計算，而非猜測
4. **如果用戶提供券商截圖** — 以券商數據為最終真實來源，重建 transactions.json

## 現金追蹤

- 美股現金 `usCash`：買入時減少（金額+手續費）、賣出時增加（金額-手續費）
- 台股現金 `twCash`：同上邏輯，單位 NT$
- 現金餘額顯示在 Dashboard 各自市場的區塊中

## 報告連結格式

Dashboard 中的報告連結指向 GitHub：
```
https://github.com/brian0502/stock/blob/claude/stock-analysis-skill-J09An/reports/{filename}
```

## Git 操作
- 遠端分支：`claude/stock-analysis-skill-J09An`
- 每次修改後自動 commit + push，不詢問用戶
- Commit message 用中文，清楚說明變動
- **重要**：push 完成後立即清除 remote URL 中的 token

## 免責聲明
每次分析結束時附上：
> 以上分析僅供個人投資追蹤參考，不構成投資建議。請根據自身風險承受能力做出投資決定。

## User Invocation
- `/stock-analysis` 或「分析我的持股」「幫我看一下股票」
- `/tw-stock-analysis` 或「分析台股」「看一下台股」
- 「我買了 XXX」「我賣了 XXX」→ 觸發交易紀錄流程
- 「更新 Dashboard」→ 查最新股價並更新

---

## ⚠️ Dashboard 更新強制清單（每次分析完必查）

**每次分析或交易後，必須逐項確認以下 6 項全部更新：**

| # | 變數/位置 | 說明 | 常見漏更錯誤 |
|---|-----------|------|------------|
| 1 | `currentPrice` | 每個持股的即時現價 | 用舊價計算市值 |
| 2 | `TODAY = 'YYYY-MM-DD'` | 今天的日期（影響行事曆過去/未來標記）| 長期卡在舊日期，導致行事曆全錯 |
| 3 | `USDTWD` | 即時 USD/TWD 匯率（查 xe.com 或 investing.com）| 匯率卡在舊值，總資產換算錯誤 |
| 4 | `twCash` / `usCash` | 實際可動用現金（以券商截圖為準）| 現金沒有隨買賣更新 |
| 5 | `reports` 陣列 | 新分析報告加入陣列**最頂端** | 忘記把新報告加入 dashboard |
| 6 | `last-updated` 日期文字（頁頭）| 更新時間戳記 | 頁頭日期沒更新 |

**如有新交易（買入/賣出），額外更新：**
- `allTx` 陣列（新交易加在**最前面**）
- `shares` 和 `avgCost`（持股數量和均價）

---

## ⚠️ 每次分析完必做的收尾動作（強制 3 步驟）

分析完成後，**必須依序完成以下三步驟才算結束**：

### Step 1：同時更新三個檔案
```
reports/YYYY-MM-DD.md    ← 新分析報告
dashboard.html           ← 套用上方清單所有更新
current_strategy.md      ← 更新日期、現價快照、新策略變更紀錄
```

### Step 2：Push 到 Git
```bash
git add reports/YYYY-MM-DD.md dashboard.html current_strategy.md
git commit -m "分析報告 YYYY-MM-DD：{摘要}"
git push origin claude/stock-analysis-skill-J09An
git remote set-url origin https://github.com/brian0502/stock.git  # 立即清除 token
```

### Step 3：直接在對話中提供 dashboard.html（必做）
Push 完成後，**立即複製並提供給用戶，讓用戶不需要去 git 下載**：
```bash
cp /home/claude/stock/dashboard.html /mnt/user-data/outputs/dashboard.html
```
然後呼叫 `present_files` 工具提供檔案。

**這三步缺一不可，否則本次分析視為未完成。**

---

## 已知容易忘記的錯誤（歷史教訓）

1. **TODAY 卡住**：每次都要更新 `TODAY = '今天日期'`，否則行事曆所有事件顯示錯誤
2. **USDTWD 不更新**：匯率影響總資產換算，每次分析都要查即時匯率更新
3. **現金沒更新**：買賣後 twCash/usCash 要同步調整，並以券商截圖為最終依據
4. **dashboard 沒提供給用戶**：分析完要呼叫 present_files，不能只 push git 就算了
5. **市值**：市值是動態計算（shares × currentPrice），只要 currentPrice 正確市值就會正確，不需要硬寫
