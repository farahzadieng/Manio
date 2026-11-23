import { useEffect, useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { all, put } from "../lib/db";
import {
  type FinancialAnalysis,
  type Transaction,
  filterTransactions,
  jalaliMonthRange,
  persianNumber,
} from "../lib/domain";
import {
  analysisMonth,
  buildFinancialPrompt,
  previousJalaliMonth,
  requestFinancialAnalysis,
} from "../lib/financial-analysis";

export function FinancialAnalysisPanel({
  rows,
  year,
  month,
  apiKey,
  onOpenSettings,
}: {
  rows: Transaction[];
  year: number;
  month: number;
  apiKey: string;
  onOpenSettings: () => void;
}) {
  const key = analysisMonth(year, month);
  const [history, setHistory] = useState<FinancialAnalysis[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [currentFrom, currentTo] = jalaliMonthRange(year, month);
  const previous = previousJalaliMonth(year, month);
  const [previousFrom, previousTo] = jalaliMonthRange(
    previous.year,
    previous.month,
  );
  const currentRows = filterTransactions(rows, {
    from: currentFrom,
    to: currentTo,
  });
  const previousRows = filterTransactions(rows, {
    from: previousFrom,
    to: previousTo,
  });
  const previousAnalysis = history
    .filter(
      (entry) => entry.month === analysisMonth(previous.year, previous.month),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const prompt = buildFinancialPrompt({
    currentRows,
    previousRows,
    previousAnalysis,
    year,
    month,
  });
  useEffect(() => {
    let active = true;
    all("analyses")
      .then((items) => {
        if (active) {
          setHistory(items);
          setHistoryReady(true);
        }
      })
      .catch((error) => {
        if (active) setMessage(String(error));
      });
    return () => {
      active = false;
    };
  }, []);
  const current = history
    .filter((entry) => entry.month === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage("پرامپت تحلیل کپی شد.");
    } catch {
      setMessage("دسترسی به کلیپ‌بورد ممکن نشد.");
    }
  };
  const analyze = async () => {
    if (!apiKey.trim()) {
      onOpenSettings();
      return;
    }
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const text = await requestFinancialAnalysis(prompt, apiKey.trim());
      const now = new Date().toISOString();
      const entry: FinancialAnalysis = {
        id: crypto.randomUUID(),
        month: key,
        text,
        transactionCount: currentRows.filter((row) => row.kind === "expense")
          .length,
        createdAt: now,
        updatedAt: now,
      };
      await put("analyses", entry);
      setHistory((items) => [...items, entry]);
      setMessage("تحلیل تازه ذخیره شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تحلیل انجام نشد.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="analysis-panel" aria-label="تحلیل رفتار مالی">
      <div className="section-title">
        <h2>تحلیل رفتار مالی</h2>
      </div>
      <p className="muted">
        نگاهی کوتاه به الگوها و محرک‌های احتمالی خرج‌کردن در این ماه.
      </p>
      <div className="analysis-actions">
        <button className="secondary" onClick={copy} disabled={!historyReady}>
          <Copy size={17} /> کپی پرامپت
        </button>
        <button
          className="primary"
          onClick={analyze}
          disabled={busy || !historyReady}
        >
          <Sparkles size={17} /> {busy ? "در حال تحلیل…" : "تحلیل با Gemini"}
        </button>
      </div>
      {!apiKey && (
        <p className="muted">
          برای تحلیل درون برنامه، کلید Gemini را در تنظیمات ثبت کنید.
        </p>
      )}
      <p className="muted tiny">
        برای Gemini، هزینه‌های این ماه و ماه قبل و در صورت وجود، آخرین تحلیل ماه
        قبل مستقیماً به Google ارسال می‌شوند. تحلیل‌های دریافتی روی
        همین دستگاه ذخیره می‌شوند.
      </p>
      {message && (
        <p role="status" className="analysis-message">
          {message}
        </p>
      )}
      {current.length ? (
        <div className="analysis-history">
          {current.map((entry, index) => (
            <article className="analysis-result" key={entry.id}>
              <small>
                {index === 0 ? "تازه‌ترین تحلیل · " : "تحلیل پیشین · "}
                {new Intl.DateTimeFormat("fa-IR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(entry.createdAt))}{" "}
                · {persianNumber(entry.transactionCount)} هزینه
              </small>
              <p>{entry.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">هنوز تحلیلی برای این ماه ذخیره نشده است.</p>
      )}
    </section>
  );
}
