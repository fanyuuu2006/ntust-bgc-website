# Member Dashboard Specification

## Goal

會員登入後先知道自己的資格、最近需要處理的事，以及可以快速回到活動、借還與個人資料。

## 順序與區塊

1. **個人化標題**：使用目前使用者名稱與一句簡短狀態，不放重複說明。
2. **需要我處理**（必要，建議新增組裝區塊）：將未簽到活動、逾期／即將到期借用、缺少會員資格等轉為一個優先排序清單；資料仍來自既有 `SelfCheckInEvents`、`DashboardBorrowingSummary`、membership service。
3. **會員資格**（必要）：沿用 `DashboardMembershipSummary`，顯示學年度、類型、狀態與下一步。
4. **近期活動／簽到**（必要）：沿用 `SelfCheckInEvents`，取消活動保留狀態，不顯示不存在的操作。
5. **借用摘要**（必要）：沿用 `DashboardBorrowingSummary`，優先標示逾期與即將到期。
6. **最新公告**（次要）：保留有限筆數，連至公告列表。
7. **快速操作**（建議）：會員資格、借還、個人資料、設定；使用文字按鈕而非大圖表。

## 狀態

未登入由 authenticated layout 導向 `/login`。已登入但無有效資格時，顯示資格 CTA，不顯示簽到假資料。無借用／無公告時只顯示一行 Empty。資料查詢失敗由 route error wrapper 處理，局部摘要可提供重試但不可把錯誤當空資料。

## Responsive

390px 以「待處理 → 資格 → 簽到 → 借用 → 公告」單欄；桌面維持順序，左側 3fr 放待處理／活動／借用，右側 2fr 放資格／公告，延續目前 Dashboard grid。

## Wireframe

### Mobile 390px

```text
[Dashboard / 使用者名稱]
[需要我處理：2 件]
  - 尚未簽到活動 -> 立即簽到
  - 借用即將到期 -> 查看借還
[會員資格卡]
[近期簽到活動]
[借用摘要]
[最新公告]
[會員資格 | 借還 | 個人資料 | 設定]
```

### Desktop 1280px

```text
[Header]
[標題 + 待處理數]
[主要欄 3fr: 待處理 / 簽到 / 借用 | 側欄 2fr: 資格 / 公告 / 快速操作]
```

## 技術可行性

主要元件與 service 已存在；新增只應是 page-level priority adapter 與可重用 `DashboardQuickActions`（若確認需要）。不要新增資料表。可將 current academic year、借用、公告以 `Promise.all` 查詢，再以既有資料計算 priority。
