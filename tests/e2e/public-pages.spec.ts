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

test("ranking routes render public navigation", async ({ page }) => {
  for (const path of ["/rankings", "/rankings/board-games", "/rankings/reviews", "/rankings/contributors"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (path === "/rankings" && ["mobile-390", "desktop-1280"].includes(test.info().project.name)) await page.screenshot({ path: `artifacts/rankings-${test.info().project.name}.png`, fullPage: true });
  }
});
