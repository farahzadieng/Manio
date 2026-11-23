import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string; color?: string };
export function Select({
  value,
  onChange,
  children,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === "option") {
      const props = child.props as {
        value?: string;
        children?: ReactNode;
        "data-color"?: string;
      };
      return [
        {
          value: props.value || "",
          label: String(Children.toArray(props.children).join("")),
          color: props["data-color"],
        },
      ];
    }
    if (child.props.children)
      return Children.toArray(child.props.children).flatMap((nested) => {
        if (
          !isValidElement<{
            value?: string;
            children?: ReactNode;
            "data-color"?: string;
          }>(nested) ||
          nested.type !== "option"
        )
          return [];
        return [
          {
            value: nested.props.value || "",
            label: String(Children.toArray(nested.props.children).join("")),
            color: nested.props["data-color"],
          },
        ];
      });
    return [];
  }) as Option[];
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const emoji: Record<string, string> = {
    expense: "↘️",
    income: "↗️",
    necessary: "✅",
    nonessential: "✨",
    card: "💳",
    cash: "💵",
    other: "🧩",
    debt: "📤",
    receivable: "📥",
    plannedPayment: "📅",
    reminder: "🔔",
    daily: "☀️",
    weekly: "🗓️",
    monthly: "🌙",
    yearly: "📆",
  };
  const renderOption = (option: Option) => (
    <>
      {option.color && (
        <i className="source-dot" style={{ background: option.color }} />
      )}
      {emoji[option.value] && (
        <span aria-hidden="true" className="select-emoji">
          {emoji[option.value]}
        </span>
      )}
      {option.label}
    </>
  );
  const selected =
    options.find((option) => option.value === value) || options[0];
  const choose = (option: Option) => {
    onChange({ target: { value: option.value } });
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>(".select-trigger")?.focus();
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(options[focus]);
      else {
        setFocus(
          Math.max(
            0,
            options.findIndex((o) => o.value === value),
          ),
        );
        setOpen(true);
      }
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = open
        ? (focus + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
          options.length
        : Math.max(
            0,
            options.findIndex((o) => o.value === value),
          );
      setFocus(next);
      setOpen(true);
    }
  };
  return (
    <div className="custom-select" ref={root}>
      <select
        className="select-native"
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
      <button
        type="button"
        className="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setFocus(
            Math.max(
              0,
              options.findIndex((o) => o.value === value),
            ),
          );
          setOpen(!open);
        }}
        onKeyDown={keyDown}
      >
        <span className="select-value">
          {selected && renderOption(selected)}
        </span>
        <ChevronDown size={17} className={open ? "turn" : ""} />
      </button>
      {open && (
        <div className="select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={index === focus ? "focused" : ""}
              key={option.value}
              onMouseEnter={() => setFocus(index)}
              onClick={() => choose(option)}
            >
              <span>{renderOption(option)}</span>
              {option.value === value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
