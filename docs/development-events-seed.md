# DEV／QA 活動測試資料

`scripts/seed-development-events.mjs` 會在指定的 Supabase DEV 專案建立可重複使用的活動資料集。它不是 migration，也不會寫入 `event_attendances` 或修改既有非 Seed 活動。

## 安全條件

- 固定目標為 `mrsyfssstigartmhofuz`（`mrsyfssstigartmhofuz.supabase.co`）。
- 腳本會拒絕其他 `SUPABASE_URL`，避免誤操作 PROD。
- 每筆資料使用 `events-dev-qa-v1` 產生的 deterministic UUID，並以 `[DEV-QA]` 名稱前綴辨識。
- 已存在且名稱相同的 Seed 資料會重用；名稱衝突會中止，不會覆蓋資料。
- 不提供自動清除功能，亦不會刪除任何活動或簽到資料。

## 使用方式

先載入 `.env.local` 後執行預覽（預設不寫入）：

```bash
node scripts/seed-development-events.mjs
```

確認預覽數量與日期分布後，才可在 DEV 執行：

```bash
node scripts/seed-development-events.mjs --apply --confirm-development
```

目前資料集共 122 筆，涵蓋 2025、2026、2027 年，包含 published、draft、cancelled、已結束、未來、跨日、跨月、跨年、不同顏色、Rich Text，以及有／無報到時間窗的活動。時間以 `Asia/Taipei` 產生，再以 ISO timestamp 寫入 `timestamptz`。

## 驗證限制

腳本成功插入只代表 DEV Seed 寫入成功；Public API、Admin CRUD、Check-in 與瀏覽器 Calendar 顯示仍需另外驗證。任何需要會員身份的簽到測試不得使用此 Seed 自動建立假會員或簽到資料。
