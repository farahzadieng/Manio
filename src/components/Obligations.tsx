import { Select } from "./Select";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { put, remove, atomicReplace } from "../lib/db";
import {
  type Obligation,
  localISO,
  money,
  parseAmount,
  note,
  jalali,
} from "../lib/domain";
import { DatePicker } from "./DatePicker";
import { AmountInput } from "./AmountInput";
import { formatAmountInput } from "../lib/amount-input";
import { Empty } from "./JournalPieces";
export function ObligationRow({
  item,
  onClick,
}: {
  item: Obligation;
  onClick: () => void;
}) {
  const type = {
    debt: "بدهی",
    receivable: "طلب",
    plannedPayment: "پرداخت برنامه‌ریزی‌شده",
    reminder: "یادآوری",
  }[item.type];
  return (
    <button className="ob-row" onClick={onClick}>
      <span className="ob-dot" />
      <span>
        <strong>{item.title}</strong>
        <small>
          {type} ·{" "}
          {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
            day: "numeric",
            month: "long",
          }).format(new Date(`${item.dueDate}T12:00:00`))}
        </small>
      </span>
      <strong>{item.amountTomans ? money(item.amountTomans) : ""}</strong>
    </button>
  );
}
export function Obligations({
  items,
  onEdit,
  onRefresh,
  onCreateTransaction,
}: {
  items: Obligation[];
  onEdit: (o: Obligation | true) => void;
  onRefresh: () => Promise<void>;
  onCreateTransaction: (
    kind: "expense" | "income",
    amount: number,
    obligationId: string,
    title: string,
  ) => void;
}) {
  const [filter, setFilter] = useState("pending");
  const shown = items
    .filter((o) =>
      filter === "all" || filter === "completed"
        ? filter === "all" || o.status === "completed"
        : filter === "overdue"
          ? o.status === "pending" && o.dueDate < localISO()
          : o.status === "pending",
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <>
      <div className="section-title">
        <p>موعدها و یادآوری‌ها</p>
        <button className="small-primary" onClick={() => onEdit(true)}>
          <Plus size={18} /> افزودن
        </button>
      </div>
      <div className="chips">
        {[
          ["pending", "در انتظار"],
          ["overdue", "سررسید گذشته"],
          ["completed", "انجام‌شده"],
          ["all", "همه"],
        ].map(([k, v]) => (
          <button
            key={k}
            className={filter === k ? "active" : ""}
            onClick={() => setFilter(k)}
          >
            {v}
          </button>
        ))}
      </div>
      {shown.length ? (
        shown.map((o) => (
          <div className="ob-card" key={o.id}>
            <ObligationRow item={o} onClick={() => onEdit(o)} />
            <div className="ob-actions">
              <button
                onClick={async () => {
                  const completed = o.status === "pending";
                  await put("obligations", {
                    ...o,
                    status: completed ? "completed" : "pending",
                    completedAt: completed ? new Date().toISOString() : null,
                    updatedAt: new Date().toISOString(),
                  });
                  await onRefresh();
                  if (
                    completed &&
                    o.amountTomans &&
                    o.type !== "reminder" &&
                    !o.linkedTransactionId &&
                    confirm("یک تراکنش جداگانه برای این تعهد ثبت شود؟")
                  )
                    onCreateTransaction(
                      o.type === "receivable" ? "income" : "expense",
                      o.amountTomans,
                      o.id,
                      o.title,
                    );
                }}
              >
                {o.status === "pending" ? "✓ انجام شد" : "بازگردانی"}
              </button>
              <button
                onClick={async () => {
                  const detail = `${o.title}\nتاریخ: ${o.dueDate}\n${o.amountTomans ? money(o.amountTomans) : ""}`;
                  await navigator.clipboard.writeText(detail);
                  await put("obligations", {
                    ...o,
                    calendarExportStatus: "copied",
                    updatedAt: new Date().toISOString(),
                  });
                  await onRefresh();
                }}
              >
                کپی جزئیات رویداد
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty
          title="تعهدی در این بخش نیست"
          hint="برای ثبت موعد تازه، افزودن را بزنید."
        />
      )}
    </>
  );
}
export function ObligationEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Obligation;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<Obligation["type"]>(initial?.type || "debt");
  const [title, setTitle] = useState(initial?.title || "");
  const [amountText, setAmountText] = useState(
    formatAmountInput(initial?.amountTomans?.toString() || "") ?? "",
  );
  const [counterparty, setCounterparty] = useState(initial?.counterparty || "");
  const [date, setDate] = useState(initial?.dueDate || localISO());
  const [text, setText] = useState(initial?.note || "");
  const [frequency, setFrequency] = useState<
    "none" | "daily" | "weekly" | "monthly" | "yearly"
  >("none");
  const [error, setError] = useState("");
  const save = async () => {
    try {
      note.parse(text);
      const now = new Date().toISOString();
      const obligationId = initial?.id || crypto.randomUUID();
      const ruleId = frequency === "none" ? null : crypto.randomUUID();
      const obligation = {
        id: obligationId,
        type,
        title: title.trim(),
        counterparty,
        amountTomans: amountText ? parseAmount(amountText) : null,
        dueDate: date,
        note: text,
        status: initial?.status || "pending",
        completedAt: initial?.completedAt || null,
        recurrenceRuleId: ruleId || initial?.recurrenceRuleId || null,
        linkedTransactionId: initial?.linkedTransactionId || null,
        calendarExportStatus: initial?.calendarExportStatus || "none",
        createdAt: initial?.createdAt || now,
        updatedAt: now,
      };
      if (ruleId) {
        const j = jalali(date);
        await atomicReplace(
          {
            obligations: [obligation],
            recurrenceRules: [
              {
                id: ruleId,
                frequency: frequency as
                  "daily" | "weekly" | "monthly" | "yearly",
                startDate: date,
                endDate: null,
                lastGeneratedDate: date,
                templateId: obligationId,
                jalaliDay: j.jd,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
          "merge",
        );
      } else await put("obligations", obligation);
      await onSaved();
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal editor"
        role="dialog"
        aria-modal="true"
        aria-label="ویرایش تعهد"
      >
        <div className="modal-title">
          <h2>{initial ? "ویرایش" : "تعهد تازه"}</h2>
          <button className="icon-button" onClick={onClose} aria-label="بستن">
            <X />
          </button>
        </div>
        <label>
          نوع
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as Obligation["type"])}
          >
            <option value="debt">بدهی</option>
            <option value="receivable">طلب</option>
            <option value="plannedPayment">پرداخت برنامه‌ریزی‌شده</option>
            <option value="reminder">یادآوری مالی</option>
          </Select>
        </label>
        <label>
          عنوان
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          مبلغ (اختیاری)
          <AmountInput value={amountText} onChange={setAmountText} />
        </label>
        <label>
          طرف حساب (اختیاری)
          <input
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
          />
        </label>
        <DatePicker value={date} onChange={setDate} label="موعد" />
        {!initial && (
          <label>
            تکرار
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
            >
              <option value="none">بدون تکرار</option>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="monthly">ماهانه شمسی</option>
              <option value="yearly">سالانه شمسی</option>
            </Select>
          </label>
        )}
        <label>
          یادداشت
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary full" onClick={save}>
          ذخیره
        </button>
        {initial && (
          <button
            className="danger full"
            onClick={async () => {
              if (confirm("این تعهد حذف شود؟")) {
                await remove("obligations", initial.id);
                await onSaved();
              }
            }}
          >
            حذف تعهد
          </button>
        )}
      </section>
    </div>
  );
}
