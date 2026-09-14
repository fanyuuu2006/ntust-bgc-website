# Phase 3K-A：PGRST303 與認證可靠性

## 已確認與尚未確認

指定 production deployment 的 GitHub Vercel status 對應 `02802af6cca0507f20591a3ca8c9a9e2e83df9ca`；Supabase client／fetch／auth／diagnostic source 與本輪修改前一致。package-lock 使用 supabase-js 2.110.8、Next 16.3.4。沒有取得 Vercel 當時 runtime headers 或每次 401 body，因此下述 header 結果是部署來源與相同 SDK 的實際 request 建構驗證，不冒充歷史封包擷取。

唯一 application client factory 是 `src/libs/supabase/server.tsx`，讀取 `SUPABASE_URL`／`SUPABASE_SECRET_KEY`，注入 `createSupabaseFetch`。其他 Repository 共用該 client；沒有 request-specific Authorization overwrite。env 仍匯出 legacy SERVICE_ROLE_KEY，但 source 搜尋沒有使用該值的 client。未使用 Supabase Auth 使用者 JWT。

SDK `SupabaseClient` 的 REST `fetchWithAuth` 沒有傳 `omitApiKeyAsBearer`；該選項只在 functionsFetch 設置。因而 raw secret key 同時進入 apikey 與 Bearer fallback。已用真正 createClient + 假 key + intercept fetch 驗證，沒有輸出真實 key。不能因 SDK 檔案頂部的新 key 註解便假定所有路徑都已修正。

官方要求新 secret/publishable key 放在 apikey，不能當成 JWT Bearer：[API keys](https://supabase.com/docs/guides/getting-started/api-keys)、[migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)。本輪已修正此 request construction，但 **尚未證明這就是所有 intermittent JWT issued at future 的根因**。PostgREST PGRST303 本身只表示 JWT claims validation/parsing failed；需要當次 body 與 provider 時間／簽發資訊才能確認 timing 來源。[PostgREST errors](https://docs.postgrest.org/en/v16/references/errors.html)

## 修正範圍

- transport 的 REST 路徑：只移除與 apikey 完全相同、且為 sb_secret_/sb_publishable_ 的 Bearer。保留 apikey、真正 JWT、legacy JWT 與其他 request headers；Request 與 URL/init 兩種呼叫皆涵蓋。
- 保留原 narrow retry：GET/HEAD + 401 + PGRST303 + message 包含 JWT issued at future，100ms 後僅一次。POST/PATCH/DELETE、PGRST301、其他 PGRST303、generic 401 都不 retry。不新增 502/504 policy。
- 保留 HEAD→GET limit=0 的 count 查詢行為，才能讀取 error JSON；不讀取資料列。
- retry 明列 signal 與 no-store；若呼叫者已給 signal，保留取消語意。Next 16.3.4 dedupe-fetch 實作不以 cache mode 區分，但 options.signal 會直接呼叫底層 fetch。
- 最終 JSON error 由 transport 補實際 status 與 retryAttempted/retrySucceeded=false。成功 retry 直接回正常資料，不產生 error log。
- `isAuthInfrastructureUnavailable` 只辨識明確 timing error（含 Repository cause chain）；API 回 503 + generic message + 同一 Error ID，不把 provider 401 回成使用者登入失效。
- server diagnostic 保留 PostgrestError/status/code/安全文字/retry flags；Repository operation/context 仍位於外層 cause。遮蔽長 hex token、Email、key、Authorization，不輸出 headers 或 request body。

例如最終失败診斷的內層：

```json
{
  "type": "PostgrestError",
  "status": 401,
  "code": "PGRST303",
  "message": "JWT issued at future",
  "retryAttempted": true,
  "retrySucceeded": false
}
```

## 認證三態（保留既有控制流程）

- valid：Session／user 查詢成功，回 User；retry 成功亦如此。
- invalid：沒有 cookie、authoritative session 不存在／過期、user 不存在／closed，回 null。不是基礎設施錯誤。
- unavailable：Repository error 向上拋出，不轉 null、不刪 cookie、不撤銷 session。API 對 timing error 分類 503；protected layout 交既有 sanitized error boundary，不 redirect login，也不 fail open。
- public viewer 既有 RepositoryError isolation 回 unavailable/user=null/isAdmin=false；只降級公開 nav enhancement，不授權 protected 操作。

沒有更動 Session token 儲存、生命週期、expiry、touch policy 或 migration。

## 唯讀 probe

2026-09-14T14:29:33.585Z–14:29:34.036Z，使用本機既有 sb_secret 設定、修正後 transport 對 users select(id) limit(0) 發出一次 GET：HTTP 200、apikeyMatchesConfigured=true、authorizationPresent=false、errorCode=null。Response Date 為 14:29:34 GMT，與本機時間在此 request 粒度沒有明顯差距。未傳 Cookie／真實 Session，未回傳 user rows，未寫入 DB。

這是目前設定的成功 probe，不證明歷史 Vercel clock、production 環境值或間歇性問題已消失；未 deploy。

## 驗證

- RED：初始 13 個 focused cases 中 4 fail（header normalization、retry diagnostics、503 classification）。
- GREEN：19 個新增 cases，含真正 SDK、Next dedupe implementation、Session/closed/null/API Cookie、public degrade、protected/Admin fail-closed、URL safety exclusions與log遮蔽。
- Next 測試只替代 React cache 的 request scope storage；執行 installed Next dedupe code，先證明相同 request 命中第一次 401，再證明 transport retry 真正繞過該快取。
- 完整 regression：598/598 PASS。既有 workflow test loader 只補新 helper import resolution，未放寬原 generic 500 assertions。
- 沒有 production browser 長時間驗收；USER QA 應確認瀏覽 dashboard/profile/admin、故障恢復後原 session 仍有效，並在未來核准部署後檢查 PGRST303 error volume。

未 commit、deploy、rotate key 或修改 production DB。前一輪 welcome-event 初步 incident 文件保留；本輪不是整個 Phase 3K RCA 完成。
