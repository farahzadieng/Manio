import { describe, it, expect } from "vitest";
import {
  fromJalali,
  jalali,
  jalaliMonthRange,
  parseAmount,
  note,
  normalize,
  filterTransactions,
  report,
  nextOccurrence,
  localISO,
  monthlyTrend,
  type Transaction,
  latestActiveSourceId,
} from "./domain";
const base: Transaction = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "expense",
  amountTomans: 123456,
  date: "2026-03-20",
  categoryId: "10000000-0000-4000-8000-000000000002",
  categoryName: "خوراک",
  categoryEmoji: "🍽️",
  paymentSourceId: null,
  paymentSourceName: null,
  necessity: "necessary",
  note: "VPN برای خانه",
  starred: false,
  createdAt: "x",
  updatedAt: "x",
};
describe("local domain", () => {
  it("parses Persian currency exactly and rejects unsafe values", () => {
    expect(parseAmount("۱۲۳٬۴۵۶")).toBe(123456);
    expect(() => parseAmount("9007199254740992")).toThrow();
    expect(() => parseAmount("12.3")).toThrow();
  });
  it("validates note by Unicode code points", () => {
    expect(note.safeParse("😀".repeat(250)).success).toBe(true);
    expect(note.safeParse("😀".repeat(251)).success).toBe(false);
  });
  it("handles Jalali new year and month boundaries", () => {
    expect(fromJalali(1405, 1, 1)).toBe("2026-03-21");
    expect(jalali("2026-03-20")).toMatchObject({ jy: 1404, jm: 12 });
    const [start, end] = jalaliMonthRange(1404, 12);
    expect(start <= end).toBe(true);
    expect(() => fromJalali(1404, 12, 31)).toThrow();
  });
  it("normalizes Persian/Arabic script and Latin search", () => {
    expect(normalize("كِي  VPN")).toBe("کی vpn");
    expect(
      filterTransactions([base], {
        q: "vpn",
        necessity: "necessary",
        kind: "expense",
      }),
    ).toHaveLength(1);
    expect(
      filterTransactions([base], { q: "vpn", kind: "income" }),
    ).toHaveLength(0);
  });
  it("reports safe grouped totals", () => {
    expect(
      report([
        base,
        {
          ...base,
          id: "10000000-0000-4000-8000-000000000003",
          kind: "income",
          amountTomans: 10,
        },
      ]),
    ).toMatchObject({ expense: 123456, income: 10, count: 1 });
  });
  it("advances monthly recurrence in Jalali months", () => {
    const next = nextOccurrence(fromJalali(1404, 6, 31), "monthly", 31);
    expect(jalali(next)).toMatchObject({ jy: 1404, jm: 7, jd: 30 });
  });
  it("builds six Jalali months across the year boundary", () => {
    const months = monthlyTrend([base], 1405, 2);
    expect(months).toHaveLength(6);
    expect(months[0]).toMatchObject({ year: 1404, month: 9 });
    expect(months[5]).toMatchObject({ year: 1405, month: 2 });
  });
  it("uses local civil dates", () => {
    expect(localISO(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });
  it("defaults to the newest active source by creation time", () => {
    const source = (id: string, createdAt: string, active = true) => ({
      id,
      createdAt,
      updatedAt: createdAt,
      active,
      name: id,
      kind: "card" as const,
      color: "#285646",
    });
    expect(
      latestActiveSourceId([
        source("old", "2026-01-01T00:00:00.000Z"),
        source("new", "2026-02-01T00:00:00.000Z"),
        source("archived", "2026-03-01T00:00:00.000Z", false),
      ]),
    ).toBe("new");
  });
});
