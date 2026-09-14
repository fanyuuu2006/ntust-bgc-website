import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "./helpers/load-app-module.mjs";

// 解析首頁 Server Components 的 async 子節點；不以此取代 Next HTTP/browser smoke。
async function resolveServerTree(node) {
  if (Array.isArray(node)) return Promise.all(node.map(async (child, index) => {
    const resolved = await resolveServerTree(child);
    return React.isValidElement(resolved) ? React.cloneElement(resolved, { key: child?.key ?? index }) : resolved;
  }));
  if (!React.isValidElement(node)) return node;
  if (typeof node.type === "function") return resolveServerTree(await node.type(node.props));
  return React.cloneElement(node, {}, await resolveServerTree(node.props.children));
}

for (const [announcementsFail, gamesFail] of [[true, false], [false, true], [true, true]]) {
  test(`homepage section failures stay local: announcements=${announcementsFail}, games=${gamesFail}`, async () => {
    const incidents = [];
    let shellProps;
    const mocks = {
      "@/libs/observability/report": { reportUnexpectedError: (_, context) => incidents.push(context.context) },
      "@/libs/observability/server-render": { withServerErrorReference: (fn) => fn },
      "@/libs/public-viewer": { resolvePublicViewer: async () => ({ status: "unavailable", user: null, isAdmin: false }) },
      "@/components/layouts/WebsiteShell": { WebsiteShell: (props) => {
        shellProps = props;
        return React.createElement("div", {}, React.createElement("header", {}, "public header"), props.children);
      } },
      "@/services/announcements/announcements.service": { announcementsService: { getHomepagePreview: async () => {
        if (announcementsFail) throw Error("fixture unavailable");
        return [{ id: 1, title: "Visible announcement", content: "public text", published_at: "2026-01-01", created_at: "2026-01-01" }];
      } } },
      "@/services/board-games/board-games.service": { boardGamesService: { listPopularBoardGames: async () => {
        if (gamesFail) throw Error("fixture unavailable");
        return [{ id: "fixture", name: "Visible game", image: null, status: "available", category: null, location: null }];
      } } },
    };
    const page = load("src/app/(public)/page.tsx", mocks).default;
    const layout = load("src/app/(public)/layout.tsx", mocks).default;
    const html = renderToStaticMarkup(await resolveServerTree(await layout({ children: React.createElement(page) })));
    assert.match(html, /public header/);
    assert.match(html, /latest-announcements|popular-board-games/);
    assert.match(html, /<h1/);
    assert.match(html, announcementsFail ? /最新公告暫時無法載入/ : /Visible announcement/);
    assert.match(html, gamesFail ? /熱門桌遊暫時無法載入/ : /Visible game/);
    assert.equal(shellProps.user, null);
    assert.equal(shellProps.isAdmin, false);
    assert.equal(incidents.length, Number(announcementsFail) + Number(gamesFail));
  });
}
