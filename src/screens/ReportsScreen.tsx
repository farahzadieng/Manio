import { Select } from "../components/Select";
import type { Dispatch, SetStateAction } from "react";
import { FinancialAnalysisPanel } from "../components/FinancialAnalysis";
import {
  type Transaction,
  type Category,
  type PaymentSource,
  type Filters,
  jalaliMonthRange,
  money,
  persianNumber,
  report,
  filterTransactions,
  monthlyTrend,
} from "../lib/domain";
import { Section, Empty } from "../components/JournalPieces";
import { DatePicker } from "../components/DatePicker";
import type { Tab, JalaliMonth, ReportPeriod } from "./types";
export function ReportsScreen({
  reportPeriod,
  setReportPeriod,
  selectedRange,
  changeMonth,
  reportAnchor,
  setReportAnchor,
  reportFilters,
  setReportFilters,
  categories,
  sources,
  reportSummary,
  incomeSummary,
  reportRange,
  trend,
  trendMax,
  rows,
  compareMonth,
  setCompareMonth,
  setFilters,
  setTab,
  reportMonth,
  geminiApiKey,
}: {
  reportPeriod: ReportPeriod;
  setReportPeriod: (value: ReportPeriod) => void;
  selectedRange: [string, string];
  changeMonth: (delta: number) => void;
  reportAnchor: string;
  setReportAnchor: (value: string) => void;
  reportFilters: Filters;
  setReportFilters: (value: Filters) => void;
  categories: Category[];
  sources: PaymentSource[];
  reportSummary: ReturnType<typeof report>;
  incomeSummary: ReturnType<typeof report>;
  reportRange: [string, string];
  trend: ReturnType<typeof monthlyTrend>;
  trendMax: number;
  rows: Transaction[];
  compareMonth: JalaliMonth;
  setCompareMonth: Dispatch<SetStateAction<JalaliMonth>>;
  setFilters: (value: Filters) => void;
  setTab: (value: Tab) => void;
  reportMonth: JalaliMonth;
  geminiApiKey: string;
}) {
  return (
    <>
      <div className="chips">
        {(
          [
            ["day", "روزانه"],
            ["week", "هفتگی"],
            ["month", "ماهانه"],
            ["year", "سالانه"],
            ["custom", "بازه دلخواه"],
          ] as const
        ).map(([k, v]) => (
          <button
            key={k}
            className={reportPeriod === k ? "active" : ""}
            onClick={() => setReportPeriod(k)}
          >
            {v}
          </button>
        ))}
      </div>
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
      {(reportPeriod === "day" || reportPeriod === "week") && (
        <DatePicker
          value={reportAnchor}
          onChange={setReportAnchor}
          label="روز مرجع"
        />
      )}
      {reportPeriod === "custom" && (
        <div className="date-range">
          <DatePicker
            value={reportFilters.from || selectedRange[0]}
            onChange={(v) => setReportFilters({ ...reportFilters, from: v })}
            label="از"
          />
          <DatePicker
            value={reportFilters.to || selectedRange[1]}
            onChange={(v) => setReportFilters({ ...reportFilters, to: v })}
            label="تا"
          />
        </div>
      )}
      <div className="filters report-filters">
        <Select
          aria-label="دسته گزارش"
          value={reportFilters.categoryId || ""}
          onChange={(e) =>
            setReportFilters({
              ...reportFilters,
              categoryId: e.target.value || undefined,
            })
          }
        >
          <option value="">همه دسته‌ها</option>
          {categories
            .filter((c) => c.transactionKind === "expense")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
        </Select>
        <Select
          aria-label="ضرورت گزارش"
          value={reportFilters.necessity || ""}
          onChange={(e) =>
            setReportFilters({
              ...reportFilters,
              necessity: (e.target.value as Filters["necessity"]) || undefined,
            })
          }
        >
          <option value="">همه ضرورت‌ها</option>
          <option value="necessary">ضروری</option>
          <option value="nonessential">غیرضروری</option>
        </Select>
        <Select
          aria-label="منبع گزارش"
          value={reportFilters.paymentSourceId || ""}
          onChange={(e) =>
            setReportFilters({
              ...reportFilters,
              paymentSourceId: e.target.value || undefined,
            })
          }
        >
          <option value="">همه منابع</option>
          {sources.map((x) => (
            <option key={x.id} value={x.id} data-color={x.color}>
              {x.name}
            </option>
          ))}
        </Select>
      </div>
      <section className="report-total">
        <span>هزینه ثبت‌شده</span>
        <strong>{money(reportSummary.expense)}</strong>
        <small>{persianNumber(reportSummary.count)} تراکنش</small>
      </section>
      <div className="stat-grid">
        <div>
          <span>ضروری</span>
          <strong>{money(reportSummary.necessary)}</strong>
        </div>
        <div>
          <span>غیرضروری</span>
          <strong>{money(reportSummary.nonessential)}</strong>
        </div>
      </div>
      <Section title="به تفکیک دسته" />
      {reportSummary.categories.length ? (
        reportSummary.categories.map((c) => (
          <button
            key={c.name}
            className="category-bar"
            onClick={() => {
              const category = categories.find((x) => x.name === c.name);
              setFilters({
                from: reportRange[0],
                to: reportRange[1],
                categoryId: category?.id,
                kind: "expense",
              });
              setTab("transactions");
            }}
          >
            <span>
              {c.name} ·{" "}
              {persianNumber(
                reportSummary.expense
                  ? Math.round((c.amount / reportSummary.expense) * 100)
                  : 0,
              )}
              ٪
            </span>
            <strong>{money(c.amount)}</strong>
            <i
              style={{
                width: `${reportSummary.expense ? Math.round((c.amount / reportSummary.expense) * 100) : 0}%`,
              }}
            />
          </button>
        ))
      ) : (
        <Empty
          title="هنوز هزینه‌ای در این ماه نیست"
          hint="با ثبت هزینه، گزارش اینجا نمایش داده می‌شود."
        />
      )}
      <Section title="روند شش‌ماهه هزینه" />
      <div className="trend" aria-label="روند هزینه شش ماه اخیر">
        {trend.map((x) => (
          <div
            key={`${x.year}-${x.month}`}
            title={`${x.year}/${x.month}: ${money(x.total)}`}
          >
            <span
              style={{
                height: `${Math.max(4, (x.total / trendMax) * 90)}px`,
              }}
            />
            <small>{persianNumber(x.month)}</small>
          </div>
        ))}
      </div>
      <Section title="درآمدهای ثبت‌شده" />
      <div className="report-total quiet">
        <span>درآمد ثبت‌شده</span>
        <strong>{money(incomeSummary.income)}</strong>
        <small>
          تفاضل درآمد و هزینه ثبت‌شده:{" "}
          {money(incomeSummary.income - reportSummary.expense)} — این مانده حساب
          نیست.
        </small>
      </div>
      <Section title="مقایسه دو ماه" />
      <div className="settings-card">
        <p>
          ماه اصلی:{" "}
          {money(
            report(
              filterTransactions(rows, {
                ...reportFilters,
                from: selectedRange[0],
                to: selectedRange[1],
              }),
            ).expense,
          )}
        </p>
        <div className="month-row">
          <button
            onClick={() =>
              setCompareMonth((v) => ({
                y: v.m === 1 ? v.y - 1 : v.y,
                m: v.m === 1 ? 12 : v.m - 1,
              }))
            }
            aria-label="ماه مقایسه قبل"
          >
            ‹
          </button>
          <span>
            {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
              month: "long",
              year: "numeric",
            }).format(
              new Date(
                `${jalaliMonthRange(compareMonth.y, compareMonth.m)[0]}T12:00:00`,
              ),
            )}
          </span>
          <button
            onClick={() =>
              setCompareMonth((v) => ({
                y: v.m === 12 ? v.y + 1 : v.y,
                m: v.m === 12 ? 1 : v.m + 1,
              }))
            }
            aria-label="ماه مقایسه بعد"
          >
            ›
          </button>
        </div>
        <p>
          ماه مقایسه:{" "}
          {money(
            report(
              filterTransactions(rows, {
                ...reportFilters,
                from: jalaliMonthRange(compareMonth.y, compareMonth.m)[0],
                to: jalaliMonthRange(compareMonth.y, compareMonth.m)[1],
              }),
            ).expense,
          )}
        </p>
      </div>
      {reportPeriod === "month" && (
        <FinancialAnalysisPanel
          rows={rows}
          year={reportMonth.y}
          month={reportMonth.m}
          apiKey={geminiApiKey}
          onOpenSettings={() => setTab("settings")}
        />
      )}
    </>
  );
}
