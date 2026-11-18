import { test, expect } from "@playwright/test";

test("empty start, create/edit/repeat/delete expense and search", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع با دفتر خالی/ }).click();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await page.getByLabel("مبلغ (تومان)").fill("12345");
  await expect(page.getByLabel("مبلغ (تومان)")).toHaveValue("۱۲٬۳۴۵");
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

test("editable fields have iPhone-safe text size and obligations group amounts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  const amount = page.getByLabel("مبلغ (تومان)");
  await amount.pressSequentially("40000", { delay: 30 });
  await expect(amount).toHaveValue("۴۰٬۰۰۰");
  await amount.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(0, 0),
  );
  await amount.press("2");
  await expect(amount).toHaveValue("۲۴۰٬۰۰۰");
  expect(
    await amount.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16);
  const undersizedEditorFields = await page
    .locator(".editor input, .editor select, .editor textarea")
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            Number.parseFloat(getComputedStyle(element).fontSize) < 16,
        )
        .map((element) => element.outerHTML),
    );
  expect(undersizedEditorFields).toEqual([]);
  await page.getByRole("button", { name: "بستن" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  const undersizedSearchFields = await page
    .locator(".search input, .filters select")
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            Number.parseFloat(getComputedStyle(element).fontSize) < 16,
        )
        .map((element) => element.outerHTML),
    );
  expect(undersizedSearchFields).toEqual([]);
  await page.getByRole("button", { name: "تعهدات", exact: true }).click();
  await page.getByRole("button", { name: "افزودن" }).click();
  const obligationAmount = page.getByLabel("مبلغ (اختیاری)");
  await obligationAmount.fill("2500000");
  await expect(obligationAmount).toHaveValue("۲٬۵۰۰٬۰۰۰");
});

test("version, newest payment source and starred repeat shortcut", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await expect(page.getByText("نسخه برنامه:")).toContainText("۱٫۰");
  await page.getByLabel("نام منبع تازه").fill("کارت تازه");
  await page
    .locator(".inline-form")
    .last()
    .getByRole("button", { name: "افزودن" })
    .click();
  await page.getByRole("button", { name: "بازگشت به خانه" }).click();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "منبع پرداخت" })).toHaveValue(
    await page
      .getByRole("combobox", { name: "منبع پرداخت" })
      .locator("option", { hasText: "کارت تازه" })
      .getAttribute("value"),
  );
  await page.getByLabel("مبلغ (تومان)").fill("40000");
  await page
    .getByRole("combobox", { name: "دسته" })
    .selectOption({ label: "🍽️ خوراک" });
  await page
    .getByRole("button", { name: "افزودن به تراکنش‌های پرتکرار" })
    .click();
  await expect(
    page.getByRole("button", { name: "ذخیره‌شده در تراکنش‌های پرتکرار" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page
    .getByRole("button", { name: /ثبت دوباره خوراک، ۴۰٬۰۰۰ تومان/ })
    .click();
  await expect(page.getByLabel("مبلغ (تومان)")).toHaveValue("۴۰٬۰۰۰");
  await expect(
    page.getByRole("combobox", { name: "دسته" }).locator("option:checked"),
  ).toHaveText("🍽️ خوراک");
  await expect(
    page
      .getByRole("combobox", { name: "منبع پرداخت" })
      .locator("option:checked"),
  ).toHaveText("کارت تازه");
  await expect(
    page.getByRole("button", { name: "افزودن به تراکنش‌های پرتکرار" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await expect(page.getByText("۸ نتیجه")).toBeVisible();
});
