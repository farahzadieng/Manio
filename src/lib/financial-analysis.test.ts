import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFinancialPrompt,
  previousJalaliMonth,
  requestFinancialAnalysis,
} from "./financial-analysis";
import type { Transaction } from "./domain";

const row: Transaction = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "expense",
  amountTomans: 120000,
  date: "2026-11-19",
  categoryId: "10000000-0000-4000-8000-000000000002",
  categoryName: "خوراک",
  categoryEmoji: "🍽️",
  paymentSourceId: null,
  paymentSourceName: null,
  necessity: "nonessential",
  note: "خرید | بعد از کار\nخسته بودم",
  starred: false,
  createdAt: "2026-11-19T00:00:00.000Z",
  updatedAt: "2026-11-19T00:00:00.000Z",
};

describe("financial analysis prompt", () => {
  it("includes causes, weekday and repeated same-day expenses without an output length limit", () => {
    const prompt = buildFinancialPrompt({
      currentRows: [
        row,
        {
          ...row,
          id: "10000000-0000-4000-8000-000000000003",
          note: "دوباره خرید کردم",
        },
        { ...row, id: "10000000-0000-4000-8000-000000000004", kind: "income" },
      ],
      previousRows: [],
      year: 1405,
      month: 8,
      today: "2026-11-20",
    });
    expect(prompt).toContain(
      "| تاریخ و روز هفته | عنوان | هزینه (تومان) | توضیحات و علت هزینه | ضرورت |",
    );
    expect(prompt).toContain("خرید بعد از کار خسته بودم");
    expect(prompt.match(/۱۲۰٬۰۰۰/g)).toHaveLength(2);
    expect(prompt).toContain("تکرار یک نوع هزینه در همان روز");
    expect(prompt).toContain(
      "محرک → نیاز/احساس یا محدودیت واقعی → انتخاب هزینه → پیامد",
    );
    expect(prompt).toContain("ماه هنوز کامل نشده");
    expect(prompt).not.toContain("۱۸۰ واژه");
  });

  it("includes the latest prior-month analysis as evidence for progress review", () => {
    const prompt = buildFinancialPrompt({
      currentRows: [row],
      previousRows: [{ ...row, note: "تاکسی بعد از کار" }],
      previousAnalysis: {
        text: "پیشنهاد ماه قبل: ثبت علت خرید پس از کار.",
        transactionCount: 4,
        createdAt: "2026-11-15T08:00:00.000Z",
      },
      year: 1405,
      month: 9,
      today: "2026-12-02",
    });
    expect(prompt).toContain("پیشنهاد ماه قبل: ثبت علت خرید پس از کار.");
    expect(prompt).toContain("هزینه‌های ماه قبل (۸/۱۴۰۵)");
    expect(prompt).toContain(
      "کدام رفتار بهتر شده، بدتر شده یا هنوز قابل داوری نیست",
    );
    expect(prompt).toContain("مقایسهٔ خامِ مجموع دو ماه");
  });

  it("does not invent adherence when prior analysis is unavailable and handles the year boundary", () => {
    expect(previousJalaliMonth(1406, 1)).toEqual({ year: 1405, month: 12 });
    const prompt = buildFinancialPrompt({
      currentRows: [],
      previousRows: [],
      year: 1406,
      month: 1,
      today: "2027-03-22",
    });
    expect(prompt).toContain("برای ماه قبل تحلیل ذخیره‌شده‌ای وجود ندارد");
    expect(prompt).toContain("دربارهٔ اجرای توصیه‌های قبلی ادعا نکن");
  });
});

describe("direct Gemini request", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the prompt and key to Gemini and extracts generated text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "تحلیل روشن" }] } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(requestFinancialAnalysis("پرامپت", "test-key")).resolves.toBe("تحلیل روشن");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    expect(options.headers["x-goog-api-key"]).toBe("test-key");
    expect(JSON.parse(options.body)).toMatchObject({ contents: [{ role: "user", parts: [{ text: "پرامپت" }] }] });
    expect(JSON.parse(options.body).generationConfig).not.toHaveProperty("maxOutputTokens");
  });

  it("reports invalid keys and network failures without exposing the key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(requestFinancialAnalysis("پرامپت", "secret-test-key")).rejects.toThrow("کلید Gemini");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Load failed")));
    await expect(requestFinancialAnalysis("پرامپت", "secret-test-key")).rejects.toThrow("ارتباط با Gemini برقرار نشد");
  });
});
