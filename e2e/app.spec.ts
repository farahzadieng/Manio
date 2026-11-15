import { test, expect } from "@playwright/test";

test("empty start, create/edit/repeat/delete expense and search", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع با دفتر خالی/ }).click();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await page.getByLabel("مبلغ (تومان)").fill("12345");
  await page
    .getByRole("combobox", { name: "دسته" })
    .selectOption({ label: "🍽️ خوراک" });
  await page.getByLabel("یادداشت (اختیاری)").fill("VPN تست");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await page.getByPlaceholder("جست‌وجو در یادداشت، دسته یا منبع").fill("vpn");
  await expect(page.getByText("۱ نتیجه")).toBeVisible();
  await page.getByRole("button", { name: /خوراک/ }).click();
  await page.getByLabel("مبلغ (تومان)").fill("15000");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByPlaceholder("جست‌وجو در یادداشت، دسته یا منبع").fill("");
  await page.getByRole("button", { name: /خوراک/ }).click();
  await page.getByRole("button", { name: "تکرار برای امروز" }).click();
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await expect(page.getByText("۲ نتیجه")).toBeVisible();
  await page.getByRole("button", { name: /خوراک/ }).first().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "حذف" }).click();
  await expect(page.getByText("۱ نتیجه")).toBeVisible();
});

test("demo reports, obligation completion, export and themes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "گزارش‌ها", exact: true }).click();
  await expect(page.getByText("هزینه ثبت‌شده", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "تعهدات", exact: true }).click();
  await page.getByRole("button", { name: "✓ انجام شد" }).first().click();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.getByRole("button", { name: "تیره" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "دریافت پشتیبان JSON" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/manio-backup/);
  await page.getByRole("button", { name: "روشن" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await expect(page.getByText("هزینه‌های ثبت‌شده این ماه")).toBeVisible();
  await expect(page.locator(".hero strong")).toHaveText("۳۰۵٬۰۰۰ تومان");
  expect(
    await page
      .locator(".hero strong")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
  ).toBeGreaterThanOrEqual(26);
  for (const name of ["خانه", "تراکنش‌ها", "گزارش‌ها", "تعهدات"]) {
    await page.getByRole("button", { name, exact: true }).last().click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow, `${name} overflow`).toBe(false);
    await expect(page.locator(".tabbar")).toBeInViewport();
  }
});

test("backup, reset confirmation, and restore", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  const ready = page.waitForEvent("download");
  await page.getByRole("button", { name: "دریافت پشتیبان JSON" }).click();
  const saved = await ready;
  const path = await saved.path();
  expect(path).toBeTruthy();
  page.on("dialog", (dialog) =>
    dialog.accept(dialog.type() === "prompt" ? "حذف" : undefined),
  );
  await page.getByRole("button", { name: "حذف همه داده‌های محلی" }).click();
  await expect(
    page.getByRole("button", { name: "دیدن داده‌های نمونه" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /شروع با دفتر خالی/ }).click();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(
    page.getByRole("dialog", { name: "پیش‌نمایش پشتیبان" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "جایگزینی" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await expect(page.getByText("۶ نتیجه")).toBeVisible();
});

test("income and optional obligation transaction remain separate records", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "+ ثبت درآمد" }).click();
  await page.getByLabel("مبلغ (تومان)").fill("250000");
  await page
    .getByRole("combobox", { name: "دسته" })
    .selectOption({ label: "💼 حقوق" });
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تعهدات", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "✓ انجام شد" }).first().click();
  await expect(page.getByRole("dialog", { name: "ثبت تراکنش" })).toBeVisible();
  await page
    .getByRole("combobox", { name: "دسته" })
    .selectOption({ label: "🍽️ خوراک" });
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await expect(page.getByText("۸ نتیجه")).toBeVisible();
});
