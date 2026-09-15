# Reviews & Ratings domain contract

Phase 3J-A 建立資料與 Server domain foundation；Phase 3J-B 在桌遊詳細頁加入公開評分摘要與文字評論 SSR 讀取；Phase 3J-C 提供已驗證使用者的作者評分操作。`202609150001_add_board_game_reviews.sql` 已套用遠端並驗證。

## Product contract

- 完成 Email 驗證的網站使用者可以評分；不要求社員、借用或幹部資格。
- 每位使用者對每款桌遊最多一筆 Review。Rating 必填且為 1–5 整數；content 是最多 2,000 字的 optional plain text。
- content 統一換行、去除外圍空白，空白內容保存為 null。HTML-looking text 仍是純文字資料。
- 註銷帳號不刪除 Review；rating 繼續計入 aggregate，作者只經 canonical public identity 映射為「已註銷使用者」。
- 作者 mutation 以 board_game_id 與 Server Session 的 user_id 為共同 predicate，不接受 client 指定 author。

## Public boundary

PublicBoardGameReview 只有 id、rating、content、createdAt、updatedAt 與 PublicUserIdentity。Repository 在同一次 relational query 只讀作者 id/name/avatar/closed_at；closed_at 僅供 Service 墓碑映射，不輸出。不得 join 或輸出 Email、驗證狀態、Profile、Membership、Officer、Session 或 Credential。

## Aggregate

board_game_review_statistics 依 board_game_id 回傳 average_rating、rating_count 及 review_count。rating-only row 會進平均及 rating_count；只有 content 非 null 才進 review_count。既有 board_games_with_statistics 與借用熱門排序不變。

## Launch requirements deferred to 3J-B/3J-C

在公開開放評論建立前，桌遊刪除流程必須將既有評論造成的外鍵衝突安全映射為使用者可理解的 `409`；不得回傳 `500`、原始資料庫錯誤或 constraint 名稱。

公開上線前應窄幅更新 Privacy／Terms，說明評分與評論是公開內容、使用既有公開身份、註銷後可能為維持內容與 aggregate 完整性而保留，以及帳號使用中可自行編輯／刪除、其他移除請求可循正式聯絡方式提出。不得把私人 Profile、社員原始紀錄、借用或簽到明細描述為公開。

Moderation資格與稽核、分散式 anti-spam、額外排序索引、Replies／Reactions 均延後；Production Session release closure 仍是獨立工作。

## Author CRUD (3J-C)

已登入且完成 Email 驗證的網站使用者可對每款桌遊建立一筆評分，文字評論選填；不需要 Membership、Borrowing 或 Officer 資格。建立使用資料庫 `UNIQUE(board_game_id,user_id)` 處理並發，重複送出安全回 409。作者可一次替換自己的 rating/content，或確認後刪除整筆評分；更新與刪除由 Repository 在寫入 predicate 同時限定桌遊 ID 和 server session user ID，不接受 body 傳入作者 ID。Rating-only 仍是已評分狀態，計入平均值和評分人數，不出現在文字評論列表。

- `POST /api/board-games/[id]/reviews`：建立；成功 201。
- `PATCH /api/board-games/[id]/reviews/me`：完整替換自己的 rating/content；成功 200，不會 upsert。
- `DELETE /api/board-games/[id]/reviews/me`：刪除自己的評分及文字；成功 200。

以上 route 都使用 `authorizeVerifiedRequest()`；匿名 401、未驗證 403、輸入錯誤 400、缺少桌遊或作者評分 404、重複建立 409。意外 Repository／transport 失敗沿用 Error ID；不重試寫入。Mutation 回應只包含 UI 需要的 rating/content 或刪除狀態。成功後以 `router.refresh()` 重新取 SSR 的 aggregate、文字列表和作者狀態；註銷作者的公開 Review 仍保留並使用墓碑身份。尚未提供 Admin moderation。

## 熱門桌遊 V1

熱門排序是獨立的 all-time read model `board_game_popularity_statistics`。完成借用只計入 `borrowed`、`returned`；評分品質採 3.5 分、20 筆的 community prior 與 5 筆信心門檻。借用熱度在 20 次完成借用時達到上限，因此 20、50、100 次的 borrowing heat 都是 1；評分參與則在 10 人評分時達到上限。權重依序為借用 50%、評分品質 35%、評分參與 15%。這些固定產品參數不會隨目錄、搜尋或篩選結果改變。

Production 量測時共有 607 款桌遊：完成借用 p50/p75/p90/p95 均為 0、最大 1、603 款為 0；評分數 p50/p75/p90/p95 均為 0、最大 1、606 款為 0。現況不足以校準成熟飽和值，因此 V1 採保守且易懂的小型社群預設，待累積足夠歷史後再以產品決策調整。文字評論數不參與熱門分數；rating-only 與註銷帳號保留的評分仍正常計入。

排序固定為 popularity score、評分數、完成借用數、平均評分（NULL 最後）、桌遊 UUID。首頁只取相同排序的前 6 筆；公開目錄的搜尋、分類與位置只縮小候選集合，不重新計算個別桌遊分數。Review 建立、修改、刪除及借出／歸還成功後，只失效熱門桌遊 cache。V1 不包含近期衰減、趨勢、推薦、materialized view 或 moderation。
