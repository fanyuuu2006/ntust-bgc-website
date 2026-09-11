# Phase 3B — 上線後管理工作流與響應式強化

日期：2026-09-12。基準 HEAD：`68d65e9c53be602a2582dc6d99b6403ef689810f`。
開始時工作目錄乾淨；沒有建立 commit、部署或更動正式資料。

## Inventory

1. **既有儲存／顯示**：`board_games.inventory_number` 是 PostgreSQL `bigint NOT NULL`，
   `board_games_inventory_number_key` 為 unique constraint。TypeScript 使用 `number`，
   create schema 為 `z.number().int().min(1)`，edit 為 create 的 partial；畫面仍送完整表單。
   列表排序使用資料庫數值排序，搜尋也有數值欄位處理。沒有找到桌遊匯入介面／匯入腳本。
   資料庫可能容許舊的非正值或超出 JS 精確整數範圍，但不容許文字編號。
2. **下一號**：Repository 只選 `inventory_number`、降冪排序、`limit(1).maybeSingle()`；
   Service 回傳最高值加一。607 → 608、1/2/3/10 → 11、1/2/4 → 5；空表或最高值小於 1 → 1。
   不使用筆數、不保留號碼、不改為 sequence。若無法在 JS 安全整數範圍內精確加一，
   不提供建議值，避免默默四捨五入。新增頁與分類／位置查詢平行取得建議值。
3. **重複／競爭**：保留 Service 事前查重與 DB unique constraint；另將 create/update 寫入時
   該 constraint 的 `23505` 轉成既有 `DuplicateInventoryNumberError`，API 回 409 與安全文案。
   表單保留全部輸入，可改號重送，不自動更改提交編號。其他資料庫錯誤不冒充重複編號。
4. **補零位置**：移除公開桌遊詳情及管理端借用摘要兩處 `padStart(3, "0")`。
   其他列表、表單、個人借用、Dashboard 原本直接顯示數值，保持如此。
   `src` 全域搜尋已無 `padStart`；社員序號與學年度等識別規則及 SQL 內容未修改。

依據：`src/repositories/board-games.repository.ts`、`src/services/board-games/`、
`src/app/(admin)/admin/board-games/new/page.tsx`、`supabase/schema/canonical-public-schema.sql`。

## Borrowing

5. **前後行為**：以前所有管理端借用列均可進入刪除確認；現在不再顯示刪除。
   核准、拒絕、借出、歸還、修改借出中的期限與使用者取消待審核申請維持原規則。
6. **死碼**：移除 `/api/admin/borrowings/[id]` 的 DELETE export、`deleteBorrowing`、
   `deleteTransactionally` 及沒有呼叫者的 `deleteById`。保留 PATCH。
   移除一個已失效的「產品提供借用刪除」測試，更新確認按鈕測試為只有拒絕使用 danger。
   DB RPC 及歷史 SQL 保留，應用程式已無呼叫。決策記錄於 `supabase/README.md`。
7. **Migration**：不需要。本輪沒有新增／改寫 migration，也沒有遠端 SQL 操作。
   無法僅憑 repository 排除前任的外部腳本使用 RPC，因此不為清理名稱而 DROP 遠端函式。

## Responsive

8. **程式碼判讀根因**：Card／Field 未明確限制 intrinsic minimum；人為文字混用 truncate、
   nowrap 與換行類別；公告桌面表格是 auto layout＋820px 最小寬，沒有固定欄位寬度所有權。
   Input 自身已有 `min-w-0 w-full`，但缺少上層 Field 的縮小能力與 `max-w-full`。
   這些是本輪靜態判讀與修正，並非已在實際瀏覽器逐項重現。
9. **公告 mobile**：Card 可縮小、列表使用單欄零最小寬；管理標題改為 `wrap-anywhere` 完整換行。
   公開公告保留原本兩行預覽設計，但使用能處理長英文字／URL 的換行規則。
10. **公告 desktop**：使用 `table-fixed`，狀態／操作各 6rem、三個日期欄各 7.5rem，
    標題使用剩餘寬度；日期允許自然換行，不再因長標題把頁面撐寬。
11. **Modal 控制項**：Field、FieldInput 包裝與 Modal 內容補齊寬度限制；Input 共用樣式新增
    `max-w-full`，Select／Textarea 沿用相同樣式。借出日期保留原生 datetime-local，
    加上 required／aria-required，提交仍由既有日期解析檢查。
12. **同根因修正／檢視**：桌遊名稱、種類、位置、借用者、幹部名稱、使用者選擇器、
    公告／桌遊詳情、Dashboard 借用摘要、個人借用紀錄改為可安全換行。
    已檢視 users、memberships、events、attendance、register keys；其 Card 受共用修正保護。
    users／桌遊／借用等真正多欄表格保留容器內水平捲動，未全域改成 fixed table。
    短狀態、操作按鈕、分頁、表格標頭保留 nowrap；既有設計性的公開摘要截行保留。
13. **共用 primitive**：Card 新增 `min-w-0 max-w-full wrap-anywhere`；Field 同類限制；
    Input 共用控制項新增 `max-w-full`；Badge 新增 `shrink-0 whitespace-nowrap`；
    Modal／HeadingSection 的長文字可換行。沒有改原生控制項外觀、全域隱藏水平溢出或重設計。

## Navigation

14. **原行為**：桌遊／公告成功及取消回固定列表，users／events 詳情返回連結也無來源查詢。
15. **設計**：`src/utils/admin-return.ts` 提供建立列表 href、附加 returnTo、驗證返回路徑三個窄用途函式。
    沿用 `buildQueryString` 及 `getSafeReturnPath`；列表以已套用 query 建立 URL，包含 page。
    仍是 URL → SSR normalize → Service／Repository，沒有新增持久化／全域 client state。
16. **範圍**：桌遊新增／編輯、公告新增／編輯／刪除後返回、users 詳情、events 簽到詳情。
    events 詳情的搜尋、排序、分頁、清除搜尋與空結果重設都保留父列表 returnTo。
    借用、社員、序號、幹部、學年度、分類／位置的原地 Modal 使用 refresh，不強加 returnTo。
17. **防護**：只允許精確的所屬列表 pathname；拒絕外部 URL、雙斜線、反斜線、控制字元、
    跨路由、子路徑、fragment、多值 returnTo。query 保留為編碼後的資料，不作導航目的地。
    原登入 helper 也補上反斜線／控制字元檢查。
18. **直接開啟**：未提供或無效 returnTo 時回 canonical list。使用普通 Link／router.push，
    沒有 history hack；失敗 catch 不導航、不清空表單。有效查詢語意保留，網址編碼或預設參數
    可能正規化，不承諾原始 URL 字元逐字相同。

## Forms

19. **既有契約**：FieldInput 已把 required 同時交給 Field、native Input 與 aria-required。
    紅色星號由 Field 的 `after:content-['*']` 與 `--status-danger` 統一產生，沿用不複製 span。
20. **已收斂**：桌遊、學年度、分類／位置、幹部、社員資格、序號產生、活動、簽到狀態、
    借出期限、設定中的顯示名稱／電話／密碼；公告、註冊、管理者編輯個資原已正確。
    活動簽到時段只有啟用自助簽到才顯示並要求填寫。
21. **發現差異**：部分 native required 缺少 Field 星號；部分 schema 必填的 enum／學年度／數量
    沒有 native required，已補齊。設定姓名、電話、密碼欄位也缺少標記，已補齊。
    說明、圖片、學籍選填欄位、可由 Service 補值的加入／簽到時間維持選填。
    使用者選擇器保持既有選取檢查與伺服器 user_id 驗證，未把搜尋文字當作已選取使用者。

## Email operations

22. **決策**：採 Option A，使用者詳情內的窄範圍唯讀資訊；無獨立 token CRUD。
23. **內容**：最近連結的建立時間、到期時間、使用／失效時間、有效／過期／已使用狀態，
    無紀錄有空狀態。`consumed_at` 也可能是重寄取代舊連結，故 UI 說「已使用／失效」。
    明示建立紀錄不保證郵件送達。查詢使用既有 `(user_id, created_at desc)` 索引並限制一筆。
24. **敏感資料**：Repository 明確只 SELECT 三個時間欄位，不 SELECT *、不讀 hash；
    新 Service 再次驗證登入、Email 已驗證及管理權限。未提供一般使用者 API、人工驗證覆寫、
    編輯／失效／刪除 token 或批次操作。

## Verification

25. **RED**：先新增 9 組測試，全部在修正前失敗；修正測試 loader 的 TS 檔名設定後重新記錄
    RED，確認包括缺少 next-number 方法、競爭錯誤未轉換、補零／刪除仍存在等需求失敗。
26. **GREEN**：新增檔案共有 17 組測試，全數通過。含實際執行 Repository 查詢替身、Service、
    Route Handler、SSR 頁面與表單事件，不只有截圖／程式字串比對。
27. **全回歸**：基準 352/352；完成後 368/368（移除 1 組過時刪除能力測試、新增 17 組）。
    舊視覺測試更新為新的換行／安全返回契約，不放寬業務或權限斷言。
28. **Lint**：`npm.cmd run lint` 通過，0 error／warning。
29. **TypeScript**：`npx.cmd tsc --noEmit` 通過。`git diff --check` 通過。
30. **Audit**：`npm.cmd audit --omit=dev --cache .temp/npm-cache` 連線官方 registry 後通過，0 vulnerabilities。
    首次受限網路執行失敗；未安裝或更新任何套件。
31. **執行期視覺**：尚未完成。工具列出 0 個瀏覽器，建立 iab 回覆 `Browser is not available: iab`。
    已產生實際元件＋假資料的 5 個 SSR fixture 頁、15 個 320／375／1440px iframe 預覽，
    入口為 `.temp/phase3b-qa.html`。它們不等於瀏覽器 CSS 尺寸量測、手機原生控制項或完整 Next.js E2E。
    表單成功／失敗／返回查詢已用事件測試執行，但 native Back 與視覺結果仍待瀏覽器驗證。
    `npm run build` 僅遭遇 Geist／Geist Mono 下載錯誤：
    **BUILD BLOCKED BY KNOWN GOOGLE FONTS NETWORK LIMITATION**。依要求未追查字型。
32. **正式資料安全**：沒有為測試建立、更新或刪除正式紀錄；沒有呼叫寄信或遠端 SQL。
    測試使用替代 Repository／API 和假資料；靜態 fixture 無登入金鑰，操作連結／表單停用。
33. **變更檔案**：見下方檔案清單。`.temp` 日誌、npm cache、fixture 均被忽略，不納入 commit。
34. **範圍**：沒有新增 dependency、React Query／SWR、client result fetch、storage filter state、
    Cron、帳號刪除／停用、提醒信、通知中心、Supabase Auth 或大型重構。
35. **剩餘事項**：補 320／375px Modal 與 375px 三個管理列表、desktop 公告的瀏覽器視覺 QA；
    在安全測試環境實走桌遊與公告的列表 → 編輯 → 儲存／取消及 native Back。
    既有 DB RPC 若要遠端移除，另行確認外部腳本依賴，不屬本輪必要部署步驟。
36. **Ready to commit?** 程式碼與自動檢查已可審查；尚不能宣稱所有驗收完成。
    建議補視覺 QA 後再決定提交／上線。未自動 commit。
37. **建議 commit 分組**：
    - `fix(admin): suggest inventory numbers and retire borrowing deletion`
    - `fix(admin): preserve list context across CRUD navigation`
    - `fix(ui): contain long content and align required fields`
    - `feat(admin): show safe latest email verification metadata`
    部分檔案跨組，應用互動式 staging 分 hunk；整合測試／報告依最終分組調整。

## 變更檔案清單

以下為相對專案根目錄的路徑。

- `docs/phase3b-post-launch-report.md`
- `src/app/(admin)/admin/announcements/[id]/edit/page.tsx`
- `src/app/(admin)/admin/announcements/new/page.tsx`
- `src/app/(admin)/admin/announcements/page.tsx`
- `src/app/(admin)/admin/board-games/[id]/edit/page.tsx`
- `src/app/(admin)/admin/board-games/new/page.tsx`
- `src/app/(admin)/admin/board-games/page.tsx`
- `src/app/(admin)/admin/events/[id]/page.tsx`
- `src/app/(admin)/admin/events/page.tsx`
- `src/app/(admin)/admin/users/[id]/page.tsx`
- `src/app/(admin)/admin/users/page.tsx`
- `src/app/(public)/announcements/[id]/page.tsx`
- `src/app/(public)/board-games/[id]/page.tsx`
- `src/app/api/admin/borrowings/[id]/route.ts`
- `src/components/(admin)/admin/HeadingSection.tsx`
- `src/components/(admin)/admin/academic-years/AcademicYearActions.tsx`
- `src/components/(admin)/admin/announcements/AnnouncementEditor.tsx`
- `src/components/(admin)/admin/board-games/BoardGameForm.tsx`
- `src/components/(admin)/admin/board-games/BoardGameTable.tsx`
- `src/components/(admin)/admin/board-games/categories/CategoryCreateAction.tsx`
- `src/components/(admin)/admin/board-games/categories/CategoryRecords.tsx`
- `src/components/(admin)/admin/board-games/locations/LocationCreateAction.tsx`
- `src/components/(admin)/admin/board-games/locations/LocationRecords.tsx`
- `src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx`
- `src/components/(admin)/admin/events/AttendanceActions.tsx`
- `src/components/(admin)/admin/events/AttendanceRecords.tsx`
- `src/components/(admin)/admin/events/EventActions.tsx`
- `src/components/(admin)/admin/events/EventRecords.tsx`
- `src/components/(admin)/admin/memberships/MembershipCreateButton.tsx`
- `src/components/(admin)/admin/memberships/MembershipRecords.tsx`
- `src/components/(admin)/admin/memberships/RegisterKeyGenerateForm.tsx`
- `src/components/(admin)/admin/officers/OfficerActions.tsx`
- `src/components/(admin)/admin/officers/OfficerRecords.tsx`
- `src/components/(admin)/admin/users/AdminUserPicker.tsx`
- `src/components/(authenticated)/borrowings/BorrowingRecord.tsx`
- `src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx`
- `src/components/(authenticated)/settings/AccountSettingsForm.tsx`
- `src/components/(authenticated)/settings/PasswordSettingsForm.tsx`
- `src/components/(authenticated)/settings/ProfileSettingsForm.tsx`
- `src/components/(public)/announcements/AnnouncementRow.tsx`
- `src/components/(public)/board-games/BoardGameCard.tsx`
- `src/components/FieldInput.tsx`
- `src/components/Modal.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Field.tsx`
- `src/components/ui/Input.tsx`
- `src/repositories/board-game-borrowings.repository.ts`
- `src/repositories/board-games.repository.ts`
- `src/repositories/email-verification.repository.ts`
- `src/services/board-games/board-games.service.ts`
- `src/services/email-verification/email-verification-operations.service.ts`
- `src/services/email-verification/email-verification-status.ts`
- `src/utils/admin-return.ts`
- `src/utils/redirect.ts`
- `supabase/README.md`
- `tests/phase2a1-visual-language.test.mjs`
- `tests/phase2fa-borrowing-admin.test.mjs`
- `tests/phase2fe5-borrowing-crud.test.mjs`
- `tests/phase2fe6-events-attendance.test.mjs`
- `tests/phase2ga-dashboard-check-in.test.mjs`
- `tests/phase2hd-announcements-editorial.test.mjs`
- `tests/phase3a-admin-email-verification-operations.test.mjs`
- `tests/phase3b-admin-workflows.test.mjs`
