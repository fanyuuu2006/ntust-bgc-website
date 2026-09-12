import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function importTypeScriptModule(path) {
  const source = await readSource(path);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

const announcementsDefaults = {
  page: "1",
  pageSize: "10",
};

const boardGamesDefaults = {
  page: "1",
  pageSize: "24",
  sort: "popular",
};

test("announcement query SEO keeps only valid base-equivalent aliases indexable", async () => {
  const { classifyQuerySeo } = await importTypeScriptModule(
    "src/libs/query-seo.ts",
  );

  for (const query of [
    {},
    { page: "1" },
    { pageSize: "10" },
    { page: "1", pageSize: "10" },
  ]) {
    assert.deepEqual(classifyQuerySeo(query, announcementsDefaults), {
      indexable: true,
    });
  }

  for (const query of [
    { search: "test" },
    { page: "2" },
    { pageSize: "20" },
    { foo: "bar" },
    { page: "abc" },
    { search: "" },
    { page: "" },
    { page: ["1", "2"] },
  ]) {
    assert.deepEqual(classifyQuerySeo(query, announcementsDefaults), {
      indexable: false,
    });
  }
});

test("board-game query SEO distinguishes default aliases from discovery state", async () => {
  const { classifyQuerySeo } = await importTypeScriptModule(
    "src/libs/query-seo.ts",
  );

  for (const query of [
    {},
    { sort: "popular" },
    { page: "1" },
    { pageSize: "24" },
    { sort: "popular", page: "1", pageSize: "24" },
  ]) {
    assert.deepEqual(classifyQuerySeo(query, boardGamesDefaults), {
      indexable: true,
    });
  }

  for (const query of [
    { search: "test" },
    { status: "available" },
    { category: "6ab11fb8-8a52-4e28-a9d6-30838358f4dc" },
    { location: "e234b58d-782a-4d6e-a662-5f7036e55ac5" },
    { sort: "name:asc" },
    { page: "2" },
    { pageSize: "60" },
    { foo: "bar" },
    { page: "abc" },
    { sort: "invalid" },
    { status: "" },
    { sort: "" },
    { status: ["available", "borrowed"] },
    { orderBy: "popular", orderDirection: "desc" },
  ]) {
    assert.deepEqual(classifyQuerySeo(query, boardGamesDefaults), {
      indexable: false,
    });
  }
});

test("list pages derive query-aware robots without changing their base canonical", async () => {
  const [announcements, boardGames] = await Promise.all([
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(public)/board-games/page.tsx"),
  ]);

  for (const [source, canonical] of [
    [announcements, "/announcements"],
    [boardGames, "/board-games"],
  ]) {
    assert.match(source, /export const generateMetadata = withServerErrorReference\(generateMetadataContent/);
    assert.match(source, /classifyQuerySeo\(/);
    assert.match(
      source,
      new RegExp(`canonical:\\s*"${canonical.replaceAll("/", "\\/")}"`),
    );
    assert.match(
      source,
      /indexable[\s\S]*?robots:\s*\{\s*index:\s*false,\s*follow:\s*true/,
    );
    assert.doesNotMatch(
      source.slice(0, source.search(/async function (AnnouncementsPage|BoardGamesPage)/)),
      /Service\.|Repository\.|listPublished\(|listBoardGameDiscovery\(/,
    );
  }
});
