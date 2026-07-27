# NTUST Board Game Club Website

This document defines the architecture, coding conventions, security rules, data model, UI design system, and development workflow for the National Taiwan University of Science and Technology Board Game Club website.

AI coding agents and developers MUST follow these rules when modifying this repository.

---

## 1. Project Overview

This repository contains the official website and internal management system for the National Taiwan University of Science and Technology Board Game Club.

The application has two major responsibilities.

### 1.1 Public Website

Public users can:

- Learn about the club.
- Browse board games.
- View board game details.
- View events.
- View announcements.
- View current officers.

### 1.2 Internal Club System

Authenticated users may:

- Manage their personal profile.
- View personal records.
- View borrowing records.
- Participate in eligible attendance workflows.
- Borrow board games when they are current members.

Current officers may additionally:

- Manage board games.
- Manage members.
- Manage events.
- Manage attendance.
- Manage officer positions.
- Manage announcements.

---

## 2. Non-Negotiable Project Rules

The following rules are mandatory.

### Never

- Do not use `any` to bypass TypeScript errors.
- Do not weaken TypeScript strictness.
- Do not add Framer Motion.
- Do not add another animation library.
- Do not add unnecessary state management libraries.
- Do not trust client-provided authorization information.
- Do not authorize based on URL paths alone.
- Do not expose Supabase service-role credentials to the browser.
- Do not hardcode academic-year IDs in authorization logic.
- Do not hardcode officer names for authorization.
- Do not expose unpublished announcements publicly.
- Do not allow non-members to borrow board games.
- Do not allow non-officers to perform administrative mutations.
- Do not expose raw database errors or stack traces to users.
- Do not introduce a duplicate design system.
- Do not create duplicate components, hooks, utilities, or types without a clear reason.
- Do not modify unrelated files for a small feature.
- Do not introduce dead code.

### Always

- Prefer Server Components.
- Verify authentication and authorization server-side.
- Treat the database as the source of truth for permissions.
- Reuse existing components, hooks, utilities, types, services, and design tokens.
- Preserve responsive behavior.
- Preserve accessibility.
- Respect `prefers-reduced-motion`.
- Follow the installed Next.js version.
- Inspect local documentation when using unfamiliar Next.js APIs.
- Make the smallest appropriate change.

---

## 3. Technology Stack

The project uses:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Supabase Auth
- PostgreSQL through Supabase
- Ant Design Icons
- `react-icons`

Do not introduce additional dependencies unless there is a clear technical requirement.

The project does not use:

- Zustand
- TanStack Query
- React Hook Form
- Zod
- shadcn/ui
- Framer Motion
- Other animation libraries

Do not add these libraries unless the project explicitly adopts them in the future.

---

## 4. Next.js Version Policy

This project uses Next.js 16.

The installed version is the source of truth.

Before implementing unfamiliar or potentially changed Next.js behavior, inspect:

```text
node_modules/next/dist/docs/
```

Do not blindly rely on:

- Old tutorials.
- Outdated Stack Overflow answers.
- Old Next.js documentation.
- AI-generated code written for older Next.js versions.

---

## 5. Architecture

The application follows a Server-First architecture.

Preferred flow:

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

Server Components are the default.

Use Client Components only when required by:

- `useState`
- `useEffect`
- Event handlers
- Browser APIs
- `localStorage`
- `sessionStorage`
- Browser-only Supabase clients
- `useRouter`
- `usePathname`
- `useSearchParams`
- Interactive form state
- Dialogs
- Dropdowns
- Client-only UI behavior

Do not add:

```tsx
"use client";
```

merely because a component renders UI.

Keep Client Components as small and focused as possible.

---

## 6. App Router Structure

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
│   │   ├── announcements/
│   │   ├── events/
│   │   └── officers/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
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
│   │       ├── borrowings/
│   │       └── attendance/
│   │
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── board-games/
│   │       ├── members/
│   │       ├── events/
│   │       ├── attendance/
│   │       ├── officers/
│   │       └── announcements/
│   │
│   └── api/
│
├── components/
├── hooks/
├── libs/
├── services/
├── types/
├── utils/
└── styles/
```

Route groups are organizational tools only.

For example:

```text
src/app/(admin)/admin/page.tsx
```

maps to:

```text
/admin
```

Route groups do not provide authorization.

This is NOT authorization:

```text
(app)/(admin)
```

Authorization must be explicitly verified.

---

## 7. Authentication and Authorization

Authentication and authorization are separate concerns.

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

An officer is still an authenticated user.

Authentication is handled by Supabase Auth.

Authorization is determined by the database.

The database is the source of truth.

---

### 7.1 Authorization Flow

Sensitive operations should follow:

```text
Request
    │
    ▼
Authenticate user
    │
    ▼
Load current academic year
    │
    ▼
Check membership or officer status
    │
    ▼
Validate input
    │
    ▼
Perform operation
```

Every mutation must follow:

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

Never trust client-provided:

```text
user_id
author_id
approved_by_user_id
isMember
isOfficer
role
membership status
officer status
```

The server must derive these values from:

- The authenticated Supabase session.
- The database.

---

## 8. Current Academic Year

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

Do not assume the latest database row is automatically the current academic year.

The database is the source of truth.

A shared domain function should be preferred:

```ts
getCurrentAcademicYear()
```

---

## 9. Membership Authorization

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

- Historical memberships.
- Expired memberships.
- Cancelled memberships.
- Suspended memberships.

Preferred domain function:

```ts
getCurrentMembership(userId)
```

---

## 10. Officer Authorization

A user is a current officer when:

```text
officer_positions.user_id = currentUser.id
```

and:

```text
officer_positions.academic_year_id = currentAcademicYear.id
```

Do not hardcode officer names for authorization.

For example, authorization must not depend on:

```text
社長
副社長
美宣
攝影
```

The position name is a display concern.

The existence of a valid current-year officer position is the authorization concern.

Preferred domain function:

```ts
isCurrentOfficer(userId)
```

---

## 11. Supabase Security

Supabase access must follow the principle of least privilege.

### Server Client

Use for:

- Server Components.
- Server Actions.
- Route Handlers.
- Server-side authorization.
- Server-side database access.

### Browser Client

Use only when the browser genuinely needs direct Supabase interaction.

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

to the browser.

Never use service-role credentials in:

- Client Components.
- Browser code.
- Public environment variables.

---

### 11.1 Row Level Security

Database-level security is an additional protection layer.

When appropriate, Supabase Row Level Security policies should enforce:

- User-owned data access.
- Membership-related access.
- Officer-only administrative access.
- Public visibility of published content.

Application-level authorization must not be replaced by frontend checks.

Frontend visibility is never a security boundary.

---

## 12. Data Model

Primary entities include:

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

Shared domain types should live in:

```text
src/types/
```

Do not duplicate the same domain union type in multiple files.

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

- Authentication.
- Current membership.
- Board game existence.
- Board game availability.
- Request validity.
- Officer permission when required.

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

Attendance workflows must verify all required permissions server-side.

---

## 16. Announcements

Announcements are public content.

Only current officers may:

- Create announcements.
- Update announcements.
- Publish announcements.

Public users may only see published announcements.

Public queries must explicitly filter:

```text
is_published = true
```

Never rely only on frontend hiding.

Unpublished content must not be exposed through:

- Public Server Components.
- Public Route Handlers.
- Public APIs.
- Search results.
- SEO metadata.
- Sitemap entries.

---

## 17. Data Access Layer

Complex domain data access should be kept outside large UI components.

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

Services may contain:

- Domain-specific database queries.
- Authorization-related data lookup.
- Business rules that are shared across multiple entry points.

However, do not over-abstract simple one-off queries.

The goal is clear separation of responsibilities, not maximum abstraction.

---

## 18. Server Actions and Route Handlers

Use Server Actions for:

- Form submissions.
- Server-side mutations.
- Application actions tightly coupled to the UI.

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

## 19. Search Parameters, Filtering, and Pagination

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

Search parameters must be:

- Validated.
- Normalized.
- Used server-side when possible.

Do not store shareable filtering state only in React state.

---

## 20. Components

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

Prefer meaningful domain components:

```text
BoardGameCard
EventCard
AnnouncementCard
OfficerCard
BorrowingStatusBadge
```

Avoid vague abstractions such as:

```text
UniversalCard
UniversalButton
UniversalModal
```

unless the behavior is genuinely shared.

---

## 21. TypeScript

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

---

## 22. Design System

The visual source of truth is:

```text
src/styles/globals.css
```

Do not create a separate design system.

Reuse existing CSS variables and utility classes.

The visual language should be:

- Playful.
- Friendly.
- Clean.
- Modern.
- Approachable.
- Slightly game-inspired.

Avoid:

- Excessive corporate styling.
- Childish styling.
- Visual noise.
- Excessive decoration.

Decoration should support the content.

---

### 22.1 Color Tokens

Prefer existing variables:

```css
var(--foreground)
var(--foreground-secondary)
var(--muted)
var(--muted-light)

var(--background)
var(--primary-background)
var(--secondary-background)
var(--tertiary-background)

var(--primary)
var(--primary-light)
var(--primary-dark)

var(--secondary)
var(--tertiary)

var(--game-red)
var(--game-green)
var(--game-yellow)
var(--game-blue)
```

Do not introduce unrelated hardcoded colors when an existing token expresses the same intent.

---

### 22.2 Borders, Shadows, and Radius

Reuse:

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

Do not duplicate existing design token values.

---

### 22.3 Layout

Use:

```text
.container
```

The maximum width is defined by:

```css
var(--container-max-width)
```

Do not duplicate the container width in individual components.

Preserve the existing responsive behavior.

---

## 23. Cards

Cards are appropriate for:

- Board games.
- Events.
- Announcements.
- Officers.
- Borrowing records.
- Dashboard summaries.

Use:

```text
.card
```

when the existing behavior is appropriate.

Interactive cards may use hover feedback.

Static cards should not appear clickable.

Avoid heavy animations on every card.

---

## 24. Buttons

Use:

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

Dangerous actions such as:

```text
刪除
拒絕借用
取消
```

must be visually distinguishable from normal actions.

Do not rely on color alone to communicate meaning.

---

## 25. Statuses

Status labels and presentation should be centralized when reused.

Example:

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

Avoid duplicating status labels and presentation logic across components.

---

## 26. Icons

Use existing icon libraries:

- Ant Design Icons.
- `react-icons`.

Do not introduce another icon library.

Icon-only buttons must have accessible names.

Example:

```tsx
<button aria-label="刪除桌遊">
  <DeleteOutlined />
</button>
```

---

## 27. Animation and Motion

This project does not use Framer Motion.

Do not introduce another animation library.

Use:

- CSS transitions.
- CSS keyframes.
- Existing transition variables.
- Existing animation classes.

Existing transition tokens:

```css
var(--transition-fast)
var(--transition-normal)
var(--transition-slow)
```

Existing timing functions:

```css
var(--transition-timing)
var(--transition-bounce)
```

Existing animation classes:

```text
.animate-pop
.animate-appear
.animate-turn
```

Use CSS transitions for:

- Button interactions.
- Hover states.
- Card interactions.
- Dropdowns.
- Expandable sections.

Use CSS keyframes for:

- Loading animations.
- Shimmer effects.
- Simple visual state transitions.

Avoid:

- Excessive bouncing.
- Unnecessary motion.
- Animation on every element.

Always respect:

```text
prefers-reduced-motion
```

---

## 28. Accessibility

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

- Color.
- Hover.
- Animation.

Images must have meaningful `alt` text.

Icon-only controls must have accessible names.

---

## 29. Loading States

Data-heavy routes should consider:

```text
loading.tsx
```

Use:

```text
.skeleton
```

and:

```text
.skeleton-line
```

where appropriate.

Loading UI should:

- Preserve layout structure.
- Avoid unnecessary layout shifts.
- Communicate what is loading.

Do not use arbitrary spinners everywhere.

The existing shimmer animation must respect reduced-motion preferences.

---

## 30. Error Handling

Use:

```text
error.tsx
```

for route-level errors when appropriate.

User-facing errors should be:

- Understandable.
- Actionable when possible.
- Free from sensitive implementation details.

Do not expose:

- Database errors.
- SQL errors.
- Stack traces.
- Internal server details.

Use server-side logging for debugging.

---

## 31. Forms

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

## 32. File Naming

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

unless the file has a clearly defined and narrow responsibility.

---

## 33. Development Workflow

Before modifying code:

1. Understand the target route and user flow.
2. Identify whether the change is public, authenticated, or administrative.
3. Check the installed Next.js version.
4. Inspect local Next.js documentation when necessary.
5. Search for existing related components.
6. Search for existing hooks.
7. Search for existing utilities.
8. Search for existing types.
9. Search for existing services and Supabase queries.
10. Search for existing CSS variables and design patterns.
11. Identify the smallest appropriate change.
12. Implement the change.
13. Check TypeScript errors.
14. Check linting and formatting.
15. Check responsive behavior.
16. Check accessibility.
17. Check authorization for all sensitive operations.
18. Review the final diff for unrelated changes.

---

## 34. Git and Change Scope

Changes should be focused and reviewable.

Prefer:

```text
one feature
```

or:

```text
one bug fix
```

per change.

Do not mix unrelated:

- Refactoring.
- Formatting changes.
- Dependency updates.
- Feature work.

Avoid large rewrites when a smaller change solves the problem.

Before finishing, inspect:

```text
git diff
```

and verify that unrelated files were not modified.

---

## 35. SEO

For public routes:

- Provide appropriate metadata.
- Consider Open Graph metadata.
- Keep sitemap behavior updated when necessary.
- Keep robots behavior updated when necessary.

Private routes must not be exposed as public SEO pages.

Do not include:

- Dashboard routes.
- Admin routes.
- Private user pages.

in public sitemap entries.

---

## 36. Completion Checklist

Before completing an implementation:

### Architecture

- [ ] Correct App Router route was used.
- [ ] Existing route conventions were preserved.
- [ ] Server Components are used by default.
- [ ] Client Components are only used when necessary.
- [ ] No unnecessary dependency was introduced.
- [ ] No animation library was introduced.
- [ ] No unrelated architecture was introduced.

### Authentication and Authorization

- [ ] Authentication is verified server-side.
- [ ] Authorization is verified server-side.
- [ ] Current academic year is not hardcoded.
- [ ] Membership status is correctly checked.
- [ ] Officer status is correctly checked.
- [ ] Client-provided permission information is not trusted.
- [ ] Sensitive mutations follow authenticate → authorize → validate → mutate.

### Data

- [ ] Existing services and queries were reused where appropriate.
- [ ] Complex database logic is not inside large UI components.
- [ ] Public queries do not expose unpublished data.
- [ ] Sensitive data is not unnecessarily exposed.
- [ ] Database-level security is considered where appropriate.

### UI

- [ ] Existing design tokens were reused.
- [ ] Existing button and card styles were reused where appropriate.
- [ ] Status labels are consistent.
- [ ] Responsive behavior was preserved.
- [ ] No unrelated design system was introduced.

### Animation

- [ ] No Framer Motion was introduced.
- [ ] No other animation library was introduced.
- [ ] Existing CSS transition variables were reused.
- [ ] Reduced-motion behavior was preserved.

### Accessibility

- [ ] Semantic HTML is used.
- [ ] Interactive elements are keyboard accessible.
- [ ] Icon-only buttons have accessible labels.
- [ ] Images have meaningful alt text.
- [ ] Important information does not rely only on color.
- [ ] Reduced-motion preferences are respected.

### SEO

- [ ] Public metadata was updated when necessary.
- [ ] Sitemap behavior was considered.
- [ ] Robots behavior was considered.
- [ ] Private routes are not exposed as public SEO pages.

### Code Quality

- [ ] No duplicate component was created.
- [ ] No duplicate hook was created.
- [ ] No duplicate utility was created.
- [ ] Existing types were reused.
- [ ] No unnecessary `any` was introduced.
- [ ] No unrelated files were modified.
- [ ] No dead code was introduced.
- [ ] TypeScript checks pass.
- [ ] Linting checks pass where applicable.
- [ ] The final diff was reviewed.
