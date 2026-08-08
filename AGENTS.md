# AGENTS.md

## Project Overview

本專案為國立臺灣科技大學桌上遊戲研究社的官方網站與社員管理系統，使用 Next.js App Router 建置。

目前已存在的功能包含：

- 公開首頁、公告、桌遊、隱私權與服務條款頁面
- 註冊、登入、登出、目前使用者查詢、密碼更新
- 自訂 Session Cookie 認證，不使用 Supabase Auth
- 已登入使用者 Dashboard、個人資料頁與設定頁
- 帳號、個人資料與登入 Session 管理
- 社員資格、幹部職位、借用與簽到統計的讀取服務
- 管理端桌遊清單與單筆桌遊 CRUD API

這個專案仍屬早期開發階段。部分公開頁面目前仍偏靜態或 placeholder，管理端與其他營運功能也還在持續擴充。

## Tech Stack

| 類別 | 現況 |
| --- | --- |
| Framework | Next.js 16.2.11，App Router |
| UI | React 19.2.4、React DOM 19.2.4 |
| Language | TypeScript 5，strict: true |
| Runtime | Node.js，由 Next.js 執行 |
| Package manager | npm，使用 package-lock.json |
| Styling | Tailwind CSS 4 + src/styles/globals.css |
| CSS processing | @tailwindcss/postcss |
| State management | 以 React Context 與伺服端查詢為主，沒有額外全域 state 套件 |
| Database | PostgreSQL，透過 Supabase JS SDK 存取 |
| Auth | 自訂 Session Cookie + 資料庫 session table，不使用 Supabase Auth |
| Password hashing | argon2 |
| Validation | Zod 4 |
| Utilities | clsx、tailwind-merge、next/font/google |
| Icons / widgets | @ant-design/icons、@marsidev/react-turnstile |
| Lint | ESLint 9 + eslint-config-next |
| Formatting | 未設定 Prettier |
| Tests | 目前尚未導入測試框架 |

`next.config.ts` 目前沒有額外設定。Tailwind CSS 4 以 `@import "tailwindcss";` 搭配 `src/styles/globals.css` 的 CSS variables 與 utility class 為主，沒有 `tailwind.config.*`。

環境變數實際使用方式如下：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

其中 `SUPABASE_SERVICE_ROLE_KEY` 與 `TURNSTILE_SECRET_KEY` 只能在 server-side 使用。

## Architecture

本專案只使用 App Router，沒有 Pages Router，也沒有 Server Actions。

路由群組只用於檔案組織，不代表授權邏輯：

```text
src/app/
├── layout.tsx
├── (public)/
├── (auth)/
├── (authenticated)/
├── (admin)/
└── api/
```

目前主要路由：

```text
/                     首頁
/announcements        公告
/board-games          桌遊
/privacy              隱私權
/terms                服務條款
/login                登入
/register             註冊
/dashboard            使用者 Dashboard
/profile              個人資料
/settings             帳號與個人設定
/admin                管理端首頁
/admin/board-games    管理端桌遊管理
```

目前沒有：

- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `middleware.ts`
- Pages Router
- Server Actions

Layout 階層目前是：

```text
RootLayout
  ├── getCurrentUser()
  ├── UserProvider
  └── children

(public)/layout
  └── 公開頁面 shell

(auth)/layout
  ├── getCurrentUser()
  ├── 已登入時 redirect("/dashboard")
  └── WebsiteShell

(authenticated)/layout
  ├── getCurrentUser()
  ├── 未登入時 redirect("/login")
  └── WebsiteShell

(admin)/layout
  ├── getCurrentUser()
  ├── isAdminByUserId(user.id)
  ├── 未登入時 redirect("/login")
  ├── 非管理者時 redirect("/")
  └── AdminShell
```

Root layout 會直接載入全域字型與使用者狀態：

```tsx
const user = await getCurrentUser();

return (
  <html lang="zh-Hant">
    <body>
      <UserProvider user={user}>{children}</UserProvider>
    </body>
  </html>
);
```

## Folder Structure

```text
src/
├── app/                 路由、layout、Route Handlers
│   ├── (admin)/         管理端頁面與 layout
│   ├── (auth)/          登入與註冊頁面
│   ├── (authenticated)/ 已登入頁面
│   ├── (public)/        公開頁面
│   └── api/             HTTP API Route Handlers
├── components/          UI 元件
│   ├── (admin)/         管理端元件
│   ├── (auth)/          認證元件
│   ├── (authenticated)/ 已登入功能元件
│   ├── Header/          全站 Header 相關元件
│   ├── Pagination/      分頁元件
│   └── layouts/         站台 shell 元件
├── contexts/            Client-side React Context
├── hooks/               React hooks
├── libs/                設定、SDK 初始化、API client、auth helper
│   ├── api/             apiClient 與 API error
│   ├── security/        Turnstile 驗證
│   ├── supabase/        Server Supabase client
│   └── zod/             Zod helper
├── repositories/        Supabase query 與 CRUD
├── services/            驗證、商業規則與跨 repository 編排
├── styles/              全域 CSS、design tokens
├── types/               共用 database/domain type
└── utils/               純函式工具
```

資料夾責任分工：

| 位置 | 責任 |
| --- | --- |
| `app/` | 路由、HTTP 邊界、layout、redirect |
| `components/` | UI、互動、視覺組裝 |
| `contexts/` | Client-side shared state |
| `hooks/` | 可重用 React hook |
| `libs/` | 設定、API client、auth helper、SDK 初始化 |
| `repositories/` | Supabase query、pagination、database error 處理 |
| `services/` | Zod validation、商業規則、授權編排 |
| `types/` | 資料庫 entity 與共用 domain type |
| `utils/` | 不依賴 React 的純工具函式 |

## Coding Guidelines

1. 優先做最小、聚焦的修改，不順手重構無關程式。
2. 優先沿用既有資料流：Route Handler / Server Component → Service → Repository → Supabase。
3. 預設使用 Server Component，只有互動需求才改成 Client Component。
4. 使用 `@/` path alias，避免深層相對路徑。
5. 純型別匯入使用 `import type`。
6. 不新增 dependency，除非現有套件無法合理完成需求。
7. 使用繁體中文撰寫使用者可見文案。
8. 既有檔案若已使用 `.ts` 或 `.tsx`，修改時保留原本副檔名與風格。
9. 不做全域格式化或大範圍 rename。

## Component Guidelines

元件目前以功能與情境分組，而不是用過度抽象的基底元件。

常見分層：

- Layout components：`components/layouts/*`
- Feature components：`components/(auth)/*`、`components/(authenticated)/*`、`components/(admin)/*`
- Shared components：`FieldInput`、`FormFeedback`、`UserAvatar`、`Pagination/*`

現有元件命名以 PascalCase 為主，例如：

```tsx
export function ProfileHeroSection() {}
export const Header = () => {};
```

Props 設計習慣：

- 外部 UI 元件通常延伸原生 HTML attributes，並支援 `className`
- 內部專用元件只接收真正需要的 props，不為未使用的擴充性加入泛用 props
- `React.HTMLAttributes<...>`、`React.ButtonHTMLAttributes<...>`、`React.ImgHTMLAttributes<...>` 很常見

常見 class 合併方式是透過 `cn()`：

```tsx
className={cn(
  "rounded-2xl border border-(--border)",
  {"bg-(--secondary-background)": isActive}, 
  className,
)}
```

目前沒有採用 compound component pattern，也不應為了抽象而引入 `UniversalCard`、`BaseSection` 這類泛用包裝。

## Server / Client Component Rules

預設為 Server Component。只有在需要下列能力時才使用 `"use client"`：

- `useState`、`useEffect`、`useId`
- 表單輸入與 loading state
- `useRouter()`、`usePathname()`
- click outside、Escape、dropdown、mobile menu
- Client-side mutation
- React Context provider / consumer

目前明確的 Client Components 包含：

- `contexts/UserContext.tsx`
- `components/FieldInput.tsx`
- `components/Header/*` 中的互動導覽元件
- `components/layouts/AdminShell.tsx`
- `components/(auth)/*` 的登入、註冊表單
- `components/(authenticated)/settings/*` 的設定表單與 Session 清單
- `components/Pagination/*` 的可互動分頁元件
- `components/LogoutButton.tsx`
- `hooks/useOutsideDismiss.tsx`

不可：

- 在 Client Component import `server-only` 模組
- 在 Client Component 使用 Supabase service role client
- 在 Client Component 讀取 server env
- 只因為檔案有 JSX 就加上 `"use client"`

使用者資料流為：

```text
Root Server Layout
  ↓ getCurrentUser()
UserProvider
  ↓
Client Component
  ↓ useUser()
```

## Data Fetching Rules

Server Component 可以直接呼叫 service，避免不必要的中介層：

```tsx
const user = await getCurrentUser();

if (!user) return null;

const profile = await usersService.getProfile(user.id);
```

多個彼此獨立的查詢要平行執行：

```tsx
const [profile, memberships, officerPositions] = await Promise.all([
  usersService.getProfile(user.id),
  membershipsService.getUserMemberships(user.id),
  officerPositionsService.getUserOfficerPositions(user.id),
]);
```

Client mutation 一律走 Route Handler，再透過 `apiClient()` 呼叫：

```tsx
await apiClient("/api/users/me/profile", {
  method: "PATCH",
  body: values,
});
```

`apiClient()` 會：

- 自動 `JSON.stringify` request body
- 預設設定 `Content-Type: application/json`
- 在非成功 response 時拋出 `ApiError`
- 提供 `status` 與欄位錯誤 `errors`

## Repository / Service Rules

實際資料流如下：

```text
Component
↓
Route Handler / Server Component
↓
Service
↓
Repository
↓
Supabase server client
↓
PostgreSQL
```

Repository 規則：

- 只處理 Supabase query、pagination、search、資料庫 error
- 檔案開頭必須加入 `import "server-only";`
- 透過 `throwRepositoryError()` 統一包裝 repository error
- 單筆可能不存在時使用 `maybeSingle()`
- list query 要限制 page 與 pageSize
- repository export 以 object literal 為主

Repository 常見 pattern：

```tsx
export const usersRepository = {
  findById: async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throwRepositoryError("依 ID 尋找用戶失敗", error);
    return data;
  },
};
```

Service 規則：

- 負責 Zod validation、domain error、跨 repository 協作
- 外部輸入先以 `unknown` 接收，再由 schema parse
- 複數獨立 query 使用 `Promise.all`
- 不要在 Component 或 Route Handler 直接寫 Supabase query
- service 層處理可預期的商業規則與授權邏輯

Auth 目前有一些重要的實作習慣：

- 註冊透過 `register_user` RPC
- 登入使用 timing-safe dummy hash，比對帳號不存在與密碼錯誤的時間差
- Session token 由 server 建立與管理
- `last_accessed_at` 只會在必要時非同步更新，避免每次驗證都寫入資料庫

## TypeScript Rules

`tsconfig.json` 的核心設定是：

- `strict: true`
- `noEmit: true`
- `moduleResolution: "bundler"`
- `paths: { "@/*": ["./src/*"] }`

型別定義目前集中在：

- `src/types/database.tsx`
- 各 service 的 `.types.ts` / `.types.tsx`
- 各 schema 對應的推論型別

型別慣例：

- 狀態優先使用 string union，不使用 `enum`
- 常見工具型別包括 `Pick`、`Partial`、`Omit`
- 表單 input 常使用 `z.infer<typeof schema>`
- 不用 `any` 逃避 type error

常見 pattern：

```tsx
type CreateUserInput = Pick<User, "email" | "name">;
type UpdateUserInput = Partial<Pick<User, "name" | "avatar">>;
```

## Styling Rules

視覺系統集中於 `src/styles/globals.css`，並以 Tailwind CSS 4 的 utility class 搭配 CSS variables 實作，不使用 `tailwind.config.*`。

目前的 design token 主要包含：

- `--foreground`
- `--muted`
- `--background`
- `--primary-background`
- `--secondary-background`
- `--tertiary-background`
- `--primary`
- `--primary-light`
- `--primary-dark`
- `--secondary`
- `--tertiary`
- `--game-red`
- `--game-green`
- `--game-yellow`
- `--game-blue`
- `--border`
- `--shadow-base`
- `--shadow-card`
- `--shadow-hover`

常用 utility 類別包括：

- `.container`
- `.card`
- `.btn`
- `.btn.primary`
- `.btn.secondary`
- `.btn.outline`
- `.btn.green`
- `.btn.yellow`
- `.btn.red`
- `.btn.danger`
- `.skeleton`
- `.skeleton-line`

UI 修改時要遵守：

- mobile-first
- 以現有 CSS variables 與 utility class 為主
- 優先使用 `cn()` 合併 class
- 不新增 dark mode 假設，也不要加入 `dark:` class
- 動畫以 CSS transition / keyframe 為主，不要引入額外動畫套件

`globals.css` 也定義了按鈕、卡片、容器與陰影的基礎行為，因此新 UI 應優先沿用這些既有樣式，而不是重造一套新的視覺語言。

## Naming Convention

Files:

- React component 使用 PascalCase，例如 `UserCard.tsx`
- repository 使用 `*.repository.ts` 或 `*.repository.tsx`
- service 使用 `*.service.ts` 或 `*.service.tsx`
- schema 使用 `*.schema.ts` 或 `*.schema.tsx`
- error 使用 `*.errors.ts` 或 `*.errors.tsx`
- hook 使用 `use*.ts` 或 `use*.tsx`
- route folder 使用 kebab-case，例如 `board-games/`

Variables:

- 一般變數使用 `camelCase`
- component、type、class 使用 `PascalCase`
- 常數使用 `UPPER_SNAKE_CASE`
- database 欄位維持 `snake_case`

Functions:

- 使用動詞開頭的明確命名，例如 `getCurrentUser()`、`findById()`、`create()`、`updateById()`、`deleteById()`、`handleSubmit()`

## Error Handling

Repository error 使用統一包裝：

```tsx
export function throwRepositoryError(context: string, error: unknown): never {
  console.error(`[Repository] ${context}:`, error);
  throw new RepositoryError(context, error);
}
```

Service 使用 domain error 表達可預期的商業錯誤，例如：

- `InvalidCredentialsError`
- `InvalidCurrentPasswordError`
- `EmailAlreadyExistsError`
- `UserProfileNotFoundError`
- `UserProfileAlreadyExistsError`
- `SessionNotFoundError`
- `CannotRevokeCurrentSessionError`

Route Handler 負責 HTTP status、可讀訊息與錯誤格式：

```tsx
try {
  const profile = await usersService.updateProfile(user.id, body);
  return NextResponse.json({ data: profile }, { status: 200 });
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
      { status: 400 },
    );
  }

  if (error instanceof UserProfileNotFoundError) {
    return NextResponse.json({ message: "找不到個人資料" }, { status: 404 });
  }

  console.error("[PATCH /api/users/me/profile]", error);
  return NextResponse.json(
    { message: "更新個人資料失敗，請稍後再試" },
    { status: 500 },
  );
}
```

API response contract：

成功：

```json
{
  "data": {}
}
```

失敗：

```json
{
  "message": "使用者可理解的錯誤訊息",
  "errors": {}
}
```

不可將 SQL error、Supabase error、stack trace 或 repository context 回傳給 client。

## Security Rules

絕對禁止：

- 將 `SUPABASE_SERVICE_ROLE_KEY` 暴露到 client 或 `NEXT_PUBLIC_*`
- 在 Client Component import `server-only` repository 或 Supabase server client
- 信任 client 傳入的 `user_id`、`author_id`、社員資格或幹部資格
- 只依 route group 或 URL 判斷授權
- 直接從 component 存取 Supabase
- 繞過 Service 層 validation
- 回傳未發布公告給公開訪客
- 將使用者提供的資料直接寫入權限欄位
- 修改 timing-safe 登入驗證邏輯

Session 安全規則：

```tsx
response.cookies.set({
  name: SESSION_COOKIE_NAME,
  value: session.token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  expires: new Date(session.expires_at),
});
```

登入時，即使帳號不存在，也必須維持 dummy password hash verify，避免帳號枚舉的 timing side channel。

所有使用者 mutation 必須從 server-side session 取得身份：

```tsx
const user = await getCurrentUser();

if (!user) {
  return NextResponse.json({ message: "請先登入" }, { status: 401 });
}
```

涉及社員或幹部授權時，必須從資料庫確認目前學年度，不可 hardcode 學年度 ID 或只靠 URL 判斷。

## Testing Rules

目前沒有測試框架與 `test` script。修改程式後至少執行：

```bash
npm run lint
npx tsc --noEmit
git diff --check
```

重大路由、架構或 build 設定變更後，再執行：

```bash
npm run build
```

若未來新增測試，優先測試：

- Service 層 validation 與商業規則
- Session、社員資格與授權判斷
- Route Handler 的 status code 與 response contract

## Git Workflow

- 一個 commit 聚焦一個 feature 或 bug fix
- 不混合 dependency 更新、無關格式化與功能修改
- 修改完成前檢查 `git diff` 與 `git status --short`
- `.env*` 不可 commit
- 不執行破壞性指令，例如 `git reset --hard` 或 `git checkout --`，除非使用者明確要求
- 只有使用者明確要求時才建立 commit

## AI Agent Rules

## Before modifying code

AI 必須：

1. 先理解現有架構，從最接近需求的 route、component、service 或 repository 讀起
2. 不隨意新增 dependency
3. 優先沿用現有 pattern 與資料流
4. 不修改無關檔案

## When creating components

AI 必須：

- 遵守現有 component structure
- 避免過度抽象
- 保持 component single responsibility
- 需要互動才使用 `"use client"`
- Props 若對外暴露，優先延伸原生 HTML attributes 並支援 `className`

## When modifying database

AI 必須：

- 不直接修改 production schema
- 先確認 migration strategy 與影響範圍
- 保持 backward compatibility
- 變更資料欄位時同步更新 `src/types/database.tsx` 與相關 service/repository/type

## When modifying API

AI 必須：

- 保持 API contract，成功回傳 `{ data }`
- 失敗回傳 `{ message, errors? }`
- 更新相關 types、schemas 與 client 端處理
- 處理 auth、validation、domain error 與未知 error
- 不回傳內部錯誤細節

## Working rules

- 優先驗證再擴大修改
- 不順手重構無關模組
- 不要為了統一而大量改副檔名
- 不要把 server-only 邏輯搬到 client
- 不要把權限判斷交給前端
