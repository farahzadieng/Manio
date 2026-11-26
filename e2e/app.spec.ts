import { test, expect, type Page } from "@playwright/test";

async function chooseOption(page: Page, name: string, label: string) {
  const trigger = page.getByRole("button", { name, exact: true });
  await trigger.click();
  const menu = page.getByRole("listbox", { name, exact: true });
  await menu.getByRole("option", { name: label, exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
}

test("empty start, create/edit/repeat/delete expense and search", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع با دفتر خالی/ }).click();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await page.getByLabel("مبلغ (تومان)").fill("12345");
  await expect(page.getByLabel("مبلغ (تومان)")).toHaveValue("۱۲٬۳۴۵");
  await chooseOption(page, "دسته", "🍽️ خوراک");
  await page.getByLabel("توضیحات و علت هزینه").fill("VPN تست");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await page.getByPlaceholder("جست‌وجو در یادداشت، دسته یا منبع").fill("vpn");
  await expect(page.getByText("۱ نتیجه")).toBeVisible();
  await page
    .locator(".transaction-row")
    .filter({ hasText: "خوراک" })
    .first()
    .click();
  await page.getByLabel("مبلغ (تومان)").fill("15000");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByPlaceholder("جست‌وجو در یادداشت، دسته یا منبع").fill("");
  await page
    .locator(".transaction-row")
    .filter({ hasText: "خوراک" })
    .first()
    .click();
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
  await chooseOption(page, "دسته", "💼 حقوق");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تعهدات", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "✓ انجام شد" }).first().click();
  await expect(page.getByRole("dialog", { name: "ثبت تراکنش" })).toBeVisible();
  await chooseOption(page, "دسته", "🍽️ خوراک");
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
  await page.getByRole("button", { name: "بستن", exact: true }).click();
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

test("version, last used payment source and starred repeat shortcut", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await expect(page.getByText("نسخه برنامه:")).toContainText("۲٫۱");
  await page.getByLabel("نام منبع تازه").fill("کارت تازه");
  await page
    .locator(".inline-form")
    .last()
    .getByRole("button", { name: "افزودن" })
    .click();
  await page.getByRole("button", { name: "بازگشت به خانه" }).click();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "منبع پرداخت", exact: true }),
  ).toHaveText("کارت روزمره");
  await chooseOption(page, "منبع پرداخت", "کارت تازه");
  await page.getByLabel("مبلغ (تومان)").fill("40000");
  await chooseOption(page, "دسته", "🍽️ خوراک");
  await page
    .getByRole("button", { name: "افزودن به تراکنش‌های پرتکرار" })
    .click();
  await expect(
    page.getByRole("button", { name: "ذخیره‌شده در تراکنش‌های پرتکرار" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "منبع پرداخت", exact: true }),
  ).toHaveText("کارت تازه");
  await page.getByRole("button", { name: "بستن", exact: true }).click();
  await page
    .getByRole("button", { name: /ثبت دوباره خوراک، ۴۰٬۰۰۰ تومان/ })
    .click();
  await expect(page.getByLabel("مبلغ (تومان)")).toHaveValue("۴۰٬۰۰۰");
  await expect(
    page.getByRole("button", { name: "دسته", exact: true }),
  ).toHaveText("🍽️ خوراک");
  await expect(
    page.getByRole("button", { name: "منبع پرداخت", exact: true }),
  ).toHaveText("کارت تازه");
  await expect(
    page.getByRole("button", { name: "افزودن به تراکنش‌های پرتکرار" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await expect(page.getByText("۸ نتیجه")).toBeVisible();
});

test("monthly backup toast appears once and can be dismissed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  const toast = page.getByRole("status", { name: "یادآوری پشتیبان" });
  await expect(toast).toBeVisible();
  await expect(
    toast.getByRole("button", { name: "دریافت پشتیبان" }),
  ).toBeVisible();
  const toastBounds = await toast.boundingBox();
  const tabsBounds = await page.locator(".tabbar").boundingBox();
  expect(
    toastBounds &&
      tabsBounds &&
      toastBounds.y + toastBounds.height <= tabsBounds.y,
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.locator("html").evaluate((element) => {
    (element as HTMLElement).dataset.theme = "dark";
  });
  expect(
    await toast.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).toBe("rgb(34, 51, 42)");
  await toast.getByRole("button", { name: "بستن یادآوری" }).click();
  await expect(toast).not.toBeVisible();
  await page.reload();
  await expect(toast).not.toBeVisible();
});

test("monthly behavior analysis persists and existing source gets a palette color", async ({
  page,
}) => {
  let analysisRequests = 0;
  await page.route("https://generativelanguage.googleapis.com/**:generateContent", async (route) => {
    const body = route.request().postDataJSON();
    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain(
      "| تاریخ و روز هفته | عنوان | هزینه (تومان) |",
    );
    expect(route.request().headers()["x-goog-api-key"]).toBe("test-key");
    if (analysisRequests === 1)
      expect(prompt).toContain("پیشنهاد ماه قبل: ثبت علت خرید پس از کار.");
    const text =
      analysisRequests++ === 0
        ? "پیشنهاد ماه قبل: ثبت علت خرید پس از کار."
        : "الگوی احتمالی: خرید پس از خستگی.\nآزمایش کوچک هفتهٔ بعد: پیش از خرید مکث کنید.";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.getByLabel("کلید Gemini API").fill("test-key");
  await page.getByRole("button", { name: "ذخیره تنظیمات تحلیل" }).click();
  const source = page.locator(".manage-row").filter({ hasText: "کارت روزمره" });
  await source.getByRole("button", { name: "ویرایش" }).click();
  await page.getByRole("button", { name: "رنگ ۴" }).click();
  await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
  await expect(source.locator(".source-dot")).toHaveCSS(
    "background-color",
    "rgb(37, 99, 235)",
  );
  await page.getByRole("button", { name: "گزارش‌ها", exact: true }).click();
  await page.getByRole("button", { name: "ماه قبل", exact: true }).click();
  await page.getByRole("button", { name: "تحلیل با Gemini" }).click();
  await expect(
    page.getByText("پیشنهاد ماه قبل: ثبت علت خرید پس از کار.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ماه بعد", exact: true }).click();
  await page.getByRole("button", { name: "تحلیل با Gemini" }).click();
  await expect(
    page.getByText("الگوی احتمالی: خرید پس از خستگی.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "دیدن گزارش‌ها ←" }).click();
  await expect(
    page.getByText("الگوی احتمالی: خرید پس از خستگی.", { exact: false }),
  ).toBeVisible();
});

test("copied prompt accepts a manual agent response and keeps it for the next month", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "گزارش‌ها", exact: true }).click();
  await page.getByRole("button", { name: "کپی پرامپت" }).click();
  await expect(page.getByText("پاسخ ایجنت خودتون رو وارد کنید تا برای آینده ثبت بشه.")).toBeVisible();
  await page.getByRole("button", { name: "ثبت پاسخ ایجنت" }).click();
  await page.getByLabel("پاسخ ایجنت", { exact: true }).fill("تحلیل دستی: خرید پس از خستگی را با استراحت کوتاه جایگزین کن.");
  await page.getByRole("button", { name: "ذخیره تحلیل این ماه" }).click();
  await expect(page.getByRole("dialog", { name: "ثبت پاسخ ایجنت" })).not.toBeVisible();
  await expect(page.getByText("پاسخ ایجنت برای این ماه ذخیره شد.")).toBeVisible();
  await expect(page.getByText("تحلیل دستی: خرید پس از خستگی را با استراحت کوتاه جایگزین کن.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "دیدن گزارش‌ها ←" }).click();
  await expect(page.getByText("تحلیل دستی: خرید پس از خستگی را با استراحت کوتاه جایگزین کن.")).toBeVisible();
  await page.getByRole("button", { name: "ماه بعد", exact: true }).click();
  await page.getByRole("button", { name: "کپی پرامپت" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("تحلیل دستی: خرید پس از خستگی را با استراحت کوتاه جایگزین کن.");
});

test("tab content fades through and reduced-motion stays usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await expect(page.locator(".fade-through-page")).toBeVisible();
  await page.getByRole("button", { name: "گزارش‌ها", exact: true }).click();
  await expect(page.getByRole("heading", { name: "گزارش‌ها" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "خانه", exact: true }).click();
  await expect(page.getByRole("heading", { name: "خانه" })).toBeVisible();
  expect(
    await page
      .locator(".fade-through-page > *")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});

test("settings edit and remove a frequent shortcut while keeping the transaction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع با دفتر خالی/ }).click();
  await page.getByRole("button", { name: "ثبت هزینه", exact: true }).click();
  await page.getByLabel("مبلغ (تومان)").fill("40000");
  await chooseOption(page, "دسته", "🍽️ خوراک");
  await page.getByRole("button", { name: "افزودن به تراکنش‌های پرتکرار" }).click();
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();

  await page.getByRole("button", { name: "تنظیمات", exact: true }).click();
  const edit = page.getByRole("button", { name: "حذف از پرتکرارها" })
    .locator("..").getByRole("button", { name: "ویرایش" });
  await edit.click();
  await page.getByLabel("مبلغ (تومان)").fill("55000");
  await page.getByRole("button", { name: "ذخیره تراکنش" }).click();
  await expect(page.getByRole("button", { name: "حذف از پرتکرارها" }).locator("../.."))
    .toContainText("۵۵٬۰۰۰");
  await page.getByRole("button", { name: "حذف از پرتکرارها" }).click();
  await expect(page.getByText("هنوز تراکنش پرتکراری ثبت نشده است.")).toBeVisible();
  await page.getByRole("button", { name: "تراکنش‌ها", exact: true }).click();
  await expect(page.locator(".transaction-row").first()).toContainText("۵۵٬۰۰۰");
});

test("custom API sends OpenAI-compatible analysis and saves the response", async ({ page }) => {
  await page.route("https://example.test/v1/chat/completions", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers().authorization).toBe("Bearer custom-test-key");
    expect(route.request().postDataJSON()).toMatchObject({
      model: "example/chat",
      messages: [{ role: "user", content: expect.any(String) }],
      stream: false,
    });
    await route.fulfill({
      json: { choices: [{ message: { content: "تحلیل از API سفارشی" } }] },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "دیدن داده‌های نمونه" }).click();
  await page.getByRole("button", { name: "تنظیمات", exact: true }).click();
  await chooseOption(page, "ارائه‌دهندهٔ تحلیل", "API سفارشی (Custom API)");
  await page.getByLabel("Base URL", { exact: true }).fill("https://example.test/v1/");
  await page.getByLabel("شناسهٔ مدل (Model)").fill("example/chat");
  await page.getByLabel("کلید API سفارشی").fill("custom-test-key");
  await page.getByRole("button", { name: "ذخیره تنظیمات تحلیل" }).click();
  await expect(page.getByText("تنظیمات تحلیل روی همین دستگاه ذخیره شد.")).toBeVisible();
  await page.getByRole("button", { name: "گزارش‌ها", exact: true }).click();
  await page.getByRole("button", { name: "تحلیل با API سفارشی" }).click();
  await expect(page.getByText("تحلیل از API سفارشی", { exact: true })).toBeVisible();
});
