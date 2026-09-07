# Query Toolbar Interaction Convergence Design

## Status

Approved by the user on 2026-09-07. Do not commit automatically.

## Goal

Give Search, filters, and sorting independent query ownership while keeping the URL authoritative and preserving Server Component → Service → Repository → SSR result rendering.

## Architecture

- Feature toolbars retain their markup, responsive layout, labels, defaults, and query semantics.
- A small route-agnostic query adapter starts from applied URL state, removes only explicitly owned keys, applies owned values, resets `page` to `1`, and preserves repeated values.
- Native Search and filter forms use a shared hidden-field adapter fed from normalized applied query state. Search owns only `search`; each filter form owns only its filter keys.
- Standalone scalar filters and sorts use narrow client controls that mutate only their owned key. Feature-specific compound sorts remain feature-owned client islands.
- `QueryFilterDisclosure` remains a visual disclosure and does not learn route schemas.

## Interaction contract

- Search text is draft until Search or Enter submits it.
- Standalone scalar filters and sorts navigate immediately.
- Grouped filters remain draft until their own `套用篩選` action is used.
- `清除搜尋` removes only Search; `清除篩選` removes only that filter group.
- Every query-changing action resets `page=1` and preserves unrelated applied state, including `pageSize`.
- Immediate navigation derives from applied URL/query props, never sibling DOM controls, so Search and filter drafts cannot leak.
- Multi-value query keys retain all applied values and native filter forms can submit repeated names.

## Route treatment

- Keep unchanged: Public Announcements, Admin Users, Admin Academic Years, Admin Board Game Categories and Locations, existing pagination/page-size controls, and sortable table-header links.
- Split explicit Search and grouped filter forms: Public Board Games, authenticated Borrowings and Memberships, Admin Board Games, Admin Memberships, and Admin Register Keys.
- Make standalone selects immediate: Admin Announcements, Events, Officers, event attendance, and Admin Borrowings.
- Admin Borrowings retains feature-owned compound sort mapping.

## Boundaries

- No client-side result fetching or duplicated result state.
- No query normalization, SEO policy, repository, service, database, domain, visual-system, AdminUserPicker, Header, or shell changes.
- No universal toolbar, schema-driven query engine, new dependency, commit, or Phase 2J-F work.

## Verification

Focused behavioral tests exercise the pure adapter with literal expected URLs, including Search/filter draft isolation, owned-key replacement, unrelated-state preservation, page reset, and repeated values. Route integration contracts then protect form ownership, immediate controls, filter actions, accessibility, and unchanged SSR/SEO architecture. Full lint, TypeScript, test suite, diff check, build, and available runtime checks follow.
