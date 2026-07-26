# NTUST Board Game Club Website

## Overview

This repository is the official website and internal management system for the National Taiwan University of Science and Technology Board Game Club.

The project serves two purposes:

1. A public-facing website for discovering the club, board games, events, announcements, and current officers.
2. A private club management system for authenticated users, members, and officers.

The application is built with Next.js App Router and follows a route-based, server-first architecture.

The main domain concepts are:

- Users
- Memberships
- Academic years
- Officer positions
- Board games
- Board game categories
- Locations
- Borrowing records
- Events
- Event attendance
- Announcements

The application has four effective permission levels:

1. Unauthenticated users
2. Authenticated users who are not current members
3. Current members
4. Current officers

Authentication and authorization are separate concerns.

A user being authenticated does not automatically make them a club member or officer.

---

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Supabase Auth
- PostgreSQL through Supabase
- Framer Motion when animation is required
- Ant Design Icons and react-icons for icons

Do not introduce Zustand, TanStack Query, React Hook Form, Zod, shadcn/ui, or another state/UI library unless the project explicitly adopts it for a real requirement.

Prefer the existing project stack and native React/Next.js capabilities.

---

## Project Structure

The expected application structure is:

```text
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   │
│   ├── (public)/
│   │   ├── board-games/
│   │   ├── announcements/
│   │   ├── officers/
│   │   └── events/
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
│   └── (admin)/
│       └── admin/
│           ├── layout.tsx
│           ├── page.tsx
│           ├── board-games/
│           ├── members/
│           ├── events/
│           ├── attendance/
│           ├── officers/
│           └── announcements/
│
├── components/
├── contexts/
├── hooks/
├── libs/
├── utils/
├── types/
└── styles/
```

Route groups such as `(public)`, `(auth)`, `(authenticated)`, and `(admin)` are organizational structures.

They do not appear in the URL.

For example:

```text
src/app/(public)/board-games/page.tsx
```

maps to:

```text
/board-games
```

Do not treat route groups as the actual authorization system.

Authorization must be enforced through authentication and database-backed permission checks.

---

## Architecture

### Server-first

Use Server Components by default.

Use Client Components only when the component requires:

- React state
- React effects
- browser APIs
- event handlers
- localStorage
- Supabase browser client
- `useRouter`
- `useSearchParams`
- `usePathname`
- Framer Motion client behavior
- interactive forms
- dialogs, dropdowns, or other browser interactions

Do not add `"use client"` unnecessarily.

Keep client boundaries as small as possible.

---

## Authentication and Authorization

Authentication is handled through Supabase Auth.

Authorization is determined from the database.

The effective permission hierarchy is:

```text
Unauthenticated
    │
    └── Public pages only

Authenticated
    │
    ├── Not a current member
    │   └── Personal dashboard and profile
    │
    └── Current member
        ├── Personal dashboard
        ├── Borrowing board games
        └── Event attendance

Current officer
    └── Officer administration
```

A user is considered a current member only when they have a valid membership for the current academic year.

A user is considered a current officer only when they have a valid officer position for the current academic year.

Do not infer officer status from:

- email address
- user name
- frontend state
- hidden UI elements
- URL paths alone

The database is the source of truth.

---

## Permission Rules

The permission model is:

| Feature               | Unauthenticated | Authenticated Non-member | Member | Officer |
| --------------------- | --------------- | ------------------------ | ------ | ------- |
| View homepage         | Yes             | Yes                      | Yes    | Yes     |
| View board games      | Yes             | Yes                      | Yes    | Yes     |
| View announcements    | Yes             | Yes                      | Yes    | Yes     |
| Register account      | Yes             | No                       | No     | No      |
| Event attendance      | No              | No                       | Yes    | Yes     |
| Borrow board games    | No              | No                       | Yes    | Yes     |
| View personal records | No              | Yes                      | Yes    | Yes     |
| Manage board games    | No              | No                       | No     | Yes     |
| Publish announcements | No              | No                       | No     | Yes     |

The UI may hide unavailable actions for better UX.

However, hiding a button is not authorization.

Every sensitive operation must also verify permissions on the server.

---

## Route Protection

### Public routes

Public routes include:

```text
/
/board-games
/board-games/[id]

/announcements
/announcements/[id]

/events
/events/[id]

/officers
```

These routes should not require authentication.

---

### Auth routes

Auth routes include:

```text
/login
/register
/forgot-password
```

The OAuth or authentication callback is:

```text
/auth/callback
```

The callback is a Route Handler, not a page.

Use:

```text
src/app/auth/callback/route.ts
```

for authentication callback processing.

---

### Authenticated routes

Authenticated routes include:

```text
/dashboard
/dashboard/profile
/dashboard/borrowings
/dashboard/attendance
```

The dashboard layout should verify that a user is authenticated.

Do not assume that an authenticated user is a member.

---

### Officer routes

Officer routes include:

```text
/admin
/admin/board-games
/admin/members
/admin/events
/admin/attendance
/admin/officers
/admin/announcements
```

The admin layout must verify that the current user has an active officer position for the current academic year.

Do not rely only on:

```text
/admin
```

being hidden from navigation.

---

## Database Domain Model

### Users

The `users` table represents application users.

```text
users
├── id
├── name
├── email
├── avatar
├── created_at
└── updated_at
```

The `id` is the primary identity used to connect users with:

- memberships
- officer positions
- borrowing records
- event attendance
- announcement authors

---

### Memberships

Memberships are academic-year based.

A user's membership status must be evaluated together with the current academic year.

Do not treat a historical membership as a current membership.

Conceptually:

```text
users
    │
    └── memberships
            │
            └── academic_years
```

A current member should generally satisfy:

```text
membership.status = "active"
```

and:

```text
academic_years.is_current = true
```

---

### Academic Years

Academic years define the active club period.

Use the `academic_years` table as the source of truth for the current academic year.

Do not hardcode:

```text
114
115
116
```

in application logic.

Prefer querying the current academic year.

---

### Officer Positions

Officer status is determined by:

```text
officer_positions
    │
    ├── user_id
    ├── position_id
    └── academic_year_id
```

A user is a current officer only when their officer position belongs to the current academic year.

The `positions` table contains position definitions such as:

```text
社長
副社長
美宣
攝影
文書
器材
```

Do not hardcode officer names in permission logic.

---

## Board Game Domain

The main board game entity is:

```text
board_games
```

A board game may belong to:

- a category
- a location
- a current availability state

The board game status represents the state of the physical game:

```text
available
borrowed
maintenance
lost
damaged
retired
```

Do not confuse board game status with borrowing record status.

---

## Borrowing Domain

Borrowing records represent a borrowing workflow.

The borrowing status represents the state of a borrowing request:

```text
pending
approved
rejected
borrowed
returned
```

The general workflow is:

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

The server must verify:

- the user is authenticated
- the user is a current member
- the board game is borrowable
- the borrowing request is valid
- the officer has permission to approve or reject

Never trust client-provided:

- `user_id`
- `approved_by_user_id`
- membership status
- officer status
- borrowing status

These values must be determined or verified on the server.

---

## Event Domain

Events represent club activities.

Examples include:

```text
社課
桌遊活動
迎新
社員大會
桌遊營
```

Events contain:

```text
id
name
description
start_time
end_time
```

Attendance records connect users and events.

```text
event_attendance
├── user_id
├── event_id
├── attended_at
└── status
```

Attendance status may include:

```text
present
absent
late
```

Only current members may participate in member attendance workflows unless the event explicitly has another policy.

---

## Announcement Domain

Announcements are public content.

Only officers may create or publish announcements.

Public users may only see published announcements.

The distinction between:

```text
is_published = false
```

and:

```text
is_published = true
```

must be enforced server-side.

Unpublished announcements must not be publicly accessible through public routes.

---

## Data Access

Keep database access separate from presentation components.

Prefer a structure such as:

```text
src/
├── libs/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
│
├── services/
│   ├── board-games.ts
│   ├── borrowings.ts
│   ├── memberships.ts
│   ├── officers.ts
│   ├── events.ts
│   └── announcements.ts
```

If the project does not yet need a `services/` directory, do not create one merely for organizational symmetry.

The important rule is:

> Do not place complex Supabase queries directly inside large UI components.

Keep database queries:

- typed
- reusable
- easy to test
- close to their domain

---

## Supabase Rules

Use the appropriate Supabase client for the execution environment.

Use a server client for:

- Server Components
- Server Actions
- Route Handlers
- server-side authorization checks

Use a browser client only for:

- browser-side authentication flows
- client-side interactions that genuinely require it

Never expose:

- service role keys
- server-only secrets
- privileged database credentials

to client components.

---

## Security Rules

Never trust authorization information from the client.

Do not authorize based on:

```ts
localStorage
```

```ts
sessionStorage
```

```ts
useState
```

```ts
isOfficer === true
```

or a client-controlled request body.

The server must verify authorization from the authenticated session and database.

For sensitive mutations:

```text
Request
    │
    ▼
Authenticate user
    │
    ▼
Load current user
    │
    ▼
Check membership/officer status
    │
    ▼
Validate input
    │
    ▼
Perform mutation
```

---

## App Router Rules

Follow the repository's Next.js 16 documentation.

Before implementing unfamiliar or potentially changed Next.js APIs:

```text
node_modules/next/dist/docs/
```

must be checked first.

Do not rely blindly on historical Next.js patterns.

Use:

- `page.tsx` for UI routes
- `layout.tsx` for shared route layouts
- `route.ts` for HTTP Route Handlers
- `loading.tsx` for route loading UI
- `error.tsx` for route error boundaries
- `not-found.tsx` for not-found handling
- `sitemap.ts` for sitemap generation
- `robots.ts` for robots generation

Use `generateMetadata` for dynamic page metadata when needed.

---

## Metadata and SEO

Every public page should have appropriate metadata.

Public routes should consider:

- title
- description
- canonical URL
- Open Graph metadata
- Twitter metadata when appropriate

Private routes such as:

```text
/dashboard
/admin
```

should generally not be indexed.

When adding or renaming public routes:

1. Update metadata.
2. Check sitemap behavior.
3. Check robots behavior.
4. Check canonical URLs.

Do not expose private application routes through the public sitemap.

---

## Components

Use reusable components when there is a real repeated pattern.

Recommended component organization:

```text
src/components/
├── layout/
│   ├── Header/
│   ├── Footer/
│   └── ...
│
├── board-games/
├── announcements/
├── events/
├── officers/
├── dashboard/
├── admin/
└── ui/
```

Do not create generic components prematurely.

For example, do not create:

```text
UniversalCard
UniversalButton
UniversalTable
UniversalModal
```

unless the same behavior is genuinely repeated across multiple features.

Prefer domain-specific components such as:

```text
BoardGameCard
BorrowingStatusBadge
AnnouncementCard
EventCard
OfficerCard
```

when the component represents real domain behavior.

---

## React Rules

Use function components.

Use hooks only in Client Components.

Keep state as close as possible to the component that owns it.

Do not move state into global state unless multiple unrelated parts of the application genuinely need it.

Prefer:

```text
Server Component
    │
    ├── fetch server data
    │
    └── Client Component
            │
            └── interactive behavior
```

Keep client components small.

---

## Hooks

Hooks should represent reusable client-side behavior.

Examples of valid hooks:

```text
useCurrentUser
useAuth
useDebounce
useDisclosure
useMediaQuery
useBoardGameFilters
```

Do not create a hook for a one-line operation.

Do not duplicate hooks.

Before creating a hook:

1. Search `src/hooks/`.
2. Search existing components.
3. Search utilities.
4. Check whether the behavior can remain local state.

---

## TypeScript Rules

Strict typing must be preserved.

Do not weaken TypeScript configuration to make code compile.

Avoid:

```ts
any
```

unnecessary:

```ts
as SomeType
```

and unnecessary:

```ts
!
```

Prefer explicit domain types.

Examples:

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

Keep shared domain types in:

```text
src/types/
```

Do not duplicate the same domain union in multiple files.

---

## Tailwind CSS

Tailwind CSS 4 is used.

Follow the existing CSS-first configuration.

Do not assume that a `tailwind.config.*` file exists.

Prefer Tailwind utility classes for:

- layout
- spacing
- typography
- responsive behavior

Use CSS variables for shared design tokens.

---

## Styling Rules

The global stylesheet is the source of truth for shared design tokens and primitives.

The design system uses CSS custom properties for:

- foreground colors
- background colors
- primary colors
- secondary colors
- borders
- shadows
- border radii
- animation timing
- container widths

Prefer:

```css
var(--foreground)
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

instead of hardcoding repeated colors.

Do not introduce unrelated color systems.

---

## Design Language

The website is a university board game club website.

The visual language should be:

- playful
- friendly
- clean
- modern
- approachable
- slightly game-like

Avoid making the interface:

- overly corporate
- overly childish
- overly decorative
- visually noisy

Use board-game-inspired decoration sparingly.

Decorative elements should support the content rather than compete with it.

---

## Cards

Cards should be used for:

- board games
- events
- announcements
- officers
- borrowing records
- dashboard summaries

Cards should have:

- clear hierarchy
- consistent padding
- readable content
- subtle borders
- purposeful hover feedback

Do not make every card heavily animated.

Use hover effects only when the card is interactive.

Static informational cards should not appear clickable.

---

## Buttons

Buttons should communicate their action clearly.

Use consistent semantic variants such as:

```text
primary
secondary
danger
ghost
```

Do not create a unique visual style for every button.

Dangerous actions such as:

```text
刪除
拒絕借用
取消
```

should be visually distinguishable from normal actions.

Do not rely on color alone to communicate status.

---

## Statuses

Status labels should be consistent across the application.

Examples:

```text
available
borrowed
maintenance
lost
damaged
retired
```

and:

```text
pending
approved
rejected
returned
```

Use a shared status mapping when the same status appears in multiple places.

Avoid duplicating status label and styling logic in multiple components.

---

## Icons

Prefer the existing icon libraries already used by the project.

Do not introduce another icon library.

Icons must have meaningful accessible labels when they are the only content of a button.

For example:

```tsx
<button aria-label="刪除桌遊">
  <DeleteOutlined />
</button>
```

---

## Accessibility

Use semantic HTML.

Interactive elements must be keyboard accessible.

Do not use a `div` as a button.

Provide:

```text
aria-label
aria-expanded
aria-controls
```

where appropriate.

Do not rely only on:

- color
- hover
- animation

to communicate information.

Provide meaningful alt text for images.

Respect:

```text
prefers-reduced-motion
```

---

## Motion

Use animation purposefully.

Prefer subtle transitions for:

- card hover
- button interaction
- loading states
- route UI
- list appearance

Do not animate every element.

Avoid excessive bouncing or game-like motion in administrative interfaces.

Respect reduced-motion preferences.

---

## Loading and Error States

Every data-heavy route should consider:

```text
loading.tsx
```

and:

```text
error.tsx
```

Loading states should use the existing skeleton design system where appropriate.

Error messages should be:

- understandable
- actionable when possible
- free of sensitive server details

Do not expose database errors directly to users.

---

## Forms

Forms that modify data must:

1. Validate input.
2. Authenticate the user.
3. Check authorization.
4. Perform the mutation.
5. Return a meaningful success or error state.

Do not rely only on client-side validation.

Client-side validation improves UX.

Server-side validation provides security.

---

## API and Mutations

Use Route Handlers or the project's established mutation pattern.

Keep API routes under:

```text
src/app/api/
```

when a real HTTP API endpoint is needed.

Do not create API routes merely to fetch data that can be fetched directly by a Server Component.

Prefer direct server-side data access for server-rendered pages when appropriate.

---

## Database Mutations

For mutations such as:

```text
Create board game
Update board game
Delete board game
Approve borrowing
Reject borrowing
Create event
Update event
Publish announcement
```

always verify authorization on the server.

A mutation must not trust client-supplied:

```text
user_id
author_id
approved_by_user_id
membership status
officer status
```

---

## Route Design

The public URL structure is:

```text
/
/board-games
/board-games/[id]

/announcements
/announcements/[id]

/events
/events/[id]

/officers

/login
/register
/forgot-password

/dashboard
/dashboard/profile
/dashboard/borrowings
/dashboard/attendance

/admin
/admin/board-games
/admin/members
/admin/events
/admin/attendance
/admin/officers
/admin/announcements
```

Keep URLs stable and meaningful.

Do not expose internal implementation details in public URLs.

---

## File and Module Naming

Use kebab-case for route directories:

```text
board-games
```

Use PascalCase for React components:

```text
BoardGameCard.tsx
```

Use camelCase for utilities and hooks:

```text
useCurrentUser.ts
```

Use descriptive domain names.

Avoid vague names such as:

```text
helper.ts
common.ts
misc.ts
stuff.ts
```

unless the file has a clearly defined purpose.

---

## Before Writing Code

Before modifying code:

1. Read the relevant Next.js documentation in `node_modules/next/dist/docs/` when the API or convention may have changed.
2. Understand the route where the change belongs.
3. Search for existing related components.
4. Search for existing hooks.
5. Search for existing utilities.
6. Search for existing types.
7. Search for existing Supabase queries.
8. Search for existing CSS variables.
9. Search for existing design patterns.
10. Only then implement the smallest appropriate change.

---

## AI Development Rules

AI must follow these rules:

1. Do not create duplicate components.
2. Do not create duplicate hooks.
3. Do not create duplicate utilities.
4. Do not introduce a new dependency without a real requirement.
5. Do not modify unrelated files.
6. Do not rewrite working code unnecessarily.
7. Do not bypass server-side authorization.
8. Do not trust client-provided permission values.
9. Do not break Supabase authentication.
10. Do not break the current academic-year permission model.
11. Do not hardcode current academic years.
12. Do not hardcode officer names for authorization.
13. Do not expose private routes through public SEO configuration.
14. Do not break the existing theme or design tokens.
15. Do not introduce an unrelated design system.
16. Prefer server components.
17. Keep client components small.
18. Keep domain logic close to its domain.
19. Preserve existing route conventions.
20. Follow the project's actual Next.js version and local documentation.

---

## Forbidden

Never:

- use `any` to bypass typing
- weaken TypeScript strictness
- trust client-side role information
- authorize users based only on hidden UI
- expose service role keys to the browser
- put complex database logic inside large UI components
- create duplicate Button or Card systems unnecessarily
- introduce a new state management library without a clear need
- create unused components
- create dead code
- duplicate CSS variables
- hardcode academic year IDs
- hardcode officer names for authorization
- expose unpublished announcements publicly
- allow non-members to borrow board games
- allow non-members to perform member-only attendance operations
- allow non-officers to perform administrative mutations
- break accessibility for visual effects
- ignore reduced-motion preferences
- modify unrelated code as part of a small feature

---

## Completion Checklist

Before finishing an implementation, verify:

- [ ] The correct App Router route was used.
- [ ] The relevant Next.js 16 documentation was checked when needed.
- [ ] Server Components are used by default.
- [ ] Client Components are only used when necessary.
- [ ] Authentication is verified server-side.
- [ ] Authorization is verified server-side.
- [ ] Current academic year logic is not hardcoded.
- [ ] Membership status is correctly checked.
- [ ] Officer status is correctly checked.
- [ ] No client-provided role information is trusted.
- [ ] No duplicate component was created.
- [ ] No duplicate hook was created.
- [ ] No duplicate utility was created.
- [ ] Existing types were reused.
- [ ] Existing CSS variables were reused.
- [ ] Existing design language was preserved.
- [ ] Loading and error states were considered.
- [ ] Public metadata was updated when necessary.
- [ ] Sitemap and robots behavior were considered.
- [ ] Private routes remain non-indexable.
- [ ] Accessibility was preserved.
- [ ] Reduced-motion behavior was preserved.
- [ ] No unnecessary dependency was added.
- [ ] No unrelated files were modified.
