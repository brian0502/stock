# Stock Analysis Project

此專案用於美股與台股持股分析，提供買進、賣出或加碼建議。

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
  3. 更新 `dashboard.html` 中的持股數據與交易紀錄
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
- 更新 `dashboard.html` 的報告列表
- 每份報告必須包含：國際情勢背景、個股分析、操作建議、風險提示

### Git 操作
- **固定分支：`claude/stock-analysis-skill-J09An`** — 所有 session 統一使用此分支，**絕對不要另開新分支**
- **每次操作前先 `git checkout claude/stock-analysis-skill-J09An && git pull origin claude/stock-analysis-skill-J09An`**
- 每次對檔案進行新增或修改後，必須自動 commit 並 push 到 `claude/stock-analysis-skill-J09An`，不需要額外詢問使用者確認
- Commit message 應清楚說明變動內容（交易紀錄 / 分析報告 / 持股更新）
- push 完成後立即清除 remote URL 中的 token

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
dashboard.html        ← 投資組合儀表板
reports/              ← 分析報告
```
