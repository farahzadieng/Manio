import { useState } from "react";
import { Download, Upload, Sun, Moon, Monitor, RefreshCw } from "lucide-react";
import { version as packageVersion } from "../../package.json";
import { put, reset, initialize } from "../lib/db";
import {
  type Settings,
  type Category,
  type PaymentSource,
  type Transaction,
  localISO,
  persianNumber,
} from "../lib/domain";
import { transactionCSV, download } from "../lib/backup";
import { seedDemo } from "../lib/demo";
import { Section } from "./JournalPieces";
export function SettingsScreen({
  settings,
  categories,
  sources,
  rows,
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
