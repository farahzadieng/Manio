import { describe, expect, it } from "vitest";
import { formatAmountInput } from "./amount-input";
import { parseAmount } from "./domain";

describe("live amount input", () => {
  it("groups Persian, Arabic and Latin digits without losing the integer", () => {
    expect(formatAmountInput("40000")).toBe("۴۰٬۰۰۰");
    expect(formatAmountInput("۴۰۰۰۰")).toBe("۴۰٬۰۰۰");
    expect(formatAmountInput("٤٠٠٠٠")).toBe("۴۰٬۰۰۰");
    expect(parseAmount(formatAmountInput("٤٠٠٠٠")!)).toBe(40000);
  });

  it("accepts pasted group separators and empty input", () => {
    expect(formatAmountInput("۱۲,۳۴۵٬۶۷۸")).toBe("۱۲٬۳۴۵٬۶۷۸");
    expect(formatAmountInput("")).toBe("");
    expect(formatAmountInput("00040000")).toBe("۴۰٬۰۰۰");
  });

  it("rejects letters and decimal amounts while typing", () => {
    expect(formatAmountInput("12a3")).toBeNull();
    expect(formatAmountInput("12.5")).toBeNull();
    expect(formatAmountInput("-40000")).toBeNull();
  });
});
