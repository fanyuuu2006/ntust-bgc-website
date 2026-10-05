# 本機購入建議試用環境

> **目前功能更新：** 購入提醒、已讀 API 與本人紀錄頁均已移除。使用者端僅有表單及送出結果；下方本人紀錄與提醒的描述僅記錄舊版測試結果，並非現有功能。

> **2026-10-03 狀態更新：** `localhost:3107` 已切換到共用測試專案 `mrsyfssstigartmhofuz`。下方 Docker 與合成帳號說明保留作歷史環境參考，目前不能用這些帳號登入 3107。請使用共用測試庫的既有帳號；目前設定與驗證結果見 `purchase-suggestions-shared-test.md`。Docker 資料仍保留，但網站現在不依賴它。

此文件只適用於 `.temp/purchase-suggestions` 功能工作目錄，不能在原工作目錄或遠端環境照做。

## 入口與帳號

- 登入：`http://localhost:3107/login`
- 推薦表單：`http://localhost:3107/board-games/suggest`
- 本人紀錄／購入提醒：`http://localhost:3107/board-games/suggest/mine`
- 幹部後台：`http://localhost:3107/admin/board-games/suggests`

帳號與各自隨機密碼儲存在功能工作目錄的 `.temp/local-test-accounts.json`。此檔與 `.env.local` 均已由 Git 忽略，請勿分享或提交。

| role | Email | 用途 |
| --- | --- | --- |
| member | purchase-member@example.test | 已驗證、無社員資格，可以推薦與查看本人紀錄 |
| admin | purchase-admin@example.test | 已驗證、114 學年度歷史幹部，能管理推薦 |
| other | purchase-other@example.test | 另一個已驗證帳號，確認彼此紀錄隔離 |
| unverified | purchase-unverified@example.test | 可登入但未驗證，推薦 API 應拒絕 |

請使用一般登入表單，無須自行註冊。以不同瀏覽器／無痕視窗分別登入一般帳號與幹部，能同時試用兩種角色。站內通知在推薦者重新開啟 Dashboard／本人紀錄時顯示，不是即時推送。

所有帳號與內容均為合成資料。一般帳號的「璀璨寶石（本機示範）」已用於購入驗收；另一帳號的 HTTP 驗收推薦已軟刪除，仍計入本週額度。沒有複製正式或共用資料。

## 隔離與重新啟動

Docker 專案識別碼：`purchase-suggestions-qa`。

設定與 migration 複本：`.temp/local-supabase/supabase/`。本機 API 使用 `127.0.0.1:15421`，PostgreSQL 使用 `127.0.0.1:15422`。專用 Docker network 為 `purchase-suggestions-loopback`。目前 Docker Desktop／CLI 組合仍會明確綁定所有介面，因此另以本機腳本修正本次兩個容器為 loopback-only，完整保留掛載資料卷；腳本只接受本次固定容器名稱，重複執行會略過已正確綁定者。

在 **Windows PowerShell、功能工作目錄**，Docker Desktop 已啟動時：

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin;" + $env:PATH
npx.cmd --yes supabase@2.117.0 start --workdir .temp/local-supabase --network-id purchase-suggestions-loopback
node .temp/bind-loopback.mjs
npm.cmd run dev -- --port 3107 --hostname 127.0.0.1
```

Supabase 啟動命令可能顯示本機連線資訊，請勿將完整輸出公開。Next.js 顯示 Ready 後，開啟登入網址。若 3107 已有網站執行，不要再啟動第二份。

停止網站使用該終端機的 Ctrl+C。停止本次 Supabase 並保留資料：

```powershell
npx.cmd --yes supabase@2.117.0 stop --workdir .temp/local-supabase
```

不要執行 `db:reset`、`db:verify:replay`、`--no-backup`、`docker volume prune`，也不要修改原目錄的 `.env.local`。

## 驗證範圍與限制

2026-10-01：新 migration 已在上述本機容器套用。另建立獨立 QA 資料庫，SQL 檢查權限、限額、重複、通知版本及軟刪除，多連線測試涵蓋同請求重送、同名競爭及最後一個週額度。第一次驗證 schema 複製遇到系統角色預設權限限制，未完成的 validation DB 保留；第二份 validation_v2 成功，不影響網站使用的 postgres DB。

HTTP 實測包含一般登入、未登入／未驗證拒絕、後台越權拒絕、本人資料隔離、額外欄位與超長內容拒絕、16 KiB 限制、六個同時提交只新增一筆、重複拒絕與 60 秒間隔。

瀏覽器實測：無社員資格帳號成功送出、額度從 3 降為 2、本人清單、歷史幹部標記購入、刪除取消／確認、狀態篩選、推薦者 Dashboard 購入提醒、確認已讀後提醒消失。375px 手機寬度下，後台、表單與通知未出現水平溢出；截圖存於 `.temp/`。通知已讀的示範紀錄仍保留在本人清單。

本環境沒有設定寄信或 Turnstile 金鑰，不包含註冊、寄送驗證信與忘記密碼的完整試用；以預先建立帳號測試購入建議。網站其餘功能的空白清單可能只是尚未建立對應資料。

應用仍使用自訂 Session，不使用 Supabase Auth。資料庫金鑰僅寫入此功能目錄的 `.env.local`，不會送到瀏覽器。
