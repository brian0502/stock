# Stock Analysis Project

此專案用於美股與台股持股分析，提供買進、賣出或加碼建議。

## Skills

- `/stock-analysis` - 分析美股持股，提供投資建議
- `/tw-stock-analysis` - 分析台股持股，提供投資建議

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

- 每次對檔案進行新增或修改後，必須自動 commit 並 push 回遠端分支，不需要額外詢問使用者確認

## 分析規則

- 每次進行投資組合分析時，必須先讀取 `reports/` 目錄下最近幾次的分析報告，回顧先前的結論與建議操作
- 對照先前結論與當前最新市況（股價變動、財報結果、重大事件），評估：
  1. 先前的建議是否已兌現或需要修正
  2. 投資組合配置是否需要調整（加碼、減碼、停損）
  3. 是否有新的投資標的值得納入或替換現有持股
- 報告中須包含「與上次報告比較」段落，追蹤持倉變動與損益變化
