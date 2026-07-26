# AGENTS.md

## NTUST Board Game Club Website

This document defines the architecture, coding conventions, security rules, data model, UI design system, and development workflow for the National Taiwan University of Science and Technology Board Game Club website.

AI coding agents and developers must follow these rules when modifying this repository.

---

## 1. Project Overview

This repository is the official website and internal management system for the National Taiwan University of Science and Technology Board Game Club.

The application has two major purposes.

### Public Website

Public users can:

* Learn about the club.
* Browse board games.
* View board game details.
* View events.
* View announcements.
* View current officers.

### Internal Club System

Authenticated users may:

* Manage their personal profile.
* View personal records.
* View borrowing records.
* Participate in attendance workflows when eligible.
* Borrow board games when they are current members.

Current officers may additionally:

* Manage board games.
* Manage members.
* Manage events.
* Manage attendance.
* Manage officer positions.
* Manage announcements.

---

## 2. Core Permission Model

The application has four effective permission states:

```text
Unauthenticated User
        │
        ▼
Authenticated User
        │
        ├── Non-member
        │
        ├── Current Member
        │
        └── Current Officer
```

Officer is not a separate authentication system.

An officer is still an authenticated user.

Authentication and authorization are separate concerns.

A logged-in user does not automatically mean that the user is:

* a member
* a current member
* an officer

The database is the source of truth for authorization.

---

## 3. Technology Stack

The project uses:

* Next.js 16 App Router
* React 19
* TypeScript
* Tailwind CSS 4
* Supabase
* Supabase Auth
* PostgreSQL through Supabase
* Ant Design Icons
* react-icons

Do not introduce additional dependencies unless there is a clear requirement.

Do not introduce:

* Zustand
* TanStack Query
* React Hook Form
* Zod
* shadcn/ui
* Framer Motion
* another animation library
* another icon library

unless the project explicitly adopts them in the future.

### Important

This project does **not** use Framer Motion.

Never add Framer Motion.

Never introduce another animation library.

Animations must use the existing CSS animation and transition system.

---

## 4. Next.js Version Rule

This project uses Next.js 16.

Next.js APIs and conventions may differ from older versions.

Before implementing unfamiliar or potentially changed Next.js behavior, inspect the local documentation:

```text
node_modules/next/dist/docs/
```

The installed version is the source of truth.

Do not blindly rely on:

* old tutorials
* old Stack Overflow answers
* outdated AI-generated code
* older Next.js documentation

---

## 5. App Router Structure

The project uses the Next.js App Router.

The expected structure is:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── loading.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   │
│   ├── (public)/
│   │   ├── board-games/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── announcements/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   └── officers/
│   │       └── page.tsx
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   │
│   ├── (authenticated)/
│   │   └── dashboard/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── profile/
│   │       │   └── page.tsx
│   │       ├── borrowings/
│   │       │   └── page.tsx
│   │       └── attendance/
│   │           └── page.tsx
│   │
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── board-games/
│   │       │   └── page.tsx
│   │       ├── members/
│   │       │   └── page.tsx
│   │       ├── events/
│   │       │   └── page.tsx
│   │       ├── attendance/
│   │       │   └── page.tsx
│   │       ├── officers/
│   │       │   └── page.tsx
│   │       └── announcements/
│   │           └── page.tsx
│   │
│   └── api/
│       └── ...
│
├── components/
├── hooks/
├── libs/
├── types/
├── utils/
└── styles/
```

---

## 6. Route Groups

Route groups are organizational tools only.

For example:

```text
src/app/(public)/board-games/page.tsx
```

maps to:

```text
/board-games
```

Similarly:

```text
src/app/(authenticated)/dashboard/page.tsx
```

maps to:

```text
/dashboard
```

and:

```text
src/app/(admin)/admin/page.tsx
```

maps to:

```text
/admin
```

Route groups do not provide authorization.

This is not authorization:

```text
(app)/(admin)
```

Authorization must be implemented through:

1. Authenticated session verification.
2. Database queries.
3. Current membership verification.
4. Current officer verification.

---

## 7. Server-First Architecture

Use Server Components by default.

Preferred architecture:

```text
Server Component
    │
    ├── Load data
    ├── Verify permissions
    └── Render UI
            │
            └── Client Component
                └── Interactive behavior
```

Use Client Components only when required by:

* `useState`
* `useEffect`
* event handlers
* browser APIs
* `localStorage`
* `sessionStorage`
* browser Supabase client
* `useRouter`
* `usePathname`
* `useSearchParams`
* interactive form state
* dialogs
* dropdowns
* client-only UI behavior

Do not add:

```tsx
"use client";
```

merely because a component renders UI.

Keep Client Components as small as possible.

---

## 8. Authentication and Authorization

Authentication is handled by Supabase Auth.

Authorization is determined by the database.

The server must verify the authenticated user before sensitive operations.

The general authorization flow is:

```text
Request
    │
    ▼
Get authenticated user
    │
    ▼
Load current academic year
    │
    ▼
Check membership or officer status
    │
    ▼
Validate request data
    │
    ▼
Perform operation
```

Never trust client-provided values such as:

```ts
user_id
```

```ts
author_id
```

```ts
approved_by_user_id
```

```ts
isMember
```

```ts
isOfficer
```

```ts
role
```

The server must derive these values from:

* the authenticated session
* the database

---

## 9. Current Academic Year

The current academic year must be determined from:

```text
academic_years
```

Prefer:

```text
is_current = true
```

Do not hardcode:

```text
114
115
116
```

in authorization logic.

Do not assume the latest row is automatically the current academic year.

The database is the source of truth.

---

## 10. Membership Authorization

A user is a current member only when their membership is valid for the current academic year.

Conceptually:

```text
users
    │
    └── memberships
            │
            └── academic_years
```

A current member generally satisfies:

```text
membership.status = "active"
```

and:

```text
membership.academic_year_id = currentAcademicYear.id
```

Do not treat the following as current memberships:

* historical memberships
* expired memberships
* cancelled memberships
* suspended memberships

---

## 11. Officer Authorization

A user is a current officer only when:

```text
officer_positions.user_id = currentUser.id
```

and:

```text
officer_positions.academic_year_id = currentAcademicYear.id
```

Do not hardcode officer names for authorization.

For example, never authorize only because the position is:

```text
社長
副社長
美宣
攝影
```

Any valid current-year officer position should be authorized through the database relationship.

The position name is a display concern.

The existence of a valid current-year officer position is the authorization concern.

---

## 12. Database Domain Model

The primary database entities are:

```text
users
memberships
academic_years
positions
officer_positions
board_games
board_game_categories
locations
board_game_borrowings
events
event_attendance
announcements
```

---

## 13. Board Games

Board games contain:

```text
id
name
description
image
created_at
updated_at
category_id
location_id
status
```

Board game status:

```text
available
borrowed
maintenance
lost
damaged
retired
```

Board game status describes the physical item.

Do not confuse it with borrowing request status.

---

## 14. Borrowings

Borrowing request status:

```text
pending
approved
rejected
borrowed
returned
```

General workflow:

```text
pending
    │
    ├── approved
    │       │
    │       └── borrowed
    │               │
    │               └── returned
    │
    └── rejected
```

Only current members may request board game borrowing.

Officers may approve or reject borrowing requests.

Every borrowing mutation must verify:

* authentication
* current membership
* board game availability
* request validity
* officer permission when required

---

## 15. Events and Attendance

Events contain:

```text
id
name
description
start_time
end_time
```

Attendance connects:

```text
users
    │
    └── event_attendance
            │
            └── events
```

Attendance statuses may include:

```text
present
absent
late
```

Member attendance workflows must verify membership requirements on the server.

---

## 16. Announcements

Announcements are public content.

Only current officers may:

* create announcements
* update announcements
* publish announcements

Public users may only see published announcements.

Unpublished announcements must not be publicly exposed.

Public queries must explicitly filter unpublished records:

```text
is_published = true
```

Never rely only on frontend hiding.

---

## 17. Data Access Layer

Keep complex database logic outside large UI components.

Recommended structure:

```text
src/
├── libs/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
│
├── services/
│   ├── users.ts
│   ├── memberships.ts
│   ├── officers.ts
│   ├── board-games.ts
│   ├── borrowings.ts
│   ├── events.ts
│   └── announcements.ts
```

Example domain functions:

```ts
getCurrentAcademicYear()
```

```ts
getCurrentMembership(userId)
```

```ts
isCurrentOfficer(userId)
```

```ts
getBoardGames()
```

```ts
createBorrowingRequest()
```

Services should contain domain-level data access and business rules where appropriate.

Do not place complex Supabase queries directly inside large UI components.

---

## 18. Supabase Client Rules

Use the correct Supabase client for the execution environment.

### Server Client

Use for:

* Server Components
* Server Actions
* Route Handlers
* server-side authorization
* server-side database access

### Browser Client

Use only when the browser genuinely needs to interact with Supabase directly.

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

or any privileged secret to the browser.

Never use server-only credentials in Client Components.

---

## 19. Server Actions and Route Handlers

Use Server Actions when appropriate for:

* form submissions
* server-side mutations
* tightly coupled application actions

Use Route Handlers when a real HTTP endpoint is required.

Do not create an API route merely to fetch data that can be loaded directly by a Server Component.

Every mutation must:

```text
Authenticate
    │
    ▼
Authorize
    │
    ▼
Validate
    │
    ▼
Mutate
```

---

## 20. Search Params, Filtering, and Pagination

For public list pages such as:

```text
/board-games
/events
/announcements
```

prefer URL search parameters for shareable state.

Examples:

```text
/board-games?category=strategy
```

```text
/board-games?status=available
```

```text
/announcements?page=2
```

```text
/events?year=115
```

Search parameters should be:

* validated
* normalized
* used server-side when possible

Do not store shareable filtering state only in React state.

---

## 21. Components

Recommended structure:

```text
src/components/
├── layout/
│   ├── Header/
│   ├── Footer/
│   └── Navigation/
│
├── ui/
│   ├── Button/
│   ├── Card/
│   ├── Badge/
│   ├── Dialog/
│   └── ...
│
├── board-games/
├── announcements/
├── events/
├── officers/
├── dashboard/
└── admin/
```

Create reusable components when a real pattern repeats.

Avoid premature abstraction.

Do not create generic components such as:

```text
UniversalCard
UniversalButton
UniversalModal
```

unless the behavior is genuinely shared.

Prefer meaningful domain components:

```text
BoardGameCard
EventCard
AnnouncementCard
OfficerCard
BorrowingStatusBadge
```

---

## 22. TypeScript

Strict typing must be preserved.

Never use:

```ts
any
```

to bypass type errors.

Avoid unnecessary:

```ts
as SomeType
```

and:

```ts
!
```

Prefer explicit domain types.

Example:

```ts
type MembershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "suspended"
  | "cancelled";
```

```ts
type BorrowingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "borrowed"
  | "returned";
```

```ts
type BoardGameStatus =
  | "available"
  | "borrowed"
  | "maintenance"
  | "lost"
  | "damaged"
  | "retired";
```

Shared domain types belong in:

```text
src/types/
```

Do not duplicate the same union type in multiple files.

---

## 23. Design System

The source of truth for the visual design system is:

```text
src/styles/globals.css
```

Do not create a separate design system.

Reuse the existing CSS variables and utility classes.

The visual language should be:

* playful
* friendly
* clean
* modern
* approachable
* slightly game-inspired

Avoid:

* excessive corporate styling
* childish styling
* visual noise
* excessive decoration

Board-game-inspired visual elements may be used sparingly.

Decoration must support the content.

---

## 24. Color System

Use existing CSS variables.

Prefer:

```css
var(--foreground)
```

```css
var(--foreground-secondary)
```

```css
var(--muted)
```

```css
var(--background)
```

```css
var(--primary-background)
```

```css
var(--secondary-background)
```

```css
var(--tertiary-background)
```

```css
var(--primary)
```

```css
var(--primary-light)
```

```css
var(--primary-dark)
```

```css
var(--secondary)
```

```css
var(--tertiary)
```

Game colors:

```css
var(--game-red)
var(--game-green)
var(--game-yellow)
var(--game-blue)
```

Do not introduce unrelated hardcoded colors when an existing token can express the same intent.

---

## 25. Borders, Shadows, and Radius

Reuse the existing design tokens:

```css
var(--border)
var(--border-strong)
```

```css
var(--shadow-base)
var(--shadow-card)
var(--shadow-hover)
var(--shadow-card-hover)
```

```css
var(--border-radius-sm)
var(--border-radius-md)
var(--border-radius-lg)
var(--border-radius-xl)
var(--border-radius-2xl)
```

Do not create duplicate values for existing design tokens.

---

## 26. Layout

Use the existing container system:

```text
.container
```

The maximum width is defined by:

```css
var(--container-max-width)
```

Do not duplicate the container width in multiple components.

Preserve responsive behavior.

The default mobile container padding is already defined by the global stylesheet.

---

## 27. Cards

Cards are appropriate for:

* board games
* events
* announcements
* officers
* borrowing records
* dashboard summaries

Use:

```text
.card
```

when the existing card behavior is appropriate.

Cards should provide:

* clear hierarchy
* consistent spacing
* readable content
* subtle borders
* purposeful interaction feedback

Interactive cards may use hover feedback.

Static cards should not appear clickable.

Do not add heavy animations to every card.

---

## 28. Buttons

Use the existing button system:

```text
.btn
```

Available semantic variants include:

```text
primary
secondary
outline
green
yellow
danger
```

Buttons must clearly communicate their action.

Dangerous actions such as:

```text
刪除
拒絕借用
取消
```

must be visually distinguishable from normal actions.

Do not rely on color alone to communicate meaning.

---

## 29. Statuses

Use consistent status mappings.

Board game statuses:

```text
available
borrowed
maintenance
lost
damaged
retired
```

Borrowing statuses:

```text
pending
approved
rejected
borrowed
returned
```

Use shared status metadata where statuses appear in multiple places.

For example:

```ts
const borrowingStatusMeta = {
  pending: {
    label: "待審核",
  },
  approved: {
    label: "已核准",
  },
} as const;
```

Avoid duplicating label and presentation logic.

---

## 30. Icons

Use existing icon libraries:

* Ant Design Icons
* react-icons

Do not introduce another icon library.

Icon-only buttons must have accessible labels.

Example:

```tsx
<button aria-label="刪除桌遊">
  <DeleteOutlined />
</button>
```

---

## 31. Animation and Motion

This project does not use Framer Motion.

Do not install or introduce Framer Motion.

Do not introduce another animation library.

Use:

* CSS transitions
* CSS keyframe animations
* existing transition variables
* existing animation classes

Existing animation tokens include:

```css
var(--transition-fast)
var(--transition-normal)
var(--transition-slow)
```

Existing timing functions include:

```css
var(--transition-timing)
var(--transition-bounce)
```

Existing animation classes include:

```text
.animate-pop
.animate-appear
.animate-turn
```

Use CSS transitions for:

* button interactions
* hover states
* card interactions
* dropdowns
* expandable sections

Use CSS keyframes for:

* loading animations
* shimmer effects
* simple visual state transitions

Avoid:

* excessive bouncing
* unnecessary motion
* animation on every element

Always respect:

```text
prefers-reduced-motion
```

The existing global stylesheet already provides reduced-motion handling. New animations must not bypass it.

---

## 32. Accessibility

Use semantic HTML.

Prefer:

```html
button
```

over:

```html
div
```

for actions.

Interactive elements must be keyboard accessible.

Use appropriate attributes such as:

```text
aria-label
aria-expanded
aria-controls
aria-current
```

Do not communicate important information only through:

* color
* hover
* animation

Images must have meaningful `alt` text.

Icon-only controls must have accessible names.

---

## 33. Loading States

Data-heavy routes should consider:

```text
loading.tsx
```

Use the existing skeleton system where appropriate:

```text
.skeleton
```

```text
.skeleton-line
```

Loading UI should:

* preserve layout structure
* avoid unnecessary layout shifts
* communicate what is loading

Do not use arbitrary spinners everywhere.

The existing shimmer animation should respect reduced-motion preferences.

---

## 34. Error Handling

Use:

```text
error.tsx
```

for route-level errors when appropriate.

User-facing errors should be:

* understandable
* actionable when possible
* free from sensitive implementation details

Do not expose:

* database errors
* SQL errors
* stack traces
* internal server details

to users.

---

## 35. Forms

Data-modifying forms must:

1. Validate input.
2. Authenticate the user.
3. Check authorization.
4. Perform the mutation.
5. Return a meaningful result.

Client-side validation improves UX.

Server-side validation is mandatory for security.

Never trust only client-side validation.

---

## 36. Security Rules

Never authorize based on:

```text
localStorage
```

```text
sessionStorage
```

```text
useState
```

```text
isOfficer === true
```

Never trust client-provided:

```text
user_id
author_id
approved_by_user_id
membership status
officer status
role
```

The server must determine these values.

Never expose:

```text
service role keys
```

to the browser.

Never expose unpublished announcements through public routes.

Never allow:

* non-members to borrow board games
* non-members to perform member-only attendance operations
* non-officers to perform administrative mutations

---

## 37. File Naming

### Routes

Use:

```text
kebab-case
```

Example:

```text
board-games
```

### Components

Use:

```text
PascalCase
```

Example:

```text
BoardGameCard.tsx
```

### Hooks

Use:

```text
camelCase
```

Example:

```text
useCurrentUser.ts
```

### Utilities

Use:

```text
camelCase
```

Example:

```text
formatDate.ts
```

Avoid vague names such as:

```text
helper.ts
common.ts
misc.ts
stuff.ts
```

unless the file has a clearly defined and narrow purpose.

---

## 38. Development Workflow

Before modifying code:

1. Understand the target route.
2. Check whether the relevant Next.js API has changed.
3. Inspect local Next.js documentation when necessary.
4. Search for existing related components.
5. Search for existing hooks.
6. Search for existing utilities.
7. Search for existing types.
8. Search for existing Supabase queries.
9. Search for existing CSS variables.
10. Search for existing design patterns.
11. Implement the smallest appropriate change.

Do not rewrite unrelated working code.

---

## 39. AI Coding Agent Rules

AI coding agents must:

1. Prefer Server Components.
2. Keep Client Components small.
3. Preserve the existing architecture.
4. Reuse existing components.
5. Reuse existing hooks.
6. Reuse existing utilities.
7. Reuse existing types.
8. Reuse existing CSS variables.
9. Reuse existing Supabase clients.
10. Preserve the current academic-year permission model.
11. Verify authorization server-side.
12. Follow the installed Next.js version.
13. Check local Next.js documentation when necessary.
14. Avoid unnecessary dependencies.
15. Never add Framer Motion.
16. Never add another animation library.
17. Avoid unnecessary abstractions.
18. Avoid unrelated modifications.
19. Preserve accessibility.
20. Preserve responsive behavior.
21. Preserve reduced-motion support.
22. Keep public and private route responsibilities clear.

---

## 40. Forbidden

Never:

* use `any` to bypass TypeScript errors
* weaken TypeScript strictness
* add Framer Motion
* add another animation library
* add an unnecessary state management library
* add a duplicate component
* add a duplicate hook
* add a duplicate utility
* authorize from client state
* authorize from hidden UI
* authorize from URL paths alone
* trust client-provided role information
* expose service role keys
* hardcode academic year IDs
* hardcode officer names for authorization
* expose unpublished announcements publicly
* allow non-members to borrow board games
* allow non-members to perform member-only attendance operations
* allow non-officers to perform admin mutations
* put complex database logic inside large UI components
* expose raw database errors to users
* introduce unrelated design systems
* modify unrelated files for a small feature
* create unused components
* create dead code
* duplicate CSS variables
* ignore accessibility
* ignore reduced-motion preferences

---

## 41. Completion Checklist

Before completing an implementation:

### Architecture

* [ ] Correct App Router route was used.
* [ ] Existing route conventions were preserved.
* [ ] Server Components are used by default.
* [ ] Client Components are only used when necessary.
* [ ] No unnecessary dependency was introduced.
* [ ] Framer Motion was not introduced.
* [ ] No other animation library was introduced.

### Authentication

* [ ] Authentication is verified server-side.
* [ ] Authorization is verified server-side.
* [ ] Current academic year is not hardcoded.
* [ ] Membership status is correctly checked.
* [ ] Officer status is correctly checked.
* [ ] Client-provided permission information is not trusted.

### Data

* [ ] Existing services and queries were reused where appropriate.
* [ ] Complex database logic is not inside large UI components.
* [ ] Sensitive mutations perform server-side authorization.
* [ ] Public queries do not expose unpublished data.

### UI

* [ ] Existing design tokens were reused.
* [ ] Existing `global.css` design system was preserved.
* [ ] Existing button and card styles were reused where appropriate.
* [ ] Status labels are consistent.
* [ ] Responsive behavior was preserved.
* [ ] No unrelated design system was introduced.

### Animation

* [ ] No Framer Motion was introduced.
* [ ] No animation library was introduced.
* [ ] Existing CSS transition variables were reused.
* [ ] Existing CSS animation patterns were reused where appropriate.
* [ ] Reduced-motion behavior was preserved.

### Accessibility

* [ ] Semantic HTML is used.
* [ ] Interactive elements are keyboard accessible.
* [ ] Icon-only buttons have accessible labels.
* [ ] Images have meaningful alt text.
* [ ] Important information does not rely only on color.
* [ ] Reduced-motion preferences are respected.

### SEO

* [ ] Public metadata was updated when necessary.
* [ ] Sitemap behavior was considered.
* [ ] Robots behavior was considered.
* [ ] Private routes are not exposed as public SEO pages.

### Code Quality

* [ ] No duplicate component was created.
* [ ] No duplicate hook was created.
* [ ] No duplicate utility was created.
* [ ] Existing types were reused.
* [ ] No unnecessary `any` was introduced.
* [ ] No unrelated files were modified.
* [ ] No dead code was introduced.

---
