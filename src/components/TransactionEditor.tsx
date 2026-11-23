import { Select } from "./Select";
import { useState } from "react";
import { Copy, Star, Trash2, X } from "lucide-react";
import { get, put, remove, atomicReplace } from "../lib/db";
import {
  type Transaction,
  type Category,
  type PaymentSource,
  localISO,
  yesterday,
  parseAmount,
  note,
  persianNumber,
  lastUsedSourceId,
} from "../lib/domain";
import { DatePicker } from "./DatePicker";
import { AmountInput } from "./AmountInput";
import { formatAmountInput } from "../lib/amount-input";
const obligationsById = (id: string) => get("obligations", id);
export type TransactionEditorInitial = {
  kind: "expense" | "income";
  row?: Transaction;
  duplicateOf?: Transaction;
  presetAmount?: number;
  presetCategoryId?: string;
  presetNote?: string;
  obligationId?: string;
};
export function TransactionEditor({
  initial,
  categories,
  sources,
  transactions,
  onClose,
  onSaved,
  onDuplicate,
}: {
  initial: TransactionEditorInitial;
  categories: Category[];
  sources: PaymentSource[];
  transactions: Transaction[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDuplicate: (row: Transaction) => void;
}) {
  const row = initial.row;
  const template = row || initial.duplicateOf;
  const [kind, setKind] = useState(initial.kind);
  const [amountText, setAmountText] = useState(
    formatAmountInput(
      template
        ? String(template.amountTomans)
        : initial.presetAmount
          ? String(initial.presetAmount)
          : "",
    ) ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    template?.categoryId || initial.presetCategoryId || "",
  );
  const [sourceId, setSourceId] = useState(
    template?.paymentSourceId ||
      (initial.kind === "expense"
        ? lastUsedSourceId(transactions, sources)
        : ""),
  );
  const [starred, setStarred] = useState(row?.starred ?? false);
  const [necessity, setNecessity] = useState(
    template?.necessity || "necessary",
  );
  const [date, setDate] = useState(row?.date || localISO());
  const [text, setText] = useState(template?.note || initial.presetNote || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const available = categories.filter(
    (c) => c.transactionKind === kind && (c.active || c.id === categoryId),
  );
  const selected = categories.find((c) => c.id === categoryId);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const amountTomans = parseAmount(amountText);
      note.parse(text);
      if (!selected || selected.transactionKind !== kind)
        throw new Error("دسته را انتخاب کنید");
      const now = new Date().toISOString();
      const transactionId = row?.id || crypto.randomUUID();
      const transaction = {
        id: transactionId,
        kind,
        amountTomans,
        date,
        categoryId,
        categoryName: selected.name,
        categoryEmoji: selected.emoji,
        paymentSourceId: sourceId || null,
        paymentSourceName: sources.find((s) => s.id === sourceId)?.name || null,
        necessity: kind === "expense" ? necessity : null,
        note: text,
        starred,
        createdAt: row?.createdAt || now,
        updatedAt: now,
      };
      if (initial.obligationId) {
        const linked = await obligationsById(initial.obligationId);
        if (!linked || linked.linkedTransactionId)
          throw new Error("برای این تعهد قبلاً تراکنش ثبت شده است");
        await atomicReplace(
          {
            transactions: [transaction],
            obligations: [
              { ...linked, linkedTransactionId: transactionId, updatedAt: now },
            ],
          },
          "merge",
        );
      } else await put("transactions", transaction);
      await onSaved();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal editor"
        role="dialog"
        aria-modal="true"
        aria-label={row ? "ویرایش تراکنش" : "ثبت تراکنش"}
      >
        <div className="modal-title">
          <h2>{row ? "ویرایش تراکنش" : "ثبت تراکنش"}</h2>
          <button className="icon-button" onClick={onClose} aria-label="بستن">
            <X />
          </button>
        </div>
        <div className="segment">
          <button
            className={kind === "expense" ? "selected" : ""}
            onClick={() => {
              setKind("expense");
              setCategoryId("");
            }}
          >
            هزینه
          </button>
          <button
            className={kind === "income" ? "selected" : ""}
            onClick={() => {
              setKind("income");
              setCategoryId("");
            }}
          >
            درآمد
          </button>
        </div>
        <label>
          مبلغ (تومان)
          <AmountInput
            autoFocus
            value={amountText}
            onChange={setAmountText}
            placeholder="مثلاً ۱۲۵٬۰۰۰"
          />
        </label>
        <label>
          دسته
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setNecessity(
                categories.find((c) => c.id === e.target.value)
                  ?.defaultNecessity || "necessary",
              );
            }}
          >
            <option value="">انتخاب کنید</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {kind === "expense" ? "منبع پرداخت" : "دریافت در (اختیاری)"}
          <Select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">بدون منبع</option>
            {sources
              .filter((s) => s.active || s.id === sourceId)
              .map((s) => (
                <option key={s.id} value={s.id} data-color={s.color}>
                  {s.name}
                </option>
              ))}
          </Select>
        </label>
        {kind === "expense" && (
          <label>
            ضرورت
            <Select
              value={necessity}
              onChange={(e) => setNecessity(e.target.value as typeof necessity)}
            >
              <option value="necessary">ضروری</option>
              <option value="nonessential">غیرضروری</option>
            </Select>
          </label>
        )}
        <button
          type="button"
          className={`favorite-toggle${starred ? " active" : ""}`}
          aria-pressed={starred}
          onClick={() => setStarred((value) => !value)}
        >
          <Star size={19} fill={starred ? "currentColor" : "none"} />
          {starred
            ? "ذخیره‌شده در تراکنش‌های پرتکرار"
            : "افزودن به تراکنش‌های پرتکرار"}
        </button>
        <label>
          تاریخ
          <div className="segment">
            <button
              className={date === localISO() ? "selected" : ""}
              onClick={() => setDate(localISO())}
            >
              امروز
            </button>
            <button
              className={date === yesterday() ? "selected" : ""}
              onClick={() => setDate(yesterday())}
            >
              دیروز
            </button>
          </div>
        </label>
        <DatePicker value={date} onChange={setDate} label="انتخاب تاریخ" />
        <label>
          یادداشت (اختیاری)
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
          />
          <small>{persianNumber([...text].length)} / ۲۵۰</small>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary full" disabled={saving} onClick={save}>
          {saving ? "در حال ذخیره…" : "ذخیره تراکنش"}
        </button>
        {row && (
          <div className="edit-actions">
            <button onClick={() => onDuplicate(row)}>
              <Copy size={17} /> تکرار برای امروز
            </button>
            <button
              className="danger"
              onClick={async () => {
                if (confirm("این تراکنش حذف شود؟")) {
                  await remove("transactions", row.id);
                  await onSaved();
                }
              }}
            >
              <Trash2 size={17} /> حذف
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
