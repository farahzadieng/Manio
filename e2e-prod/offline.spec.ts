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

test("manifest points to the user-provided install icons", async ({ page }) => {
  await page.goto("/");
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    if (!link) throw new Error("manifest link missing");
    return fetch(link.href).then((response) => response.json());
  });
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
  for (const path of [
    "/icons/manio-fullbleed-192.png",
    "/icons/manio-fullbleed-512.png",
    "/icons/apple-touch-icon-fullbleed-180.png",
  ]) {
    const response = await page.request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});
