## AGENTS.md

### Project Overview

本專案為國立臺灣科技大學桌上遊戲研究社的官方網站與會員管理系統，使用 Next.js App Router 建置。

目前已實作：

- 公開首頁、公告、桌遊、隱私權與服務條款頁面
- 註冊、登入、登出、目前使用者與密碼更新
- 自訂 Session Cookie 認證
- 已登入使用者 Dashboard、個人資料頁與設定頁
- 帳號、個人資料與登入 Session 管理
- 會員資格、幹部職位、借用與出席統計的讀取服務

仍屬早期開發階段；公告、桌遊等公開頁面目前多為靜態或 placeholder，管理端路由尚未實作。

---

### Tech Stack

| 類別 | 現況 |
| --- | --- |
| Framework | Next.js `16.2.11`，App Router |
| UI | React `19.2.4`、React DOM `19.2.4` |
| Language | TypeScript 5，`strict: true` |
| Runtime | Node.js，由 Next.js 執行 |
| Package manager | npm，使用 `package-lock.json` |
| Styling | Tailwind CSS 4 + `src/styles/globals.css` |
| CSS processing | `@tailwindcss/postcss` |
| Database | PostgreSQL，透過 Supabase JS SDK 存取 |
| Auth | 自訂 Session，非 Supabase Auth |
| Password hashing | `argon2` |
| Validation | Zod 4 |
| Icons | `@ant-design/icons` |
| Class merging | `clsx` + `tailwind-merge`，封裝為 `cn()` |
| Fonts | `next/font/google` 的 Geist Sans / Geist Mono |
| Lint | ESLint 9 + `eslint-config-next` |
| Tests | 尚未導入測試框架 |
| Formatting | 未設定 Prettier |

`next.config.ts` 目前沒有額外設定。Tailwind CSS 4 沒有 `tailwind.config.*`；設計 token 與全域樣式集中於 `src/styles/globals.css`。

環境變數：

```ts
process.env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY;
```

這些變數由 `src/libs/env.tsx` 匯出，`.env*` 已被 Git 忽略。

---

### Architecture

本專案僅使用 App Router，沒有 Pages Router，也沒有 Server Actions。

路由群組僅用於組織檔案，不構成授權機制：

```text
src/app/
├── layout.tsx                    Root layout
├── page.tsx                      /
├── (public)/                     公開頁面
├── (auth)/                       登入與註冊
├── (authenticated)/              需要登入的頁面
└── api/                          Route Handlers
```

目前主要頁面：

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
```

目前沒有：

- `middleware.ts`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `sitemap.ts`
- `robots.ts`
- Server Actions
- Admin route 實作

Layout 階層：

```text
RootLayout
  ├── getCurrentUser()
  ├── UserProvider
  ├── Header
  └── children

(auth)/layout
  └── 已登入時 redirect("/dashboard")

(authenticated)/layout
  └── 未登入時 redirect("/login")
```

Root layout 範例：

```tsx
const user = await getCurrentUser();

return (
  <UserProvider user={user}>
    <Header className="sticky top-0 z-50" />
    <main className="flex-1">{children}</main>
  </UserProvider>
);
```

---

### Folder Structure

```text
src/
├── app/                 路由、layout、Route Handlers
│   ├── (auth)/          登入與註冊
│   ├── (authenticated)/ 已登入頁面
│   ├── (public)/        公開頁面
│   └── api/             HTTP API
├── components/          UI 元件
│   ├── (auth)/          認證功能元件
│   ├── (authenticated)/ 已登入功能元件
│   └── Header/          全站 Header 相關元件
├── contexts/            Client-side React Context
├── libs/                跨領域設定與工具
│   ├── api/             Client fetch wrapper、API error
│   ├── supabase/        Server Supabase client
│   └── zod/             Zod error helper
├── repositories/        資料庫查詢與 CRUD
├── services/            驗證、商業規則與跨 repository 編排
├── styles/              全域 CSS、design tokens
├── types/               共用 domain/database types
└── utils/               純函式工具
```

資料夾責任：

| 位置 | 責任 |
| --- | --- |
| `app/` | 路由、HTTP 邊界、layout、redirect |
| `components/` | UI 與使用者互動 |
| `contexts/` | Client-side shared state |
| `libs/` | 設定、API client、auth helper、SDK 初始化 |
| `repositories/` | Supabase query 與資料庫錯誤轉換 |
| `services/` | Zod 驗證、商業規則、授權編排 |
| `types/` | 資料庫 entity 與共用 domain type |
| `utils/` | 不依賴 React 的工具函式 |

---

### Coding Guidelines

1. 優先做最小、聚焦的修改，不順手重構無關程式。
2. 預設使用 Server Component。
3. 沿用既有分層：Route Handler / Server Component → Service → Repository → Supabase。
4. 不新增 dependency，除非既有套件無法合理完成需求。
5. 使用繁體中文撰寫使用者可見文案。
6. 使用 `@/` path alias，避免深層相對路徑。
7. 使用 `import type` 匯入純型別。

```tsx
import type { UserProfileData } from "@/services/users/users.types";
import { usersService } from "@/services/users/users.service";
```

目前專案同時存在 `.ts` 與 `.tsx` 的非 JSX 模組。新增檔案應遵循所在 domain 的既有慣例，不應為了統一副檔名進行大範圍 rename。

- React component：使用 `.tsx`
- 新 domain 的純 TypeScript 模組：優先使用 `.ts`
- 修改既有模組：保留原有副檔名

避免：

```tsx
const value: any = response;
const user = data.user!;
```

---

### Component Guidelines

- 使用者可見文案須簡潔且直接；避免加入未提供資訊價值的標語或描述，例如「即時統計」、「個人檔案」。
- 同一頁面只保留一個主要編輯入口，避免重複導向相同設定頁。
- 桌遊相關功能一律使用「借用／歸還」用語，不使用「借閱」；活動參與紀錄一律使用「簽到」，不使用「出席」。

元件依功能與使用情境分組：

```text
components/
├── Header/                         全站 layout 元件
├── (auth)/login/                   登入功能元件
├── (auth)/register/                註冊功能元件
├── (authenticated)/dashboard/      Dashboard 功能元件
├── (authenticated)/profile/        個人資料功能元件
└── (authenticated)/settings/       設定功能元件
```

元件分層：

- Layout components：`Header/Header.tsx`
- Feature components：`ProfileHeroSection.tsx`、`PasswordSettingsCard.tsx`
- Shared components：`FieldInput.tsx`、`FormFeedback.tsx`、`UserAvatar.tsx`
- Client context：`UserContext.tsx`

命名使用 PascalCase：

```tsx
export function ProfileHeroSection() {}
export const Header = () => {};
```

Props 優先延伸原生 attributes，並支援 `className`：

```tsx
type HeaderProps = React.HTMLAttributes<HTMLElement>;

export const Header = ({ className, ...rest }: HeaderProps) => (
  <header className={cn("border-b", className)} {...rest} />
);
```

內部專用元件只接收真正需要的 props，不要為未使用的擴充性加入泛用 HTML props。

```tsx
type BadgeData = {
  key: string;
  label: string;
  variant: BadgeVariant;
};
```

目前未採用 compound component pattern。不要引入 `UniversalCard`、`BaseSection` 這類過度抽象元件；功能元件應保持單一責任。

---

### Server / Client Component Rules

預設為 Server Component。僅在需要以下能力時使用 `"use client"`：

- `useState`、`useEffect`、`useMemo`
- 表單輸入與 loading state
- `useRouter()`、`usePathname()`
- click outside、Escape、dropdown、mobile menu
- Client API mutation

現有 Client Components 包含：

- `contexts/UserContext.tsx`
- 登入、註冊表單
- 設定表單與 session 清單
- Header 導覽、行動版選單、使用者選單
- `FieldInput.tsx`
- `LogoutButton.tsx`

不可：

- 在 Client Component import `server-only` 模組
- 在 Client Component 使用 Supabase service role client
- 在 Client Component 讀取 server env
- 只因為檔案有 JSX 而加上 `"use client"`

使用者資料流：

```text
Root Server Layout
  ↓ getCurrentUser()
UserProvider
  ↓
Client Component
  ↓ useUser()
```

```tsx
const { user } = useUser();
```

---

### Data Fetching Rules

Server Component 可直接呼叫 service：

```tsx
const user = await getCurrentUser();

if (!user) return null;

const profile = await usersService.getProfile(user.id);
```

獨立查詢應使用 `Promise.all` 平行執行：

```tsx
const [profileData, totalBorrowings, attendances] = await Promise.all([
  usersService.getProfileData(user.id),
  boardGameBorrowingsService.getTotalBorrowedCount(user.id),
  eventAttendancesService.getAttendedCountByCurrentAcademicYear(user.id),
]);
```

Client mutation 使用 Route Handler 與 `apiClient()`：

```tsx
await apiClient("/api/users/me/profile", {
  method: "PATCH",
  body: values,
});
```

`apiClient()` 會：

- 自動 JSON stringify request body
- 預設設定 `Content-Type: application/json`
- 非成功 response 時拋出 `ApiError`
- 提供 `status` 與欄位錯誤 `errors`

```tsx
try {
  await apiClient("/api/users/me/account", {
    method: "PATCH",
    body: values,
  });
  router.refresh();
} catch (error) {
  if (error instanceof ApiError) {
    setFormError(error.message);
  }
}
```

本專案目前沒有 Server Actions。新增 mutation 時應先使用 Route Handler，保持與既有認證與錯誤處理一致。

---

### Repository / Service Rules

實際資料流：

```text
Server Component / Client Form
        ↓
Route Handler
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

- 僅處理 Supabase query、pagination、資料庫 error。
- 檔案開頭必須加入：

```tsx
import "server-only";
```

- 透過 `throwRepositoryError()` 封裝 Supabase error。
- 單筆可能不存在時使用 `maybeSingle()`。
- list query 要限制 page 與 pageSize。

```tsx
const MAX_PAGE_SIZE = 100;

const pageSize = Math.min(
  MAX_PAGE_SIZE,
  Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE),
);
```

Repository export 使用 object literal：

```tsx
export const usersRepository = {
  findById: async (id: string): Promise<User | null> => {
    // ...
  },
};
```

Service 規則：

- 負責 Zod validation、domain error、跨 repository 協作。
- 外部輸入先以 `unknown` 接收，再由 schema parse。
- 複數獨立 query 使用 `Promise.all`。
- 不要在 Component 或 Route Handler 直接寫 Supabase query。

```tsx
export const usersService = {
  updateAccount: async (userId: string, payload: unknown): Promise<User> => {
    const data = updateUserAccountSchema.parse(payload);
    const updated = await usersRepository.updateById(userId, data);

    if (!updated) {
      throw new UserProfileNotFoundError();
    }

    return updated;
  },
};
```

認證使用自訂資料表與 session，不使用 Supabase Auth：

```text
users
auth_credentials
sessions
user_profiles
```

註冊透過 RPC：

```tsx
await supabase.rpc("register_user", {
  email: input.email,
  name: input.name,
  password_hash: input.passwordHash,
});
```

---

### TypeScript Rules

`tsconfig.json` 已啟用：

```json
{
  "strict": true,
  "noEmit": true,
  "moduleResolution": "bundler",
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

資料庫 entity 定義集中於：

```text
src/types/database.tsx
```

例如：

```tsx
export type User = {
  id: UUID;
  name: string;
  email: string;
  avatar: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
```

狀態使用 string union，不使用 TypeScript enum：

```tsx
export type MembershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "suspended"
  | "cancelled";
```

延續 `Pick`、`Partial`、`Omit` 等 utility type：

```tsx
type CreateSessionInput = Pick<Session, "user_id" | "token" | "expires_at">;

type UpdateUserInput = Partial<Pick<User, "name" | "avatar">>;
```

Zod schema 推論的表單 type 放在對應 service domain：

```tsx
export type RegisterInput = z.infer<typeof registerSchema>;
```

不可使用 `any` 逃避 type error。必要的 type assertion 必須只縮小不可信 input，並保持範圍最小。

---

### Styling Rules

視覺系統集中於：

```text
src/styles/globals.css
```

使用 Tailwind CSS 4 與 CSS variable token：

```tsx
className="bg-(--primary-background) text-(--foreground)"
```

常用 token：

```css
--foreground
--muted
--background
--primary-background
--secondary-background
--tertiary-background
--primary
--primary-light
--primary-dark
--game-red
--game-green
--game-yellow
--game-blue
--border
--shadow-base
--shadow-hover
```

優先使用既有 utility：

```text
.container
.card
.card.accent
.btn
.btn.primary
.btn.secondary
.btn.outline
.btn.green
.btn.yellow
.btn.danger
.skeleton
.skeleton-line
```

使用 `cn()` 合併 class：

```tsx
import { cn } from "@/utils/className";

className={cn(
  "rounded-2xl border border-(--border)",
  isActive && "bg-(--secondary-background)",
  className,
)}
```

RWD 採 mobile-first：

```tsx
className="grid grid-cols-1 gap-4 lg:grid-cols-2"
```

目前常用 breakpoint 為 `sm:`、`md:`、`lg:`。不要任意新增不一致的 breakpoint 策略。

目前未實作 dark mode。不可新增 `dark:` class 或假設有主題切換。

動畫僅使用 CSS transition / keyframe；全域已處理 `prefers-reduced-motion`。不可新增 Framer Motion 或其他動畫 dependency。

---

### Naming Convention

| 類別 | 慣例 | 範例 |
| --- | --- | --- |
| React component | PascalCase | `ProfileHeroSection.tsx` |
| Component folder | PascalCase 或功能分組 | `Header/` |
| Route folder | kebab-case | `board-games/` |
| Repository | kebab-case + `.repository` | `users.repository.tsx` |
| Service | kebab-case + `.service` | `users.service.tsx` |
| Schema | kebab-case + `.schema` | `users.schema.tsx` |
| Domain error | kebab-case + `.errors` | `auth.errors.tsx` |
| Context | PascalCase | `UserContext.tsx` |
| Utility | camelCase | `className.tsx` |
| Database type | domain type | `database.tsx` |

Variables 使用 `camelCase`：

```tsx
const currentMembership = memberships.find(
  (membership) => membership.academic_year.is_current,
);
```

Component、type、class 使用 `PascalCase`：

```tsx
type ProfileBasicInfoSectionProps = {};
export function ProfileBasicInfoSection() {}
```

常數使用 `UPPER_SNAKE_CASE`：

```tsx
const SESSION_COOKIE_NAME = "bgc_st";
const MAX_PAGE_SIZE = 100;
```

函式命名：

```tsx
findById();
findByEmail();
findMany();
create();
updateById();
deleteById();
getCurrentUser();
handleSubmit();
handleLogout();
```

資料庫欄位維持 snake_case：

```tsx
user_id;
academic_year_id;
is_current;
created_at;
```

---

### Error Handling

Repository error 使用統一包裝：

```tsx
export function throwRepositoryError(context: string, error: unknown): never {
  console.error(`[Repository] ${context}:`, error);
  throw new RepositoryError(context, error);
}
```

Service 使用 domain error 表達可預期的商業錯誤：

```tsx
throw new InvalidCredentialsError();
throw new UserProfileAlreadyExistsError();
throw new UserProfileNotFoundError();
```

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
    return NextResponse.json(
      { message: "找不到個人資料" },
      { status: 404 },
    );
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

---

### Security Rules

絕對禁止：

- 將 `SUPABASE_SERVICE_ROLE_KEY` 暴露到 client 或 `NEXT_PUBLIC_*`
- 在 Client Component import `server-only` repository 或 Supabase server client
- 信任 client 傳入的 `user_id`、`author_id`、會員資格或幹部資格
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

```tsx
const passwordHashToCompare =
  credential?.password_hash ?? (await getDummyPasswordHash());

const isPasswordValid = await verifyPassword(
  data.password,
  passwordHashToCompare,
);
```

所有使用者 mutation 必須從 server-side session 取得身份：

```text
Authenticate
→ Authorize
→ Validate
→ Mutate
```

使用 `getCurrentUser()`，不可接受 client 提供的 user id：

```tsx
const user = await getCurrentUser();

if (!user) {
  return NextResponse.json({ message: "請先登入" }, { status: 401 });
}

await usersService.updateProfile(user.id, body);
```

涉及社員或幹部授權時，必須從資料庫確認目前學年度：

```tsx
const currentYear = await academicYearsRepository.findCurrent();
```

不可 hardcode 學年度 ID 或依幹部職稱字串作為授權依據。

---

### Testing Rules

目前沒有測試框架與 `test` script。

修改程式後至少執行：

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

- Service 層的 validation 與商業規則
- Session、會員資格與授權判斷
- Route Handler 的 status code 與 response contract

避免只寫 snapshot 測試取代行為驗證。

---

### Git Workflow

- 一個 commit 聚焦一個 feature 或 bug fix。
- 不混合 dependency 更新、無關格式化與功能修改。
- 修改完成前檢查：

```bash
git diff
git status --short
```

- `.env*` 不可 commit。
- 不執行 `git reset --hard`、`git checkout --` 等破壞性指令，除非使用者明確要求。
- 只有使用者明確要求時才建立 commit。

---

### AI Agent Rules

#### Before modifying code

AI 必須：

1. 先閱讀與任務直接相關的 route、component、service、repository、schema 與 type。
2. 確認是 Server Component 還是 Client Component。
3. 不隨意新增 dependency；優先使用 Next.js、React、Zod、Tailwind、`cn()` 與既有 API client。
4. 優先沿用 Repository → Service → Route Handler 的資料流。
5. 不修改無關檔案、不做大範圍 rename、不順手格式化整個專案。
6. 修改 API 或資料層前，先確認既有 response contract 與 domain error。
7. 修改後執行 lint、type check 與 diff check。

#### When creating components

AI 必須：

- 依功能放入正確的 `components/` 子資料夾。
- 預設使用 Server Component；只有互動需求才使用 `"use client"`。
- 使用 PascalCase 檔名與 export。
- 支援 `className` 時使用 `cn()`。
- 使用既有 design token、`.container`、`.card`、`.btn`。
- 維持 mobile-first RWD 與基本 aria 屬性。
- 保持單一責任，避免過度抽象。
- 不在 UI component 寫 Supabase query、授權判斷或複雜商業邏輯。

#### When modifying database

AI 必須：

- 不直接修改 production schema。
- 若需要 schema 變更，先提出 migration strategy、backward compatibility 與 type 更新範圍。
- 新增資料庫操作時建立 repository，不可在 component 或 service 中直接呼叫 Supabase。
- 保持 `src/types/database.tsx` 與資料表欄位同步。
- 保持 snake_case database column naming。
- 學年度邏輯使用 `academicYearsRepository.findCurrent()`，不可 hardcode 年度。
- 公開公告查詢必須限制：

```ts
.eq("is_published", true)
```

#### When modifying API

AI 必須：

- 維持 `{ data }` / `{ message, errors? }` response contract。
- mutation 先驗證登入身份，再 parse body，再呼叫 service。
- 使用 Zod 驗證不可信輸入。
- 處理 ZodError、domain error、未知 error。
- 不回傳內部錯誤細節。
- 更新相關 schema、type 與 client form handling。
- 使用 server-side current user，不可信任 request body 中的身份與權限欄位。

#### Completion Checklist

- [ ] 修改範圍只涵蓋需求。
- [ ] 沒有將 server-only code 匯入 client。
- [ ] 沒有暴露 Supabase service role key。
- [ ] 資料庫邏輯位於 repository。
- [ ] 驗證與商業規則位於 service。
- [ ] API 具備身份驗證、輸入驗證與安全錯誤回應。
- [ ] UI 使用既有 token、utility class 與 responsive 策略。
- [ ] 沒有 `any`、dead code 或不必要 dependency。
- [ ] `npm run lint`、`npx tsc --noEmit`、`git diff --check` 通過。
