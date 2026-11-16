import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { formatAmountInput } from "../lib/amount-input";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function AmountInput({ value, onChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const pendingCursor = useRef<number | null>(null);

  const placeCursor = (
    input: HTMLInputElement,
    formatted: string,
    digits: number,
  ) => {
    let position = 0;
    let seen = 0;
    while (position < formatted.length && seen < digits) {
      if (/[۰-۹]/.test(formatted[position])) seen++;
      position++;
    }
    input.setSelectionRange(position, position);
  };

  useLayoutEffect(() => {
    const digits = pendingCursor.current;
    const input = ref.current;
    if (digits === null || !input || document.activeElement !== input) return;
    pendingCursor.current = null;
    placeCursor(input, value, digits);
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const raw = input.value;
    const formatted = formatAmountInput(raw);
    if (formatted === null) {
      input.value = value;
      return;
    }

    const beforeCursor = formatAmountInput(
      raw.slice(0, input.selectionStart ?? raw.length),
    );
    const digitsBeforeCursor = [...(beforeCursor ?? "")].filter((digit) =>
      /[۰-۹]/.test(digit),
    ).length;
    input.value = formatted;
    if (formatted === value) {
      placeCursor(input, formatted, digitsBeforeCursor);
      return;
    }
    pendingCursor.current = digitsBeforeCursor;
    onChange(formatted);
  };

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      dir="ltr"
      className={["amount-input", props.className].filter(Boolean).join(" ")}
      value={value}
      onChange={handleChange}
    />
  );
}
