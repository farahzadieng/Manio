import { Star, Plus } from "lucide-react";
import {
  type Transaction,
  type Obligation,
  filterTransactions,
  money,
  persianNumber,
  report,
} from "../lib/domain";
import type { TransactionEditorInitial } from "../components/TransactionEditor";
import { Section, Empty, TransactionList } from "../components/JournalPieces";
import { ObligationRow } from "../components/Obligations";
import type { Tab } from "./types";
export function HomeScreen({
  selectedRange,
  summary,
  rows,
  obligations,
  frequent,
  changeMonth,
  setEditor,
  setTab,
  setObEditor,
}: {
  selectedRange: [string, string];
  summary: ReturnType<typeof report>;
  rows: Transaction[];
  obligations: Obligation[];
  frequent: Transaction[];
  changeMonth: (delta: number) => void;
  setEditor: (value: TransactionEditorInitial) => void;
  setTab: (value: Tab) => void;
  setObEditor: (value: Obligation) => void;
}) {
  return (
    <>
      <div className="month-row">
        <button onClick={() => changeMonth(-1)} aria-label="ماه قبل">
          ‹
        </button>
        <span>
          {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
            month: "long",
            year: "numeric",
          }).format(new Date(`${selectedRange[0]}T12:00:00`))}
        </span>
        <button onClick={() => changeMonth(1)} aria-label="ماه بعد">
          ›
        </button>
      </div>
      <section className="hero">
        <span>هزینه‌های ثبت‌شده این ماه</span>
        <strong dir="ltr">{money(summary.expense)}</strong>
        <span>{persianNumber(summary.count)} تراکنش هزینه</span>
        <div className="leaf" aria-hidden="true">
          ✦
        </div>
      </section>
      <button
        className="primary full add-main"
        onClick={() => setEditor({ kind: "expense" })}
      >
        <Plus /> ثبت هزینه
      </button>
      <div className="quick">
        <button onClick={() => setEditor({ kind: "income" })}>
          + ثبت درآمد
        </button>
        <button onClick={() => setTab("reports")}>دیدن گزارش‌ها ←</button>
      </div>
      <Section title="تراکنش‌های اخیر" action={() => setTab("transactions")} />
      {rows.length ? (
        <TransactionList
          items={filterTransactions(rows, {}).slice(0, 5)}
          onSelect={(row) => setEditor({ kind: row.kind, row })}
        />
      ) : (
        <Empty
          title="هنوز تراکنشی ندارید"
          hint="اولین هزینه را ثبت کنید تا دفترتان شکل بگیرد."
        />
      )}
      {frequent.length > 0 && (
        <>
          <Section title="تراکنش‌های پرتکرار" />
          <div className="chips">
            {frequent.map((f) => (
              <button
                key={f.id}
                onClick={() => setEditor({ kind: f.kind, duplicateOf: f })}
                aria-label={`ثبت دوباره ${f.categoryName}، ${money(f.amountTomans)}`}
              >
                <Star size={15} fill="currentColor" /> {f.categoryEmoji}{" "}
                {f.categoryName} · {money(f.amountTomans)}
              </button>
            ))}
          </div>
        </>
      )}
      <Section title="تعهدات پیش رو" action={() => setTab("obligations")} />
      {obligations
        .filter((o) => o.status === "pending")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 2)
        .map((o) => (
          <ObligationRow key={o.id} item={o} onClick={() => setObEditor(o)} />
        ))}
      {!obligations.length && <p className="muted">تعهدی ثبت نشده است.</p>}
    </>
  );
}
