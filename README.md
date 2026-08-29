# NTUST Board Game Club Website

國立臺灣科技大學桌上遊戲研究社的官方網站、社員服務平台與幹部管理後台。
使用 Next.js App Router、TypeScript、Tailwind CSS 與 Supabase PostgreSQL。

## 開發

    npm install
    npm run dev

常用檢查：

    npm run lint
    npx tsc --noEmit
    git diff --check

## Admin 架構

/admin/** 由 (admin)/layout.tsx 在 server-side 驗證登入與管理權限。
產品規則維持「曾任幹部即具 Admin 權限」；User 是註冊帳號，Membership 是社員資格。

### Canonical routes

    /admin
    /admin/users
    /admin/users/[id]
    /admin/memberships
    /admin/memberships/register-keys
    /admin/academic-years
    /admin/officers
    /admin/board-games
    /admin/board-games/new
    /admin/board-games/[id]/edit
    /admin/board-games/categories
    /admin/board-games/locations
    /admin/board-games/borrowings
    /admin/events
    /admin/events/[id]
    /admin/announcements
    /admin/announcements/new
    /admin/announcements/[id]/edit

### Page 與資料責任

- List page：Server Component 解析 URL query，透過 Service → Repository 讀取資料，
  並組裝 header、toolbar、records 與 pagination。
- Feature-local component：負責該 domain 的 table、mobile cards、row actions、
  dialog 與 client mutation；不直接存取 Supabase。
- Route Handler：提供 client mutation 的 HTTP 邊界，維持既有驗證、授權與 API contract。

共享且穩定的 UI primitives 包含 HeadingSection、AdminToolbar、
AdminListSection、SortableTableHeader、Pagination、Modal、ConfirmDialog 與 ui controls。
桌遊的 QuickStats、多值篩選與圖片呈現屬於桌遊 domain，不是其他管理頁的通用模板。

### URL query 規則

列表頁以 URL 為唯一 query state：

    URL searchParams → Server Page → Service → Repository

search、filter、sort、page 與 pageSize 必須可在重新整理及瀏覽器上一頁／下一頁後還原。
空 query 值不應留在 URL；搜尋清除只移除 search 與 page，保留其他有效篩選與 pageSize。

### Responsive grammar

- Header：mobile 垂直排列 title、description、CTA；桌面 CTA 靠右。
- Toolbar：mobile 優先保留可操作的搜尋列，filters 自然換行；desktop 使用
  search 主欄、固定較窄的單值 select、auto-width submit。
- Results：高密度 users、board-games、borrowings 在 lg 切換 table/cards；
  較簡單的 officers、events、announcements、活動簽到在 md 切換。
- Mobile records：identity 優先，其次 status、metadata、actions；文字容器可縮，
  badge 與固定 action 不壓縮。
- Pagination、form footer 與 toolbar 必須可自然換行，不以 mobile horizontal
  scroll 作為主要操作方式。

## 資料庫

資料庫 schema snapshot、legacy migrations 與驗證 SQL 位於 supabase/README.md。
不要將 production data、密碼、session、service-role key 或其他 secrets 放進 repository。
