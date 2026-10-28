import { expect, test, type Page } from "@playwright/test";

async function assertNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("homepage renders accessible shell without horizontal overflow", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/臺科大桌上遊戲研究社/);
  await expect(page.locator("body")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  if (["mobile-390", "desktop-1280"].includes(test.info().project.name)) await page.screenshot({ path: `artifacts/home-${test.info().project.name}.png`, fullPage: true });
});

test("homepage upcoming event row opens styled shared preview when data is available", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const rows = page.locator("#upcoming-events button");
  if (await rows.count() === 0) return;
  await rows.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".event-calendar-event-details-title")).toBeVisible();
  await expect(dialog.locator(".event-calendar-event-date-line")).toHaveCSS("display", "flex");
  await expect(dialog.locator(".event-calendar-event-meta-icon").first()).toHaveCSS("flex-shrink", "0");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("public calendar renders and supports month/list controls", async ({ page }) => {
  await page.goto("/schedule", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/行事曆/);
  await expect(page.getByRole("button", { name: "下一個月" })).toBeVisible();
  await expect(page.getByRole("button", { name: "月曆" })).toBeVisible();
  await page.getByRole("button", { name: "列表" }).click();
  await expect(page.locator('[aria-label="活動列表"]')).toBeVisible();
  await page.getByRole("button", { name: "月曆" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  if (["mobile-390", "desktop-1280"].includes(test.info().project.name)) await page.screenshot({ path: `artifacts/calendar-${test.info().project.name}.png`, fullPage: true });
});

test("public calendar supports navigation, selected-day details, and dialog escape", async ({ page }) => {
  await page.goto("/schedule", { waitUntil: "domcontentloaded" });
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  const monthLabel = await grid.getAttribute("aria-label");
  await page.getByRole("button", { name: "下一個月" }).click();
  await expect(grid).not.toHaveAttribute("aria-label", monthLabel ?? "");
  await page.getByRole("button", { name: "上一個月" }).click();
  await expect(grid).toHaveAttribute("aria-label", monthLabel ?? "");
  await page.getByRole("button", { name: "今天" }).click();
  const eventButtons = page.getByRole("button", { name: /查看詳情$/ });
  if (await eventButtons.count()) {
    await eventButtons.first().focus();
    await expect(eventButtons.first()).toBeFocused();
    await eventButtons.first().click();
    await expect(page.getByRole("dialog", { name: "活動詳情" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "活動詳情" })).toBeHidden();
  }
});

test("board-game ranking search preserves query parameters", async ({ page }) => {
  await page.goto("/rankings/board-games", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("searchbox", { name: "搜尋桌遊名稱" });
  await search.fill("桌遊");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=%E6%A1%8C%E9%81%8A/);
});

test("ranking routes render public navigation", async ({ page }) => {
  for (const path of ["/rankings", "/rankings/board-games", "/rankings/reviews", "/rankings/contributors"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (path === "/rankings" && ["mobile-390", "desktop-1280"].includes(test.info().project.name)) await page.screenshot({ path: `artifacts/rankings-${test.info().project.name}.png`, fullPage: true });
  }
});
