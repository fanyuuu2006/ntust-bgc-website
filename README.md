# NTUST Board Game Club Website

國立臺灣科技大學桌上遊戲研究社的官方網站、社員服務平台與幹部管理後台。
使用 Next.js App Router、TypeScript、Tailwind CSS 與 Supabase PostgreSQL。

## 本機開發環境設定

Windows PowerShell 初次設定：

```powershell
git clone https://github.com/fanyuuu2006/ntust-bgc-website.git
cd ntust-bgc-website

npm ci
Copy-Item .env.example .env.local
npm run dev
```

接著開啟 <http://localhost:3000>。若資料庫設定完整，也可以用
<http://localhost:3000/api/health> 檢查 application 與 database 狀態。

如果 `.env.local` 已經存在，不要用 `Copy-Item` 覆寫。請分別開啟 `.env.example` 與
`.env.local`，只補上缺少的「變數名稱」，並向維護者索取目前工作真正需要的值。

### 環境變數

`.env.example` 是可以提交到 Git 的安全範本；`.env.local` 則保存每位開發者自己的真實設定，
不可提交。表格中的「依工作需要」代表一般公開頁面不一定需要該憑證，但相關功能會需要。

| 變數 | 本機需求 | Secret | 用途 |
| --- | --- | --- | --- |
| `SITE_URL` | 建議保留範本值 | 否 | 網站 canonical origin；本機使用 `http://localhost:3000` |
| `SUPABASE_URL` | 使用資料庫時需要 | 否 | Server 使用的 Supabase project origin |
| `NEXT_PUBLIC_SUPABASE_URL` | 使用 RichEditor 圖片時需要 | 否（公開） | Browser 驗證 Rich Content 圖片來源；須與 `SUPABASE_URL` 同 origin |
| `SUPABASE_SECRET_KEY` | 使用資料庫時需要 | 是 | Server repositories 存取 Supabase；不可放入 client |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 測試註冊時需要 | 否（公開） | Browser 顯示 Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | 測試註冊時需要 | 是 | Server 驗證 Turnstile token |
| `BREVO_API_KEY` | 測試寄信時需要 | 是 | Brevo transactional email API |
| `EMAIL_FROM` | 測試寄信時需要 | 否 | Brevo 已驗證的寄件地址 |
| `EMAIL_FROM_NAME` | 測試寄信時需要 | 否 | 寄件者顯示名稱 |
| `REGISTER_KEY_SECRET` | 測試產生社員註冊碼時需要 | 是 | Server 產生註冊碼；至少 16 字元 |
| `SUPPORT_MANAGER_USER_ID` | 管理支持紀錄時需要 | 否（server-only） | 唯一可管理私人 SupportRecord 的 open、已驗證 User UUID |
| `SUPPORT_PAYMENT_URL` | 開放外部支持時需要 | 否（server-only） | 第三方 hosted payment page 的 HTTPS URL；留空時 CTA 維持準備中 |

`SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_URL` 在一般開發環境應指向同一個 Supabase
project origin。`NEXT_PUBLIC_*` 會被打包到瀏覽器，因此只能放公開設定；
`SUPABASE_SECRET_KEY` 絕對不可改名成 `NEXT_PUBLIC_SUPABASE_SECRET_KEY` 或以其他方式傳到 client。

Supabase CLI 與本機 schema replay 使用 `supabase/config.toml`、本機容器及 CLI
link metadata，不讀取 application `.env.local` 的 `DATABASE_URL` 或 legacy
`SUPABASE_SERVICE_ROLE_KEY`。需要直接資料庫維護憑證的特殊工作由維護者另行提供，
不屬於一般協作者環境變數 contract。

Brevo 設定採延遲讀取：瀏覽首頁或進行不寄信的開發工作不需要 Production Brevo API key；
只有實際寄送／重寄驗證信的流程才需要三項 email 設定。請向維護者索取開發用途設定，
不要要求或共用 Production key。

`SITE_URL` 是 canonical production origin 的唯一 deployment 設定來源。Production 必須設定
完整 HTTP/HTTPS origin，且不可包含 path、query 或 hash；development 與 test 未設定時使用
`http://localhost:3000`。Vercel Preview 不會自動使用 `VERCEL_URL` 作為 canonical origin。

### 支持款項人工核對

1. 在第三方 payment provider dashboard 確認交易成功並取得 transaction/reference。
2. 進入 `/support/manage` 建立私人支持紀錄。
3. 另外取得公開暱稱的明確同意，再記錄 display name 與 consent method 並發布。
4. 支持者要求取消公開時使用 withdraw；付款已退款時標記 refunded。

Payment does not imply consent to public acknowledgement. 未取得明確同意時不得公開支持者名稱。

### 協作者安全提醒

- GitHub 帳號、密碼、Personal Access Token 與 SSH private key 都屬於個人，不要互相分享。
- Server secrets 只在負責的功能確實需要時向維護者索取。
- 不要把 `.env.local`、secret、token 或 private key 貼到 Issue、PR、commit、截圖或公開聊天。
- Agent 若回報缺少設定，只傳「環境變數名稱」給維護者，不要傳既有值或整份 `.env.local`。

常用檢查：

```powershell
npm run lint
npx tsc --noEmit
git diff --check
```

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

## 權利與授權現況

本 repository 公開供檢視與協作，但目前未採用一般開放原始碼授權。公開可見不表示概括授予重製、修改、散布或商業利用 source code 的權利；相關權利仍依實際作者、既有約定與適用法律判斷。

社團名稱、標誌、公告、活動內容、照片及其他社團素材，不因出現在公開 repository 而自動納入 source code 的授權範圍。Reviews、個人資料及其他使用者提交內容亦保留各自的權利與適用規則；dependencies、icons、嵌入媒體及外部素材則依各自的 license 或服務條款使用。

詳細的 attribution、內容邊界與待確認事項請見 [NOTICE.md](NOTICE.md) 及 [ownership and licensing 說明](docs/ownership-and-licensing.md)。提交 issue 或 pull request 前請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。
