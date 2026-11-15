import { test, expect } from "@playwright/test";
test("production PWA reloads offline after first cache", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(
    true,
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  await expect(page.getByText("۳۰۵٬۰۰۰ تومان")).toBeVisible();
});
