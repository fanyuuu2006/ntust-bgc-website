# Query Toolbar Interaction Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge Search, filter, sort, clear, and page-reset ownership without changing query semantics or SSR result authority.

**Architecture:** Feature-owned toolbars use a narrow pure query adapter plus small intrinsic controls. Explicit Search and grouped filter forms preserve normalized applied state through a shared hidden-field adapter; immediate controls mutate only their owned key from the current applied URL.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, Tailwind CSS 4, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-07-query-toolbar-interaction-convergence-design.md`

## Global Constraints

- Keep URL → Server Component → normalization → Service → Repository → SSR results.
- Do not change query semantics, Phase 2J-C normalization, Phase 2I-D SEO policy, repositories, services, database, domain behavior, or accepted visual design.
- Search owns only `search`; grouped filter forms own only their filter keys; immediate controls own only their scalar/sort keys.
- Every query-changing action resets `page=1` and preserves unrelated applied state including `pageSize`.
- Do not build a universal toolbar or query engine, add dependencies, commit, or start Phase 2J-F.

---

### Task 1: Pure applied-query adapter

**Files:**
- Create: `src/libs/query-navigation.ts`
- Create: `tests/phase2je-query-toolbar-interaction.test.mjs`

**Interfaces:**
- Produces: a pure function that accepts a base path, applied query state, owned keys, and owned values and returns a relative href with `page=1`.

- [ ] Write behavioral tests for owned Search/filter/sort changes, unrelated state preservation, repeated values, empty-value removal, and page reset.
- [ ] Run the focused test and verify RED because the adapter does not exist.
- [ ] Implement the smallest route-agnostic adapter using `URLSearchParams` and existing query value types.
- [ ] Run the focused test and verify GREEN.

### Task 2: Shared intrinsic form/navigation adapters

**Files:**
- Create: `src/components/query/PreservedQueryFields.tsx`
- Create: `src/components/query/ImmediateQuerySelect.tsx`
- Modify: `tests/phase2je-query-toolbar-interaction.test.mjs`

**Interfaces:**
- `PreservedQueryFields` renders normalized applied query fields excluding explicit owned keys and always resets the page.
- `ImmediateQuerySelect` changes one scalar key from applied URL state without reading sibling form drafts.

- [ ] Add failing integration contracts for hidden-field ownership and immediate select behavior.
- [ ] Verify RED.
- [ ] Implement the two narrow primitives without feature-schema knowledge.
- [ ] Verify GREEN and TypeScript for these boundaries.

### Task 3: Public and authenticated reference toolbars

**Files:**
- Modify: `src/components/(public)/board-games/BoardGameSearchForm.tsx`
- Modify: `src/components/(public)/board-games/BoardGameFilterDisclosure.tsx`
- Modify: `src/app/(authenticated)/borrowings/page.tsx`
- Modify: `src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx`
- Modify: focused tests

- [ ] Add failing contracts for Search/filter draft isolation, filter Apply/Clear, active feedback, and immediate sort.
- [ ] Verify RED.
- [ ] Split Search and grouped filter ownership; add immediate sort and preserve applied query state.
- [ ] Verify GREEN with affected Public/authenticated tests.

### Task 4: Admin grouped-filter toolbars

**Files:**
- Modify: `src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx`
- Modify: `src/components/(admin)/admin/memberships/MembershipFilterBar.tsx`
- Modify: `src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx`
- Modify: focused tests

- [ ] Add failing route contracts proving Search and filter forms own different keys.
- [ ] Verify RED.
- [ ] Split the forms, add filter-owned Apply/Clear, preserve table-sort/page-size state, and keep AdminToolbar presentation.
- [ ] Verify GREEN with affected Admin tests.

### Task 5: Admin standalone immediate controls

**Files:**
- Modify: Admin Announcements, Events, Officers, event attendance, and Admin Borrowings toolbar composition.
- Modify: focused tests

- [ ] Add failing contracts for immediate standalone filters/sorts and explicit Search isolation.
- [ ] Verify RED.
- [ ] Apply narrow client controls; keep Admin Borrowings compound sorting feature-owned.
- [ ] Verify GREEN with all affected Admin tests.

### Task 6: Full verification and runtime evidence

**Files:**
- Review all changed files only.

- [ ] Inspect status/diff and confirm scope.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `git diff --check`.
- [ ] Run one production build and apply the known Google Fonts blocker rule.
- [ ] Verify Public Board Games in available browser runtime; verify authenticated/Admin routes only if a safe session is available.
- [ ] Report source, test, build, and runtime evidence separately without committing or starting Phase 2J-F.
