# NTUST Board Game Club Website

本文件依據 repository 現有程式碼、設定檔與開發慣例撰寫，供 AI Coding Agent 與開發者修改此專案時遵循。

---

## Project Overview

本專案為**國立臺灣科技大學桌上遊戲研究社**官方網站與內部管理系統，目前處於早期建置階段。

### 目前實作範圍

**公開網站（部分為 placeholder）：**

- 首頁 `/`
- 公告 `/announcements`
- 桌遊 `/board-games`
- 幹部 `/officers`

**認證流程（已實作）：**

- 註冊 `/register`
- 登入 `/login`
- Session Cookie 登入狀態
- API：`/api/auth/register`、`/api/auth/login`、`/api/auth/logout`、`/api/auth/me`

**已登入使用者：**

- Dashboard `/dashboard`（placeholder）
- `(authenticated)` layout 會 redirect 未登入使用者至 `/login`

### 規劃中（README 已定義，尚未實作）

- 公開：`/events`、各資源 `[id]` 詳情頁
- 使用者：`/dashboard/profile`、`/dashboard/borrowings`、`/dashboard/attendance`
- 管理：`/admin/*`（桌遊、社員、活動、簽到、幹部、公告）
- `not-found.tsx`、`error.tsx`、`loading.tsx`、`middleware.ts`、`sitemap.ts`、`robots.ts`

### 權限模型（資料模型已定義，授權邏輯多數尚未實作）

| 狀態 | 說明 |
| --- | --- |
| 未登入 | 可瀏覽公開頁面、註冊 |
| 已登入非社員 | 可查看個人相關功能（規劃中） |
| 現任社員 | 可借用桌遊、社課簽到（規劃中） |
| 現任幹部 | 可執行管理操作（規劃中） |

社員與幹部身分必須由資料庫判定，不可信任 client 傳入的 role 或 membership 資訊。

---

## Tech Stack

依 `package.json` 與現有程式碼：

| 項目 | 版本 / 技術 |
| --- | --- |
| Runtime | Node.js（Next.js 內建） |
| Framework | Next.js **16.2.11** App Router |
| UI | React **19.2.4** |
| Language | TypeScript **5.x**，`strict: true` |
| Styling | Tailwind CSS **4**（`@tailwindcss/postcss`）+ `src/styles/globals.css` design tokens |
| Database | PostgreSQL via **Supabase JS SDK**（server-only service role） |
| Auth | **自訂 Session 認證**（`sessions` + `auth_credentials` + **argon2**），**非 Supabase Auth** |
| Validation | **Zod 4**（目前用於 auth schema） |
| Icons | `@ant-design/icons` |
| Class merge | `clsx` + `tailwind-merge` → `cn()` |
| Fonts | `next/font/google`（Geist Sans / Geist Mono） |
| Lint | ESLint 9 + `eslint-config-next` |
| Package manager | npm（`package-lock.json`） |

### 目前未使用

- Supabase Auth
- Server Actions（尚未出現 `"use server"`）
- Middleware
- CSS Modules
- Prettier（無設定檔）
- Testing framework（無 test script / 測試檔）
- Zustand、TanStack Query、React Hook Form、shadcn/ui、Framer Motion
- `react-icons`（AGENTS 舊版提及，但 `package.json` 未安裝）

### 環境變數

定義於 `src/libs/env.tsx`，目前使用：

```ts
process.env.SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY
```

`.env*` 已在 `.gitignore` 排除。**不可**將 service role key 暴露至 client 或 public env。

---

## Architecture

### Router

- **僅 App Router**，無 Pages Router
- Route groups 僅作組織用途，**不提供授權**：
  - `(public)` → 公開頁面
  - `(auth)` → 登入/註冊（已登入 redirect `/dashboard`）
  - `(authenticated)` → 需登入（未登入 redirect `/login`）
  - `(admin)` → 目錄存在，尚未實作

### Layout 階層

```text
src/app/layout.tsx          ← Root：載入 user、UserProvider、Header
├── (public)/*              ← 無額外 layout
├── (auth)/layout.tsx       ← 已登入 redirect
├── (authenticated)/layout.tsx ← 未登入 redirect
└── api/auth/*              ← Route Handlers
```

Root layout 範例（Server Component 載入 session user）：

```tsx
// src/app/layout.tsx
const user = await getCurrentUser();
return (
  <UserProvider user={user}>
    <Header />
    <main>{children}</main>
  </UserProvider>
);
```

### Server / Client 分工

**預設 Server Component。** 目前含 `"use client"` 的檔案：

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/contexts/UserContext.tsx`
- `src/components/Header/DesktopNavigation.tsx`
- `src/components/Header/MobileNavigation.tsx`
- `src/components/Header/HeaderActions.tsx`
- `src/components/Header/UserMenu.tsx`
- `src/components/LogoutButton.tsx`

Client Component 用於：`useState`、`useEffect`、事件處理、`useRouter`、`usePathname`、dropdown 互動。

### 資料流（現行 auth 實作）

```text
Client Form (login/register)
  ↓ fetch
Route Handler (/api/auth/*)
  ↓
Service (authService)
  ↓ validate (Zod) + business rules
Repository (usersRepository / authRepository / sessionRepository)
  ↓
Supabase client (service role, server-only)
  ↓
PostgreSQL
```

Server Component 取得登入使用者：

```text
Server Component / Layout
  ↓
getCurrentUser()  ← src/libs/auth.tsx
  ↓
authService.getUserBySessionToken(token)
  ↓
sessionRepository + usersRepository
```

Client 需要 user 時，由 Root layout 注入 `UserProvider`，client 子元件使用 `useUser()`。

### API 回應格式

成功：

```json
{ "data": { "id": "...", "email": "...", "name": "..." } }
```

錯誤：

```json
{ "message": "使用者可讀訊息", "errors": {} }
```

Login 成功時額外設定 httpOnly cookie `bgc_st`（見 `SESSION_COOKIE_NAME`）。

---

## Folder Structure

### 現有結構

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (authenticated)/
│   │   ├── layout.tsx
│   │   └── dashboard/page.tsx
│   ├── (public)/
│   │   ├── announcements/page.tsx
│   │   ├── board-games/page.tsx
│   │   └── officers/page.tsx
│   └── api/auth/
│       ├── login/route.ts
│       ├── logout/route.ts
│       ├── me/route.ts
│       └── register/route.ts
├── components/
│   ├── Header/
│   │   ├── Header.tsx
│   │   ├── DesktopNavigation.tsx
│   │   ├── MobileNavigation.tsx
│   │   ├── HeaderActions.tsx
│   │   └── UserMenu.tsx
│   ├── UserAvatar.tsx
│   └── LogoutButton.tsx
├── contexts/
│   └── UserContext.tsx
├── libs/
│   ├── auth.tsx
│   ├── env.tsx
│   ├── metadata.tsx
│   ├── navigation.tsx
│   ├── siteConfigs.tsx
│   ├── api/
│   │   ├── client.tsx
│   │   └── errors.tsx
│   └── supabase/
│       └── server.tsx
├── repositories/
│   ├── auth.repository.tsx
│   ├── session.repository.tsx
│   ├── users.repository.tsx
│   └── error.tsx
├── services/
│   ├── auth/
│   │   ├── auth.service.tsx
│   │   ├── auth.schema.tsx
│   │   ├── auth.errors.tsx
│   │   └── auth.types.tsx
│   └── users.service.tsx
├── styles/
│   └── globals.css
├── types/
│   └── database.tsx
└── utils/
    ├── className.tsx
    └── auth/
        ├── password.tsx
        └── session.tsx
```

### 各層職責

| 資料夾 | 職責 |
| --- | --- |
| `app/` | 路由、layout、Route Handlers |
| `components/` | UI 元件，依功能或 layout 分組 |
| `contexts/` | Client-side React Context |
| `libs/` | 跨域工具、設定、server client 初始化 |
| `repositories/` | 資料庫 CRUD，僅 server-side |
| `services/` | 商業邏輯、驗證、授權編排 |
| `types/` | 共用 domain types |
| `utils/` | 純函式工具（密碼、className 等） |
| `styles/` | 全域 CSS 與 design system |

### Path alias

```json
"@/*": ["./src/*"]
```

---

## Coding Guidelines

### 一般原則

1. **最小改動**：只改與任務相關的檔案
2. **Server-first**：預設 Server Component
3. **沿用現有 pattern**：Repository → Service → Route Handler
4. **不引入不必要 dependency**
5. **繁體中文**作為使用者-facing 文案語言
6. **JSDoc** 用於非顯而易見的商業邏輯（參考 `auth.service.tsx`、`session.repository.tsx`）

### 檔案副檔名慣例

專案大量使用 `.tsx` 作為 TypeScript 模組副檔名，**即使檔案不含 JSX**（如 repository、service、types）。新增檔案時**沿用此慣例**，不要混用 `.ts` / `.tsx` 造成不一致。

### Import 規則

- Repository 與 Supabase client 必須 `import "server-only"`
- 使用 `@/` path alias，避免深層 relative import

### 驗證

- 輸入驗證在 **Service 層**以 Zod schema 執行（`auth.schema.tsx`）
- Route Handler 捕捉 `ZodError` 回傳 400

```tsx
// services/auth/auth.service.tsx
const data = loginSchema.parse(input);
```

### 授權（現況與目標）

**現況：** 僅 `(authenticated)/layout.tsx` 檢查是否登入。

**目標（尚未實作，但必須遵守）：**

```text
Request
  → Authenticate (session)
  → Load current academic year (is_current = true)
  → Check membership / officer status
  → Validate input
  → Mutate
```

- 不可 hardcode 學年度 ID（如 `114`、`115`）
- 不可 hardcode 幹部職稱作為授權依據
- 公開公告查詢必須 `is_published = true`

---

## Component Guidelines

### 分層

- **Layout components**：`Header/` 等全站共用
- **Feature components**：依 domain 新增子資料夾（如 `board-games/`、`announcements/`）
- **Shared components**：`UserAvatar.tsx` 等跨功能元件

目前**未使用** compound component pattern。

### Props 慣例

- 延伸原生 HTML attributes：`React.HTMLAttributes<HTMLElement>`
- 額外 props 以 intersection type 定義
- 支援 `className` override，並以 `cn()` 合併

```tsx
type HeaderProps = React.HTMLAttributes<HTMLElement>;

export const Header = ({ className, ...rest }: HeaderProps) => (
  <header className={cn("...", className)} {...rest} />
);
```

### 命名

- 元件檔案：**PascalCase**（`UserAvatar.tsx`）
- 元件 export：**PascalCase**（`export function UserAvatar` 或 `export const Header`）
- 資料夾依功能分組（`Header/Header.tsx`）

### 互動元件模式

Dropdown / mobile menu 共用模式（見 `MobileNavigation.tsx`、`UserMenu.tsx`）：

- `useState` 控制開關
- `useId()` 產生 panel id
- `useEffect` 處理 Escape、click outside
- 開啟時 `document.body.style.overflow = "hidden"`
- `aria-expanded`、`aria-controls`、`aria-label`

### 導覽

主導覽定義於 `src/libs/navigation.tsx`：

```tsx
export const mainNavigation = [
  { label: "首頁", href: "/" },
  { label: "公告", href: "/announcements" },
  { label: "桌遊", href: "/board-games" },
  { label: "幹部", href: "/officers" },
] as const;
```

新增公開 nav 項目時同步更新此檔。

---

## Server / Client Component Rules

### 使用 Server Component 當

- 讀取資料庫
- 讀取 cookie / session
- 執行 redirect
- 渲染靜態或資料驅動 UI
- 不需要 browser API 或 React state

### 使用 Client Component 當

- 表單互動 state（loading、error message）
- `useRouter().refresh()` 更新 server state
- `usePathname()` 判斷 active nav
- Dropdown、mobile menu 等互動

### 不可

- 在 Client Component import `server-only` 模組
- 在 Client Component 直接使用 Supabase service role client
- 僅因「要寫 JSX」就加 `"use client"`

### User Context 模式

Server 在 layout 取得 user，傳入 client provider：

```tsx
// Server: layout.tsx
const user = await getCurrentUser();
<UserProvider user={user}>{children}</UserProvider>

// Client: HeaderActions.tsx
const { user } = useUser();
```

---

## Data Fetching Rules

### 現況

| 場景 | 方式 |
| --- | --- |
| Server 取得 current user | `getCurrentUser()` |
| Client 登入/註冊 | `fetch("/api/auth/...")` |
| Client 登出 | `apiClient("/api/auth/logout")` |
| 公開列表頁 | 尚未實作（placeholder） |

### 新增資料讀取時

1. **Server Component 直接呼叫 repository/service**（公開列表、詳情頁）
2. **Client 需 mutate 時**使用 Route Handler（沿用 auth pattern）
3. Server Actions 可於未來引入，但需與現有 Route Handler pattern 一致，不可混用多套 auth 流程

### 公開列表頁（規劃）

使用 URL search params 作為可分享狀態：

```text
/board-games?category=strategy
/announcements?page=2
```

Search params 必須 server-side 驗證與 normalize。

---

## Repository / Service Rules

### 分層責任

```text
Route Handler   → HTTP、cookie、status code、user-facing message
Service         → 驗證、商業規則、domain errors、跨 repository 編排
Repository      → Supabase query、DB error 轉換
```

### Repository 慣例

- 檔名：`*.repository.tsx`
- Export：object literal，`export const usersRepository = { ... }`
- 開頭：`import "server-only"`
- 錯誤：使用 `throwRepositoryError(context, error)`

```tsx
// repositories/users.repository.tsx
type CreateUserInput = Pick<User, "email" | "name">;
type UpdateUserInput = Partial<Pick<User, "email" | "name" | "avatar">>;

export const usersRepository = {
  findById: async (id: string): Promise<User | null> => { ... },
};
```

- 列表查詢支援 pagination（`page`、`pageSize`、`MAX_PAGE_SIZE = 100`）
- 使用 `maybeSingle()` 處理可能不存在的單筆

### Service 慣例

- 複雜 domain 放子資料夾：`services/auth/`
- 簡單 domain 可單檔：`users.service.tsx`
- Export：`export const authService = { ... }`
- 輸入型別：`unknown` → Zod parse，或明確 typed input
- Domain error 使用自訂 Error class（`auth.errors.tsx`）

### Supabase Client

僅一個 server client：

```tsx
// libs/supabase/server.tsx
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

- 註冊使用 RPC：`supabase.rpc("register_user", { ... })`
- **不可**建立 browser Supabase client 除非有明確需求

### 新增 domain 時

建議新增：

```text
repositories/board-games.repository.tsx
services/board-games/
  board-games.service.tsx
types/  （若需額外 input types，優先放在 service 或 types/）
```

---

## TypeScript Rules

### 設定

- `strict: true`
- **禁止**使用 `any` 繞過型別錯誤
- 避免不必要的 `as` 與 `!`

### 型別定義位置

- Domain entities：`src/types/database.tsx`
- Zod infer types：`services/auth/auth.types.tsx`

```tsx
export type RegisterInput = z.infer<typeof registerSchema>;
```

### Union types（非 enum）

專案使用 string union type，**不使用 TypeScript enum**：

```tsx
export type MembershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "suspended"
  | "cancelled";

export type BoardGameStatus =
  | "available"
  | "borrowed"
  | "maintenance"
  | "lost"
  | "damaged"
  | "retired";
```

### Utility type pattern（應延續）

```tsx
type CreateUserInput = Pick<User, "email" | "name">;
type UpdateUserInput = Partial<Pick<User, "email" | "name" | "avatar">>;
type CreateSessionInput = Pick<Session, "user_id" | "token" | "expires_at">;
```

### 共用別名

```tsx
export type UUID = string;
export type Timestamp = string;
```

---

## Styling Rules

### 單一 Design System

視覺來源為 `src/styles/globals.css`。**不可**另建 design system 或大量 hardcode 色碼。

### Tailwind CSS 4

- 透過 `@import "tailwindcss"` 載入
- 搭配 `@layer base` / `@layer utilities`
- 使用 Tailwind 4 括號語法引用 CSS variables：

```tsx
className="text-(--foreground) bg-(--primary-background) border-(--border)"
```

### Class 合併

一律使用 `cn()`：

```tsx
import { cn } from "@/utils/className";

cn("base-class", condition && "conditional-class", className)
```

### 全域 utility classes（優先使用）

| Class | 用途 |
| --- | --- |
| `.container` | 最大寬度 `var(--container-max-width)` |
| `.btn` / `.btn.primary` / `.btn.secondary` / `.btn.outline` / `.btn.green` / `.btn.yellow` / `.btn.danger` | 按鈕 |
| `.card` / `.card.accent` | 卡片 |
| `.game-block` | 裝飾色塊 |
| `.skeleton` / `.skeleton-line` | 載入占位 |
| `.animate-pop` / `.animate-appear` / `.animate-turn` | 動畫 |

### Color tokens

```css
var(--foreground)
var(--muted)
var(--background)
var(--primary-background)
var(--secondary-background)
var(--primary) / var(--primary-light) / var(--primary-dark)
var(--secondary) / var(--tertiary)
var(--game-red) / var(--game-green) / var(--game-yellow) / var(--game-blue)
var(--border) / var(--border-strong)
var(--shadow-base) / var(--shadow-card) / var(--shadow-hover)
```

### Responsive

- Mobile-first
- 主要 breakpoint：`md:`（Header nav 桌面/手機切換）
- 保留現有 responsive 行為，不任意改 breakpoint 策略

### Dark mode

**目前未實作。** 不要假設有 dark mode 或新增 `dark:` variant，除非專案明確引入。

### Animation

- **禁止** Framer Motion 或其他動畫 library
- 使用 CSS transitions / keyframes
- 必須尊重 `prefers-reduced-motion`（已在 `globals.css` 設定）

### Icons

- 使用 `@ant-design/icons`
- Icon-only button 必須有 `aria-label`

---

## Naming Convention

### Files

| 類型 | 慣例 | 範例 |
| --- | --- | --- |
| Route | kebab-case 資料夾 | `board-games/page.tsx` |
| Component | PascalCase | `UserAvatar.tsx` |
| Component 資料夾 | PascalCase | `Header/Header.tsx` |
| Repository | kebab-case + `.repository.tsx` | `users.repository.tsx` |
| Service | kebab-case + `.service.tsx` | `auth.service.tsx` |
| Context | PascalCase | `UserContext.tsx` |
| Utils | camelCase | `className.tsx`、`password.tsx` |
| Types | camelCase 或 domain | `database.tsx` |

### Variables

- 一般變數：`camelCase`
- React component：`PascalCase`
- 常數：`UPPER_SNAKE_CASE`（如 `SESSION_COOKIE_NAME`、`MAX_PAGE_SIZE`）
- Repository/Service export：`camelCase` object（`usersRepository`、`authService`）

### Functions

- 資料取得：`findById`、`findByEmail`、`findMany`、`getCurrentUser`
- 建立/更新/刪除：`create`、`updateById`、`deleteById`
- 事件處理：`handleSubmit`、`handleLogout`
- 工具：`hashPassword`、`verifyPassword`、`generateSessionToken`、`cn`

### Database columns

使用 **snake_case**（`user_id`、`created_at`、`is_published`），TypeScript type 保持一致。

---

## Error Handling

### 錯誤類型

| 類型 | 位置 | 用途 |
| --- | --- | --- |
| `RepositoryError` | `repositories/error.tsx` | DB 層錯誤 |
| `EmailAlreadyExistsError` | `services/auth/auth.errors.tsx` | 註冊 email 重複 |
| `InvalidCredentialsError` | `services/auth/auth.errors.tsx` | 登入失敗 |
| `ApiError` | `libs/api/errors.tsx` | Client fetch 錯誤 |

### Repository 錯誤

```tsx
export function throwRepositoryError(context: string, error: unknown): never {
  console.error(`[Repository] ${context}:`, error);
  throw new RepositoryError(context, error);
}
```

Repository 錯誤**不應**直接暴露給使用者。

### Route Handler 錯誤

```tsx
try {
  // business logic
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json({ message: "輸入資料格式不正確", errors: ... }, { status: 400 });
  }
  if (error instanceof InvalidCredentialsError) {
    return NextResponse.json({ message: "Email 或密碼錯誤" }, { status: 401 });
  }
  console.error("[POST /api/auth/login]", error);
  return NextResponse.json({ message: "登入失敗，請稍後再試" }, { status: 500 });
}
```

### 規則

- 使用者看到的訊息必須可理解、可行動
- **不可**回傳 SQL error、stack trace、內部實作細節
- Server-side 使用 `console.error` 記錄（目前無集中 logging service）
- Client 使用 `ApiError` 或 local state 顯示錯誤

---

## Security Rules

### 絕對禁止

- 暴露 `SUPABASE_SERVICE_ROLE_KEY` 至 client 或 `NEXT_PUBLIC_*`
- 在 client import `server-only` 模組
- 信任 client 提供的 `user_id`、`author_id`、`isMember`、`isOfficer`
- 僅靠 route group 或 URL path 做授權
- 公開 API 回傳未發布公告（`is_published = false`）
- 允許非社員借用桌遊
- 允許非幹部執行管理 mutation
- 修改 auth 核心邏輯時繞過 timing-safe 登入比對

### Session 安全（現行實作）

```tsx
// libs/auth.tsx
export const SESSION_COOKIE_NAME = "bgc_st";

// login route
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

- Session token 由 `randomBytes(32).toString("hex")` 產生
- 密碼以 argon2 hash
- 登入時即使 user 不存在也執行 dummy hash verify（timing-safe）

### 資料庫

- AI **不可**直接修改 production schema
- Schema 變更需有 migration 策略並在 README / 文件記錄
- 保持 backward compatibility

---

## Testing Rules

### 現況

- 無 testing framework
- 無 `test` script
- 無 Prettier

### 修改程式後必須執行

```bash
npm run lint
npx tsc --noEmit
npm run build   # 重大改動時
```

### 若未來引入測試

優先測試 service 層商業邏輯與授權規則，而非 snapshot 整頁 UI。

---

## Git Workflow

- 一個 commit / PR 聚焦一個 feature 或 bug fix
- 不混合無關 refactoring、formatting、dependency 更新
- 完成前檢查 `git diff`，確認未修改無關檔案
- `.env*` 不可 commit
- **只有在使用者明確要求時才 commit**

---

## AI Agent Rules

### Before modifying code

AI 必須：

1. **先理解現有架構** — 閱讀相關 route、service、repository、types
2. **不隨意新增 dependency** — 現有 stack 已能滿足大部分需求
3. **優先沿用現有 pattern** — Repository → Service → Route Handler；`cn()`；domain errors；Zod validation
4. **不修改無關檔案** — 小功能不做順手重構
5. **確認 Next.js 16 行為** — 不熟悉 API 時查 `node_modules/next/dist/docs/`
6. **區分「已實作」與「規劃中」** — 不要假設 admin、membership 授權已存在

### When creating components

AI 必須：

- 遵守現有 component structure（PascalCase、`cn()`、aria attributes）
- 預設 Server Component，只在需要互動時加 `"use client"`
- 避免過度抽象（不要建立 `UniversalCard` 類 vague 元件）
- 保持 single responsibility
- 沿用 `.tsx` 副檔名慣例
- 複用 `.btn`、`.card`、`.container` 與 CSS variables

### When modifying database

AI 必須：

- **不直接修改 schema** 而不說明 migration 策略
- 新增 repository 方法而非在 component 內寫 inline Supabase query
- 保持 snake_case column 與 `src/types/database.tsx` 同步
- 使用 `getCurrentAcademicYear()` 模式（待實作）查 current academic year
- 公開查詢公告必須 filter `is_published = true`

### When modifying API

AI 必須：

- 保持 API response contract（`{ data }` / `{ message }`）
- 同步更新相關 types
- 處理 ZodError、domain errors、未知 errors
- 不在 response 暴露 raw database errors
- Mutations 遵循：**Authenticate → Authorize → Validate → Mutate**

### Dependency policy

| 可沿用 | 未安裝，勿引入 |
| --- | --- |
| zod | zustand |
| argon2 | @tanstack/react-query |
| clsx, tailwind-merge | react-hook-form |
| @ant-design/icons | framer-motion |
| @supabase/supabase-js | shadcn/ui |

Zod **已安裝且使用中**，新增表單/輸入驗證應優先使用 Zod，而非再引入其他 validation library。

### 完成前 Checklist

**Architecture**

- [ ] 使用正確 route group 與 layout
- [ ] Server Component 為預設
- [ ] Client Component 僅在必要時使用
- [ ] 未引入不必要 dependency 或動畫 library

**Auth / Security**

- [ ] 認證在 server 端驗證（cookie / `getCurrentUser()`）
- [ ] 授權在 server 端驗證（mutations）
- [ ] 未暴露 service role key
- [ ] 未信任 client 提供的 permission 資訊

**Data**

- [ ] 資料庫邏輯在 repository/service，不在大型 UI component
- [ ] 公開資料未暴露 unpublished 內容

**UI**

- [ ] 使用 design tokens 與現有 utility classes
- [ ] 保留 responsive 與 accessibility
- [ ] 尊重 `prefers-reduced-motion`

**Code Quality**

- [ ] 無 `any`
- [ ] 無 dead code
- [ ] 通過 `npm run lint`
- [ ] 通過 `npx tsc --noEmit`
- [ ] diff 範圍聚焦

---

## 參考：Site Config

站點文案與 metadata 集中於 `src/libs/siteConfigs.tsx`：

```tsx
export const siteConfigs = {
  name: "臺科大桌遊社",
  fullName: "國立臺灣科技大學桌上遊戲研究社",
  title: "臺科大桌上遊戲研究社｜官方網站",
  url: "https://ntust-bgc.vercel.app",
  logo: "/images/logo.jpg",
  icon: "/images/favicon.ico",
} as const;
```

Metadata 由 `src/libs/metadata.tsx` export，Root layout re-export。
