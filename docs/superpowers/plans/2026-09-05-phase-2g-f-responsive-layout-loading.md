# Phase 2G-F Responsive Layout & Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge query toolbar sizing, Admin document scrolling, and query-result loading while preserving URL-authoritative Streaming SSR.

**Architecture:** Feature pages retain their own query composition. Shared controls own only intrinsic sizing, while Borrowings and Memberships move their single server-side result reads behind page-local Suspense boundaries. Admin desktop scrolling returns to the document; the mobile drawer keeps its overlay scroll.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components/Suspense, TypeScript 5, Tailwind CSS 4, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-responsive-layout-loading-convergence-design.md`

## Global Constraints

- Work directly in the current `main` working tree as explicitly authorized by the User; do not create a worktree or commit.
- Write and run a failing regression test before each production change.
- Preserve GET/URL navigation, query parameters, page reset, query preservation, Pagination semantics, and server-side result reads.
- Do not introduce client result fetching, duplicated result reads, SWR, React Query, SEO work, database changes, or accepted content redesign.
- Use `apply_patch` for source edits.

---

### Task 1: Establish Phase 2G-F regression contracts

**Files:**
- Create: `tests/phase2gf-responsive-layout-loading.test.mjs`
- Modify: `tests/phase2gd3-authenticated-route-hardening.test.mjs`

**Interfaces:**
- Consumes: current source files as contract fixtures.
- Produces: failing contracts for intrinsic controls, Board Game filter flow, Admin scroll ownership, result Suspense, and SSR boundaries.

- [ ] Write source/AST-oriented tests asserting that shared controls allow flexible shrink, short Pagination actions remain intrinsic, the three query toolbar patterns do not enter unsafe rows early, Board Game expanded content is a full-width sibling, and Admin main no longer owns desktop vertical scrolling.
- [ ] Add SSR contracts asserting each query page still receives `searchParams`, the async result component calls the existing server service once, result components have no `"use client"`, no browser `fetch`, and direct URL values are normalized before being passed into results.
- [ ] Reconcile the older hardening test so Dashboard/Profile/Settings retain route loading while Borrowings/Memberships are protected by result-level Suspense instead.
- [ ] Run `node --test tests/phase2gf-responsive-layout-loading.test.mjs tests/phase2gd3-authenticated-route-hardening.test.mjs` and confirm failures point to current layout/loading architecture rather than syntax errors.

### Task 2: Fix shared intrinsic control sizing

**Files:**
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/Pagination/PaginationNavLinks.tsx`

**Interfaces:**
- Consumes: current `formControlClassName` and URL-preserving Pagination links.
- Produces: shrink-safe controls and single-line intrinsic previous/next navigation without contextual widths.

- [ ] Run the focused shared-control test and retain its expected failure.
- [ ] Add `min-w-0` to the intrinsic form-control class and inline-flex/no-wrap alignment to Pagination navigation labels.
- [ ] Run the focused test and the existing Phase 2G-E Pagination tests; both must pass.

### Task 3: Converge Authenticated toolbar composition

**Files:**
- Modify: `src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx`
- Modify: `src/app/(authenticated)/borrowings/page.tsx`

**Interfaces:**
- Consumes: existing GET fields, hidden page/pageSize values, Select focus ownership, and filter details.
- Produces: mobile-first two-row compositions and a single wider `lg` reflow.

- [ ] Run the toolbar composition tests and confirm Memberships and Borrowings fail the new contract.
- [ ] Replace the unsafe Memberships `sm:flex-row` with a grid whose flexible search track is separate from intrinsic Search/Filter/Sort tracks; give the raw summary an intrinsic no-wrap contract.
- [ ] Apply the same mobile mental model to Borrowings without altering the BorrowingRecord/result UI or query names.
- [ ] Run Phase 2G-E plus Phase 2G-F toolbar tests and confirm query preservation remains green.

### Task 4: Separate Board Game expanded filters from Sort height

**Files:**
- Create: `src/components/(public)/board-games/BoardGameFilterDisclosure.tsx`
- Modify: `src/components/(public)/board-games/BoardGameSearchForm.tsx`

**Interfaces:**
- Consumes: category/location/status values and native checkbox names from `BoardGameSearchForm`.
- Produces: a feature-local interaction island that renders an intrinsic trigger and a full-width panel while native form controls remain children of the GET form.

- [ ] Run the Board Game disclosure test and confirm the existing nested `<details>` grid item fails.
- [ ] Implement a narrow Client Component owning only disclosure state and `aria-expanded`; it must not import services, repositories, `useSearchParams`, or `fetch`.
- [ ] Render the trigger and panel as independent grid items, with the panel ordered after Sort and spanning the full toolbar grid.
- [ ] Preserve checkbox names/default values and all Phase 2G-E hidden inputs/query semantics.
- [ ] Run Board Game and whole-query regression tests.

### Task 5: Restore one desktop vertical scroll owner

**Files:**
- Modify: `src/components/layouts/AdminShell.tsx`
- Modify: `src/components/(admin)/AdminSidebar.tsx` only if desktop sticky/max-height behavior requires a bounded adjustment.

**Interfaces:**
- Consumes: mobile drawer state/focus behavior and current Admin header/sidebar/main landmarks.
- Produces: document-owned desktop scrolling with unchanged mobile drawer behavior.

- [ ] Run the Admin height-model test and confirm it fails on `h-dvh`, outer `overflow-hidden`, and main `overflow-y-auto`.
- [ ] Change the shell to `min-h-dvh`, remove the desktop internal main scroll, and keep `min-w-0` on main.
- [ ] Preserve mobile sidebar `fixed h-dvh` and its internal nav overflow; adjust only desktop sidebar constraints if necessary.
- [ ] Run Phase 2FB Admin shell tests and the new height-model test.

### Task 6: Move Borrowings to result-level Streaming SSR

**Files:**
- Modify: `src/app/(authenticated)/borrowings/page.tsx`
- Create: `src/components/(authenticated)/borrowings/BorrowingsResults.tsx`
- Create: `src/components/(authenticated)/borrowings/BorrowingsResultsLoading.tsx`
- Delete: `src/app/(authenticated)/borrowings/loading.tsx`

**Interfaces:**
- Consumes: normalized borrowing query and existing `boardGamesService.getBorrowingsByUserId` paginated read.
- Produces: async Server `BorrowingsResults` that performs exactly one result query and renders empty/list/Pagination; PageHeader and toolbar remain outside Suspense.

- [ ] Run the Borrowings SSR/loading tests and confirm the route-level loading/current inline fetch fail.
- [ ] Keep normalization in `page.tsx`, derive a deterministic key from all result-affecting normalized values, and render the toolbar before Suspense.
- [ ] Move the one paginated service read and existing result/Pagination JSX into `BorrowingsResults`; do not add `"use client"` or `fetch`.
- [ ] Add a compact `aria-busy` result fallback shaped like borrowing records.
- [ ] Remove only the obsolete Borrowings route loading file.
- [ ] Run Borrowings domain/UI, Phase 2G-E, Phase 2G-D.3, and Phase 2G-F tests.

### Task 7: Move Membership history to result-level Streaming SSR

**Files:**
- Modify: `src/app/(authenticated)/memberships/page.tsx`
- Create: `src/components/(authenticated)/memberships/MembershipRecordsResults.tsx`
- Create: `src/components/(authenticated)/memberships/MembershipRecordsLoading.tsx`
- Modify: `src/components/(authenticated)/memberships/MembershipHistory.tsx` only to accept the existing result/pagination composition cleanly.
- Delete: `src/app/(authenticated)/memberships/loading.tsx`

**Interfaces:**
- Consumes: normalized membership query, authenticated user id, current membership id, and existing `membershipService.listMembershipRecordsByUserId` read.
- Produces: async Server history results with exactly one paginated read; PageHeader/current context/toolbar remain outside its keyed Suspense boundary.

- [ ] Run the Membership SSR/loading tests and confirm the route-level loading/current inline result read fail.
- [ ] Retain current academic-year/current membership server reads without duplication and move only the paginated history read into `MembershipRecordsResults`.
- [ ] Keep `MembershipRecordsToolbar` outside the keyed result boundary and place list/empty/Pagination inside it.
- [ ] Add an `aria-busy` membership-record fallback and remove only the obsolete Memberships route loading file.
- [ ] Run Membership domain/UI, Phase 2G-E, Phase 2G-D.3, and Phase 2G-F tests.

### Task 8: Verify SSR boundaries and repository-read uniqueness

**Files:**
- Modify: `tests/phase2gf-responsive-layout-loading.test.mjs` if a stronger behavior-oriented AST/source helper is needed.

**Interfaces:**
- Consumes: final Public, Authenticated, and Admin query boundaries.
- Produces: explicit route matrix evidence for the final report.

- [ ] Confirm `/board-games`, `/announcements`, `/borrowings`, `/memberships`, and Admin query pages still normalize URL input in Server pages/components and call services/repositories only from server code.
- [ ] Confirm neither new result component contains browser result-fetching or canonical client query state.
- [ ] Confirm each paginated result read occurs once in its owning render path and supplies totals/Pagination.
- [ ] Run the full test suite.

### Task 9: Complete repository verification

**Files:**
- No planned source changes.

**Interfaces:**
- Consumes: final working tree.
- Produces: evidence-backed completion report.

- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `git diff --check`.
- [ ] Run `npm run build`.
- [ ] Inspect `git status --short` and `git diff --stat`.
- [ ] Attempt browser-surface discovery. If unavailable, report exact manual routes, widths, actions, `SSR SOURCE VERIFIED`, and `USER RUNTIME/VISUAL REVIEW REQUIRED`.
