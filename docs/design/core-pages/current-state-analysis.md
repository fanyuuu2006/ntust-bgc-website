# Current State Analysis

## 產品與路由

目前使用 Next.js App Router、Server Components 與自訂 Session Cookie。公開頁面共用 `src/components/layouts/WebsiteShell.tsx`；登入頁面受 `src/app/(authenticated)/layout.tsx` 保護；管理端受 `src/app/(admin)/layout.tsx` 的登入與 `isAdminByUserId` 驗證保護。Root layout 提供 Theme、Toast 與網站設定 Metadata。

核心路由：

| 入口 | 路由 | 現況 |
|---|---|---|
| 首頁 | `/` | Server 讀取 Site Settings，顯示 Hero、最新公告、熱門桌遊 |
| 會員入口 | `/dashboard` | 會員資格、可簽到活動、借用摘要、公告 |
| 管理入口 | `/admin` | 借用流程統計、逾期提醒、桌遊總數 |
| 活動 | `/schedule`, `/admin/events` | Public／Admin 共用 Calendar；活動生命週期已實作 |
| 排行榜 | `/rankings/*` | 桌遊、評論、貢獻者排行與分頁 |
| 設定 | `/admin/site-settings/*` | Site Settings Provider、圖片上傳、預覽、PATCH |

## 現有功能盤點

| 功能 | 角色 | 適合入口呈現 |
|---|---|---|
| 公告 | 訪客／會員／管理員 | 首頁摘要、Dashboard 待讀、Admin 快捷入口 |
| 活動與簽到 | 全部；簽到需登入且具資格 | 首頁近期活動摘要、Dashboard 待簽到、Admin 待處理 |
| 桌遊瀏覽與排行 | 訪客／會員 | 首頁探索入口、Dashboard 快捷入口 |
| 借還 | 會員／管理員 | Dashboard 個人待辦、Admin 流程佇列 |
| 會員資格 | 會員／管理員 | Dashboard 狀態卡、Admin 管理入口 |
| 評論與按讚 | 會員／管理員 | 首頁排行入口、Dashboard 最近紀錄、Admin 審核 |
| Site Settings／Media | 管理員 | 不在公開首頁直接暴露管理操作 |

狀態判斷：功能大多已存在，三個核心頁面的主要缺口是「入口優先順序」與「動態功能整合」；不應另建第二套資料模型。Dashboard 的查詢已平行取得學年度、借用與公告，但會員資格後續仍會觸發查詢；未來可在不改契約下改善平行化。Admin Overview 目前只聚焦借用，未呈現活動、會員、公告與系統設定待辦。

## 主要 UX 問題

1. 首頁只有公告與熱門桌遊，沒有將 `/schedule`、排行、加入社團等下一步形成清楚優先路徑。
2. Dashboard 能顯示簽到與借用，但沒有統一的「需要我處理」摘要，空資料狀態容易變成多張低資訊卡片。
3. Admin Overview 只顯示桌遊借用統計；活動發布／取消、會員資格、公告與 Site Settings 仍需從側欄逐層尋找。
4. 三個頁面已有 `PageHeader`、`Card`、`DashboardSectionHeader`、Button、Loading 與 Error wrapper，可重用；不宜再建立泛用 Dashboard framework。

## 設計事實與限制

- Site Settings 的公開資料來自 `getPublicSiteSettings()` 與 `resolveSitePresentation()`，不可在 UI 硬編碼品牌文字。
- 互動導覽由 Header、MobileNavigation、AdminShell 管理；需維持 SSR／Client 邊界。
- Public data 應透過現有 service／repository；新增首頁動態區塊前先確認查詢數量與 cache。
- RBAC 目前以登入、Email 驗證與 `isAdminByUserId` 為主；本規劃不新增角色。
- 本文件中的新增區塊是建議，尚未代表既有 API 或已確認產品決策。
