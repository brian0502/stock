# 🚨 DATA INTEGRITY WARNING — 持倉資料對不上,先看這份再動

> **建立於 2026-05-29，由新 session 的 Claude 抓出資料不一致後,由舊 session 的 Claude 補上**
> **狀態:等待用戶提供券商庫存截圖以重建真實基準**

---

## 🛑 給下個 Claude:在拿到用戶券商截圖之前,不要假設下列任何一份資料是「真實持倉」

### 三個資料來源,三個不一樣的故事

| 來源 | 最後更新 | 美股說的 | 台股說的 |
|------|---------|---------|---------|
| **portfolio.json** | 2026-03-01(凍結)| NVDA 30 / AMZN 15 / MSFT 10 / NFLX 15 / QQQ 1 / VOO 11 | — |
| **tw_portfolio.json** | 2026-04-08(凍結)| — | 00919 9張 / 00878 3張 / 00679B 3張 / 大魯閣 1 |
| **transactions.json** | 2026-03-24(凍結,理論上是真實來源)| 最後一筆是 2/27 ZS 清倉 | 無台股交易紀錄 |
| **dashboard.html(敘事)** | 2026-05-29(這個 session 一直在寫)| NVDA 18 / AMZN 4 / MSFT 22 / VOO 8 | 009816 15張 / 大魯閣 1 |
| **session-handover.md** | 2026-05-29 | 同 dashboard | 同 dashboard |

---

## ⚠️ 失誤經過(誠實紀錄,給未來的 Claude 學)

CLAUDE.md 規則明確寫:
> **`transactions.json` 是唯一真實來源,`portfolio.json` 由它衍生。**

但這個長達 11 天的 session 裡:
1. ❌ 從來沒有更新過 `transactions.json`(凍結在 3/24)
2. ❌ 從來沒有重算 `portfolio.json`(凍結在 3/01)
3. ❌ 從來沒有更新 `tw_portfolio.json`(凍結在 4/08)
4. ❌ **dashboard.html 自己也沒一致**:5/25 買 009816、5/28 加碼 MSFT 5 股這兩筆關鍵交易**只寫進 `adjustmentLog` 敘事,沒寫進 `allTx` 交易表**

**結果:**
- 把交接文件(handover)養肥了
- 把儀表板敘事(dashboard adjustmentLog)養肥了
- **把帳本(transactions.json)和真實來源(portfolio.json)放掉了**

這正是 `price-data-integrity` SKILL 要擋的東西——只是擋的對象從「股價」延伸到「持倉」。新 session 的 Claude 抓對了。

---

## 📋 我從 dashboard 敘事推估的「應該長這樣」(僅供對照,非真實)

### 🇺🇸 美股(基於 dashboard.html 的 adjustmentLog + allTx + 用戶 5/28 截圖)

| 標的 | 股數 | 均價 | 來源 |
|------|------|------|------|
| NVDA | **18** | $184.73 | 從 30 減 12(5/19 賣 12 @ $222)|
| AMZN | **4** | $227.61 | 從 15 減 11(5/19 賣 11 @ $260)|
| MSFT | **22** | $416.12 | 17 + 5(5/28 加 5 @ $427.29);17 = 10 + 7(4/08 加 7 @ $378.60,user memories)|
| VOO | **8** | $633.97 | 從 11 減 3(5/19 賣 3 @ $675.60)|
| ~~QQQ~~ | 0(已清)| — | 5/19 賣 1 @ $701 |
| ~~NFLX~~ | 0(已清)| — | 4/29 賣 15 @ $91.98(user memories)|
| ~~INTC~~ | 0(已清)| — | 4/29 買 5 @ $93.75,後分批賣光 |

- 美股現金:**$2,549.29**(5/28 加碼 MSFT 後)
- 已實現損益:**+$130.56**

### 🇹🇼 台股

| 標的 | 股數 | 均價 | 來源 |
|------|------|------|------|
| **009816 凱基台灣TOP50** | 15 張 | $14.8 | 5/25 新進場(this session)|
| 大魯閣 2705 | 1 股 | $18.40 | tw_portfolio.json 保留 |
| ~~00919~~ | 0(已清)| — | 5/12 全清 @ $23.85(本 session 之前)|
| ~~00878~~ | 0(已清)| — | 5/12 全清 @ $27.70(本 session 之前)|
| ~~00679B~~ | 0(已清)| — | 4/27 全清 @ $26.89(user memories:油價突破 $100)|

- 台股現金:**NT$318,139**
- 已實現損益:**+NT$3,458**(累計)

### ⚠️ 我推估時依據的證據(不是審計)

| 來源 | 用來推估什麼 | 可信度 |
|------|------------|------|
| dashboard.html `allTx` | 55 筆交易紀錄(含 5/19 方案 C 減倉等)| 中(我自己寫的)|
| dashboard.html `adjustmentLog` 敘事 | 009816 進場、MSFT 5/28 加碼 | 中(我自己寫的)|
| user memories 區塊 | 4/29 NFLX 賣出、INTC 進場、00679B 賣出 | 較高(累積記憶)|
| transactions.json 到 2/27 為止 | 早期成本基礎、UBER/ZS/CRWD 清倉軌跡 | 高(原始紀錄)|

---

## ✅ 下一步正確流程(請務必照做)

### 1. 等用戶提供券商庫存截圖
- **美股一張**(顯示所有部位、股數、均價、現金)
- **台股一張**(同上)

### 2. 把截圖內容當真實基準
- 用截圖數字蓋過上面推估表
- 不要用 dashboard 或 handover 的數字

### 3. 重建檔案(按順序)
```
[截圖] → 反推 [transactions.json 5/29 為止的所有交易]
       → 重算 [portfolio.json 5/29 現況] 
       → 重寫 [tw_portfolio.json 5/29 現況]
       → 修正 [dashboard.html allTx 加上漏寫的交易]
       → 更新 [session-handover.md 持倉區段]
```

### 4. 補上漏寫的 dashboard 交易紀錄
**dashboard.html `allTx` 至少漏了這 2 筆:**
- 2026-05-25 | TW | 009816 | buy | 15,000 股 @ $14.8 = NT$222,000
- 2026-05-28 | US | MSFT | buy | 5 股 @ $427.29 = $2,136.45

可能還漏了其他(請對照截圖確認)。

### 5. 從此每筆交易**同步更新三個地方**(寫進 CLAUDE.md 規則)
```
真實交易發生
   ↓
① transactions.json(追加一筆) ← 真實來源
② portfolio.json / tw_portfolio.json(重算部位)
③ dashboard.html allTx(加一筆視覺化)
④ adjustmentLog 敘事(描述決策)
```
**①②③④缺一不可。** 過去這個 session 只做④,所以才會走樣。

---

## 🚦 在用戶提供截圖之前,Claude 不應該做的事

| ❌ 不要做 | 為什麼 |
|---------|------|
| 用上面推估表當真實做分析 | 那是我從敘事反推的,可能漏交易 |
| 推薦新標的或加碼 | 沒有可信基準就無法算可用現金 |
| 計算總損益、報酬率 | 成本基礎可能錯 |
| 覆寫現有 JSON 為「我推估的版本」 | 會把錯誤固化成真實 |
| 假裝這份警告不存在 | 帳本失準是嚴重問題,不可繞過 |

| ✅ 可以做 | |
|---------|---|
| 跟用戶要截圖 | 這是唯一乾淨的路 |
| 解釋這份警告的內容 | 幫用戶理解問題 |
| 對純技術問題(如「MSFT 為何漲」)做分析 | 不涉及部位數字的可以 |
| 收到截圖後執行重建 | 按上面流程走 |

---

## 📐 重建用 Python script(收到截圖後可直接跑)

```python
# 收到用戶截圖後,把實際數字填進來,然後跑這個
import json
from datetime import datetime

# 從用戶截圖填入(範例,等截圖確認)
us_actual = {
    "NVDA": {"shares": ?, "avg_cost": ?},
    "AMZN": {"shares": ?, "avg_cost": ?},
    "MSFT": {"shares": ?, "avg_cost": ?},
    "VOO":  {"shares": ?, "avg_cost": ?},
}
us_cash = ?

tw_actual = {
    "009816": {"shares": ?, "avg_cost": ?},
    "2705":   {"shares": 1, "avg_cost": 18.40},  # 大魯閣
}
tw_cash = ?

# 重寫 portfolio.json
portfolio = {
    "portfolio": [
        {"symbol": k, "name": "...", "shares": v["shares"], "avg_cost": v["avg_cost"]}
        for k, v in us_actual.items()
    ],
    "cash": us_cash,
    "last_updated": datetime.now().strftime("%Y-%m-%d"),
    "_reconstruction_note": "Rebuilt from brokerage screenshot on YYYY-MM-DD due to drift from 2026-03-01"
}
json.dump(portfolio, open("portfolio.json", "w"), indent=2, ensure_ascii=False)

# 同樣處理 tw_portfolio.json
# transactions.json 則需要從截圖反推所有交易(較複雜,建議分批做)
```

---

## 🎯 給用戶的訊息範本(下個 session 可直接用)

```
"在我們繼續之前,我需要對齊你的真實持倉——
我這邊有三份資料(portfolio.json / tw_portfolio.json / dashboard.html)
彼此對不上,前一個 session 沒同步好帳本。

請給我兩張截圖:
1. 美股券商庫存頁(顯示股數、均價、現金)
2. 台股券商庫存頁(同上)

收到後我會:
① 用截圖當基準重建 transactions.json
② 重算 portfolio.json + tw_portfolio.json
③ 修正 dashboard.html 漏記的交易
④ 之後每筆新交易都會同步四個地方,不再失準

這個動作做完之前,我不會做新的進場推薦或損益計算。"
```

---

> **建立目的**:讓下個 Claude 不要再犯同樣的錯
> **更新觸發**:用戶提供截圖、完成重建後,把這份檔案改名為 `DATA_INTEGRITY_HISTORY.md`(歷史紀錄)
