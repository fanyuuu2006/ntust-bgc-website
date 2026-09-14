# 2026-09-14 迎新活動 incident：初步證據與安全停止點

狀態：**RCA 未完成；發現 raw Session token 進入 Data API URL 的安全風險，依本次任務第 51 節先回報，不擅自執行遠端失效／rotation。** 尚未實作或部署 Phase 3K reliability changes。

## Phase 3I checkpoint

- `.next` 未受 Git 追蹤；停止本專案 Next dev 程序後，刪除該快取並執行 `next typegen` 成功。
- 沒有修改 application source 來規避 generated types 錯誤。
- lint、TypeScript、579/579 tests、diff check 全數通過；production npm audit 0 vulnerabilities。
- Commit：`cff82c3c32eefb38b53c9f0356ecb82c9ed12756`，`feat(profile): enrich public profiles with club activity`，21 files。
- 保留 `70f6e4e` foundation；未 push／deploy。此文件在 checkpoint 後新增，未 commit。

## Deployment provenance

GitHub live branch API 與 commit statuses 已讀取，並非以本機 HEAD 推定部署版本。

| 項目 | 證據／結果 |
| --- | --- |
| 指定 deployment | `dpl_5Y9o4xQ5ZEDGsy57oRoNpJvoQGvK` |
| Vercel project | `ntust-bgc` |
| 對應 Git SHA | `02802af6cca0507f20591a3ca8c9a9e2e83df9ca` |
| 對應方式 | 該 SHA 的 Vercel status target URL 精確包含指定 deployment ID |
| pending status | 2026-09-14T09:27:30Z |
| success status | 2026-09-14T09:28:14Z |
| 真正 build 開始／結束時間 | 尚未取得 Vercel build metadata；以上是 GitHub status 時間，不冒充 build timestamps |
| main／本機 origin/main | `02802af6cca0507f20591a3ca8c9a9e2e83df9ca`，live API 已核對 |
| 本機 HEAD | `cff82c3c32eefb38b53c9f0356ecb82c9ed12756`，比 main 多 2 commits |
| Next.js | 對應 SHA 的 package.json 指定 16.3.4；尚未取得 runtime/build log 再確認 |
| Phase 3G diagnostic／custom fetch／closure code | 對應 SHA 皆包含；這些目錄與本機 HEAD 無 diff |
| 本機尚未部署差異 | Phase 3I Public Identity／Profile 相關 code、政策、文件、測試；不能把新增公開摘要 fan-out 算成此次 production 原因 |

來源：[GitHub main](https://api.github.com/repos/fanyuuu2006/ntust-bgc-website/branches/main)、[commit statuses](https://api.github.com/repos/fanyuuu2006/ntust-bgc-website/commits/02802af6cca0507f20591a3ca8c9a9e2e83df9ca/statuses)、[指定 Vercel deployment](https://vercel.com/fan-yuuus-projects/ntust-bgc/5Y9o4xQ5ZEDGsy57oRoNpJvoQGvK)。

## 高優先安全發現：不是 hash，是 raw cookie credential

下列程式在上述部署來源 SHA 與本機一致：

1. `src/utils/auth/session.tsx`：`randomBytes(32).toString("hex")` 產生 64 hex 隨機 token，沒有 hash。
2. `src/services/auth/auth.service.tsx` 的 login：將該 token 原樣交給 `sessionRepository.create`，存入 `sessions.token`。
3. `src/app/api/auth/login/route.ts`：將回傳的 `session.token` 原樣寫入 `bgc_st` Cookie。
4. `src/libs/auth.tsx`：讀取 Cookie，交給 `getUserBySessionToken`。
5. `src/repositories/sessions.repository.tsx` 的 `findValidByToken`：`.eq("token", token)`，因此 Data API URL 的 lookup value 就是 raw Cookie token。findByToken／deleteByToken／revoke-other 的 filter 亦使用原值。

使用者提供的事故描述指出 Edge log 出現 `sessions?token=eq.[REDACTED]`。**程式路徑已確認；本輪尚未取得原始 Edge log 或讀取任何真實 token，無法量化外洩筆數、有效期與存取者。** 不把「記錄於 provider log」等同於已遭第三人盜用，但具 log 存取權者若取得仍有效 token，可能重放 Session。現行 code 的新 Session 有效期為 7 天，不能假設活動結束後所有 token 都已失效。

這與 Supabase secret API key 不同；目前沒有 API key 洩漏證據，不應無差別旋轉服務金鑰。OWASP 建議不將 Session ID 寫入 log，若需關聯可使用不可直接重用的衍生值：[Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)。

### 安全邊界與待決策

- 未登入／重放任何真實 token；未查詢真實 Session rows；未刪除／失效 Session，未旋轉 key。
- 應優先限制事故 log／匯出的存取，保留遮蔽後證據，避免再貼完整 URL 到對話或 issue。
- 需要與 USER 確認現有 Session 的失效處置範圍；不能只將既有 raw token hash 後 backfill 就宣稱先前 log 中的 token 已不可用。
- 後續本機修正方向：browser 保留 random raw token；Server 雜湊後查詢；DB 僅保留 token_hash；所有登入、撤銷、列出 current Session、close_account RPC 一起對齊。需另行設計 migration／失效與部署順序。
- migration 與遠端 Session 失效屬獨立授權邊界，不能在舊 application 仍要求 raw `token` 欄位時直接切換 schema。
- 本次依使用者「安全發現若需立即 rotation，先 STOP 並回報」要求暫停；這不是已完成的 migration 或 remediation。

## 事故時段與缺少的原始證據

| 時段 | UTC | Asia/Taipei | 來源 |
| --- | --- | --- | --- |
| reported failure window | 13:24–13:38 | 21:24–21:38 | 使用者附件描述 |
| Vercel 查詢 window | 12:53–13:53 | 20:53–21:53 | 使用者指定 |
| 資源圖查詢 window | 13:20–13:45 | 21:20–21:45 | 使用者指定 |

附件列出 sessions/users/officers/announcements/board-games/categories/locations/register/verification 等多條路徑失敗，但沒有逐筆 raw log。本輪無可用 Vercel／Supabase connector、CLI command 或 browser session（browser inventory 為空）。已向 USER 請求遮蔽後 evidence 或唯讀存取。

因此以下目前均為 **UNKNOWN／尚未量測**，不是 0：Vercel Error ID 數量、status／endpoint／operation／minute bucket 分布、Supabase request IDs、個別 401 body、504 body、CPU/RAM/IO/connection/pool/locks/Postgres logs。沒有足夠事件記錄建立 Vercel↔Supabase request correlation；目前均 unmatched，不能用部署 status 取代 runtime log。

所需 evidence：

- Vercel 指定 deployment 的 build metadata 與 12:53–13:53Z runtime logs（時間、route、method、Error ID、operation、safe cause、request ID）。
- Supabase Logs Explorer 的 API／PostgREST／Postgres 同時段紀錄；匯出前遮蔽 URL query token／Email／headers／row values。
- Supabase Database／Reports 的 CPU、RAM、swap、IO、connections 與服務 restart／health；記錄 chart 時區、採樣間隔及缺口。
- 取得錯誤 body 才能分開核對 PGRST003／PGRST303；HTTP status 本身不足。

## 已定位的診斷缺口（非歷史逐筆 RCA）

`retainErrorStatus` 目前只對可解析且有 code/message 的 JSON error 加 status。非 JSON gateway body、空 body 或無 code 物件會原樣交回 SDK，缺少 metadata 的風險仍存在。`serverDiagnostic` 對無已知 code/name 的物件輸出 UnknownError；文字又採嚴格格式白名單。這些是可由 source 重現的缺口，但未拿到本次原始 response 前，不能說每筆 UnknownError 都由同一機制造成。

目前 `getCurrentUser` 已使用 React cache；Session touch 已有 15 分鐘門檻且失敗 catch/report、不阻斷登入。不能把它描述成每次 page hit 必定 PATCH。`isAdminByUserId` 尚未 cache，還會再次查 user。Public viewer 已有 unavailable 狀態，捕捉 RepositoryError 並只降級公開呈現。尚未完成全站 request amplification 計數與跨路徑測試。

官方定義：PGRST003 對應等候 pool connection timeout／504；PGRST303 是 JWT claims validation/parsing／401。**不能將所有 504 判為 PGRST003，也不能將本次所有 401 判為 JWT issued at future。** 參考：[PostgREST errors](https://docs.postgrest.org/en/v16/references/errors.html)。

## 初步 root-cause matrix

| Candidate | Evidence for | Evidence against／missing | Confidence |
| --- | --- | --- | --- |
| individual bad query | 多路徑失敗的 reported evidence | 同時 simple users／sessions 失敗，不支持單一查詢解釋所有事件 | 未證實 |
| schema mismatch | 尚未取得本次 error body | 不能用過去尚缺 closed_at 的開發紀錄推定；Phase 3G closure 文件記載已套用 | 未證實 |
| database overload | reported burst／多路徑 5xx | 缺資源圖與當時連線數 | 未證實 |
| PostgREST pool exhaustion | reported 504 | 缺 PGRST003 或 pool log | 未證實 |
| JWT/PGRST303 secondary failure | 專案有既有 narrow retry；reported 401 | 缺本次 401 body | 未證實 |
| provider outage | reported 多服務路徑 5xx | 缺 provider health／incident evidence | 未證實 |
| lock contention | 無直接證據 | 缺 lock／wait log | 未證實 |
| application amplification | source 有 user/admin 重複查詢與 enrichment fan-out | 已有 request cache／touch throttle，未量測事件流量與 DB 壓力 | 程式存在放大機會；事故因果未知 |
| unknown | 缺逐筆 logs／metrics | 不能強迫單一根因 | 目前整體 RCA 結論 |

Raw token log exposure 是獨立安全問題，**不是目前已證實的 5xx 成因**。

## 本輪實際操作

只重建本機 ignored Next cache、執行 Phase 3I 完整驗證／checkpoint commit，並進行 source、GitHub status 與官方文件唯讀查詢。沒有 production DB query／mutation、key rotation、部署、push、service restart。沒有 Phase 3K application patch、migration 或 RED/GREEN hardening 測試，不能回報 Phase 3K 完成或 ready to deploy。

## Phase 3K-S1 憑證稽核

已檢查 raw token、hash、Cookie、Email、Authorization、apikey、secret key 與 query URLs。此文件未發現可重用的實際 bearer credential；commit SHA 與 deployment ID 僅作版本溯源。Session 查詢範例統一使用 [REDACTED]，不得補入真實 token/hash。目前沒有足以判定濫用的證據。Phase 3K-A 已獨立提交；S1 的 migration 與 Session 失效作業尚未執行於 production。
