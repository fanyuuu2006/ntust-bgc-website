import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const gameId = "00000000-0000-4000-8000-000000000001";

test("authoring validation retains canonical normalization and rejects forged fields", () => {
  const { replaceReviewSchema } = load("src/services/reviews/reviews.schema.ts");
  assert.deepEqual(replaceReviewSchema.parse({ rating: 1, content: "  first\r\nsecond  " }), { rating: 1, content: "first\nsecond" });
  assert.deepEqual(replaceReviewSchema.parse({ rating: 5, content: " \r " }), { rating: 5, content: null });
  assert.equal(Array.from(replaceReviewSchema.parse({ rating: 3, content: "😀".repeat(2000) }).content).length, 2000);
  for (const input of [{ rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: "5" }, { content: "text" }, { rating: 5, content: "x".repeat(2001) }, { rating: 5, userId: "forged" }]) assert.throws(() => replaceReviewSchema.parse(input));
});

test("create route uses verified authorization and maps expected statuses without private response", async () => {
  const calls = [];
  let user = { id: "author" };
  let outcome = { rating: 5, content: null };
  class DuplicateReviewError extends Error {}
  class BoardNotFoundError extends Error {}
  const { POST } = load("src/app/api/board-games/[id]/reviews/route.ts", {
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => user ? { user, response: null } : { user: null, response: Response.json({ message: "請先登入" }, { status: 401 }) } },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => Response.json({ message: "unexpected", errorId: "ERR" }, { status: 500 }) },
    "@/services/board-games/board-games.errors": { BoardNotFoundError },
    "@/services/reviews/reviews.errors": { DuplicateReviewError },
    "@/services/reviews/reviews.service": { reviewsService: { create: async (...args) => { calls.push(args); if (outcome instanceof Error) throw outcome; return outcome; } } },
  });
  const context = { params: Promise.resolve({ id: gameId }) };
  const request = () => new Request("https://example.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: 5, content: null }) });
  user = null;
  assert.equal((await POST(request(), context)).status, 401);
  assert.equal(calls.length, 0);
  user = { id: "author" };
  const created = await POST(request(), context);
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { data: { rating: 5, content: null } });
  assert.deepEqual(calls[0], ["author", gameId, { rating: 5, content: null }]);
  outcome = new DuplicateReviewError();
  assert.equal((await POST(request(), context)).status, 409);
  outcome = new BoardNotFoundError();
  assert.equal((await POST(request(), context)).status, 404);
  user = null;
  assert.equal((await POST(request(), context)).status, 401);
});

test("unverified author receives the existing 403 verification contract", async () => {
  const { POST } = load("src/app/api/board-games/[id]/reviews/route.ts", {
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => ({ user: null, response: Response.json({ message: "請先完成 Email 驗證", code: "EMAIL_VERIFICATION_REQUIRED" }, { status: 403 }) }) },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => { throw new Error("unexpected"); } },
    "@/services/board-games/board-games.errors": { BoardNotFoundError: class extends Error {} },
    "@/services/reviews/reviews.errors": { DuplicateReviewError: class extends Error {} },
    "@/services/reviews/reviews.service": { reviewsService: { create: () => { throw new Error("mutation must not run"); } } },
  });
  const result = await POST(new Request("https://example.test", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: gameId }) });
  assert.equal(result.status, 403);
  assert.equal((await result.json()).code, "EMAIL_VERIFICATION_REQUIRED");
});

test("own PATCH/DELETE route uses session author, never body author, and handles missing rows", async () => {
  const calls = [];
  class ReviewNotFoundError extends Error {}
  let missing = false;
  const { PATCH, DELETE } = load("src/app/api/board-games/[id]/reviews/me/route.ts", {
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => ({ user: { id: "author" }, response: null }) },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => Response.json({ message: "unexpected" }, { status: 500 }) },
    "@/services/reviews/reviews.errors": { ReviewNotFoundError },
    "@/services/reviews/reviews.service": { reviewsService: {
      updateOwn: async (...args) => { calls.push(["update", ...args]); if (missing) throw new ReviewNotFoundError(); return { rating: 4, content: null }; },
      deleteOwn: async (...args) => { calls.push(["delete", ...args]); if (missing) throw new ReviewNotFoundError(); },
    } },
  });
  const context = { params: Promise.resolve({ id: gameId }) };
  const request = new Request("https://example.test", { method: "PATCH", body: JSON.stringify({ rating: 4, content: null }) });
  assert.equal((await PATCH(request, context)).status, 200);
  assert.deepEqual(calls[0], ["update", "author", gameId, { rating: 4, content: null }]);
  assert.equal((await DELETE(new Request("https://example.test", { method: "DELETE" }), context)).status, 200);
  assert.deepEqual(calls[1], ["delete", "author", gameId]);
  missing = true;
  assert.equal((await DELETE(new Request("https://example.test", { method: "DELETE" }), context)).status, 404);
});

test("author UI treats rating-only as existing review and uses modal plus confirmation", async () => {
  const source = await read("src/components/(public)/board-games/ReviewAuthorAction.tsx");
  const ratingInputSource = await read("src/components/(public)/board-games/RatingInput.tsx");
  assert.match(source, /<ConfirmDialog/);
  assert.match(ratingInputSource, /type="radio"/);
  assert.match(source, /router\.refresh\(\)/);
  assert.doesNotMatch(source, /supabase|dangerouslySetInnerHTML/);
  const { ReviewAuthorAction } = load("src/components/(public)/board-games/ReviewAuthorAction.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
  });
  const html = renderToStaticMarkup(createElement(ReviewAuthorAction, { boardGameId: gameId, eligibility: "verified", ownReview: { rating: 4, content: null } }));
  assert.match(html, /你的評分/);
  assert.match(html, /只有評分/);
  assert.match(html, /編輯評分/);
  assert.doesNotMatch(html, /登入後評分/);
  const anonymous = renderToStaticMarkup(createElement(ReviewAuthorAction, { boardGameId: gameId, eligibility: "anonymous", ownReview: null }));
  assert.match(anonymous, /登入後評分/);
  assert.match(anonymous, /returnTo=/);
  const unverified = renderToStaticMarkup(createElement(ReviewAuthorAction, { boardGameId: gameId, eligibility: "unverified", ownReview: null }));
  assert.match(unverified, /完成 Email 驗證後再評分/);
  const noReview = renderToStaticMarkup(createElement(ReviewAuthorAction, { boardGameId: gameId, eligibility: "verified", ownReview: null }));
  assert.match(noReview, /評分這款桌遊/);
  assert.doesNotMatch(noReview, /編輯評分/);
});

test("rating presentation formats averages, clips fractional stars, and omits slash-five copy", () => {
  const { formatAverageRating, RatingStars } = load("src/components/(public)/board-games/RatingStars.tsx");
  assert.equal(formatAverageRating(5), "5.0");
  assert.equal(formatAverageRating(3.25), "3.3");
  const html = renderToStaticMarkup(createElement(RatingStars, { rating: 4.6, label: "平均評分 4.6，滿分 5 分" }));
  assert.match(html, /aria-label="平均評分 4\.6，滿分 5 分"/);
  assert.match(html, /style="width:60/);
  assert.equal((html.match(/lucide-star/g) ?? []).length, 10);
  assert.doesNotMatch(html, /4\.6 \/ 5/);
});

test("interactive rating keeps native radio state and visible numeric selection", async () => {
  const { RatingInput } = load("src/components/(public)/board-games/RatingInput.tsx");
  const html = renderToStaticMarkup(createElement(RatingInput, { value: 4, onChange: () => {} }));
  assert.equal((html.match(/type="radio"/g) ?? []).length, 5);
  assert.match(html, /checked=""[^>]*value="4"|value="4"[^>]*checked=""/);
  assert.match(html, /你的評分：4 分/);
  assert.doesNotMatch(html, /4 \/ 5/);
});

test("compact own state does not duplicate written review content", () => {
  const { ReviewAuthorAction } = load("src/components/(public)/board-games/ReviewAuthorAction.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
  });
  const privateText = "這段評論只應由公開評論列表呈現";
  const ownHtml = renderToStaticMarkup(createElement(ReviewAuthorAction, {
    boardGameId: gameId,
    eligibility: "verified",
    ownReview: { rating: 5, content: privateText },
  }));
  assert.match(ownHtml, /已留下文字評論/);
  assert.doesNotMatch(ownHtml, new RegExp(privateText));
});

test("service returns minimal own and mutation projection while ownership remains in repository", async () => {
  const calls = [];
  const row = { id: "private-id", board_game_id: gameId, user_id: "author", rating: 4, content: null, created_at: "date", updated_at: "date", email: "private@example.invalid" };
  class RepositoryError extends Error {}
  class BoardNotFoundError extends Error {}
  class DuplicateReviewError extends Error {}
  class ReviewNotFoundError extends Error {}
  const { reviewsService } = load("src/services/reviews/reviews.service.ts", {
    "@/repositories/shared/errors": { RepositoryError },
    "@/services/board-games/board-games.errors": { BoardNotFoundError },
    "@/services/reviews/reviews.errors": { DuplicateReviewError, ReviewNotFoundError },
    "@/repositories/board-games.repository": { boardGamesRepository: { findById: async () => ({ id: gameId }) } },
    "@/repositories/board-game-reviews.repository": { boardGameReviewsRepository: {
      create: async (...args) => { calls.push(["create", ...args]); return row; },
      findByBoardGameAndUser: async (...args) => { calls.push(["find", ...args]); return row; },
      updateOwn: async (...args) => { calls.push(["update", ...args]); return row; },
      deleteOwn: async (...args) => { calls.push(["delete", ...args]); return true; },
    } },
    "@/services/users/public-identity": { toPublicUserIdentity: (value) => value },
  });
  assert.deepEqual(await reviewsService.findOwn("author", gameId), { rating: 4, content: null });
  assert.deepEqual(await reviewsService.create("author", gameId, { rating: 4, content: "  " }), { rating: 4, content: null });
  assert.deepEqual(await reviewsService.updateOwn("author", gameId, { rating: 5, content: "hello" }), { rating: 4, content: null });
  await reviewsService.deleteOwn("author", gameId);
  assert.deepEqual(calls.map((call) => call.slice(0, 3)), [
    ["find", gameId, "author"], ["create", gameId, "author"], ["update", gameId, "author"], ["delete", gameId, "author"],
  ]);
  assert.equal(calls[1][3].content, null);
  assert.equal(calls[2][3].rating, 5);
});

test("rapid double submit starts exactly one author mutation", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { url: "https://example.test" });
  const previous = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let finish;
  let calls = 0;
  const request = new Promise((resolve) => { finish = resolve; });
  const { ReviewAuthorAction } = load("src/components/(public)/board-games/ReviewAuthorAction.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
    "@/components/Modal": { Modal: ({ open, children }) => open ? createElement("div", {}, children) : null },
    "@/components/ConfirmDialog": { ConfirmDialog: () => null },
    "@/components/FormFeedback": { FormFeedback: () => null },
    "@/components/ui/Button": { Button: ({ children, isLoading, ...props }) => createElement("button", { ...props, disabled: props.disabled || isLoading }, children), ButtonLink: () => null },
    "@/libs/api/client": { apiClient: () => { calls += 1; return request; } },
  });
  const root = createRoot(dom.window.document.getElementById("app"));
  try {
    await act(async () => root.render(createElement(ReviewAuthorAction, { boardGameId: gameId, eligibility: "verified", ownReview: null })));
    await act(async () => dom.window.document.querySelector("button").click());
    await act(async () => { const radio = dom.window.document.querySelector("input[value='5']"); radio.click(); });
    const form = dom.window.document.querySelector("form");
    await act(async () => { form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.equal(calls, 1);
    await act(async () => finish({ data: { rating: 5, content: null } }));
  } finally {
    await act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.IS_REACT_ACT_ENVIRONMENT;
    dom.window.close();
  }
});
