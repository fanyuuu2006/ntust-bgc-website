# 共用測試資料庫試用

> **目前功能更新：** 已移除購入提醒、已讀 API 及本人紀錄頁；使用者端僅有表單及送出結果。下方本人紀錄相關描述是歷史狀態。既有資料庫通知欄位保留相容，本次未變更遠端資料庫。

2026-10-03，功能工作目錄 `.temp/purchase-suggestions` 的網站已切換到共用測試專案 `mrsyfssstigartmhofuz`。不是正式資料庫，也不是先前的 Docker 本機資料庫。

## 連線與啟動

原專案 `.env.local` 保持不變。功能目錄沿用其 Supabase URL、伺服器金鑰及其他設定，只將 `SITE_URL` 設為 `http://localhost:3107`；伺服器與公開 Supabase URL 均一致。金鑰不寫入本文件。

Windows PowerShell，在功能工作目錄執行：

```powershell
npm.cmd run dev -- --port 3107 --hostname 127.0.0.1
```

顯示 Ready 後，可使用以下入口；若已執行，不要啟動第二份。此設定需要網路，不需要 Docker。網站上的寫入會寫入共用測試庫，請只操作自己的測試紀錄。

- `/login`：使用共用測試庫的既有網站帳號，與 Supabase Dashboard／CLI 登入是不同帳號系統。
- `/board-games`：既有桌遊資料。
- `/board-games/suggest`：推薦表單。
- `/board-games/suggest/mine`：本人紀錄與購入提醒。
- `/admin/board-games/suggests`：具既有管理權限的幹部後台。

先前 `.temp/local-test-accounts.json` 的合成帳号不適用於此環境，未匯入共用資料庫。先前本機連線備份在 Git 忽略的 `.temp/local-env.before-shared.env`，不要公開、提交或直接印出內容。

## 已完成的遠端檢查

- 遠端有前面 33 份 migration；dry-run 只有 `202609300001_add_board_game_purchase_suggestions.sql` 待套用。
- `users.id`、`users.closed_at`、`users.email_verified_at`、`officer_positions.user_id` 均已存在；新表與三個新函式不存在，沒有物件衝突。
- 只套用上述 migration，明確略過 Vault 更新，未帶入 seeds 或 roles。第一次在建立連線前遇到驗證逾時，第二次成功。
- migration 紀錄已確認新增成功。套用前後均為 25 筆桌遊、22 個帳號；新推薦表為 0 筆，未匯入本機示範資料。
- 新表啟用 RLS；anon／authenticated 無 SELECT，service_role 可 SELECT 但不能直接 INSERT／UPDATE／DELETE；三個服務端 RPC 可執行，anon 不可提交。
- 重啟後 `/login` 與 `/board-games` HTTP 200，未登入的推薦頁導向 `/login`。

## 尚待既有帳號驗證

需要使用者自行登入或提供專用測試帳密檔的位置，才能實測共用測試庫上的本人清單、正常提交與幹部處理。尚未取得既有測試帳號的登入狀態，不可把先前 Docker 的登入與操作測試當成此環境已驗證。

禁止執行本機 SQL／並發 fixture 腳本對此環境測試；它們只適用於隔離 QA 資料庫。未執行 reset、資料清除、Git commit／push／pull／PR／merge 或部署。
