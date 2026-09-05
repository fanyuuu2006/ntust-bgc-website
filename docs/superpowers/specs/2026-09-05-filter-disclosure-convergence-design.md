# Phase 2G-F.1 Filter Disclosure Convergence Design

## Goal

Converge suitable whole-site query filters on one responsive disclosure grammar without changing URL-authoritative query semantics, server-side result fetching, accepted content composition, APIs, or domain rules.

## Route Decision Matrix

| Route | Current filter UI | Disclosure decision | Reason |
| --- | --- | --- | --- |
| `/board-games` | custom button plus three multi-select groups | feature-local custom disclosure | The mobile trigger and Sort must remain siblings while the panel spans the parent grid; desktop becomes floating. |
| `/borrowings` | native details, one status filter | shared native disclosure | Existing accepted interaction already matches the canonical grammar. |
| `/memberships` | native details, type and status | shared native disclosure | Canonical compact-filter reference. |
| `/admin/memberships` | two permanently visible Selects | shared native disclosure | Two supporting filters benefit from reduced toolbar width. |
| `/admin/memberships/register-keys` | two permanently visible Selects | shared native disclosure | Two supporting filters benefit from reduced toolbar width. |
| `/admin/board-games` | three permanently visible Selects | shared native disclosure | Three supporting filters otherwise dominate the toolbar. |
| `/admin/officers` | one academic-year Select | remain visible | One high-frequency Select does not justify an extra disclosure step. |
| `/admin/board-games/borrowings` | one status Select | remain visible | Operational status filtering is frequent and already compact. |
| `/admin/events` | one status Select | remain visible | A single compact status filter is clearer when directly available. |
| `/admin/announcements` | one status Select | remain visible | A single compact publication-state filter is clearer when directly available. |

Search-only Admin routes and `/announcements` have no filter disclosure responsibility.

## Shared Primitive Boundary

`QueryFilterDisclosure` owns only:

- native `<details>/<summary>` semantics;
- canonical outline trigger with `ListFilter` icon and no wrapping;
- mobile in-flow panel chrome;
- `lg`-and-wider relative/floating positioning;
- panel width classes supplied as ordinary presentation overrides.

Feature components continue to own filter fields, names, values, option lists, validation, URL construction, submission, and server querying. No schema-driven filter renderer or universal query toolbar is introduced.

## Public Board Games Exception

The Board Games multi-select panel remains a narrow Client interaction island. A native `<details>` cannot make its panel a sibling-level `col-span-full` item in the parent grid while keeping the trigger beside Sort without relying on fragile `display: contents` behavior. The island owns only `isOpen`, `aria-expanded`, and `aria-controls`.

On mobile the panel remains a full-width normal-flow grid item. At `lg` it becomes an absolute, right-aligned floating surface positioned by the toolbar grid. Its native checkbox fields remain descendants of the owning GET form and are submitted normally.

## State And Submission

- All disclosures start closed, including when filters are active.
- Opening or closing does not navigate or change query state.
- No active-filter count is added in this phase.
- Filter fields remain within their owning form.
- Existing search, filter, sort, page-size preservation and explicit `page=1` behavior remain unchanged.
- Query values remain URL-authoritative and result data remains server-rendered.

## Responsive And Overflow Rules

- Mobile panels remain in document flow and use the available width.
- Desktop native panels use `lg:absolute`, right alignment, a content-appropriate minimum width, and a viewport-safe maximum width.
- Toolbars and owning grids remain `overflow-visible`; no global overflow override is added.
- Trigger labels are intrinsic, shrink-resistant, and single-line.
- Board Games uses a wider panel than compact Select-based disclosures.

## Mobile Density And Spacing Ownership

Filter panels are temporary utility surfaces, not content cards. Mobile therefore uses the compact end of the existing spacing scale while retaining `text-sm` labels and the established `min-h-10` controls.

- Shared controls own their intrinsic padding, height, icon gap, and focus treatment.
- Feature toolbars own row gaps and responsive placement.
- Disclosure panels own one `p-3` inset and `gap-3` between filter groups; child groups do not add another outer margin.
- Board Games uses two columns for its short checkbox options on mobile, then one option column inside each of the three group columns from `sm` upward.
- Checkbox labels remain fully clickable and at least `min-h-8`; density does not come from blanket `text-xs` styling.
- Search, submit, Filter, and Sort rows use an 8px composition rhythm rather than stacked 12–16px margins.
- No fixed panel height, nested panel scrolling, or overflow-hiding workaround is introduced.

## Accessibility

- Native disclosures retain keyboard and platform semantics.
- The summary icon is decorative and `aria-hidden`.
- The custom Board Games button exposes `aria-expanded` and `aria-controls`.
- All filter labels and controls retain their existing accessible names.
- Color is not used to communicate expanded state.

## Scope Exclusions

No database, API, repository, domain, SEO, Pagination, result-fetching, card/list composition, or client-side query architecture changes.
