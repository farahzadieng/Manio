import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Sparkles, X } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");
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
      setCopied(true);
    } catch {
      setMessage("دسترسی به کلیپ‌بورد ممکن نشد.");
    }
  };
  const saveAnalysis = async (text: string) => {
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
  };
  const saveManual = async () => {
    const text = manualText.trim();
    if (!text) {
      setManualError("پاسخ ایجنت را وارد کنید.");
      return;
    }
    if (manualSaving) return;
    setManualSaving(true);
    setManualError("");
    try {
      await saveAnalysis(text);
      setManualOpen(false);
      setManualText("");
      setMessage("پاسخ ایجنت برای این ماه ذخیره شد.");
    } catch {
      setManualError("ذخیره پاسخ ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setManualSaving(false);
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
      await saveAnalysis(text);
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
        بررسی الگوها و محرک‌های خرج‌کردن در این ماه.
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
      {copied && (
        <div className="analysis-copy-notice" role="status">
          <span>پاسخ ایجنت خودتون رو وارد کنید تا برای آینده ثبت بشه.</span>
          <button className="secondary" onClick={() => setManualOpen(true)}>
            ثبت پاسخ ایجنت
          </button>
        </div>
      )}
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
      {manualOpen && createPortal(
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !manualSaving)
              setManualOpen(false);
          }}
        >
          <section
            className="modal editor analysis-manual-modal"
            role="dialog"
            aria-modal="true"
            aria-label="ثبت پاسخ ایجنت"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !manualSaving) setManualOpen(false);
            }}
          >
            <div className="modal-title">
              <h2>ثبت پاسخ ایجنت</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="بستن"
                onClick={() => setManualOpen(false)}
                disabled={manualSaving}
              >
                <X size={20} />
              </button>
            </div>
            <p className="muted">
              پاسخ کامل ایجنت را اینجا جای‌گذاری کنید. این متن در تحلیل‌های ماه
              {" "}{persianNumber(month)} سال {persianNumber(year)} ذخیره می‌شود و
              برای مقایسهٔ ماه بعد هم در دسترس خواهد بود.
            </p>
            <label htmlFor="manual-analysis-text">پاسخ ایجنت</label>
            <textarea
              id="manual-analysis-text"
              autoFocus
              value={manualText}
              onChange={(event) => {
                setManualText(event.target.value);
                setManualError("");
              }}
              placeholder="پاسخ ایجنت را اینجا جای‌گذاری کنید…"
            />
            {manualError && <p role="alert" className="analysis-manual-error">{manualError}</p>}
            <button
              type="button"
              className="primary analysis-manual-save"
              onClick={saveManual}
              disabled={manualSaving}
            >
              {manualSaving ? "در حال ذخیره…" : "ذخیره تحلیل این ماه"}
            </button>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
