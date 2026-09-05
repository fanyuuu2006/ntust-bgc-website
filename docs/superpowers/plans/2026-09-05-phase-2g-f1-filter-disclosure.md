# Phase 2G-F.1 Filter Disclosure Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge suitable filter toolbars on the accepted mobile-flow and desktop-floating disclosure grammar while preserving URL-authoritative SSR queries.

**Architecture:** A narrow server-safe native disclosure primitive owns shared trigger and panel chrome. Feature toolbars own fields and query semantics; Public Board Games keeps its proven feature-local interaction island because its full-width mobile panel must be a sibling in the parent grid.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, TypeScript 5, Tailwind CSS 4, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-filter-disclosure-convergence-design.md`

## Global Constraints

- Work in the current `main` working tree; do not commit.
- Write and run failing tests before production changes.
- Preserve URL query authority, server parsing/fetch/render, existing forms, page reset, query preservation, and Pagination.
- Do not introduce client result fetching, a universal toolbar/filter renderer, DB/API/domain changes, SEO work, or accepted content redesign.

---

### Task 1: Establish disclosure architecture contracts

**Files:**
- Create: `tests/phase2gf1-filter-disclosure.test.mjs`

**Interfaces:**
- Consumes: current query toolbar sources.
- Produces: failing contracts for the shared native primitive, Board Games responsive exception, SSR boundaries, and intentional always-visible filters.

- [ ] Write focused tests for native semantics, intrinsic trigger behavior, mobile flow, desktop floating panels, form ownership, multi-select preservation, and absence of client result fetching.
- [ ] Run the focused test and verify failures identify missing convergence behavior.

### Task 2: Add the narrow native disclosure primitive

**Files:**
- Create: `src/components/query/QueryFilterDisclosure.tsx`
- Test: `tests/phase2gf1-filter-disclosure.test.mjs`

**Interfaces:**
- Produces: `QueryFilterDisclosure({ children, className?, panelClassName?, label? })`.

- [ ] Add the native `<details>/<summary>` implementation with canonical outline trigger, mobile-flow panel, and `lg` floating positioning.
- [ ] Run the focused primitive test and existing query tests.

### Task 3: Adopt the primitive in authenticated toolbars

**Files:**
- Modify: `src/app/(authenticated)/borrowings/page.tsx`
- Modify: `src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx`

**Interfaces:**
- Consumes: `QueryFilterDisclosure`.
- Preserves: existing GET fields, hidden page/pageSize, search clear URLs, and sort controls.

- [ ] Replace duplicated native disclosure chrome while leaving feature fields unchanged.
- [ ] Run Borrowings, Memberships, Phase 2G-E, Phase 2G-F, and focused tests.

### Task 4: Adopt the primitive in suitable Admin toolbars

**Files:**
- Modify: `src/components/(admin)/admin/memberships/MembershipFilterBar.tsx`
- Modify: `src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx`
- Modify: `src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx`

**Interfaces:**
- Consumes: `QueryFilterDisclosure`.
- Preserves: native GET URL navigation, filter names, sorting parameters, pageSize, and `page=1`.

- [ ] Move only the two- or three-filter groups into the native disclosure panel.
- [ ] Keep single-filter Admin routes permanently visible and cover that decision in tests.
- [ ] Run Admin query and focused tests.

### Task 5: Complete Public Board Games responsive disclosure

**Files:**
- Modify: `src/components/(public)/board-games/BoardGameSearchForm.tsx`
- Modify: `src/components/(public)/board-games/BoardGameFilterDisclosure.tsx`

**Interfaces:**
- Preserves: native checkbox fields within the GET form and feature-local open state only.

- [ ] Make the toolbar grid the desktop positioning owner.
- [ ] Keep the panel full-width and in-flow on mobile; make it right-aligned and floating at `lg`.
- [ ] Preserve all repeated multi-select query names and default selections.
- [ ] Run Board Games, SSR, Phase 2G-E, Phase 2G-F, and focused tests.

### Task 6: Converge mobile filter density

**Files:**
- Modify: `src/components/(public)/board-games/BoardGameSearchForm.tsx`
- Modify: `src/components/(public)/board-games/BoardGameFilterDisclosure.tsx`
- Modify: authenticated and multi-filter Admin toolbar compositions listed above
- Test: `tests/phase2gf1-filter-disclosure.test.mjs`

**Interfaces:**
- Preserves: control touch targets and readable typography.
- Reduces: duplicated toolbar, panel, group, and option spacing owned by multiple nesting levels.

- [ ] Add failing density contracts without treating exact class snapshots as runtime proof.
- [ ] Use compact mobile toolbar gaps and retain the shared panel's `p-3` / `gap-3` utility-surface rhythm.
- [ ] Use a safe two-column mobile option grid for Board Games while keeping each label fully clickable.
- [ ] Keep Admin operational toolbars compact without changing their query fields or result rendering.

### Task 7: Verify the repository

**Files:**
- No planned source changes.

**Interfaces:**
- Produces: final static, test, build, and review evidence.

- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm test`.
- [ ] Run `git diff --check`.
- [ ] Run `npm run build`.
- [ ] Inspect final diff and provide the exact manual runtime checklist when no browser surface is available.
