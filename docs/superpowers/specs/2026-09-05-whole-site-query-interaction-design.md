# Whole-site Query Interaction System Design

## Status

Approved for implementation on 2026-09-05.

## Goal

Converge search, filtering, sorting, reset, query-empty recovery, pagination, and page-size behavior across public, authenticated, and Admin list pages without creating a universal query manager or changing accepted content composition, APIs, domain rules, database schema, or SEO behavior.

Mobile usability is the primary constraint. Responsive behavior should use mobile defaults and only the existing meaningful wider-layout transitions required by each feature.

## Product principles

- URL query parameters remain the canonical state for every list route.
- Enter in a search field and clicking `搜尋` execute the same form submission path.
- An explicit Search submit is always a text-only canonical primary button.
- The Search icon belongs to the search field, never the submit button.
- Search, filter, sort, and page-size changes explicitly reset `page` to `1`.
- Query mutations preserve every unrelated active query value, including a valid `pageSize` whose UI is hidden.
- Pagination changes only `page` and preserves search, filters, sort, and page size.
- The search-field clear affordance removes only search text. A query-empty recovery action returns to the route's canonical dataset URL.
- Dataset-empty and query-empty states are distinct product states.
- Shared primitives own intrinsic interaction and accessibility. Feature components own query schemas, responsive composition, widths, and domain copy.

## Audited route inventory

| Route | Search | Filter | Sort | Pagination | Page-size UI |
| --- | --- | --- | --- | --- | --- |
| `/board-games` | `search` | repeated `status`, `category`, `location` | `sort` | yes | keep: 12/24/36 |
| `/announcements` | `search` | none | none | yes | hide |
| `/borrowings` | `search` | `status` | `sort` | yes | hide |
| `/memberships` | `search` | `type`, `status` | `orderDirection` with fixed `orderBy=academic_year` | yes | remain hidden |
| `/admin/users` | `search` | none | sortable headers | yes | keep: 10/20/50/100 |
| `/admin/memberships` | `search` | `academic_year_id`, `status` | sortable headers | yes | keep: 10/20/50/100 |
| `/admin/memberships/register-keys` | `search` | `academic_year_id`, `status` | none | yes | keep: 10/20/50/100 |
| `/admin/academic-years` | `search` | none | none | yes | keep: 10/20/50/100 |
| `/admin/officers` | `search` | `academicYearId` | none | yes | keep: 10/20/50/100 |
| `/admin/board-games` | `search` | `status`, `category`, `location` | sortable headers | yes | keep: 10/20/50/100 |
| `/admin/board-games/categories` | `search` | none | none | yes | keep: 10/20/50/100 |
| `/admin/board-games/locations` | `search` | none | none | yes | keep: 10/20/50/100 |
| `/admin/board-games/borrowings` | `search` | `status` | supported repository fields | yes | keep: 10/20/50/100 |
| `/admin/events` | `search` | `status` | `orderBy`, preserved direction | yes | keep: 10/20/50/100 |
| `/admin/events/[id]` | `search` | none | `orderDirection` | yes | keep: 10/20/50 |
| `/admin/announcements` | `search` | `status` | `orderBy`, sortable headers | yes | keep: 10/20/50/100 |

Routes without list-query responsibility do not receive query controls merely for consistency.

## Current inconsistencies

- Public Board Games and authenticated Borrowings use outline `套用` instead of primary `搜尋`.
- Memberships contains the typo `搜詢`.
- Public Announcements lacks the canonical Search icon.
- `ClearableSearchInput` is domain-neutral but lives under an Admin namespace, causing duplicated search-field implementations.
- Several native GET forms discard page size, filter, or sort values on submit.
- Admin Membership filters discard active table sorting.
- Admin Borrowings accepts sorting in its schema/repository but neither exposes nor safely preserves it in the toolbar.
- Several empty states always claim either an empty dataset or an empty query regardless of actual active query state.
- Query-empty states generally lack a direct recovery action.
- Pagination is visually close to the desired model but lacks semantic navigation and a responsive grouping strategy.

## Shared primitive architecture

### `components/query/ClearableSearchInput.tsx`

Move the existing domain-neutral control out of the Admin namespace and update all callers. It owns the Search icon, controlled display value, clear X, intrinsic input padding, accessible names, and visible focus behavior. It receives the feature-computed `clearHref`; it does not know route query schemas or page layout.

The clear X removes only the search value. Each feature computes a URL that preserves filters, sort, and valid page size while resetting the page.

### `components/query/QueryEmptyState.tsx`

A narrow wrapper around the existing `EmptyState` provides a centered compact zero-result presentation and a secondary `清除條件` navigation action. Callers supply domain-specific title, optional description, and an explicit `clearHref`.

`clearHref` is not mechanically inferred from `usePathname()` or a pathname prop. Every route passes its canonical dataset URL. This permits routes with a canonical non-empty query baseline to remain correct.

Dataset-empty onboarding continues to use `EmptyState` directly.

### Existing URL utilities

Continue using `buildQueryString`. Do not introduce a query manager. Feature forms explicitly include or compose every value they must preserve.

## Feature toolbar composition

Feature-specific components remain responsible for visual layout and their own query fields.

Complex mobile toolbar:

```text
[ Search field                               ]
[ 搜尋 ] [ 篩選 ] [ 排序 ]
```

Simple mobile search:

```text
[ Search field                               ]
[ 搜尋 ]
```

At wider widths, controls may share a row when labels and touch targets remain readable. No 320/375/430-specific breakpoints are introduced.

Filter and sort remain supporting controls. Filter disclosures and composed Select controls retain their current domain-specific forms and single visible focus ownership.

## Search and reset behavior

All explicit search actions use:

```tsx
<Button type="submit" variant="primary">
  搜尋
</Button>
```

Native GET forms use hidden fields for active values not directly edited by the visible form. Client forms build the same URL once in `onSubmit`; Enter and button activation share that handler.

The transition rules are:

| Action | Preserved | Changed |
| --- | --- | --- |
| Search | filters, sort, valid page size | search, `page=1` |
| Filter | search, sort, valid page size | filters, `page=1` |
| Sort | search, filters, valid page size | sort, `page=1` |
| Page navigation | all active query values | page only |
| Page-size change | search, filters, sort | page size, `page=1` |
| Search-field X | filters, sort, valid page size | remove search, `page=1` |
| Query-empty recovery | none unless part of the route's canonical dataset URL | navigate to explicit canonical URL |

## Pagination design

Retain and refine the page-selector model instead of adding numbered pages and ellipses.

```text
[上一頁]  [3 ▼] / 12 頁  [下一頁]
```

The shared Pagination remains server-first. Only page/page-size Select controls require narrow Client Components for `router.push`.

Requirements:

- Render a `<nav aria-label="分頁">`.
- Show the current result range and total.
- Give the page selector the accessible name `前往頁碼`.
- Include readable current/total page context.
- Use real Links for enabled previous/next navigation.
- Render disabled edge controls as non-links with `aria-disabled="true"`.
- Preserve the complete active query when changing page.
- Use one `sm` transition for grouping; do not build a second mobile pagination model.
- Keep touch targets usable at 320px.
- Place page size on a separate compact mobile row when it is visible.

Generating one option per page is acceptable for the evidenced university-club datasets. No source or telemetry demonstrates thousands of pages. If that changes, search quality or a bounded jump control should be designed from actual scale rather than pre-emptively adding complexity.

## Page-size policy

Page-size visibility follows product usefulness rather than route category:

- Keep on Public Board Games because 12/24/36 corresponds to meaningful catalog-grid density.
- Hide on authenticated Borrowings; continue parsing and preserving valid bookmarked `pageSize` values.
- Keep hidden on Memberships; preserve valid URL values.
- Hide on Public Announcements; preserve valid URL values.
- Keep on all paginated Admin operational lists, including event attendance.

Hiding the selector never removes URL compatibility.

## Admin Borrowings sort

Add a feature-specific compact sort Select using only already-supported fields: `created_at`, `borrowed_at`, `due_at`, and `returned_at`, with established direction values. The control preserves search, status, page size, and resets page. No repository, service, API, or domain semantics change.

## Query-empty behavior

Each query-enabled route computes whether a meaningful active query exists and chooses:

- Dataset empty: domain-specific `EmptyState`, including onboarding where already accepted.
- Query empty: `QueryEmptyState` with concise domain copy and an explicit canonical clear URL.

Sort defaults are not active conditions. Non-default sort is considered an active condition only when clearing it is necessary to return to the canonical dataset view.

The recovery action uses restrained outline semantics and never danger or primary styling.

## Accessibility and focus

- Search fields retain explicit accessible labels.
- Search icon is decorative and hidden from assistive technology.
- Clear X has a specific `清除搜尋` accessible name.
- Composed Select controls preserve one visible focus owner.
- Query form tab order follows its visual order.
- Pagination is a named navigation landmark.
- Disabled navigation is not interactive.
- Query-empty recovery is a real Link.
- Status, empty-state, and query behavior are never communicated by color alone.

## Responsive behavior

- 320px: full-width search field; actions wrap or use a compact grid; no fixed-width children; pagination navigation remains usable; visible page size uses a separate row.
- 375/430px: related query actions may share a row without reducing touch targets.
- Desktop: simple forms align search and primary submit first, supporting filters/sort afterward; Admin may retain denser multi-control rows.
- No global `overflow-x-hidden`, arbitrary max-width patches, or per-device breakpoints.

## Testing strategy

Implementation follows TDD. Tests first establish failing contracts for:

- shared search icon ownership and primary `搜尋` submission;
- native/shared Enter submission path;
- explicit page reset and unrelated query preservation;
- valid hidden `pageSize` preservation;
- dataset-empty versus query-empty copy and recovery links;
- route-provided canonical query-empty URLs;
- pagination nav semantics, page selector, total-page text, edge states, and query preservation;
- page-size reset behavior and visibility policy;
- Admin Borrowings supported sort;
- preservation of accepted record/card/table composition.

Repository-wide lint, TypeScript, tests, diff check, and production build are required. Browser runtime verification is reported separately from source verification.

## Out of scope

- Dashboard, Profile, Settings, content-card, borrowing-record, Membership-history, Announcement-list, and Admin table redesigns
- Universal query toolbar or schema-rendered form framework
- API or domain semantic changes
- Database schema or migrations
- SEO, metadata, canonical SEO URLs, robots, sitemap, or structured data
- New filtering or sorting capabilities unsupported by current repositories
