const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

/** Format a partially entered amount without converting it to a floating-point number. */
export function formatAmountInput(value: string): string | null {
  if (!/^[0-9۰-۹٠-٩,٬،\s]*$/.test(value)) return null;
  const digits = value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[,٬،\s]/g, "")
    .replace(/^0+(?=\d)/, "");
  return digits
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬")
    .replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}
