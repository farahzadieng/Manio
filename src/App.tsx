import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  List,
  ChartNoAxesCombined,
  CalendarClock,
  Settings as SettingsIcon,
  ArrowRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { all, get, initialize, put, reset } from "./lib/db";
import {
  type Transaction,
  type Category,
  type PaymentSource,
  type Obligation,
  type Settings,
  localISO,
  jalali,
  jalaliMonthRange,
  filterTransactions,
  report,
  persianNumber,
  type Filters,
  monthlyTrend,
} from "./lib/domain";
import {
  exportBackup,
  importBackup,
  validateBackup,
  download,
  type Backup,
} from "./lib/backup";
import { seedDemo, seedEmptyCategories } from "./lib/demo";
import { generateDueInstances } from "./lib/recurrence";
import {
  TransactionEditor,
  type TransactionEditorInitial,
} from "./components/TransactionEditor";
import { Obligations, ObligationEditor } from "./components/Obligations";
import { SettingsScreen } from "./components/SettingsScreen";
import { BackupReminderToast } from "./components/BackupReminderToast";
import { claimBackupReminder } from "./lib/backup-reminder";
import type { Tab } from "./screens/types";
import { HomeScreen } from "./screens/HomeScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
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
function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<TransactionEditorInitial | null>(null);
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
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [showBackupToast, setShowBackupToast] = useState(false);
  const refresh = useCallback(async () => {
    setRows(await all("transactions"));
    setCategories(await all("categories"));
    setSources(await all("paymentSources"));
    setObligations(await all("obligations"));
    setSettings((await all("settings"))[0] || null);
  }, []);
  const checkUpdateNow = async () => {
    if (!navigator.onLine) {
      setUpdateMessage("برای بررسی نسخه تازه به اینترنت وصل شوید.");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setUpdateMessage("این مرورگر از به‌روزرسانی PWA پشتیبانی نمی‌کند.");
      return;
    }
    setCheckingUpdate(true);
    try {
      const registration =
        swRegistrationRef.current ||
        (await navigator.serviceWorker.getRegistration());
      if (!registration) {
        setUpdateMessage("بررسی نسخه پس از نصب برنامه در مرورگر فعال می‌شود.");
        return;
      }
      if (!registration.waiting) await registration.update();
      if (registration.waiting) setNeedRefresh(true);
      setUpdateMessage(
        registration.waiting
          ? "نسخه تازه آماده است؛ دکمه به‌روزرسانی را بزنید."
          : "بررسی انجام شد. اگر نسخه تازه‌ای پیدا شود، پیام به‌روزرسانی ظاهر می‌شود.",
      );
    } catch {
      setUpdateMessage("بررسی نسخه انجام نشد؛ اتصال اینترنت را بررسی کنید.");
    } finally {
      setCheckingUpdate(false);
    }
  };
  useEffect(() => {
    let alive = true;
    let swRegistration: ServiceWorkerRegistration | undefined;
    let lastUpdateCheck = 0;
    const checkForUpdate = () => {
      if (
        !swRegistration ||
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        Date.now() - lastUpdateCheck < 5 * 60_000
      )
        return;
      lastUpdateCheck = Date.now();
      swRegistration.update().catch(() => {});
    };
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
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
    const updateInterval = window.setInterval(checkForUpdate, 60 * 60_000);
    const sw = registerSW({
      onRegisteredSW(_url, registration) {
        swRegistration = registration;
        swRegistrationRef.current = registration || null;
        checkForUpdate();
      },
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {},
    });
    setUpdateSW(() => sw);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.clearInterval(updateInterval);
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
  useEffect(() => {
    if (!settings?.onboarded) return;
    let active = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      claimBackupReminder()
        .then((claimed) => {
          if (!active || !claimed) return;
          setSettings(claimed);
          setShowBackupToast(true);
        })
        .catch((e) => setError(String(e)));
    };
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const interval = window.setInterval(check, 60 * 60_000);
    return () => {
      active = false;
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(interval);
    };
  }, [settings?.onboarded]);
  useEffect(() => {
    if (!showBackupToast) return;
    const timeout = window.setTimeout(() => setShowBackupToast(false), 12_000);
    return () => window.clearTimeout(timeout);
  }, [showBackupToast]);
  useEffect(() => {
    if (tab !== "home") setShowBackupToast(false);
  }, [tab]);
  useEffect(() => {
    if (editor || obEditor || backupPreview) setShowBackupToast(false);
  }, [editor, obEditor, backupPreview]);
  useEffect(() => {
    if (needRefresh) setShowBackupToast(false);
  }, [needRefresh]);
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
  const frequent = rows
    .filter((t) => t.starred)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const saveSetting = async (next: Settings) => {
    await put("settings", next);
    setSettings(next);
  };
  const exportData = async () => {
    const backup = await exportBackup();
    download(
      JSON.stringify(backup, null, 2),
      `manio-backup-${localISO()}.json`,
      "application/json",
    );
    const current = await get("settings", "main");
    if (current)
      await saveSetting({ ...current, lastBackupAt: new Date().toISOString() });
    setShowBackupToast(false);
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
          <img src="/icons/manio-fullbleed-192.png" alt="نشان مانیو" />
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
          <HomeScreen
            selectedRange={selectedRange}
            summary={summary}
            rows={rows}
            obligations={obligations}
            frequent={frequent}
            changeMonth={changeMonth}
            setEditor={setEditor}
            setTab={setTab}
            setObEditor={setObEditor}
          />
        )}
        {tab === "transactions" && (
          <TransactionsScreen
            filters={filters}
            setFilters={setFilters}
            filtered={filtered}
            categories={categories}
            sources={sources}
            setEditor={setEditor}
          />
        )}
        {tab === "reports" && (
          <ReportsScreen
            reportPeriod={reportPeriod}
            setReportPeriod={setReportPeriod}
            selectedRange={selectedRange}
            changeMonth={changeMonth}
            reportAnchor={reportAnchor}
            setReportAnchor={setReportAnchor}
            reportFilters={reportFilters}
            setReportFilters={setReportFilters}
            categories={categories}
            sources={sources}
            reportSummary={reportSummary}
            incomeSummary={incomeSummary}
            reportRange={reportRange}
            trend={trend}
            trendMax={trendMax}
            rows={rows}
            compareMonth={compareMonth}
            setCompareMonth={setCompareMonth}
            setFilters={setFilters}
            setTab={setTab}
          />
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
            onExport={exportData}
            onImport={onImport}
            onReset={erase}
            onCheckUpdate={checkUpdateNow}
            checkingUpdate={checkingUpdate}
            updateMessage={updateMessage}
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
          key={
            editor.row
              ? `edit-${editor.row.id}`
              : editor.duplicateOf
                ? `repeat-${editor.duplicateOf.id}`
                : `${editor.kind}-${editor.obligationId || "new"}`
          }
          initial={editor}
          onDuplicate={(row) => setEditor({ kind: row.kind, duplicateOf: row })}
          categories={categories}
          sources={sources}
          transactions={rows}
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
      {showBackupToast &&
        !needRefresh &&
        !editor &&
        !obEditor &&
        !backupPreview && (
          <BackupReminderToast
            onExport={exportData}
            onDismiss={() => setShowBackupToast(false)}
          />
        )}
    </div>
  );
}
export default App;
