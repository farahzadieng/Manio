import { useState } from "react";
import { jalaaliMonthLength } from "jalaali-js";
import { fromJalali, jalali, localISO, persianNumber } from "../lib/domain";
const months = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
export function DatePicker({
  value,
  onChange,
  label = "تاریخ",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => jalali(value || localISO()));
  const selected = jalali(value || localISO());
  const move = (delta: number) =>
    setView((v) => {
      let n = v.jm + delta,
        y = v.jy;
      if (n < 1) {
        n = 12;
        y--;
      }
      if (n > 12) {
        n = 1;
        y++;
      }
      return { ...v, jy: y, jm: n };
    });
  const first = new Date(
    `${fromJalali(view.jy, view.jm, 1)}T12:00:00`,
  ).getDay();
  const offset = (first + 1) % 7;
  return (
    <>
      <button
        type="button"
        className="field date-trigger"
        onClick={() => {
          setView(jalali(value || localISO()));
          setOpen(true);
        }}
        aria-label={`${label}: ${persianNumber(selected.jy)}/${persianNumber(selected.jm)}/${persianNumber(selected.jd)}`}
      >
        {label}: {persianNumber(selected.jd)} {months[selected.jm - 1]}{" "}
        {persianNumber(selected.jy)}
      </button>
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <section
            className="modal calendar"
            role="dialog"
            aria-modal="true"
            aria-label="انتخاب تاریخ شمسی"
          >
            <header className="calendar-head">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="ماه قبل"
              >
                ‹
              </button>
              <strong>
                {months[view.jm - 1]} {persianNumber(view.jy)}
              </strong>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="ماه بعد"
              >
                ›
              </button>
            </header>
            <div className="calendar-grid">
              {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((x) => (
                <span key={x}>{x}</span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {Array.from(
                { length: jalaaliMonthLength(view.jy, view.jm) },
                (_, i) => (
                  <button
                    type="button"
                    key={i}
                    className={
                      selected.jy === view.jy &&
                      selected.jm === view.jm &&
                      selected.jd === i + 1
                        ? "selected"
                        : ""
                    }
                    onClick={() => {
                      onChange(fromJalali(view.jy, view.jm, i + 1));
                      setOpen(false);
                    }}
                    aria-label={`${persianNumber(i + 1)} ${months[view.jm - 1]}`}
                  >
                    {persianNumber(i + 1)}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              className="secondary full"
              onClick={() => setOpen(false)}
            >
              انصراف
            </button>
          </section>
        </div>
      )}
    </>
  );
}
