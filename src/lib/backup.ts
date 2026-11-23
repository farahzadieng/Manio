import { z } from "zod";
import { all, atomicReplace, stores, DB_VERSION } from "./db";
import {
  schemas,
  type TableName,
  type Tables,
  type Transaction,
} from "./domain";
const backupSchema = z.object({
  format: z.literal("manio-backup"),
  version: z.literal(1),
  generatedAt: z.iso.datetime(),
  data: z.object({
    paymentSources: z.array(schemas.paymentSources),
    categories: z.array(schemas.categories),
    transactions: z.array(schemas.transactions),
    obligations: z.array(schemas.obligations),
    recurrenceRules: z.array(schemas.recurrenceRules),
    settings: z.array(schemas.settings),
    metadata: z.array(schemas.metadata),
  }),
});
export type Backup = z.infer<typeof backupSchema>;
export async function exportBackup(): Promise<Backup> {
  const data = {} as Backup["data"];
  for (const name of stores)
    (data as Record<TableName, Tables[TableName][]>)[name] = await all(name);
  return {
    format: "manio-backup",
    version: 1,
    generatedAt: new Date().toISOString(),
    data,
  };
}
export function validateBackup(raw: unknown): Backup {
  const b = backupSchema.parse(raw);
  if (b.data.metadata[0]?.schemaVersion > DB_VERSION)
    throw new Error("نسخه داده‌ها جدیدتر از برنامه است");
  if (b.data.settings.length !== 1 || b.data.metadata.length !== 1)
    throw new Error("تنظیمات یا فراداده پشتیبان ناقص است");
  const unique = (rows: { id: string }[]) => {
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error("شناسه تکراری در پشتیبان");
  };
  Object.values(b.data).forEach(unique);
  const categories = new Set(b.data.categories.map((x) => x.id));
  const sources = new Set(b.data.paymentSources.map((x) => x.id));
  for (const t of b.data.transactions) {
    if (
      !categories.has(t.categoryId) ||
      (t.paymentSourceId && !sources.has(t.paymentSourceId))
    )
      throw new Error("ارجاع تراکنش نامعتبر است");
  }
  const obligationIds = new Set(b.data.obligations.map((x) => x.id));
  const transactionIds = new Set(b.data.transactions.map((x) => x.id));
  const rules = new Set(b.data.recurrenceRules.map((x) => x.id));
  for (const o of b.data.obligations) {
    if (o.linkedTransactionId && !transactionIds.has(o.linkedTransactionId))
      throw new Error("تراکنش پیوندی نامعتبر است");
    if (o.recurrenceRuleId && !rules.has(o.recurrenceRuleId))
      throw new Error("قاعده تکرار نامعتبر است");
  }
  for (const r of b.data.recurrenceRules)
    if (!obligationIds.has(r.templateId))
      throw new Error("الگوی تکرار نامعتبر است");
  return b;
}
export async function importBackup(raw: unknown, mode: "replace" | "merge") {
  const b = validateBackup(raw);
  if (mode === "replace") {
    if (b.data.metadata[0].schemaVersion < DB_VERSION)
      b.data.metadata[0] = {
        ...b.data.metadata[0],
        schemaVersion: DB_VERSION,
        migratedAt: new Date().toISOString(),
      };
    await atomicReplace(b.data, "replace");
    return;
  }
  const current = await exportBackup();
  const additions = {} as Backup["data"];
  for (const name of stores) {
    const existing = new Set(current.data[name].map((x) => x.id));
    (additions as Record<TableName, Tables[TableName][]>)[name] = (
      b.data as Record<TableName, Tables[TableName][]>
    )[name].filter((row) => !existing.has(row.id));
  }
  const categoryIds = new Set(
    [...current.data.categories, ...additions.categories].map((x) => x.id),
  );
  const sourceIds = new Set(
    [...current.data.paymentSources, ...additions.paymentSources].map(
      (x) => x.id,
    ),
  );
  for (const t of additions.transactions) {
    if (
      !categoryIds.has(t.categoryId) ||
      (t.paymentSourceId && !sourceIds.has(t.paymentSourceId))
    )
      throw new Error("ارجاع تراکنش نامعتبر است");
  }
  await atomicReplace(additions, "merge");
}
const csvCell = (v: string) =>
  `"${(/^[=+\-@\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
export function transactionCSV(rows: Transaction[]) {
  const header = [
    "نوع",
    "مبلغ (تومان)",
    "تاریخ",
    "دسته",
    "منبع",
    "ضرورت",
    "یادداشت",
  ];
  return (
    "\uFEFF" +
    [
      header,
      ...rows.map((t) => [
        t.kind,
        t.amountTomans.toString(),
        t.date,
        t.categoryName,
        t.paymentSourceName || "",
        t.necessity || "",
        t.note,
      ]),
    ]
      .map((r) => r.map(csvCell).join(","))
      .join("\r\n")
  );
}
export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
