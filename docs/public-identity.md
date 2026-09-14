# 公開身份與 Profile 摘要邊界

## Phase 3I-2 公開契約

USER 明確授權未註銷帳號公開名稱、頭像、社員／幹部身份 badges、累積借用次數、本學年簽到次數與加入社團學年度。這取代 Phase 3I-1 僅職稱／學年度的契約；不代表公開原始社員、借用或簽到紀錄。Privacy／Terms／Settings 同步告知，未新增同意 checkbox 或 visibility settings。

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
| memberships 原始欄位：id / user_id / academic_year_id / type / status / joined_at / created_at / updated_at / membership_register_key_id | 否 | 本人資格／歷史必要範圍 | 是 | 只衍生公開社員 badge／加入學年度 |
| academic_years.id / start_date / end_date / is_current | 否 | 本人社團脈絡 | 是 | 內部計算與排序 |
| 社員／幹部 badge 的學年度 label、加入學年度 | 是（未註銷） | 本人 | 是 | 公開摘要 |
| officer_positions.title / academic_years.year | 是（未註銷帳號） | 本人 | 是 | Phase 3I-1 明確公開契約 |
| officer_positions.id / user_id / academic_year_id / created_at | 否 | 本人 | 是 | 僅內部關聯／管理欄位 |
| board_game_borrowings.id / board_game_id / user_id / status / approved_by_user_id / created_at / borrowed_at / due_at / returned_at | 否 | 本人紀錄 | 是 | 私人借用細節，公開桌遊狀態不等於借用者名單 |
| event_attendances.id / user_id / event_id / attended_at / status | 否 | 本人 | 是 | 私人參與紀錄 |
| auth_credentials.id / user_id / password_hash / created_at / updated_at | 否 | 僅 Server 認證 | 不展示 | 密碼雜湊亦非公開資料 |
| sessions.id / user_id / created_at / last_accessed_at / expires_at | 否 | 本人管理摘要 | 非一般 Admin detail | 安全操作資料 |
| sessions.token | 否 | 僅 HttpOnly cookie／Server | 不展示 | 身份憑證 |
| email_verification_tokens.id / user_id / token_hash / created_at / expires_at / consumed_at | 否 | 驗證流程必要狀態 | 僅必要時間／衍生狀態，不展示 hash | 驗證秘密與內部操作資訊 |
| membership_register_keys 所有欄位 | 否 | 認領必要範圍 | 管理作業 | 啟用碼不是公開身份 |
| announcements.author_id | 不新增展示 | 非公開身份來源 | 管理／歷史關聯 | 本輪不變更公告作者展示 |
| 累積借用次數、本學年簽到次數 | 是（未註銷） | 本人 | 是 | 僅 aggregate，不公開桌遊／活動／日期明細 |

## Server 邊界

PublicUserIdentity 固定 id/name/avatar。PublicProfile 另有 identityBadges（label/category）與 clubFootprint（totalBorrowedCount/attendedCount/joinedAcademicYear）。closed_at 只在 Repository／Service 判斷；註銷者回傳固定名稱、avatar=null、空 badges、clubFootprint=null，直接停止摘要查詢。invalid UUID／不存在為 404，其他資料庫錯誤仍走 Error ID。

公開專用 Repository 分頁 narrow select：社員僅 id/status/academic_year_id 與學年度 year/start_date；幹部僅 id/title 與學年度 year/start_date。內部 IDs 只用於 canonical badge 計算，時間只用於排序，都不輸出 DTO；不讀取 Profile、聯絡／學籍、Session 或驗證秘密。公開 badge 不輸出 row id，UI 使用本次展示的序號作 React key。

## 與私人頁相同的定義

- 借用：直接重用 boardGamesService.getTotalBorrowedCount；count borrowed/returned 紀錄，非 distinct 桌遊，不計 pending/approved。底層 HEAD count 不回傳明細。
- 簽到：直接重用 eventsService.getAttendedCountByCurrentAcademicYear；目前學年度起訖內的活動，present/late 紀錄，沒有目前學年度為 0。底層 HEAD count 不回傳明細。
- 社員 badge：active/expired 資格；目前學年度 active 優先，其餘依學年度 start_date 由新到舊，同年度幹部先於社員，維持 canonical stable ordering。非社員 badge 是排除性標籤，本輪不公開。
- 加入：active/expired 資格中學年度 start_date 最早者的 year，非帳號註冊日或 joined_at。

共用 libs/profile-presentation 純函式；私人服務仍讀原有資料，公開服務只使用窄查詢，不把私人 loader 結果轉交頁面。

## Canonical UI

兩頁直接使用 ProfileHeroSection／ProfileIdentityBadges／ProfileClubFootprint。Hero 只要求 id/name/avatar 與 badges，details/actions slots 由私人頁自行提供真實姓名、Email、操作按鈕；公開頁不傳私人資料。Footprint title 預設「我的社團足跡」，公開傳「社團足跡」。+N、折疊與顏色沿用 canonical badge。移除 PublicProfileContent／年度職務卡，不保留平行 UI。

私人 Hero 與足跡已以 fixture 比對抽取前後 HTML 相同。兩頁同一 container 與響應式 grammar；全域 container 的 important max-width 規則未變。公開空統計使用同款 0 次與「尚無社員紀錄」；註銷者完全不呈現足跡。未來真實 Reviews 可自然接在足跡後，目前無假評論區塊。

## SEO 與限制

noindex/follow、相對 canonical 由 metadataBase/SITE_URL 解決；不把統計或私人資料放入 metadata。React cache 僅同次 render。網站 shell 的目前登入者選單不是被查詢者的公開資料。noindex 不是存取控制，外部頭像會連線第三方；名稱／職稱中自行填入的個資無法靠欄位白名單自動辨識。

沒有 migration、公開明細 API、Reviews／Comments 或額外依賴；未操作真實使用者資料。
