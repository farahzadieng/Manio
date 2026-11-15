import { test, expect } from "@playwright/test";
test("production PWA reloads offline after first cache", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.load("16px Arad");
  });
  expect(await page.evaluate(() => document.fonts.check("16px Arad"))).toBe(
    true,
  );
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily),
  ).toContain("Arad");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(
    true,
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  await expect(page.getByText("۳۰۵٬۰۰۰ تومان")).toBeVisible();
});
