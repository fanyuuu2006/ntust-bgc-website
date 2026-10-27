# Calendar 假日資料

正式來源為行政院人事行政總處「政府行政機關辦公日曆表」官方 CSV：

<https://www.dgpa.gov.tw/information?pid=12922&uid=137>

資料流程：

```text
DGPA 官方 CSV
  → scripts/sync-calendar-holidays.mjs
  → 年度快照／共用假日資料
  → Next.js Server Component
  → Public／Admin EventCalendar
```

同步與檢查：

```bash
node scripts/sync-calendar-holidays.mjs --year 2027 --check
node scripts/sync-calendar-holidays.mjs --year 2027
```

同步腳本處理 UTF-8 BOM、欄位、日期與年度、重複日期、放假狀態、下載大小、Timeout、禁止重新導向與原子更新。Check mode 不寫入檔案；下載或驗證失敗時保留既有快照。

Calendar 目前由 Server Component 讀取 2026／2027 年本地資料並一次傳入共用 Client Calendar，因此月份切換不會再請求政府 API，也不需要假日 API Route、Cache 或假日專用 Loading State。更新快照後需要透過正常部署流程發布新版。

未涵蓋年度不自行推算國定假日；一般週末仍由 Calendar 日期邏輯判斷。政府行政機關辦公日曆不等同臺科大校曆，假日資料只用於行事曆視覺呈現。
