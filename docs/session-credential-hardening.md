# Session 憑證硬化（Phase 3K-S1）

## 契約與風險

舊流程為 login 產生 32-byte 隨機值 → sessions.token 明文保存 → bgc_st Cookie → REST token equality query。取得原始值的人可能在有效期限內重播登入。現有事件文件沒有實際可重用憑證，也沒有足以確認濫用的證據；這不代表所有 provider logs 都未保存原始值。

新流程為原始隨機值 → Server-only `hashSessionToken`（SHA-256）→ `sessions.token_hash`。Cookie 仍持有原始值，hash 不是瀏覽器登入憑證；以 hash 當 Cookie 會再次雜湊，無法匹配。高熵隨機憑證不需要密碼用的慢速雜湊。

## 路徑盤點

- `src/utils/auth/session.tsx`：產生原始值與唯一雜湊實作。
- `src/services/auth/auth.service.tsx`：login、lookup、logout、current-session 判斷、revoke-other 與 closure 在 Server 轉換雜湊。
- `src/repositories/sessions.repository.tsx`：明確 token_hash 參數與 insert allowlist；窄 select 不讀取 legacy token。touch 與單筆撤銷使用 Session ID。
- `src/repositories/auth.repository.tsx`：呼叫新的 hash closure RPC，不傳原始 Session。
- `src/app/api/auth/login/route.ts`：原始值僅寫入 HttpOnly Cookie，JSON response 不輸出兩種憑證。
- `src/libs/auth.tsx`、logout/sessions API、`src/app/api/users/me/closure/route.ts`：原始 Cookie 只送入 Server service，未直接送往資料庫。
- `SessionSummary` 與 Settings Session UI：只接收 ID、時間及 is_current，不接收 raw/hash。保留禁止在個別撤銷操作中撤銷目前 Session 的規則；登出仍可撤銷目前 Session。
- 舊 migration、舊 closure RPC 與歷史驗證腳本保留原樣；新 hash RPC 保留使用者／Session 鎖定、密碼版本檢查、借用 blockers、原子清除與歷史保留。
- `server-diagnostic` 既有 sanitizer 與新增 development diagnostics 覆蓋 raw/hash、絕對與相對 token/token_hash 查詢。不得把真實值補入文件或應用紀錄。

Phase 3K-A 的 narrow PGRST303 retry 與 unavailable/invalid 區分不變。查詢失敗仍向上傳遞，不能當作不存在的 Session；不因暫時性錯誤刪 Cookie。touch 頻率不變。

## 需另外授權的部署順序

目前只有本機修改與 isolated DB 驗證，未套用遠端 migration、未清除遠端 Session、未部署。

1. **Stage A**：授權後套用 `202609140002_add_session_token_hash.sql`。新增 nullable token_hash 與唯一索引、允許 legacy token 為 NULL，CHECK 限制每列只保存其中一種憑證。新 hash RPC 只授權 service_role，SECURITY DEFINER 使用空 search_path。沒有回填或資料刪除。
2. 唯讀確認欄位、constraints、RPC 權限、migration history 與 PostgREST readiness。新應用不可先於 Stage A 部署。
3. **Stage B**：部署新應用並以 disposable account 驗證 login/settings/logout/closure。新應用不 fallback 查 raw token，因此舊 Cookie 在切換時就需要重新登入。舊應用無法辨識新 hash-only Session；不可混合新舊版本承接流量。
4. 停用／保護仍能接觸同一 DB 的舊 deployment 入口，確認切換完成。
5. **Stage C**：另行授權後執行 `supabase/operations/invalidate-legacy-sessions.sql`，明確提供 psql 變數 `approve_legacy_session_invalidation=true`。同一交易鎖定 sessions 並刪除全部 legacy rows。新 hash-only Session 保留；不加入禁止 legacy writer 的 constraint。此檔不會由 db push 自動執行。
6. **Stage D**：穩定後另案 migration 才禁止 legacy writer、移除 token／舊 RPC 並將 token_hash 設為 NOT NULL；本輪不做。

Stage C 會使所有舊憑證失效，而非只撤銷範例。不能以 sha256(token) 回填延續可能已曝光的登入。使用者只需重新登入一次，不需要宣告尚無證據支持的入侵事件。

| 組合 | 行為 |
| --- | --- |
| 舊 schema + 舊應用 | 維持 legacy 行為 |
| 舊 schema + 新應用 | 不相容，禁止此部署順序 |
| Stage A + 舊應用 | 原 legacy query、insert、closure RPC 仍可運作 |
| Stage A + 新應用 | 只使用 hash Session；舊 Cookie 不繼續有效 |
| Stage C + 新應用 | 新 Session 有效，legacy 已失效 |
| Stage C + 舊應用 | DB 仍容許寫入，但會重新產生 raw 憑證，不可作正常安全回滾 |

Stage A 本身不改資料，回滾應用仍有 legacy 恢復可用的風險；Stage C 後不可將舊應用當作正常回滾。刪除不能復原，不能從備份恢復可能已曝光的憑證。Stage C 只清除資料，重新執行仍需授權；若再出現 legacy rows，應先找出未停用的 writer。

## 驗證紀錄

- Node focused tests：雜湊、登入 Cookie／persist 分離、lookup/logout/revoke/list、RPC、REST URL、insert allowlist、touch ID、雙重 redaction。
- `verify-session-token-hash.sql`：在含 legacy rows 的 isolated PostgreSQL 執行 Stage A，確認舊寫入、新寫入、格式／唯一／互斥 constraints 與 RPC 權限，執行本機 Stage C 後舊列失效、新列保留；另以 rollback fixture 證明 cleanup 前仍須從部署層阻止 legacy writer。
- `verify-account-closure-session-hash.sql`：新 RPC 的借用狀態 blockers、密碼版本、PII 清除、Session 撤銷、歷史保留與失敗 rollback。
- 原 `verify-account-closure.sql` 對新的 Stage A canonical schema 仍通過，證明舊 RPC 相容。
- 遠端 CLI dry-run：只有 `202609140002_add_session_token_hash.sql`；seeds 與 roles 皆空。未執行遠端 DDL/DML。

Canonical snapshot 表示 Stage A 目標，不宣稱 Stage C 已執行。正式 migration、部署、全體 legacy Session 失效皆仍需 USER 分別核准。

## Production runbook（尚未執行）

1. **相容 migration 授權與套用**：確認 linked project 為 `gcydchpuckbmctcjpokz`，核對 migration 檔案雜湊；執行 `npx supabase db push --dry-run`，必須只有 `202609140002` 且無 seeds／roles。收到授權後才執行 `npx supabase db push`。若清單或 target 不符即停止。migration 建立函式內的 DELETE 只在日後呼叫註銷 RPC 才執行，套用 migration 本身不刪 Session。
2. **唯讀 readiness**：比較套用前後安全 row counts、migration history；核對 token nullable、token_hash nullable、partial unique index、互斥 CHECK、舊 RPC 仍存在、新 RPC 的 service_role 權限與空 search_path。以 `sessions?select=token_hash&limit=0` 確認 PostgREST 成功。只有實際欄位存在但 cache 仍 stale 才評估 reload。此時舊 deployment 應仍可登入／refresh。
3. **受保護 preview QA 與正式部署**：可先將新版本部署至受保護 preview，明確授權它使用 production DB 的 disposable account；不得操作真實帳號。完成 login → refresh → dashboard → profile → settings Session list → logout → login again，確認 Cookie raw、DB token=NULL/hash 正確、REST URL 無 raw，並測試錯誤密碼與註銷成功。Admin smoke 必須用獲授權的既有管理員唯讀存取，不為 QA 捏造真實幹部歷史。借用 blocker／history 以 isolated tests 補足。任何失敗先停止，不 promote。
4. **切換與觀察**：授權後 promote 已驗證的新版本，重做 production smoke；檢查部署版本及所有 alias／preview URL，停用或保護舊版本入口，等待舊 in-flight requests 結束。確認無持續產生 legacy rows。觀察期由 USER 決定，不宣稱固定分鐘數即可證明穩定。舊 Cookie 在新版本已需重新登入，並非等清除時才開始。
5. **全體 legacy 失效**：另行取得明確授權。安全注入 DB 連線設定而不輸出 DSN，先唯讀確認 target 與 legacy/hash-only counts；以 `psql -X -v ON_ERROR_STOP=1 -v approve_legacy_session_invalidation=true -f supabase/operations/invalidate-legacy-sessions.sql` 執行。連線方式由已核對的安全環境提供，禁止將含密碼 DSN 寫入文件。此操作有短暫 exclusive lock，應安排低流量時段，鎖定無法及時取得時取消並另排，不強行終止其他工作。
6. **驗證與後續 cleanup**：確認 legacy count=0、disposable 新 Session refresh 仍有效、再次登入只產生 hash-only row；持續確認沒有 legacy writer。另案提出禁止 legacy writer／NOT NULL／DROP token／DROP 舊 RPC migration，本輪不建立或套用。

## Rollback 邊界

- Stage 1 後：舊應用仍在運作，可保留相容 DB。技術上無 hash rows 與新 caller 時才能評估反向 DDL，但不應為回滾程式而 DROP 新欄位；本輪不提供反向 migration。
- Stage 2 後、全體失效前：可緊急切回舊應用配相容 DB，但新 Cookie 在舊應用不匹配，需要重新登入；未被刪除的 legacy Cookie 可能恢復有效，且舊 writer 再度暴露 raw 憑證。這是需明確承認風險的緊急選擇，優先修正新版本，不能稱為無損回滾。
- Stage 4 全體失效後：DB 技術上仍接受舊 writer，但安全上不應回退。舊憑證已刪除，新 hash 無法還原 raw；禁止恢復 legacy 備份。若新版本故障，應暫停登入／修正新版本，而非正常化重新保存 raw token。

## QA 限制與 deferred baseline

2026-09-14 的 Next 開發設定由 `.env.local` 指向 remote project，零列 probe 確認 token_hash 為 HTTP 400／42703（column sessions.token_hash does not exist），id 對照為 200。沒有 fallback 或 production schema detection。

已完成 code/unit/integration 與 populated isolated PostgreSQL migration tests；尚未完成 disposable browser round-trip。此機沒有 Docker、沒有 supabase/config.toml，既有 migrations 依賴未納入歷史的 baseline，不能從空 DB 完整重播。獨立 PostgreSQL 測試不是完整 local Supabase/Next 瀏覽器驗收。

不必把安裝 local Supabase 當成純 additive Stage 1 的唯一前提；可在 Stage 1 經獨立授權後，使用上列受保護 preview + disposable account 做窄範圍驗收。但 preview 指向 production DB 仍是 production mutation，需另行授權，且必須在正式 promote／全體 legacy 失效前完成。未通過 browser QA，不宣稱已 ready for production traffic。

Deferred technical debt：建立可從空 DB 重建的 baseline／bootstrap schema，搭配 local Supabase config 與 migration replay CI。本輪只記錄，不重寫已部署 migration history、不建立 paid staging。
