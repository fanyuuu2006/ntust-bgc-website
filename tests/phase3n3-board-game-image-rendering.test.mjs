import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "SVGElement"]) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
const { BoardGameImage } = load("src/components/BoardGameImage.tsx");
after(() => dom.window.close());

const game = (image) => ({ name: "測試桌遊", image });

test("BoardGameImage renders persisted images privately while preserving caller layout", () => {
  const html = renderToStaticMarkup(React.createElement(BoardGameImage, {
    boardGame: game("https://external.example/cover.jpg"),
    className: "h-20 w-16 object-contain",
    width: 64,
    height: 80,
    loading: "eager",
  }));
  assert.match(html, /src="https:\/\/external\.example\/cover\.jpg"/);
  assert.match(html, /alt="測試桌遊"/);
  assert.match(html, /referrerPolicy="no-referrer"/);
  assert.match(html, /h-20 w-16 object-contain/);
  assert.match(html, /width="64"/);
  assert.match(html, /height="80"/);
  assert.match(html, /loading="eager"/);
});

test("null and failed persisted images render the canonical fallback", async (t) => {
  const fallback = renderToStaticMarkup(React.createElement(BoardGameImage, { boardGame: game(null), className: "h-20 w-16 object-cover" }));
  assert.match(fallback, /<svg/);
  assert.match(fallback, /role="img"/);
  assert.match(fallback, /h-20 w-16 object-cover/);

  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); });
  const broken = "https://external.example/broken-a.jpg";
  await React.act(async () => root.render(React.createElement(BoardGameImage, { boardGame: game(broken), className: "h-20 w-16" })));
  const image = host.querySelector("img"); assert.equal(image.src, broken);
  await React.act(async () => image.dispatchEvent(new window.Event("error")));
  assert.equal(host.querySelector("img"), null);
  assert.ok(host.querySelector("svg"));
});

test("a failed source does not prevent a changed source from loading", async (t) => {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); });
  const first = "https://external.example/broken-a.jpg";
  const second = "https://project.supabase.co/storage/v1/object/public/board-game-images/game/cover.webp";
  await React.act(async () => root.render(React.createElement(BoardGameImage, { boardGame: game(first) })));
  await React.act(async () => host.querySelector("img").dispatchEvent(new window.Event("error")));
  await React.act(async () => root.render(React.createElement(BoardGameImage, { boardGame: game(second) })));
  assert.equal(host.querySelector("img")?.src, second);
  await React.act(async () => root.render(React.createElement(BoardGameImage, { boardGame: game(null) })));
  assert.equal(host.querySelector("img"), null);
  assert.ok(host.querySelector("svg"));
});

test("persisted-cover consumers converge on BoardGameImage while local draft preview stays native", () => {
  const consumers = [
    "src/components/(public)/home/HomeBoardGamePreview.tsx",
    "src/components/(public)/board-games/BoardGameCard.tsx",
    "src/app/(public)/board-games/[id]/page.tsx",
    "src/components/(admin)/admin/board-games/BoardGameTable.tsx",
    "src/components/(admin)/admin/board-games/BoardGameForm.tsx",
    "src/components/(authenticated)/borrowings/BorrowingRecord.tsx",
  ];
  for (const path of consumers) assert.match(readFileSync(path, "utf8"), /BoardGameImage/, path);

  const form = readFileSync("src/components/(admin)/admin/board-games/BoardGameForm.tsx", "utf8");
  assert.match(form, /<img src=\{previewUrl\}/);
  assert.doesNotMatch(form, /<BoardGameImage[^>]+onError=/);
  const persistedDirectImages = consumers
    .filter((path) => !path.endsWith("BoardGameForm.tsx"))
    .map((path) => readFileSync(path, "utf8"))
    .filter((source) => /<img[^>]+(?:boardGame|game)[^>]*image|src=\{[^}]*\.image/.test(source));
  assert.deepEqual(persistedDirectImages, []);
});

test("cover copy uses 4 MB only and validation error is conditional", () => {
  const form = readFileSync("src/components/(admin)/admin/board-games/BoardGameForm.tsx", "utf8");
  assert.match(form, /最大 4 MB/);
  assert.match(form, /圖片檔案不可超過 4 MB/);
  assert.doesNotMatch(form, /4 MiB/);
  assert.match(form, /<FormFeedback error=\{imageError \|\| removeError\}/);
});
