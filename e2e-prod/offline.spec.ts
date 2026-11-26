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

test("installed app checks for a new service worker on resume", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = ServiceWorkerRegistration.prototype.update;
    ServiceWorkerRegistration.prototype.update = function () {
      (window as Window & { __updateChecks?: number }).__updateChecks =
        ((window as Window & { __updateChecks?: number }).__updateChecks || 0) +
        1;
      return original.call(this);
    };
  });
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __updateChecks?: number }).__updateChecks || 0,
      ),
    )
    .toBeGreaterThan(0);
  const before = await page.evaluate(
    () => (window as Window & { __updateChecks?: number }).__updateChecks || 0,
  );
  await page.evaluate(() => {
    const now = Date.now();
    Date.now = () => now + 6 * 60_000;
    window.dispatchEvent(new Event("focus"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __updateChecks?: number }).__updateChecks || 0,
      ),
    )
    .toBeGreaterThan(before);
});

test("settings can manually request an update check", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.getByRole("button", { name: "بررسی نسخه تازه" }).click();
  await expect(page.getByRole("status")).toContainText("بررسی انجام شد");
  await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
});

test("PWA install assets follow the phone color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const manifestLink = page.locator('link[rel="manifest"]');
  const favicon = page.locator('link[rel="icon"]');
  await expect(favicon).toHaveAttribute(
    "href",
    "/icons/manio-fullbleed-dark-192.png",
  );
  const touchIcon = page.locator('link[rel="apple-touch-icon"]');
  await expect(manifestLink).toHaveAttribute(
    "href",
    "/manifest-dark.webmanifest",
  );
  await expect(touchIcon).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon-fullbleed-dark-180.png",
  );

  const session = await page.context().newCDPSession(page);
  const { manifest } = await session.send("Page.getAppManifest");
  expect(manifest?.icons?.map((icon) => new URL(icon.url).pathname)).toEqual([
    "/icons/manio-fullbleed-dark-192.png",
    "/icons/manio-fullbleed-dark-512.png",
  ]);

  await page.emulateMedia({ colorScheme: "light" });
  await expect(favicon).toHaveAttribute(
    "href",
    "/icons/manio-fullbleed-192.png",
  );
  await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(touchIcon).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon-fullbleed-180.png",
  );
});
