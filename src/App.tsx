import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home,
  List,
  ChartNoAxesCombined,
  CalendarClock,
  Settings as SettingsIcon,
  Plus,
  Search,
  ArrowRight,
  Trash2,
  Copy,
  Download,
  Upload,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  X,
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import {
  all,
  get,
  initialize,
  put,
  remove,
  reset,
  atomicReplace,
} from "./lib/db";
import {
  type Transaction,
  type Category,
  type PaymentSource,
  type Obligation,
  type Settings,
  localISO,
  yesterday,
  jalali,
  jalaliMonthRange,
  money,
  parseAmount,
  filterTransactions,
  report,
  persianNumber,
  type Filters,
  note,
  monthlyTrend,
} from "./lib/domain";
import {
  exportBackup,
  importBackup,
  validateBackup,
  transactionCSV,
  download,
  type Backup,
} from "./lib/backup";
import { seedDemo, seedEmptyCategories } from "./lib/demo";
import { generateDueInstances } from "./lib/recurrence";
import { DatePicker } from "./components/DatePicker";
type Tab = "home" | "transactions" | "reports" | "obligations" | "settings";
const labels = {
  home: "خانه",
  transactions: "تراکنش‌ها",
  reports: "گزارش‌ها",
  obligations: "تعهدات",
  settings: "تنظیمات",
};
const icons = {
  home: Home,
  transactions: List,
  reports: ChartNoAxesCombined,
  obligations: CalendarClock,
};
const necessityLabel = (v: string | null) =>
  v === "necessary" ? "ضروری" : v === "nonessential" ? "غیرضروری" : "";
function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{
    kind: "expense" | "income";
    row?: Transaction;
    duplicateOf?: Transaction;
    presetAmount?: number;
    presetCategoryId?: string;
    presetNote?: string;
    obligationId?: string;
  } | null>(null);
  const [obEditor, setObEditor] = useState<Obligation | true | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [reportFilters, setReportFilters] = useState<Filters>({});
  const [reportPeriod, setReportPeriod] = useState<
    "day" | "week" | "month" | "year" | "custom"
  >("month");
  const [reportAnchor, setReportAnchor] = useState(localISO());
  const [compareMonth, setCompareMonth] = useState(() => {
    const j = jalali(localISO());
    return { y: j.jm === 1 ? j.jy - 1 : j.jy, m: j.jm === 1 ? 12 : j.jm - 1 };
  });
  const [month, setMonth] = useState(() => {
    const j = jalali(localISO());
    return { y: j.jy, m: j.jm };
  });
  const [backupPreview, setBackupPreview] = useState<Backup | null>(null);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<
    ((reload?: boolean) => Promise<void>) | null
  >(null);
  const refresh = useCallback(async () => {
    setRows(await all("transactions"));
    setCategories(await all("categories"));
    setSources(await all("paymentSources"));
    setObligations(await all("obligations"));
    setSettings((await all("settings"))[0] || null);
  }, []);
  useEffect(() => {
    let alive = true;
    initialize()
      .then(async () => {
        await generateDueInstances(localISO());
        if (navigator.storage?.persist)
          navigator.storage.persist().catch(() => {});
        if (alive) await refresh();
      })
      .catch((e) => setError(String(e)))
      .finally(() => setBusy(false));
    const onFocus = () =>
      generateDueInstances(localISO())
        .then(refresh)
        .catch(() => {});
    window.addEventListener("focus", onFocus);
    const sw = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {},
    });
    setUpdateSW(() => sw);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    const theme =
      settings?.theme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings?.theme || "light";
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#15211C" : "#F8F6F1");
  }, [settings?.theme]);
  const selectedRange = jalaliMonthRange(month.y, month.m);
  const monthly = filterTransactions(rows, {
    from: selectedRange[0],
    to: selectedRange[1],
  });
  const weekStart = new Date(`${reportAnchor}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 1) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const reportRange: [string, string] =
    reportPeriod === "day"
      ? [reportAnchor, reportAnchor]
      : reportPeriod === "week"
        ? [localISO(weekStart), localISO(weekEnd)]
        : reportPeriod === "month"
          ? selectedRange
          : reportPeriod === "year"
            ? [
                jalaliMonthRange(month.y, 1)[0],
                jalaliMonthRange(month.y, 12)[1],
              ]
            : [
                reportFilters.from || selectedRange[0],
                reportFilters.to || selectedRange[1],
              ];
  const reportRows = filterTransactions(rows, {
    ...reportFilters,
    from: reportRange[0],
    to: reportRange[1],
  });
  const reportSummary = report(reportRows);
  const incomeSummary = report(
    filterTransactions(rows, {
      from: reportRange[0],
      to: reportRange[1],
      kind: "income",
    }),
  );
  const trend = monthlyTrend(rows, month.y, month.m, reportFilters);
  const trendMax = Math.max(1, ...trend.map((x) => x.total));
  const summary = report(monthly);
  const filtered = useMemo(
    () => filterTransactions(rows, filters),
    [rows, filters],
  );
  const changeMonth = (delta: number) =>
    setMonth((v) => {
      let m = v.m + delta,
        y = v.y;
      if (m < 1) {
        m = 12;
        y--;
      }
      if (m > 12) {
        m = 1;
        y++;
      }
      return { m, y };
    });
  const frequent = Object.values(
    rows
      .filter((t) => t.kind === "expense")
      .reduce<
        Record<
          string,
          { id: string; name: string; emoji: string; count: number }
        >
      >((acc, t) => {
        const x = acc[t.categoryId] || {
          id: t.categoryId,
          name: t.categoryName,
          emoji: t.categoryEmoji,
          count: 0,
        };
        x.count++;
        acc[t.categoryId] = x;
        return acc;
      }, {}),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const saveSetting = async (next: Settings) => {
    await put("settings", next);
    setSettings(next);
  };
  const begin = async (demo: boolean) => {
    try {
      if (demo) await seedDemo();
      else await seedEmptyCategories();
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };
  const erase = async () => {
    if (!confirm("همه داده‌های محلی حذف می‌شوند. ادامه می‌دهید؟")) return;
    const typed = prompt("برای تأیید نهایی واژه «حذف» را بنویسید");
    if (typed !== "حذف") return;
    await reset();
    await initialize();
    await refresh();
    setTab("home");
  };
  const onImport = async (file: File) => {
    try {
      const parsed = validateBackup(JSON.parse(await file.text()));
      setBackupPreview(parsed);
    } catch (e) {
      setError(`پشتیبان نامعتبر است: ${String(e)}`);
    }
  };
  const performImport = async (mode: "replace" | "merge") => {
    if (!backupPreview) return;
    if (
      mode === "replace" &&
      !confirm(
        "داده‌های فعلی جایگزین می‌شوند. پیش از ادامه نسخه پشتیبان بگیرید. ادامه؟",
      )
    )
      return;
    try {
      await importBackup(backupPreview, mode);
      setBackupPreview(null);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };
  if (busy) return <main className="center">در حال بارگذاری دفتر…</main>;
  if (!settings?.onboarded)
    return (
      <main className="onboard">
        <div className="brand-mark">
          <img src="/icons/manio-user-192.png" alt="نشان مانیو" />
        </div>
        <span className="eyebrow">دفتر شخصی شما</span>
        <h1>
          خرج‌ها را
          <br />
          آرام‌تر ببینید.
        </h1>
        <p>
          مانیو، دفتر ساده و خصوصی برای ثبت هزینه‌ها، درآمدها و یادآوری تعهدات
          شماست. همه چیز روی همین دستگاه می‌ماند.
        </p>
        <button className="primary full" onClick={() => begin(false)}>
          شروع با دفتر خالی <ChevronLeft size={18} />
        </button>
        <button className="secondary full" onClick={() => begin(true)}>
          دیدن داده‌های نمونه
        </button>
        <small>بدون حساب کاربری، بدون همگام‌سازی</small>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </main>
    );
  return (
    <div className="app">
      <div className="safe-top" />
      <header className="topbar">
        <div>
          <span className="eyebrow">مانیو · دفتر خرج شخصی</span>
          <h1>{labels[tab]}</h1>
        </div>
        <button
          className="icon-button"
          onClick={() => setTab(tab === "settings" ? "home" : "settings")}
          aria-label={tab === "settings" ? "بازگشت به خانه" : "تنظیمات"}
        >
          {tab === "settings" ? <ArrowRight /> : <SettingsIcon />}
        </button>
      </header>
      <main className="content">
        {error && (
          <div className="error notice" role="alert">
            {error}
            <button aria-label="بستن خطا" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {tab === "home" && (
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
            <Section
              title="تراکنش‌های اخیر"
              action={() => setTab("transactions")}
            />
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
                <Section title="هزینه‌های پرتکرار" />
                <div className="chips">
                  {frequent.map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        setEditor({ kind: "expense", presetCategoryId: f.id })
                      }
                    >
                      {f.emoji} {f.name} +
                    </button>
                  ))}
                </div>
              </>
            )}
            <Section
              title="تعهدات پیش رو"
              action={() => setTab("obligations")}
            />
            {obligations
              .filter((o) => o.status === "pending")
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 2)
              .map((o) => (
                <ObligationRow
                  key={o.id}
                  item={o}
                  onClick={() => setObEditor(o)}
                />
              ))}
            {!obligations.length && (
              <p className="muted">تعهدی ثبت نشده است.</p>
            )}
          </>
        )}
        {tab === "transactions" && (
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
              <select
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
              </select>
              <select
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
              </select>
              <select
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
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="ضرورت"
                value={filters.necessity || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    necessity:
                      (e.target.value as Filters["necessity"]) || undefined,
                  })
                }
              >
                <option value="">همه ضرورت‌ها</option>
                <option value="necessary">ضروری</option>
                <option value="nonessential">غیرضروری</option>
              </select>
              {filters.from ? (
                <DatePicker
                  value={filters.from}
                  onChange={(v) => setFilters({ ...filters, from: v })}
                  label="از تاریخ"
                />
              ) : (
                <button
                  onClick={() => setFilters({ ...filters, from: localISO() })}
                >
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
                <button
                  onClick={() => setFilters({ ...filters, to: localISO() })}
                >
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
        )}
        {tab === "reports" && (
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
                  onChange={(v) =>
                    setReportFilters({ ...reportFilters, from: v })
                  }
                  label="از"
                />
                <DatePicker
                  value={reportFilters.to || selectedRange[1]}
                  onChange={(v) =>
                    setReportFilters({ ...reportFilters, to: v })
                  }
                  label="تا"
                />
              </div>
            )}
            <div className="filters report-filters">
              <select
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
              </select>
              <select
                aria-label="ضرورت گزارش"
                value={reportFilters.necessity || ""}
                onChange={(e) =>
                  setReportFilters({
                    ...reportFilters,
                    necessity:
                      (e.target.value as Filters["necessity"]) || undefined,
                  })
                }
              >
                <option value="">همه ضرورت‌ها</option>
                <option value="necessary">ضروری</option>
                <option value="nonessential">غیرضروری</option>
              </select>
              <select
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
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
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
                {money(incomeSummary.income - reportSummary.expense)} — این
                مانده حساب نیست.
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
          </>
        )}
        {tab === "obligations" && (
          <Obligations
            items={obligations}
            onEdit={setObEditor}
            onRefresh={refresh}
            onCreateTransaction={(kind, amount, obligationId, title) =>
              setEditor({
                kind,
                presetAmount: amount,
                presetNote: title,
                obligationId,
              })
            }
          />
        )}
        {tab === "settings" && (
          <SettingsScreen
            settings={settings}
            categories={categories}
            sources={sources}
            rows={rows}
            save={saveSetting}
            refresh={refresh}
            onExport={async () => {
              const b = await exportBackup();
              download(
                JSON.stringify(b, null, 2),
                `manio-backup-${localISO()}.json`,
                "application/json",
              );
              await saveSetting({
                ...settings,
                lastBackupAt: new Date().toISOString(),
              });
            }}
            onImport={onImport}
            onReset={erase}
          />
        )}
      </main>
      <nav className="tabbar" aria-label="ناوبری اصلی">
        {(Object.keys(icons) as (keyof typeof icons)[]).map((key) => {
          const Icon = icons[key];
          return (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
              aria-current={tab === key ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{labels[key]}</span>
            </button>
          );
        })}
      </nav>
      {editor && (
        <TransactionEditor
          initial={editor}
          onDuplicate={(row) => setEditor({ kind: row.kind, duplicateOf: row })}
          categories={categories}
          sources={sources}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await refresh();
          }}
        />
      )}
      {obEditor && (
        <ObligationEditor
          initial={obEditor === true ? undefined : obEditor}
          onClose={() => setObEditor(null)}
          onSaved={async () => {
            setObEditor(null);
            await refresh();
          }}
        />
      )}
      {backupPreview && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="پیش‌نمایش پشتیبان"
          >
            <h2>پیش‌نمایش پشتیبان</h2>
            <p>
              {persianNumber(backupPreview.data.transactions.length)} تراکنش،{" "}
              {persianNumber(backupPreview.data.obligations.length)} تعهد،{" "}
              {persianNumber(backupPreview.data.categories.length)} دسته
            </p>
            <p className="muted">
              در ادغام، رکوردهای موجود با شناسه یکسان حفظ می‌شوند؛ جایگزینی همه
              داده‌ها را عوض می‌کند.
            </p>
            <button
              className="primary full"
              onClick={() => performImport("merge")}
            >
              ادغام
            </button>
            <button
              className="secondary full"
              onClick={() => performImport("replace")}
            >
              جایگزینی
            </button>
            <button
              className="text-button"
              onClick={() => setBackupPreview(null)}
            >
              انصراف
            </button>
          </section>
        </div>
      )}
      {needRefresh && !editor && !obEditor && (
        <div className="update-banner">
          نسخه تازه آماده است. پس از ذخیره فرم‌ها به‌روزرسانی کنید.{" "}
          <button onClick={() => updateSW?.(true)}>به‌روزرسانی</button>
        </div>
      )}
    </div>
  );
}
function Section({ title, action }: { title: string; action?: () => void }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && <button onClick={action}>همه ←</button>}
    </div>
  );
}
function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}
function TransactionList({
  items,
  onSelect,
}: {
  items: Transaction[];
  onSelect: (t: Transaction) => void;
}) {
  return (
    <div className="list">
      {items.map((t) => (
        <button
          className="transaction-row"
          key={t.id}
          onClick={() => onSelect(t)}
        >
          <span className="emoji">{t.categoryEmoji}</span>
          <span className="row-main">
            <strong>{t.categoryName}</strong>
            <small>
              {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                day: "numeric",
                month: "long",
              }).format(new Date(`${t.date}T12:00:00`))}{" "}
              · {t.paymentSourceName || "بدون منبع"}{" "}
              {t.necessity && `· ${necessityLabel(t.necessity)}`}
            </small>
          </span>
          <strong className={t.kind === "income" ? "income" : ""} dir="ltr">
            {t.kind === "income" ? "+" : "−"}
            {money(t.amountTomans)}
          </strong>
        </button>
      ))}
    </div>
  );
}
const obligationsById = (id: string) => get("obligations", id);
function TransactionEditor({
  initial,
  categories,
  sources,
  onClose,
  onSaved,
  onDuplicate,
}: {
  initial: {
    kind: "expense" | "income";
    row?: Transaction;
    duplicateOf?: Transaction;
    presetAmount?: number;
    presetCategoryId?: string;
    presetNote?: string;
    obligationId?: string;
  };
  categories: Category[];
  sources: PaymentSource[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDuplicate: (row: Transaction) => void;
}) {
  const row = initial.row;
  const template = row || initial.duplicateOf;
  const [kind, setKind] = useState(initial.kind);
  const [amountText, setAmountText] = useState(
    template
      ? String(template.amountTomans)
      : initial.presetAmount
        ? String(initial.presetAmount)
        : "",
  );
  const [categoryId, setCategoryId] = useState(
    template?.categoryId || initial.presetCategoryId || "",
  );
  const [sourceId, setSourceId] = useState(template?.paymentSourceId || "");
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
          <input
            autoFocus
            inputMode="numeric"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="مثلاً ۱۲۵٬۰۰۰"
          />
        </label>
        <label>
          دسته
          <select
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
          </select>
        </label>
        <label>
          {kind === "expense" ? "منبع پرداخت" : "دریافت در (اختیاری)"}
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">بدون منبع</option>
            {sources
              .filter((s) => s.active || s.id === sourceId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        {kind === "expense" && (
          <label>
            ضرورت
            <select
              value={necessity}
              onChange={(e) => setNecessity(e.target.value as typeof necessity)}
            >
              <option value="necessary">ضروری</option>
              <option value="nonessential">غیرضروری</option>
            </select>
          </label>
        )}
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
function ObligationRow({
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
function Obligations({
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
function ObligationEditor({
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
    initial?.amountTomans?.toString() || "",
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
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Obligation["type"])}
          >
            <option value="debt">بدهی</option>
            <option value="receivable">طلب</option>
            <option value="plannedPayment">پرداخت برنامه‌ریزی‌شده</option>
            <option value="reminder">یادآوری مالی</option>
          </select>
        </label>
        <label>
          عنوان
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          مبلغ (اختیاری)
          <input
            inputMode="numeric"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />
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
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
            >
              <option value="none">بدون تکرار</option>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="monthly">ماهانه شمسی</option>
              <option value="yearly">سالانه شمسی</option>
            </select>
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
function SettingsScreen({
  settings,
  categories,
  sources,
  rows,
  save,
  refresh,
  onExport,
  onImport,
  onReset,
}: {
  settings: Settings;
  categories: Category[];
  sources: PaymentSource[];
  rows: Transaction[];
  save: (s: Settings) => Promise<void>;
  refresh: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (f: File) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧾");
  const [kind, setKind] = useState<Category["transactionKind"]>("expense");
  const [sourceName, setSourceName] = useState("");
  const [sourceColor, setSourceColor] = useState("#285646");
  const [sourceKind, setSourceKind] = useState<PaymentSource["kind"]>("card");
  const [defaultNecessity, setDefaultNecessity] =
    useState<Category["defaultNecessity"]>("necessary");
  return (
    <>
      <Section title="نمایش" />
      <div className="settings-card">
        <span>پوسته</span>
        <div className="chips">
          {(
            [
              ["system", "دستگاه", Monitor],
              ["light", "روشن", Sun],
              ["dark", "تیره", Moon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              className={settings.theme === value ? "active" : ""}
              onClick={() => save({ ...settings, theme: value })}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <Section title="دسته‌ها" />
      <div className="settings-card">
        {categories.map((c) => (
          <div className="manage-row" key={c.id}>
            <span>
              {c.emoji} {c.name} {!c.active && "· بایگانی"}
            </span>
            <span className="manage-actions">
              <button
                onClick={async () => {
                  const name = prompt("نام دسته", c.name);
                  if (!name?.trim()) return;
                  const emoji = prompt("ایموجی", c.emoji) || c.emoji;
                  const necessity =
                    c.transactionKind === "expense"
                      ? prompt(
                          "ضرورت پیش‌فرض: ضروری یا غیرضروری",
                          c.defaultNecessity === "nonessential"
                            ? "غیرضروری"
                            : "ضروری",
                        )
                      : null;
                  if (
                    necessity !== null &&
                    necessity !== "ضروری" &&
                    necessity !== "غیرضروری"
                  )
                    return;
                  await put("categories", {
                    ...c,
                    name: name.trim(),
                    emoji,
                    defaultNecessity:
                      necessity === null
                        ? null
                        : necessity === "ضروری"
                          ? "necessary"
                          : "nonessential",
                    updatedAt: new Date().toISOString(),
                  });
                  await refresh();
                }}
              >
                ویرایش
              </button>
              <button
                onClick={async () => {
                  await put("categories", {
                    ...c,
                    active: !c.active,
                    updatedAt: new Date().toISOString(),
                  });
                  await refresh();
                }}
              >
                {c.active ? "بایگانی" : "فعال‌سازی"}
              </button>
            </span>
          </div>
        ))}
        <div className="inline-form">
          <input
            aria-label="نام دسته تازه"
            placeholder="نام دسته"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            aria-label="ایموجی دسته"
            className="emoji-input"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
          />
          <select
            aria-label="نوع دسته"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as Category["transactionKind"])
            }
          >
            <option value="expense">هزینه</option>
            <option value="income">درآمد</option>
          </select>
          {kind === "expense" && (
            <select
              aria-label="ضرورت پیش‌فرض"
              value={defaultNecessity || "necessary"}
              onChange={(e) =>
                setDefaultNecessity(
                  e.target.value as Category["defaultNecessity"],
                )
              }
            >
              <option value="necessary">ضروری</option>
              <option value="nonessential">غیرضروری</option>
            </select>
          )}
          <button
            onClick={async () => {
              if (!name.trim()) return;
              const now = new Date().toISOString();
              await put("categories", {
                id: crypto.randomUUID(),
                name: name.trim(),
                emoji,
                transactionKind: kind,
                defaultNecessity: kind === "expense" ? defaultNecessity : null,
                active: true,
                createdAt: now,
                updatedAt: now,
              });
              setName("");
              await refresh();
            }}
          >
            افزودن
          </button>
        </div>
      </div>
      <Section title="منابع پرداخت" />
      <div className="settings-card">
        {sources.map((s) => (
          <div className="manage-row" key={s.id}>
            <span>
              <i className="source-dot" style={{ background: s.color }} />
              {s.name} {!s.active && "· بایگانی"}
            </span>
            <span className="manage-actions">
              <button
                onClick={async () => {
                  const name = prompt("نام منبع", s.name);
                  if (!name?.trim()) return;
                  const color =
                    prompt("رنگ منبع (کد #RRGGBB)", s.color) || s.color;
                  const kind =
                    prompt(
                      "نوع منبع: کارت، نقد یا دیگر",
                      s.kind === "card"
                        ? "کارت"
                        : s.kind === "cash"
                          ? "نقد"
                          : "دیگر",
                    ) || "دیگر";
                  if (
                    !/^#[0-9a-fA-F]{6}$/.test(color) ||
                    !["کارت", "نقد", "دیگر"].includes(kind)
                  )
                    return;
                  await put("paymentSources", {
                    ...s,
                    name: name.trim(),
                    color,
                    kind:
                      kind === "کارت"
                        ? "card"
                        : kind === "نقد"
                          ? "cash"
                          : "other",
                    updatedAt: new Date().toISOString(),
                  });
                  await refresh();
                }}
              >
                ویرایش
              </button>
              <button
                onClick={async () => {
                  await put("paymentSources", {
                    ...s,
                    active: !s.active,
                    updatedAt: new Date().toISOString(),
                  });
                  await refresh();
                }}
              >
                {s.active ? "بایگانی" : "فعال‌سازی"}
              </button>
            </span>
          </div>
        ))}
        <div className="inline-form">
          <input
            aria-label="نام منبع تازه"
            placeholder="نام منبع"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
          />
          <select
            aria-label="نوع منبع"
            value={sourceKind}
            onChange={(e) =>
              setSourceKind(e.target.value as PaymentSource["kind"])
            }
          >
            <option value="card">کارت</option>
            <option value="cash">نقد</option>
            <option value="other">دیگر</option>
          </select>
          <input
            aria-label="رنگ منبع"
            type="color"
            value={sourceColor}
            onChange={(e) => setSourceColor(e.target.value)}
          />
          <button
            onClick={async () => {
              if (!sourceName.trim()) return;
              const now = new Date().toISOString();
              await put("paymentSources", {
                id: crypto.randomUUID(),
                name: sourceName.trim(),
                kind: sourceKind,
                color: sourceColor,
                active: true,
                createdAt: now,
                updatedAt: now,
              });
              setSourceName("");
              await refresh();
            }}
          >
            افزودن
          </button>
        </div>
      </div>
      <Section title="داده‌های من" />
      {(!settings.lastBackupAt ||
        Date.now() - new Date(settings.lastBackupAt).getTime() >
          30 * 86400000) && (
        <p className="backup-reminder">
          برای حفظ داده‌های محلی، یک نسخه پشتیبان بگیرید.
        </p>
      )}
      <div className="settings-card stack">
        <button onClick={onExport}>
          <Download size={18} /> دریافت پشتیبان JSON
        </button>
        <button
          onClick={() =>
            download(
              transactionCSV(rows),
              `manio-transactions-${localISO()}.csv`,
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={18} /> خروجی CSV تراکنش‌ها
        </button>
        <label className="file-label">
          <Upload size={18} /> ورود پشتیبان JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
            }}
          />
        </label>
        <small>
          داده‌ها روی همین دستگاه‌اند. برای انتقال به دستگاه یا نشانی دیگر،
          پشتیبان بگیرید.
        </small>
      </div>
      <Section title="داده‌های نمونه" />
      <div className="settings-card">
        <p className="muted">
          بارگذاری نمونه، داده‌های فعلی این دستگاه را جایگزین می‌کند. ابتدا
          پشتیبان بگیرید.
        </p>
        <button
          className="secondary full"
          onClick={async () => {
            if (!confirm("همه داده‌های فعلی با نمونه جایگزین شوند؟")) return;
            if (prompt("برای تأیید «نمونه» را بنویسید") !== "نمونه") return;
            await reset();
            await initialize();
            await seedDemo();
            await refresh();
          }}
        >
          {settings.demo ? "بارگذاری دوباره نمونه" : "بارگذاری داده‌های نمونه"}
        </button>
      </div>
      <Section title="شروع دوباره" />
      <button className="danger settings-reset" onClick={onReset}>
        حذف همه داده‌های محلی
      </button>
      <p className="muted tiny">
        حذف بدون پشتیبان قابل بازگشت نیست. مانیو همگام‌سازی ابری ندارد.
      </p>
    </>
  );
}
export default App;
