# Whole-site Query Interaction System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge whole-site query forms, zero-result recovery, and page-selector pagination into one mobile-first interaction grammar while preserving feature-specific query composition.

**Architecture:** Move only domain-neutral search and query-empty behavior into `components/query`, refine the existing shared Pagination around URL-preserving page/page-size Select islands, and update each feature form to preserve unrelated URL state while resetting page explicitly. Public, authenticated, and Admin components continue to own their query fields, responsive grids, and domain copy.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, Tailwind CSS 4, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-whole-site-query-interaction-design.md`

## Global Constraints

- Do not redesign accepted Board Game cards, Borrowing records, Membership content, Announcement content, Dashboard, Profile, Settings, or Admin record surfaces.
- Do not change API, service, repository, domain, database, migration, or SEO behavior.
- Search submit text is exactly `搜尋` and uses `Button variant="primary"` without a Search icon.
- Search/filter/sort/page-size changes reset `page` to `1` and preserve unrelated query values, including valid hidden `pageSize` values.
- Query-empty recovery receives an explicit route-owned canonical dataset URL; it must not infer pathname.
- Pagination keeps the page-selector model and real URL navigation.
- Do not build a universal query toolbar or schema-driven renderer.
- Do not commit automatically; repository commits require explicit user authorization.

---

### Task 1: Establish failing whole-site query contracts

**Files:**
- Create: `tests/phase2ge-query-convergence.test.mjs`

**Interfaces:**
- Consumes: existing route and component source files through the repository's `readSource()` contract-test pattern.
- Produces: failing contracts for shared primitives, canonical Search semantics, query-empty recovery, pagination semantics, page-size policy, preservation, and Admin Borrowings sort.

- [ ] **Step 1: Write the failing shared-query and Search tests**

Add tests that read the relevant source files and assert:

```js
assert.match(sharedSearch, /<Search/);
assert.match(sharedSearch, /aria-label="清除搜尋"/);
assert.doesNotMatch(routeSource, /import \{[^}]*Search[^}]*\} from "lucide-react"/);
assert.match(routeSource, /<Button type="submit" variant="primary"/);
assert.match(routeSource, />\s*搜尋\s*<\/Button>/);
assert.doesNotMatch(routeSource, /套用|搜詢/);
```

Cover Public Board Games, Public Announcements, authenticated Borrowings and Memberships, plus the existing Admin search-form inventory.

- [ ] **Step 2: Write failing query-preservation tests**

Assert that feature forms explicitly preserve their relevant sort/filter/page-size values and explicitly reset the page. Cover native GET hidden inputs and client `buildQueryString` objects. Include hidden-page-size routes so the tests reject implementations that drop a valid bookmarked `pageSize`.

- [ ] **Step 3: Write failing query-empty tests**

Assert the existence of shared `QueryEmptyState`, an explicit `clearHref` prop, a real secondary clear Link, and distinct dataset/query-empty branches on every query-enabled route. Assert no pathname inference inside the primitive.

- [ ] **Step 4: Write failing Pagination tests**

Assert:

```js
assert.match(pagination, /<nav/);
assert.match(pagination, /aria-label="分頁"/);
assert.match(pageSelect, /aria-label="前往頁碼"/);
assert.match(pageSelect, /page: event\.target\.value/);
assert.match(pageSizeSelect, /page: 1/);
assert.match(navLinks, /buildQueryString\(query/);
assert.match(navLinks, /aria-disabled="true"/);
```

Also protect the responsive page-selector grammar and page-size visibility policy: Public Board Games and all Admin callers show it; Borrowings, Memberships, and Public Announcements pass `showPageSize={false}`.

- [ ] **Step 5: Run the focused test and verify RED**

Run:

```powershell
node --test tests/phase2ge-query-convergence.test.mjs
```

Expected: failures for missing shared-query files, current `套用`/`搜詢`, missing semantic Pagination nav, and missing zero-result recovery.

### Task 2: Create shared query primitives

**Files:**
- Create: `src/components/query/ClearableSearchInput.tsx`
- Create: `src/components/query/QueryEmptyState.tsx`
- Delete: `src/components/(admin)/admin/ClearableSearchInput.tsx`
- Modify: all existing `ClearableSearchInput` imports under `src/app/(admin)` and `src/components/(admin)`
- Test: `tests/phase2ge-query-convergence.test.mjs`

**Interfaces:**
- Consumes: `Input`, `ButtonLink`, `EmptyState`, `cn`, `useRouter`.
- Produces: `ClearableSearchInput(props)` with the existing prop contract and `QueryEmptyState({ title, description?, clearHref, clearLabel? })`.

- [ ] **Step 1: Move the search control without changing behavior**

Create the shared file with the existing state-reset pattern:

```tsx
export function ClearableSearchInput({ initialValue = "", ...props }: Props) {
  return (
    <ClearableSearchInputControl
      key={initialValue}
      initialValue={initialValue}
      {...props}
    />
  );
}
```

Keep Search icon ownership, `aria-label="清除搜尋"`, `router.replace(clearHref)`, and intrinsic `min-w-0 w-full` layout. Update all callers and remove the Admin-owned file.

- [ ] **Step 2: Implement the narrow query-empty primitive**

Implement:

```tsx
type QueryEmptyStateProps = {
  title: string;
  description?: string;
  clearHref: string;
  clearLabel?: string;
};

export function QueryEmptyState({
  title,
  description,
  clearHref,
  clearLabel = "清除條件",
}: QueryEmptyStateProps) {
  return (
    <EmptyState
      compact
      title={title}
      description={description}
      action={
        <ButtonLink href={clearHref} variant="outline" size="sm">
          {clearLabel}
        </ButtonLink>
      }
    />
  );
}
```

Do not import pathname/router APIs. The caller must supply the canonical URL.

- [ ] **Step 3: Run focused tests**

Run `node --test tests/phase2ge-query-convergence.test.mjs` and confirm the shared primitive/import tests pass while route/Pagination tests remain red.

### Task 3: Refine page-selector Pagination

**Files:**
- Modify: `src/components/Pagination/Pagination.tsx`
- Modify: `src/components/Pagination/PaginationPageSelect.tsx`
- Modify: `src/components/Pagination/PaginationPageSizeSelect.tsx`
- Modify: `src/components/Pagination/PaginationNavLinks.tsx`
- Test: `tests/phase2ge-query-convergence.test.mjs`

**Interfaces:**
- Consumes: `page`, `pageSize`, `total`, `totalPages`, `basePath`, and a domain-neutral `Record<string, QueryValue>`.
- Produces: semantic page-selector pagination with unchanged caller API and optional `showPageSize`.

- [ ] **Step 1: Make Pagination a named navigation landmark**

Replace the outer `div` with:

```tsx
<nav aria-label="分頁" className={cn("min-w-0 space-y-3", className)}>
```

Keep the result range, then group page-size and navigation controls so the page-size control can occupy a separate mobile row without squeezing navigation.

- [ ] **Step 2: Refine page selector semantics**

Render the visual grammar `頁面 [Select] / {totalPages} 頁`, use `aria-label="前往頁碼"`, and include screen-reader text describing `目前第 {page} 頁，共 {totalPages} 頁`. Keep the narrow `router.push` boundary and preserve the supplied query while overriding only `page` and retaining `pageSize`.

- [ ] **Step 3: Preserve page-size semantics**

Keep the Client Select and build its URL with all active query values plus:

```tsx
{ pageSize: event.target.value, page: 1 }
```

Use a compact mobile-safe row and retain `aria-label="每頁顯示筆數"`.

- [ ] **Step 4: Keep previous/next as real navigation**

Keep enabled destinations as Links. Disabled edges remain spans with `aria-disabled="true"`; ensure neither receives an `href`. Use touch-safe minimum height and do not add numbered links or ellipses.

- [ ] **Step 5: Run focused tests**

Run `node --test tests/phase2ge-query-convergence.test.mjs`. Pagination contracts should now pass.

### Task 4: Converge Public and authenticated query forms

**Files:**
- Modify: `src/components/(public)/board-games/BoardGameSearchForm.tsx`
- Modify: `src/components/(public)/board-games/BoardGameGrid.tsx`
- Modify: `src/app/(public)/board-games/page.tsx`
- Modify: `src/app/(public)/announcements/page.tsx`
- Modify: `src/app/(authenticated)/borrowings/page.tsx`
- Modify: `src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx`
- Modify: `src/components/(authenticated)/memberships/MembershipHistory.tsx`
- Modify: `src/app/(authenticated)/memberships/page.tsx`
- Test: `tests/phase2ge-query-convergence.test.mjs`

**Interfaces:**
- Consumes: shared search and query-empty primitives, existing feature query types and canonical route constants.
- Produces: primary Search grammar, explicit preservation/reset behavior, explicit canonical clear URLs, and the approved page-size policy.

- [ ] **Step 1: Update Public Board Games**

Use shared `ClearableSearchInput`; place primary `搜尋` immediately after the search field in the logical tab order; retain the filter disclosure and composed sort Select. Preserve `pageSize` and reset `page=1`. Keep page-size UI visible. Pass `clearHref={BASE_PATH}` to query-empty recovery while retaining the existing dataset-empty onboarding.

- [ ] **Step 2: Update authenticated Borrowings**

Replace the local Search icon/Input composition with the shared primitive. Change `套用` to primary `搜尋`; preserve `status`, `sort`, and valid `pageSize`, with hidden `page=1`. Keep the accepted BorrowingRecord unchanged. Use `/borrowings` as the canonical query-empty clear URL and pass `showPageSize={false}` to Pagination.

- [ ] **Step 3: Update Memberships**

Fix `搜詢` to `搜尋`; use the shared input; preserve fixed `orderBy`, active `orderDirection`, filters, and valid hidden `pageSize`; reset `page=1`. Query-empty recovery uses `/memberships`. Keep Membership summary/history composition unchanged.

- [ ] **Step 4: Update Public Announcements**

Use shared `ClearableSearchInput`, explicit primary `搜尋`, hidden valid `pageSize`, and `page=1`. Use `/announcements` as the explicit canonical recovery URL. Hide the page-size selector without removing parsing support. Do not alter announcement rows.

- [ ] **Step 5: Run focused and affected legacy tests**

Run:

```powershell
node --test tests/phase2ge-query-convergence.test.mjs tests/phase2e-board-games-borrowings.test.mjs tests/phase2d-dashboard-memberships.test.mjs tests/phase2gd3-authenticated-route-hardening.test.mjs
```

Expected: all pass.

### Task 5: Converge Admin preservation, sort, and empty recovery

**Files:**
- Modify: Admin query pages and filter bars listed in the spec inventory
- Modify: Admin record components that currently own ambiguous empty states
- Modify: `src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx`
- Test: `tests/phase2ge-query-convergence.test.mjs`
- Test: existing `tests/phase2fb-admin-shell-query.test.mjs`, `tests/phase2fc-board-game-admin.test.mjs`, `tests/phase2fd-people-admin.test.mjs`, `tests/phase2fe-content-admin.test.mjs`, `tests/phase2fe6-events-attendance.test.mjs`

**Interfaces:**
- Consumes: existing Admin query schemas, `buildQueryString`, shared query primitives, and existing AdminToolbar.
- Produces: Admin forms that preserve active query state and reset pages, plus domain-natural query-empty recovery.

- [ ] **Step 1: Fix simple native Admin search forms**

For Users, Academic Years, Categories, and Locations, add hidden fields for valid active page size and sort values where applicable, plus explicit `page=1`. Preserve the shared primary text-only Search button and update imports to the shared search primitive.

- [ ] **Step 2: Fix filtered Admin forms**

For Memberships, Register Keys, Officers, Events, Announcements, and event attendance, ensure search/filter/sort submits preserve every unrelated value and valid page size and reset `page=1`. Preserve each feature's existing Select/disclosure composition.

- [ ] **Step 3: Add Admin Borrowings sort**

Add a compact feature-specific Select whose values map only to the supported `created_at`, `borrowed_at`, `due_at`, and `returned_at` query fields and established directions. Include both `orderBy` and `orderDirection` in the submitted URL, preserve search/status/pageSize, and reset page.

- [ ] **Step 4: Add Admin query-empty recovery**

Pass `hasQuery` and explicit canonical route URLs into affected record components. Use shared `QueryEmptyState` only for active zero-result queries; retain existing dataset-empty/onboarding copy when no query is active.

- [ ] **Step 5: Run focused Admin tests**

Run:

```powershell
node --test tests/phase2ge-query-convergence.test.mjs tests/phase2fb-admin-shell-query.test.mjs tests/phase2fc-board-game-admin.test.mjs tests/phase2fd-people-admin.test.mjs tests/phase2fe-content-admin.test.mjs tests/phase2fe6-events-attendance.test.mjs
```

Expected: all pass without Admin CRUD or record-composition regressions.

### Task 6: Repository-wide verification and handoff

**Files:**
- Review only: all changed files

**Interfaces:**
- Consumes: completed implementation.
- Produces: evidence-backed source, test, build, and runtime status.

- [ ] **Step 1: Review scope and diff**

Run `git status --short` and `git diff --stat`, then inspect `git diff`. Confirm no API, repository, service, database, migration, SEO, accepted content, or domain files changed.

- [ ] **Step 2: Run static verification**

Run in order:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
git diff --check
```

Expected: exit code 0 for every command.

- [ ] **Step 3: Run production build**

Run `npm.cmd run build`. If sandbox networking alone blocks `next/font/google`, rerun with the required escalation and report sandbox versus source/build outcomes separately.

- [ ] **Step 4: Attempt browser runtime review**

Check available browser surfaces. If available, test Public Board Games, Borrowings, Memberships, Public Announcements, and representative Admin lists at 320, 375, 430, and desktop, including Search button, Enter, clear X, clear conditions, filters, sort, page selector, previous/next, page size, Back/Forward, refresh, and copied URLs. If unavailable, report `USER VISUAL REVIEW REQUIRED` without claiming runtime verification.

- [ ] **Step 5: Report without committing**

Return the requested Phase 2G-E report, separate SOURCE/TEST/BUILD/RUNTIME evidence, list remaining issues, and recommend a Traditional Chinese Conventional Commit message only if verification is green.
