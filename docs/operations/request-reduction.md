# Phase 3K-B1/B2：請求減量與公開快取

## 範圍與量測

基準為 `2072e15`。本批沒有 migration、index、RPC、廣義 retry 或 Session touch 變更；S1 deployment QA 仍暫停。

先在原始 code 執行 `tests/request-budgets.test.mjs`，baseline assertion 通過：4／7／5／8／11／3。接著修改 expected budget，觀察首頁與桌遊查詢仍超標的 RED，完成 query 修改後轉 GREEN。Profile 與 register 的第一步修改已先降至 10／2。

測試執行真實 Service、Repository、Supabase SDK、application transport 與已安裝 Next dedupe 實作；Data API 回應為固定假資料。React request scope 為受控測試 scope；Next `unstable_cache`／`revalidateTag` 使用真實實作，只有 incremental cache storage 是隔離記憶體。

這不是 production HAR、Vercel cache 實測或完整瀏覽器 navigation。資料非空、無額外分頁、無 retry、Session 未到 touch 門檻。`HEAD count` 經現有 transport 轉為 GET limit=0；一個帶 exact count 的 GET 仍計一個 HTTP request。

| Flow | Before | After cold | After warm | Cold reduction |
| --- | ---: | ---: | ---: | ---: |
| Anonymous homepage | 4 | 2 | 0 | 2 |
| Auth homepage | 7 | 5 | 3 | 2 |
| Public board-game list | 5 | 3 | 1 | 2 |
| Admin board-game list | 8 | 6 | 4 | 2 |
| Private Profile | 11 | 10 | 10 | 1 |
| Register API | 3 | 2 | 不適用：mutation 不快取 | 1 |

Register 的 2 次都是 POST RPC。暖快取不代表沒有成本：登入者授權仍查詢、桌遊 result list 仍查詢；expired cache、invalidation、region cold start 都需要重新讀 DB。符合既有 touch 條件時另有 PATCH。

## Query 與 payload

| 讀取 | Before | After |
| --- | --- | --- |
| 首頁公告 | `*`、exact count | `id,title,content,published_at,created_at`、limit 3、無 count |
| 首頁熱門桌遊 | statistics `*`、exact count，再補 categories／locations | `id,name,image,status,average_rating,rating_count,review_count,completed_borrow_count,category(name),location(name)`、limit 6、無 count；後四項由同一 popularity query 提供，借用與人氣只供排序 |
| 公開桌遊清單 | statistics `*` 再補 categories／locations | `id,name,image,status,inventory_number,completed_borrow_count,average_rating,rating_count,review_count,category(name),location(name)`，保留 count/filter/order/range；沒有逐卡查詢 |
| Admin 桌遊清單 | game `*` 再補 categories／locations | game `*` 與 category/location 的 `id,name,description` 同次取得；保留管理欄位 |

首頁公告使用寫入時由 Server 衍生的 `content`，不下載／解析 `rich_content`。公開桌遊預覽不下載 description／rich_description。Detail renderer 與搜尋條件未改。

已對現有 DB 的 base table 與 statistics view 執行 `limit=0` relational projection 唯讀 readiness probe，兩者 HTTP 200；沒有讀取業務 rows 或變更 DB。

Profile 重用 `findCurrent()` 已取得的 `start_date/end_date`，仍以 event start_time 的 inclusive 界線與 present/late 計次；joined year、badges 未改。

## 公開快取契約

只快取固定公開資料，不能用這個 helper 包裝私人 Service。Cache key = 固定版本 tag + 非敏感 Supabase URL + TTL 時間區段；URL 區隔不同資料來源。沒有 Cookie、user ID、permission 或 credential 作為 key/value。

| Key/tag | TTL 上限 | 失效來源 |
| --- | ---: | --- |
| public-home-announcements-v1 | 30 秒 | 公告 create／publish／unpublish／edit／delete 成功後 |
| public-home-games-v1 | 60 秒 | 桌遊 create／edit／delete、種類／位置 CRUD 成功後 |
| public-categories-v1 | 300 秒 | 種類 create／edit／delete 成功後 |
| public-locations-v1 | 300 秒 | 位置 create／edit／delete 成功後 |

種類與位置為公開 reference data；管理頁只共用 filter options，管理清單、權限與使用者資料沒有 shared cache。非首頁的自訂熱門清單 limit 不使用首頁快取。

時間區段包含在 key：跨區段後不讀舊 key，不依賴 Next stale-on-error。有效區段內可展示先前成功資料；跨區段且上游失敗時拋錯，既有 section fallback 接手。失敗不轉為可快取的空陣列或 unavailable 值，下一次 request 可重新查詢。沒有無限 stale 或長時間 negative cache。

寫入成功後使用 `revalidateTag(tag, { expire: 0 })`，不採 `max` stale-while-revalidate。失效失敗不偽裝成成功；既有 unexpected error 路徑會保留 Error ID。DB 寫入與 cache invalidation 並非同一 transaction，必要時應查寫入結果再操作，避免重複建立。

借用流程未修改；熱門統計與狀態可能延遲至下一個 60 秒區段。直接從外部 SQL 修改資料不會觸發 application invalidation，也依 TTL 更新。已開啟頁面的 DOM 不會被 server tag 主動推送更新。

到期區段切換或 cold start 仍可能有並行 miss；沒有新增 distributed lock／Redis，也不宣稱完全消除尖峰。時間區段會產生不同 cache key，舊 entry 的儲存回收由 Next／平台管理；Preview QA 應觀察 cache 儲存量及跨 region cold misses。

## 註冊與錯誤行為

刪除 email existence pre-check；`users_email_key` unique constraint 與 `register_user` atomic RPC 保留。競爭測試透過 SDK 模擬 constraint 勝負，驗證一筆 201、一筆安全 409，僅成功者發送驗證信；不是 production 競爭測試。沒有修改 DB register function。

首頁保留原有兩個 Suspense section 與局部 unavailable 文案。測試覆蓋各自失敗／同時失敗、Hero 保留及 unavailable viewer 的安全 shell props；S1/3K-A 的 public viewer、protected fail-closed tests 一併回歸。

Server tree rendering 測試不是實際 HTTP 200 或 browser visual PASS；部署 QA 仍需確認 HTTP、真實 RSC refresh、Vercel cache/tag propagation。部署前仍須完成獨立的 S1 protected preview QA，不可跳過。

## Review／QA 重點

- 首頁冷／暖讀取、下架公告後新 request、種類名稱更新、桌遊編輯後預覽更新。
- 公開與 Admin 桌遊 search/filter/order/page URL 行為。
- 登入使用者不因暖 public cache 混用其他人的資料。
- DB unavailable 時首頁 section fallback、Cookie 不被清除、protected route 不 fail open。
- 不執行 legacy Session invalidation、cleanup、deploy 或 push。

官方 API 參考：[unstable_cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)、[revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)。
