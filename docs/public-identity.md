# Phase 3I：公開身份邊界

## 稽核與決策（2026-09-14）

來源：database types/canonical schema、users/profile/auth/session services、Profile/Settings/Admin detail、公開路由及元件全文搜尋、privacy/terms、privacy-terms-audit 與 account-lifecycle。

目前公開公告／桌遊沒有動態作者個人資料或幹部名冊。Header 帳號選單是目前登入者自身身份；verify-email/pending 的遮罩 Email 受登入檢查保護，不是公開使用者資料。本人 Profile 顯示私人聯絡資料、社員／幹部 badges 及統計；Admin users、officers、memberships、borrowings、attendance 顯示作業所需身份。這些 authenticated/admin contract 不可推論為公開許可。

Privacy 原本概括「帳號不作為公開名冊」，本階段只將 UUID 路由、名稱、頭像的公開用途寫清楚，其他資料保持私有。Terms 提醒顯示名稱不是身分或社員資格認證。既有姓名可能包含本人自填個資；projection 不會辨識／改寫名稱內容，上線前應由維護者審閱政策與既有使用者告知安排。noindex 不是存取控制，也不能保證搜尋引擎遵守或阻止他人分享。

## 欄位可見矩陣

「本人」指既有自助頁／功能必要範圍，不表示回傳整張資料表；「幹部」亦限獲授權的既有作業。敏感秘密即使 Admin 也沒有檢視 UI。

| 欄位 | Public | Authenticated | Admin | 理由 |
| --- | --- | --- | --- | --- |
| users.id | 是 | 本人 | 是 | 穩定路由／作者參照，不是授權憑證 |
| users.name | 是 | 本人可編輯 | 可編輯 | 公開顯示名稱，不等於 real_name |
| users.avatar | 是 | 本人可編輯 | 可編輯 | 選填 URL；公開輸出限 HTTP(S) 且無帳密 |
| users.email | 否 | 本人 | 是（closed 隱藏） | 登入識別／私人聯絡 |
| users.email_verified_at | 否 | 本人 | 唯讀 | 帳號驗證狀態 |
| users.created_at / updated_at | 否 | 本人必要範圍 | 唯讀 | 公開身份不需要時間戳 |
| users.closed_at | 不輸出；僅 tombstone 映射 | 註銷後不可登入 | 唯讀 | 內部生命週期 |
| user_profiles.id / user_id | 否 | 本人關聯 | 是 | 內部關聯 |
| user_profiles.real_name / phone | 否 | 本人 | 是 | 註冊必填個資，不因必填而公開 |
| user_profiles.student_id / school / department / grade | 否 | 本人 | 是 | 選填學籍，沒有公開同意契約 |
| user_profiles.created_at / updated_at | 否 | 本人必要範圍 | 作業必要範圍 | 內部維護時間 |
| memberships.id / user_id / academic_year_id / type / status / joined_at / created_at / updated_at / membership_register_key_id | 否 | 本人資格／歷史必要範圍 | 是 | 非公開社員歷史 |
| academic_years.id / year / start_date / end_date / is_current（與個人關聯） | 否 | 本人社團脈絡 | 是 | 個人參與學年度不隨全域設定公開 |
| officer_positions.id / user_id / title / academic_year_id / created_at | 否 | 本人 | 是 | 目前無公開幹部歷史契約 |
| board_game_borrowings.id / board_game_id / user_id / status / approved_by_user_id / created_at / borrowed_at / due_at / returned_at | 否 | 本人紀錄 | 是 | 私人借用細節，公開桌遊狀態不等於借用者名單 |
| event_attendances.id / user_id / event_id / attended_at / status | 否 | 本人 | 是 | 私人參與紀錄 |
| auth_credentials.id / user_id / password_hash / created_at / updated_at | 否 | 僅 Server 認證 | 不展示 | 密碼雜湊亦非公開資料 |
| sessions.id / user_id / created_at / last_accessed_at / expires_at | 否 | 本人管理摘要 | 非一般 Admin detail | 安全操作資料 |
| sessions.token | 否 | 僅 HttpOnly cookie／Server | 不展示 | 身份憑證 |
| email_verification_tokens.id / user_id / token_hash / created_at / expires_at / consumed_at | 否 | 驗證流程必要狀態 | 僅必要時間／衍生狀態，不展示 hash | 驗證秘密與內部操作資訊 |
| membership_register_keys 所有欄位 | 否 | 認領必要範圍 | 管理作業 | 啟用碼不是公開身份 |
| announcements.author_id | 不新增展示 | 非公開身份來源 | 管理／歷史關聯 | 本輪不變更公告作者展示 |

## 資料與顯示契約

`publicIdentitiesRepository.findById` 僅 select `id,name,avatar,closed_at`，無 join、無 select(*)。`publicIdentityService.findById(unknown)` 先驗證 UUID，invalid/missing 回 null；以明列物件輸出 `PublicUserIdentity { id, name, avatar }`。即使來源有多餘欄位亦不展開。Closed 一律覆蓋 name/ avatar，不輸出時間或舊身份。未知 DB 錯誤保留既有 Error ID boundary，不當作 404。

`/profile/[id]` 放在 public route group，沒有 getCurrentUser/owner branch；自己與訪客看到同一 projection。既有 shell 仍可顯示登入者自身選單，那不是目標 Profile 資料。`/profile` 的登入／Email gate 與完整私人頁不變；加上前往本人公開頁的文字連結。

頁面只放小型身份 Card，沒有假 Reviews 區塊。`UserAvatar` 移除本來未使用的 email 型別需求，視覺／fallback 算法不變。`PublicUserLink` 是小型作者連結 primitive，只吃 public identity；供後續真實作者消費者使用，不為此新增評論功能。

metadata 採 noindex, follow、一般標題，不使用姓名或 avatar 作 OG 推廣。相對 canonical 由 Root metadataBase / siteConfigs.url / SITE_URL 解決，不硬編 domain；不新增 sitemap。React cache 僅同次 render 合併 metadata/page 查詢，不增加跨請求身份快取。

## 未來 Reviews 契約與限制

Review.user_id → publicIdentityService → PublicUserIdentity → PublicUserLink。禁止完整 User/Profile 傳進 React 再刪私人欄位。列表若需批次查詢，屆時新增同白名單批次 query，不能借用完整 users.findManyByIds。沒有 migration、visibility flags、Review/Rating/Comment table 或 API。

外部 avatar 仍會連線第三方，公開用法加 no-referrer；使用者自行放在名稱／頭像的個資不可能由欄位白名單完全消除。已經傳送給瀏覽器的舊身份無法在註銷後追溯收回；新請求使用 tombstone，無歷史頭像保留。

## QA

以 mocked fixtures 測 active/closed/invalid/missing、上游夾帶私人欄位、實際 repository select 白名單、metadata、renderer 與 avatar fallback。不修改遠端帳號或資料。人工檢查 320/375/desktop：長名稱換行、avatar、登入與未登入同一公開頁、本人公開連結、404、tombstone 與政策文案。Noindex 不等於私密頁。
