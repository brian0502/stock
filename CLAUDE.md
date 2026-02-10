# Stock Analysis Project

此專案用於美股持股分析，提供買進、賣出或加碼建議。

## Skills

- `/stock-analysis` - 分析美股持股，提供投資建議

## 持股檔案格式

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
