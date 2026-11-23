import { Select } from "../components/Select";
import { Plus, Search } from "lucide-react";
import {
  type Transaction,
  type Category,
  type PaymentSource,
  type Filters,
  localISO,
  persianNumber,
} from "../lib/domain";
import type { TransactionEditorInitial } from "../components/TransactionEditor";
import { Empty, TransactionList } from "../components/JournalPieces";
import { DatePicker } from "../components/DatePicker";
export function TransactionsScreen({
  filters,
  setFilters,
  filtered,
  categories,
  sources,
  setEditor,
}: {
  filters: Filters;
  setFilters: (value: Filters) => void;
  filtered: Transaction[];
  categories: Category[];
  sources: PaymentSource[];
  setEditor: (value: TransactionEditorInitial) => void;
}) {
  return (
    <>
      <div className="section-title">
        <p>هزینه‌ها و درآمدهای ثبت‌شده</p>
        <button
          className="small-primary"
          onClick={() => setEditor({ kind: "expense" })}
        >
          <Plus size={18} /> ثبت
        </button>
      </div>
      <label className="search">
        <Search size={19} />
        <input
          placeholder="جست‌وجو در یادداشت، دسته یا منبع"
          value={filters.q || ""}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
      </label>
      <div className="filters">
        <Select
          aria-label="نوع تراکنش"
          value={filters.kind || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              kind: (e.target.value as Filters["kind"]) || undefined,
            })
          }
        >
          <option value="">همه نوع‌ها</option>
          <option value="expense">هزینه</option>
          <option value="income">درآمد</option>
        </Select>
        <Select
          aria-label="دسته"
          value={filters.categoryId || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              categoryId: e.target.value || undefined,
            })
          }
        >
          <option value="">همه دسته‌ها</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="منبع پرداخت"
          value={filters.paymentSourceId || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              paymentSourceId: e.target.value || undefined,
            })
          }
        >
          <option value="">همه منابع</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id} data-color={s.color}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="ضرورت"
          value={filters.necessity || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              necessity: (e.target.value as Filters["necessity"]) || undefined,
            })
          }
        >
          <option value="">همه ضرورت‌ها</option>
          <option value="necessary">ضروری</option>
          <option value="nonessential">غیرضروری</option>
        </Select>
        {filters.from ? (
          <DatePicker
            value={filters.from}
            onChange={(v) => setFilters({ ...filters, from: v })}
            label="از تاریخ"
          />
        ) : (
          <button onClick={() => setFilters({ ...filters, from: localISO() })}>
            از تاریخ
          </button>
        )}
        {filters.to ? (
          <DatePicker
            value={filters.to}
            onChange={(v) => setFilters({ ...filters, to: v })}
            label="تا تاریخ"
          />
        ) : (
          <button onClick={() => setFilters({ ...filters, to: localISO() })}>
            تا تاریخ
          </button>
        )}
      </div>
      <button className="text-button" onClick={() => setFilters({})}>
        پاک کردن فیلترها
      </button>
      <p className="muted">{persianNumber(filtered.length)} نتیجه</p>
      {filtered.length ? (
        <TransactionList
          items={filtered}
          onSelect={(row) => setEditor({ kind: row.kind, row })}
        />
      ) : (
        <Empty
          title="موردی پیدا نشد"
          hint="فیلترها را تغییر دهید یا تراکنش تازه‌ای ثبت کنید."
        />
      )}
      <button
        className="floating-add"
        onClick={() => setEditor({ kind: "expense" })}
        aria-label="ثبت هزینه"
      >
        <Plus />
      </button>
    </>
  );
}
