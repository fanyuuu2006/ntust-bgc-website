import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, SVGElement: dom.window.SVGElement });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
const { UserAvatar } = load("src/components/UserAvatar.tsx");

const USER = { id: "user-identity", name: "社員甲", avatar: null };

test("UserAvatar SSR renders a private, covered image and deterministic accessible fallback", () => {
  const image = renderToStaticMarkup(React.createElement(UserAvatar, { user: { ...USER, avatar: "https://external.example/avatar.jpg" }, className: "size-8 rounded-full" }));
  assert.match(image, /src="https:\/\/external\.example\/avatar\.jpg"/);
  assert.match(image, /alt="社員甲"/);
  assert.match(image, /referrerPolicy="no-referrer"/);
  assert.match(image, /object-cover/);
  assert.match(image, /size-8/);

  const first = renderToStaticMarkup(React.createElement(UserAvatar, { user: USER, className: "size-8" }));
  const second = renderToStaticMarkup(React.createElement(UserAvatar, { user: USER, className: "size-8" }));
  assert.match(first, /role="img"/); assert.match(first, /aria-label="社員甲"/); assert.match(first, />社</);
  const stops = (html) => [...html.matchAll(/stop-color="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(stops(first), stops(second));
});

test("a broken Avatar falls back and a changed valid URL renders again", async (t) => {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); });
  const avatarA = "https://external.example/broken-a.jpg";
  const avatarB = "https://external.example/valid-b.jpg";
  await React.act(async () => root.render(React.createElement(UserAvatar, { user: { ...USER, avatar: avatarA }, className: "size-8" })));
  const image = host.querySelector("img"); assert.equal(image.src, avatarA);
  await React.act(async () => image.dispatchEvent(new window.Event("error")));
  assert.equal(host.querySelector("img"), null); assert.ok(host.querySelector('svg[aria-label="社員甲"]'));
  await React.act(async () => root.render(React.createElement(UserAvatar, { user: { ...USER, avatar: avatarB }, className: "size-8" })));
  assert.equal(host.querySelector("img")?.src, avatarB);
});

test("every user identity consumer delegates image rendering to UserAvatar", () => {
  const consumers = [
    "src/components/Header/UserMenu.tsx",
    "src/components/avatars/AvatarManagement.tsx",
    "src/components/(authenticated)/profile/ProfileHeroSection.tsx",
    "src/components/PublicUserLink.tsx",
    "src/app/(admin)/admin/users/page.tsx",
    "src/app/(admin)/admin/users/[id]/page.tsx",
  ].map((path) => [path, readFileSync(path, "utf8")]);
  for (const [path, source] of consumers) assert.match(source, /UserAvatar|AvatarManagement/, path);
  assert.match(readFileSync("src/repositories/board-game-reviews.repository.ts", "utf8"), /author:users[^\n]+avatar/);
  assert.match(readFileSync("src/components/PublicUserLink.tsx", "utf8"), /UserAvatar/);
});

test("Avatar refresh feeds the existing Header without polling or client Storage access", () => {
  const manager = readFileSync("src/components/avatars/AvatarManagement.tsx", "utf8");
  const header = readFileSync("src/components/Header/UserMenu.tsx", "utf8");
  assert.match(manager, /router\.refresh\(\)/); assert.match(header, /<UserAvatar[\s\S]*user=\{user\}/);
  assert.doesNotMatch(manager, /supabase|setInterval|useSWR|react-query/i);
});

test("ordinary account schemas reject Avatar writes and only dedicated routes expose mutations", () => {
  const schema = load("src/services/users/users.schema.tsx").updateUserAccountSchema;
  assert.equal(schema.safeParse({ name: "合法名稱", avatar: "https://external.example/new.jpg" }).success, false);
  assert.equal(schema.safeParse({ name: "合法名稱", avatar: null }).success, false);
  const accountRoutes = ["src/app/api/users/me/account/route.ts", "src/app/api/admin/users/[id]/account/route.ts"];
  for (const path of accountRoutes) assert.doesNotMatch(readFileSync(path, "utf8"), /avatar/i);
  for (const path of ["src/app/api/users/me/avatar/route.ts", "src/app/api/admin/users/[id]/avatar/route.ts"]) {
    const source = readFileSync(path, "utf8"); assert.match(source, /avatarsService\.(replace|remove)/);
  }
});

test("public identity stays narrow and closed Review authors retain the canonical fallback", () => {
  const projection = readFileSync("src/services/users/public-identity.ts", "utf8");
  assert.match(projection, /source\.closed_at \? null : publicAvatar\(source\.avatar\)/);
  assert.doesNotMatch(projection, /email|real_name|membership|session/);
  const publicLink = readFileSync("src/components/PublicUserLink.tsx", "utf8");
  assert.match(publicLink, /PublicUserIdentity/); assert.match(publicLink, /UserAvatar/);
});
