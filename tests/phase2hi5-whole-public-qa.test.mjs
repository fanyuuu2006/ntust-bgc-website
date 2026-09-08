import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legal routes share the accepted public page rhythm and readable measure", async () => {
  const [privacy, terms] = await Promise.all([
    readSource("src/app/(public)/privacy/page.tsx"),
    readSource("src/app/(public)/terms/page.tsx"),
  ]);

  for (const source of [privacy, terms]) {
    assert.match(source, /className="container py-8"/);
    assert.match(source, /max-w-4xl/);
    assert.doesNotMatch(source, /<Card\b|shadow-|rounded-2xl/);
  }
});

test("public routes provide a concise shell-compatible not-found state", async () => {
  const notFound = await readSource("src/app/(public)/not-found.tsx");

  assert.match(notFound, /<PageHeader/);
  assert.match(notFound, /eyebrow="404"/);
  assert.match(notFound, /title="找不到這個頁面"/);
  assert.match(notFound, /<ButtonLink[^>]*href="\/"/);
  assert.doesNotMatch(notFound, /<Card\b|Image|illustration|gradient/);
});

test("public shell retains document scroll, sticky header, and footer push-down", async () => {
  const [shell, header] = await Promise.all([
    readSource("src/components/layouts/WebsiteShell.tsx"),
    readSource("src/components/Header/Header.tsx"),
  ]);

  assert.match(shell, /flex min-h-dvh shrink-0 flex-col/);
  assert.match(
    shell,
    /<main[\s\S]*?className="[^"]*flex-1[^"]*flex-col[^"]*focus:outline-none"/,
  );
  assert.doesNotMatch(shell, /overflow-y-(?:auto|scroll)/);
  assert.match(header, /sticky top-0/);
});

test("accepted homepage image and bounded-query performance contracts remain intact", async () => {
  const [hero, announcements, popular, boardGameCard] = await Promise.all([
    readSource("src/components/(public)/home/HomeHero.tsx"),
    readSource(
      "src/components/(public)/home/LatestAnnouncementsSection.tsx",
    ),
    readSource("src/components/(public)/home/PopularBoardGamesSection.tsx"),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);

  assert.match(hero, /<Image/);
  assert.match(hero, /priority/);
  assert.match(announcements, /pageSize:\s*3/);
  assert.match(popular, /listPopularBoardGames\(\{\s*limit:\s*6/);
  assert.match(boardGameCard, /loading="lazy"/);
});
