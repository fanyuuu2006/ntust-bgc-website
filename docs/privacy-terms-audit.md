# Phase 3F：政策與產品對照（2026-09-14）

此文件是維護稽核，不是公開政策或法律意見。產品事實、法規參考與文案判斷分開記錄。

## 修改前矩陣

| 實際行為 | 舊 Privacy | 舊 Terms | 調整 |
| --- | --- | --- | --- |
| Email verification | 缺漏 | 缺漏 | Email 狀態、雜湊、有效期、驗證要求 |
| Session cookie | 部分正確，無名稱／期限 | 帳號保管 | 必要 bgc_st、7 天、失效不等於刪除 |
| Profile | 僅姓名 Email，誤稱尚未建檔 | 姓名語意不明 | 顯示名稱與真實姓名分開，電話必填，學籍／頭像選填 |
| Membership | 缺漏 | 帳號不等於社員正確 | 學年度／類型／狀態、啟用碼、幹部歷史 |
| Borrowing | 缺漏 | 缺漏 | 申請→核准→領取借出→歸還 |
| Attendance | 缺漏 | 缺漏 | 出席狀態與時間；沒有來源欄位 |
| Brevo | 缺漏 | 不需重複 | 收件 Email、稱呼名稱、主旨／信文／驗證連結、寄件設定 |
| Supabase | 已提及 | 不需重複 | 資料庫用途保留 |
| Vercel | 缺漏 | 服務可用性 | 部署／必要系統紀錄 |
| Error logs | 過於籠統 | 不需重複 | 追蹤碼、功能類別、錯誤代碼；區分平台紀錄 |
| YouTube/Bilibili | 僅外連 | 泛稱內容權利歸社團 | 嵌入直接連線與第三方權利 |
| Turnstile | 缺漏 | 不需重複 | 註冊安全驗證、第三方裝置／網路訊號 |
| 保存／權利 | 虛構長期未使用清除，權利不完整 | 泛化停權與免責 | 不承諾自動清除，依法受理全部權利，移除無實作停權 |
| UI／metadata | 無日期，max-w-4xl | 服務條款與 Footer 使用條款不一致 | 日期、較窄閱讀欄、目錄、互連；canonical 保留 |

## 原始碼事實與查核位置

- auth.schema / users.schema：註冊 name（顯示名稱）、email、password、real_name、phone 必填；student_id/school/department/grade 可留空。avatar 為選填 URL，不是上傳服務。
- auth.service / utils/auth/password：argon2 雜湊後傳入 register RPC；Session 期限固定 7 天，last_accessed_at 節流更新不延長期限。sessions Repository 儲存 token 本身（不是 hash）；登出／撤銷刪對應 Session。clearExpiredSessions 只有定義，沒有排程呼叫，不能宣稱到期自動清資料。
- login/logout Route：bgc_st、HttpOnly、production Secure、SameSite=lax、path=/、expires=session.expires_at。搜尋 src 未見其他 application Cookie setter、localStorage/sessionStorage。
- email-verification.service/token/repository + 202609080001 SQL：DB 僅 token_hash、user_id、created_at、expires_at、consumed_at；原 token 在信件連結，效期 60 分鐘。consumed_at 同時用於使用／取代，不宣稱可區分全部原因；無自動清除排程。
- libs/email/brevo：唯一寄信實作是驗證信。payload 含寄件 Email/名稱、收件 Email、主旨、HTML/純文字；信文有 user.name 與 raw token 連結，沒有電話／學號。沒有借用提醒、marketing。
- types/database + memberships/officer services：學年度、annual/lifetime、資格狀態、joined_at、register key 關聯；key 本身存明碼及建立／認領／撤銷時間；幹部 user/title/year/created_at。會員停用是資格狀態，不是帳號 ban。
- board-games.service request/approve/checkout/return、verified-authorization：登入且 Email 已驗證可申請，桌遊 available、禁止重複未完成借用；會員資格不是申請 gate。核准不等於借出，checkout 指定 due_at。DB 保存申請／借出／歸還時間、狀態、審核者 ID。
- event-attendances Repository／eventsService：user/event/status/attended_at，present/late 計次；無 source/IP 欄。自行簽到須當學年度有效社員及開放時段，幹部可維護紀錄。
- report.ts：只序列化 allowlist context、去 query/動態 ID 的 route、method、type/code、digest、UUID；不序列化原 message/stack/body/header。伺服器 console 交平台，純 client console 未遠端收集。平台 request/security logs 不能由此 helper 推論完全不含 IP。
- RichTextRenderer/media：受限 YouTube nocookie／Bilibili player、直接 HTTPS media；iframe lazy 並不表示一定按播放才發請求。UserAvatar/BoardGameImage 使用外部 img URL；本地 SVG fallback 無第三方頭像服務。
- RegisterForm + register API + verifyTurnstile：widget 與 Siteverify 均實作；Server 傳 secret/response，未主動傳 remoteip，Browser 仍與 Cloudflare 連線。
- package.json、src 全文：未見 Sentry、Google Analytics、Axiom、Datadog 或 analytics SDK；不推論部署帳號沒有平台設定。next/font/google 的 Geist 為 build 下載後自託管，不是訪客直接 Google Fonts 請求。
- Footer：官方聯絡 ntustboardgame@gmail.com；privacy/terms 兩個 variant 路由正確。verify-email/pending 使用既有 legal Footer，無須再塞頁內連結。
- Root/public layout、Profile/Memberships/Dashboard：沿用 text-primary/secondary/muted 與藍色連結；legal 頁使用文章寬度與章節間距，不複製 Card 排版。
- 不讀取真實使用者資料、不變更 env／DB／套件；Vercel 部署依既有 README、error-support 與 USER 確認。實際儲存地區、方案、log retention、Turnstile dashboard pre-clearance 無法由 repo 證明。

## 法規參考（與產品事實分開）

查核日期 2026-09-14。全國法規資料庫最新條文可能包含未生效修文，另對照主管機關逐條施行標記及 112 年官方版本：
- [個人資料保護法](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021)
- [主管機關逐條施行狀態](https://law.pdpc.gov.tw/LawContent.aspx?id=FL010627)
- [112 年 5 月 31 日官方版本](https://ws.ndc.gov.tw/001/administrator/30/laws/4/1e71c611-d58c-4ff4-8d1e-405987f5a5e4.pdf)
- [施行細則](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050022)

本次依第 3 條權利不可預先拋棄、第 8 條告知類別／目的／期間地區對象方式及不提供影響、第 19／20 條特定目的與合法依據原則擬稿。資料權利受理仍須遵守第 10–14 條，不是社團可任意以營運需要拒絕。
114/11/11 修正的第 12 條、新第 20-1 條、第 21 條等與第 27 條刪除，官方仍標記施行日期未定；不將其當現行要求。安全採現行第 27 條與細則第 12 條的比例性措施，事故依現行第 12 條／細則第 22 條，國際傳輸依現行第 21 條。未自行承諾特定事故通知小時數，也未引用尚未生效的新通報制度。
此為政策對齊，不代表已證明所有法定組織、委外監督與申請作業均落實。

其他官方技術參考：
- [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/)：裝置／網路訊號與 provider 自身用途。
- [Turnstile pre-clearance](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/pre-clearance/)：cf_clearance 取決於額外設定，不能只由 src 宣稱所有第三方 cookie 為零。
- [Next font](https://nextjs.org/docs/app/getting-started/fonts)：build 後自託管，訪客不因 next/font 向 Google 取字型。

## 文案判斷與待人工確認

- 保存採目的必要期間，不捏造 30 天、自動刪帳號／匯出或不限期保存承諾。目的消失／期限屆滿依法處理，不能把歷史保存當作無條件例外。
- 海外服務揭露境內及服務商境外處理，未猜具體國家。正式維運應確認 Supabase region、Vercel 執行／日誌區域、Brevo 及受託處理者清單，再補充更明確的地區告知。
- 沿用正式社團信箱，需幹部確認實際收件與身分核對、法定期限受理流程；不承諾一鍵刪除或立即刪除全部歷史。
- 原 checkbox 已存在且僅 client gate、非版本化同意紀錄；改文案區分條款同意／隱私告知，不新增 checkbox，也不宣稱可取代個資告知或特定用途同意。
- 不新增 cookie banner、analytics、停權、通知或資料清理功能。不虛構賠償金額、永久資格、線上付款或第三方素材授權。
- 幹部／法律審閱：正式蒐集主體（社團與校方責任）、未成年會員情境、資料項目必要性、委外／跨境地區、歷史保存年限、權利請求／事故處理，以及現場借用規則。

## 驗收紀錄

- 新增 8 組政策／語意測試，舊頁面 RED 為 8 組失敗，改寫後聚焦 GREEN 為 8/8。
- 第一輪全測試 501/504；三項舊測試固定要求舊版面或「服務條款」標題，已同步更新為文章版面及「使用條款」，保留其他回歸斷言。
- 瀏覽器工具回傳沒有可用瀏覽器，因此未宣稱實際視覺 PASS。DOM 測試僅驗證文章結構、日期、目錄錨點、互連及長字串容納設定。
- 人工 QA：開啟 `/privacy`、`/terms`，分別以 320px、375px、平板、桌面檢查標題／信箱換行、列表縮排、目錄點擊與鍵盤焦點、頁面垂直捲動及無水平溢位；再確認註冊 checkbox、Footer 兩個政策連結。

- 最終驗證：504/504 tests PASS（原 496 + 新增 8）；lint、TypeScript、diff check PASS；production audit 0 vulnerabilities。未 commit、部署或修改資料庫。
