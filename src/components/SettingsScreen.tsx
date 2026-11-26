import { Select } from "./Select";
import { useState } from "react";
import { Download, Upload, Sun, Moon, Monitor, RefreshCw } from "lucide-react";
import { version as packageVersion } from "../../package.json";
import { get, put, reset, initialize } from "../lib/db";
import {
  type Settings,
  type Category,
  type PaymentSource,
  type Transaction,
  localISO,
  money,
  persianNumber,
} from "../lib/domain";
import { transactionCSV, download } from "../lib/backup";
import { customAnalysisEndpoint } from "../lib/financial-analysis";
import { seedDemo } from "../lib/demo";
import { Section } from "./JournalPieces";
const sourceColors = [
  "#285646",
  "#0F766E",
  "#0891B2",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#A21CAF",
  "#BE185D",
  "#E11D48",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#CA8A04",
  "#65A30D",
  "#64748B",
  "#334155",
];
export function SettingsScreen({
  settings,
  categories,
  sources,
  rows,
  frequent,
  onEditFrequent,
  save,
  refresh,
  onExport,
  onImport,
  onReset,
  onCheckUpdate,
  checkingUpdate,
  updateMessage,
}: {
  settings: Settings;
  categories: Category[];
  sources: PaymentSource[];
  rows: Transaction[];
  frequent: Transaction[];
  onEditFrequent: (row: Transaction) => void;
  save: (s: Settings) => Promise<void>;
  refresh: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (f: File) => Promise<void>;
  onReset: () => Promise<void>;
  onCheckUpdate: () => Promise<void>;
  checkingUpdate: boolean;
  updateMessage: string;
}) {
  const [name, setName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [emoji, setEmoji] = useState("🧾");
  const [kind, setKind] = useState<Category["transactionKind"]>("expense");
  const [sourceName, setSourceName] = useState("");
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [provider, setProvider] = useState(settings.analysisProvider);
  const [baseUrl, setBaseUrl] = useState(settings.customApiBaseUrl);
  const [model, setModel] = useState(settings.customApiModel);
  const [customKey, setCustomKey] = useState(settings.customApiKey);
  const [apiMessage, setApiMessage] = useState("");
  const [apiError, setApiError] = useState("");
  const [savingApi, setSavingApi] = useState(false);
  const [removingFrequent, setRemovingFrequent] = useState<string | null>(null);
  const [frequentError, setFrequentError] = useState("");
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
      <Section title="به‌روزرسانی برنامه" />
      <div className="settings-card stack">
        <span>
          نسخه برنامه:{" "}
          <bdi>
            {packageVersion
              .split(".")
              .slice(0, 2)
              .map(Number)
              .map(persianNumber)
              .join("٫")}
          </bdi>
        </span>
        <button onClick={onCheckUpdate} disabled={checkingUpdate}>
          <RefreshCw size={18} />
          {checkingUpdate ? "در حال بررسی…" : "بررسی نسخه تازه"}
        </button>
        {updateMessage && <small role="status">{updateMessage}</small>}
      </div>
      <Section title="هوش مصنوعی" />
      <form
        className="settings-card stack"
        onChange={() => {
          setApiMessage("");
          setApiError("");
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (savingApi) return;
          setApiMessage("");
          setApiError("");
          if (provider === "custom") {
            try {
              customAnalysisEndpoint(baseUrl);
              if (!model.trim() || !customKey.trim())
                throw new Error("شناسهٔ مدل و کلید API سفارشی را وارد کنید.");
            } catch (error) {
              setApiError(error instanceof Error ? error.message : "تنظیمات API معتبر نیست.");
              return;
            }
          }
          setSavingApi(true);
          try {
            await save({
              ...settings,
              analysisProvider: provider,
              geminiApiKey: apiKey.trim(),
              customApiBaseUrl: baseUrl.trim(),
              customApiModel: model.trim(),
              customApiKey: customKey.trim(),
            });
            setApiMessage("تنظیمات تحلیل روی همین دستگاه ذخیره شد.");
          } catch {
            setApiError("ذخیره تنظیمات تحلیل ممکن نشد. دوباره تلاش کنید.");
          } finally {
            setSavingApi(false);
          }
        }}
      >
        <span>ارائه‌دهندهٔ تحلیل</span>
        <Select
          aria-label="ارائه‌دهندهٔ تحلیل"
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value === "custom" ? "custom" : "gemini");
            setApiMessage("");
            setApiError("");
          }}
        >
          <option value="gemini">Gemini</option>
          <option value="custom">API سفارشی (Custom API)</option>
        </Select>
        {provider === "custom" ? (
          <>
            <label htmlFor="custom-api-base-url">Base URL</label>
            <input
              id="custom-api-base-url"
              className="field"
              dir="ltr"
              type="url"
              required
              placeholder="https://iranrouter.net/api/v1"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
            <label htmlFor="custom-api-model">شناسهٔ مدل (Model)</label>
            <input
              id="custom-api-model"
              className="field"
              dir="ltr"
              required
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <label htmlFor="custom-api-key">کلید API سفارشی</label>
            <input
              id="custom-api-key"
              className="field"
              dir="ltr"
              type="password"
              autoComplete="off"
              required
              value={customKey}
              onChange={(event) => setCustomKey(event.target.value)}
            />
            <small>سرویس باید درخواست OpenAI-compatible را از مرورگر بپذیرد (CORS).</small>
          </>
        ) : (
          <>
            <label htmlFor="gemini-api-key">کلید Gemini API</label>
            <input
              id="gemini-api-key"
              className="field"
              dir="ltr"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </>
        )}
        <button type="submit" disabled={savingApi}>
          {savingApi ? "در حال ذخیره…" : "ذخیره تنظیمات تحلیل"}
        </button>
        {apiError && <small className="error" role="alert">{apiError}</small>}
        {apiMessage && <small role="status">{apiMessage}</small>}
        <small>کلیدها روی همین دستگاه ذخیره می‌شوند و در فایل پشتیبان قرار نمی‌گیرند.</small>
      </form>
      <Section title="تراکنش‌های پرتکرار" />
      <div className="settings-card">
        {!frequent.length && <small>هنوز تراکنش پرتکراری ثبت نشده است.</small>}
        {frequent.map((row) => (
          <div className="manage-row" key={row.id}>
            <span>
              {row.categoryEmoji} {row.categoryName} · {money(row.amountTomans)}
              {row.note && <small className="frequent-note">{row.note}</small>}
            </span>
            <span className="manage-actions">
              <button disabled={removingFrequent !== null} onClick={() => onEditFrequent(row)}>
                ویرایش
              </button>
              <button
                disabled={removingFrequent !== null}
                onClick={async () => {
                  setRemovingFrequent(row.id);
                  setFrequentError("");
                  try {
                    const current = await get("transactions", row.id);
                    if (current?.starred)
                      await put("transactions", {
                        ...current,
                        starred: false,
                        updatedAt: new Date().toISOString(),
                      });
                    await refresh();
                  } catch {
                    setFrequentError("حذف از پرتکرارها ممکن نشد. دوباره تلاش کنید.");
                  } finally {
                    setRemovingFrequent(null);
                  }
                }}
              >
                حذف از پرتکرارها
              </button>
            </span>
          </div>
        ))}
        {frequentError && <small className="error" role="alert">{frequentError}</small>}
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
                onClick={() => {
                  setEditingCategoryId(c.id);
                  setName(c.name);
                  setEmoji(c.emoji);
                  setKind(c.transactionKind);
                  setDefaultNecessity(c.defaultNecessity || "necessary");
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
            aria-label={editingCategoryId ? "ویرایش نام دسته" : "نام دسته تازه"}
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
          {editingCategoryId ? (
            <span className="edit-kind-note">
              نوع دسته: {kind === "expense" ? "هزینه" : "درآمد"}
            </span>
          ) : (
            <Select
              aria-label="نوع دسته"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as Category["transactionKind"])
              }
            >
              <option value="expense">هزینه</option>
              <option value="income">درآمد</option>
            </Select>
          )}
          {kind === "expense" && (
            <Select
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
            </Select>
          )}
          <button
            onClick={async () => {
              if (!name.trim()) return;
              const now = new Date().toISOString();
              const existing = categories.find(
                (category) => category.id === editingCategoryId,
              );
              await put("categories", {
                id: existing?.id || crypto.randomUUID(),
                name: name.trim(),
                emoji,
                transactionKind: kind,
                defaultNecessity: kind === "expense" ? defaultNecessity : null,
                active: existing?.active ?? true,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
              });
              setName("");
              setEmoji("🧾");
              setKind("expense");
              setDefaultNecessity("necessary");
              setEditingCategoryId(null);
              await refresh();
            }}
          >
            {editingCategoryId ? "ذخیره تغییرات" : "افزودن"}
          </button>
          {editingCategoryId && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingCategoryId(null);
                setName("");
                setEmoji("🧾");
                setKind("expense");
                setDefaultNecessity("necessary");
              }}
            >
              انصراف
            </button>
          )}
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
                onClick={() => {
                  setEditingSourceId(s.id);
                  setSourceName(s.name);
                  setSourceKind(s.kind);
                  setSourceColor(s.color);
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
            aria-label={editingSourceId ? "ویرایش نام منبع" : "نام منبع تازه"}
            placeholder="نام منبع"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
          />
          <Select
            aria-label="نوع منبع"
            value={sourceKind}
            onChange={(e) =>
              setSourceKind(e.target.value as PaymentSource["kind"])
            }
          >
            <option value="card">کارت</option>
            <option value="cash">نقد</option>
            <option value="other">دیگر</option>
          </Select>
          <div className="source-palette" role="group" aria-label="رنگ منبع">
            {sourceColors.map((color, index) => (
              <button
                type="button"
                key={color}
                className={
                  sourceColor.toLowerCase() === color.toLowerCase()
                    ? "selected"
                    : ""
                }
                style={{ background: color }}
                aria-label={`رنگ ${persianNumber(index + 1)}`}
                aria-pressed={sourceColor.toLowerCase() === color.toLowerCase()}
                onClick={() => setSourceColor(color)}
              />
            ))}
          </div>
          <button
            onClick={async () => {
              if (!sourceName.trim()) return;
              const now = new Date().toISOString();
              const existing = sources.find(
                (source) => source.id === editingSourceId,
              );
              await put("paymentSources", {
                id: existing?.id || crypto.randomUUID(),
                name: sourceName.trim(),
                kind: sourceKind,
                color: sourceColor,
                active: existing?.active ?? true,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
              });
              setSourceName("");
              setSourceColor("#285646");
              setSourceKind("card");
              setEditingSourceId(null);
              await refresh();
            }}
          >
            {editingSourceId ? "ذخیره تغییرات" : "افزودن"}
          </button>
          {editingSourceId && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingSourceId(null);
                setSourceName("");
                setSourceColor("#285646");
                setSourceKind("card");
              }}
            >
              انصراف
            </button>
          )}
        </div>
      </div>
      <Section title="داده‌های من" />
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
