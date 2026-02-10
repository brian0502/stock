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
