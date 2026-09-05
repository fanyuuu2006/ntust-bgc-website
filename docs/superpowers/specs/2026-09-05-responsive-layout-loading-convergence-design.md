# Phase 2G-F Responsive Layout, Query Toolbar & Navigation Loading Design

## Goal

Correct the shared responsive composition, Admin scroll ownership, and query-transition loading boundaries without changing the accepted URL-authoritative query semantics, content composition, domain behavior, API, or database.

## Architecture Invariants

- URL search parameters remain the only source of truth for search, filters, sorting, pagination, and page size.
- Query parsing, normalization, service/repository calls, and result rendering remain on the server.
- Client Components remain narrow interaction islands only; no result data is fetched from the browser.
- Each result collection is fetched exactly once per server render. The same paginated read supplies rows, totals, and Pagination.
- GET forms and URL navigation remain canonical. Enter and the primary `搜尋` button share the same form submission path.
- Public result HTML remains server-renderable on a direct query URL. Suspense is used only for Streaming SSR.
- Existing query preservation and page-reset behavior from Phase 2G-E remains unchanged.

## Root Causes

1. `MembershipRecordsToolbar` enters a single `sm:flex-row` while the search control still claims `w-full`. The four siblings compete for width and the raw filter `<summary>` can wrap.
2. `BoardGameSearchForm` puts an expanding `<details>` and the Sort surface in the same CSS grid row. The expanded details height defines the row and default cross-axis stretch makes Sort equally tall.
3. `AdminShell` fixes the shell to `h-dvh`, hides outer overflow, and gives `<main>` its own `overflow-y-auto`. This creates a second desktop vertical scroll context instead of allowing natural document height.
4. Route-level `loading.tsx` files under Borrowings and Memberships wrap their entire page segments. Query navigation therefore replaces the PageHeader, toolbar, and result area with one page-sized skeleton.
5. `formControlClassName` lacks `min-w-0`, and Pagination's raw `.btn` links lack an explicit intrinsic no-wrap/alignment contract.

## Responsive Query Composition

### Shared intrinsic rules

- Inputs and Selects may shrink inside a flexible track through `min-w-0`.
- Canonical short actions remain single-line and intrinsic.
- Shared primitives do not own feature widths, grid placement, or breakpoints.

### Search-only

- Mobile: search field, then full-width Search button.
- Wider screens: `minmax(0, 1fr) auto`.

### Search + filter + sort

- Mobile: search field and Search action use full rows; Filter and Sort share a following row only when their intrinsic widths fit.
- Desktop composition begins at `lg`, not prematurely at `sm`.
- Search uses the flexible track; Search, Filter, and Sort controls use intrinsic tracks.

### Complex Board Game filters

- Search and Search action retain their GET form semantics.
- Filter trigger and Sort may share a controls row.
- Expanded filter content is a separate, full-width flow row and cannot define the Sort control's height.
- The disclosure may be a feature-local Client Component, but its form fields remain native successful controls submitted through the parent GET form.

## Admin Height Model

Desktop uses document scrolling:

```text
body/document
└── AdminShell min-h-dvh
    ├── AdminHeader
    └── content row
        ├── desktop sidebar
        └── natural-height main
```

The mobile drawer remains fixed to the dynamic viewport and may own an internal nav scroll because it is an overlay interaction surface.

## Query Loading Model

- Dashboard, Profile, and Settings retain their route-shaped initial loading boundaries because they are not query result pages.
- Borrowings and Memberships stop using route-level whole-page loading files.
- Their PageHeader and query toolbar render outside a keyed result Suspense boundary.
- The keyed child is an async Server Component that performs the single paginated service read and returns result content plus Pagination.
- The fallback is limited to the result region, uses `aria-busy`, and preserves the surrounding page rhythm.
- Public and Admin routes do not currently have route-level query skeletons; they are not converted to client fetching or modified without a proven loading defect.

## Wrapping Policy

- Never arbitrarily wrap or truncate short actions, status labels, or Pagination navigation labels.
- Flexible query fields may shrink, but retain usable control height and width.
- Long identity/content values wrap where reading is important.
- Truncation remains limited to already constrained records/tables with an accessible route or context for the full value.

## Verification Boundary

Source tests protect semantic structure, Server Component boundaries, single server reads, and responsive composition contracts. They cannot prove pixel layout or transition timing. Browser verification remains required for 320, 375, 430, 768, desktop, and wide desktop; if no browser surface exists, the final report must say `SSR SOURCE VERIFIED` and `USER RUNTIME/VISUAL REVIEW REQUIRED`.

## Scope Exclusions

No database, migration, repository semantics, API semantics, domain changes, SEO metadata, accepted record/card redesign, Dashboard redesign, Profile/Settings changes, or universal QueryToolbar framework.
