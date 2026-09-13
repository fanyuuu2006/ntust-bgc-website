import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { load } from "./helpers/load-app-module.mjs";

const media = load("src/libs/rich-content/media.ts");
const { richContentSchema } = load("src/libs/rich-content/content.ts");
const youtube = { type: "videoEmbed", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ" } };
const bilibili = { type: "videoEmbed", attrs: { provider: "bilibili", videoId: "BV1JYED6tEff" } };
const doc = (node) => ({ type: "doc", content: [node] });
for (const [name, input, expected] of [
  ["YouTube watch", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", youtube],
  ["YouTube share", "https://youtu.be/dQw4w9WgXcQ", youtube],
  ["YouTube embed URL", "https://www.youtube.com/embed/dQw4w9WgXcQ", youtube],
  ["YouTube iframe", '<iframe width="560" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" allow="camera" onload="alert(1)"></iframe>', youtube],
  ["Bilibili BV", "https://www.bilibili.com/video/BV1JYED6tEff/?share_source=copy_web", bilibili],
  ["Bilibili player", "https://player.bilibili.com/player.html?bvid=BV1JYED6tEff&autoplay=1", bilibili],
  ["Bilibili iframe", '<iframe src="//player.bilibili.com/player.html?bvid=BV1JYED6tEff&amp;autoplay=1" scrolling="no" allowfullscreen="true"></iframe>', bilibili],
  ["video file", "https://cdn.example.com/a.mp4?key=public", { type: "videoEmbed", attrs: { provider: "direct", src: "https://cdn.example.com/a.mp4?key=public" } }],
  ["audio file", "https://cdn.example.com/a.mp3", { type: "audioEmbed", attrs: { src: "https://cdn.example.com/a.mp3" } }],
]) test(`resolver recognizes ${name} and emits validated structured data`, () => {
  const result = media.resolveMediaInput(input);
  assert.deepEqual(result, expected);
  assert.equal(richContentSchema.safeParse(doc(result)).success, true);
});

test("invalid inputs are expected validation errors, including ambiguous or arbitrary HTML", () => {
  for (const input of [
    "https://bilibili.com.evil.test/video/BV1JYED6tEff", "https://evil.test/?bvid=BV1JYED6tEff", "https://www.bilibili.com/video/BVbad/",
    "https://u:p@example.com/a.mp3", "javascript:alert(1)", "data:video/mp4,abc", "http://example.com/a.mp4", "https://example.com/article",
    "https://open.spotify.com/track/123", "https://music.apple.com/album/123", "https://soundcloud.com/user/song",
    '<iframe src="https://evil.test"></iframe>', '<iframe src="https://example.com/a.mp4"></iframe>',
    '<iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe><iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>',
    '<script>alert(1)</script><iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>',
    '<iframe src="https://youtu.be/dQw4w9WgXcQ" src="https://evil.test"></iframe>',
    '<iframe src="https://youtu.be/dQw4w9WgXcQ"><img src=x></iframe>',
    '<iframe src=https://youtu.be/dQw4w9WgXcQ></iframe>',
  ]) assert.throws(() => media.resolveMediaInput(input), (error) => error.name === "MediaInputError" && !error.errorId, input);
});

test("provider renderer owns src, permissions and autoplay policy", () => {
  const { RichTextRenderer } = load("src/components/RichTextRenderer.tsx");
  const html = renderToStaticMarkup(React.createElement(RichTextRenderer, { content: "fallback", content_format: "rich_text_v1", rich_content: { type: "doc", content: [youtube, bilibili] } }));
  assert.match(html, /www.youtube-nocookie.com\/embed\/dQw4w9WgXcQ/);
  assert.match(html, /player.bilibili.com\/player.html\?bvid=BV1JYED6tEff&amp;autoplay=0/);
  assert.doesNotMatch(html, /camera|microphone|geolocation|autoplay=1|onload|sandbox=/);
  assert.equal((html.match(/loading="lazy"/g) ?? []).length, 2);
});

test("media editor uses Modal and content has separate bounded scroll ownership", () => {
  const source = readFileSync("src/components/RichTextEditor.tsx", "utf8");
  assert.match(source, /<Modal/);
  assert.match(source, /媒體網址或嵌入碼/);
  assert.match(source, /rich-editor-viewport/);
  assert.doesNotMatch(source, /<div role="group" aria-label="媒體設定"/);
  const css = readFileSync("src/styles/globals.css", "utf8");
  assert.match(css, /\.rich-editor-viewport\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s);
});

test("API rejects unsafe media as 400 without incident reporting or writes", async () => {
 let writes=0, incidents=0;
 const { POST }=load("src/app/api/admin/announcements/route.ts", {
 "@/libs/api/admin-authorization":{authorizeAdminRequest:async()=>({user:{id:"author"}})},
 "@/libs/api/server-response":{unexpectedErrorResponse:()=>{incidents++;return new Response(null,{status:500});}},
 "@/repositories/announcements.repository":{announcementsRepository:{create:async()=>{writes++;}}},
 });
 for(const node of [{type:"videoEmbed",attrs:{provider:"bilibili",videoId:"bad"}},{type:"audioEmbed",attrs:{src:"https://open.spotify.com/track/123"}},{type:"iframe",attrs:{src:"https://evil.test"}}]) {
 const response=await POST(new Request("http://localhost/api/admin/announcements",{method:"POST",body:JSON.stringify({title:"media",is_published:false,content_format:"rich_text_v1",rich_content:doc(node)})}));
 assert.equal(response.status,400);assert.equal((await response.json()).errorId,undefined);
 }
 assert.equal(writes,0);assert.equal(incidents,0);
});
