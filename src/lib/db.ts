import {
  schemas,
  settingsSchema,
  type Tables,
  type TableName,
  type Metadata,
} from "./domain";
const NAME = "manio-local";
export const DB_VERSION = 6;
export const stores: TableName[] = [
  "paymentSources",
  "categories",
  "transactions",
  "obligations",
  "recurrenceRules",
  "settings",
  "metadata",
  "analyses",
];
let connection: Promise<IDBDatabase> | null = null;
export function db(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const d = request.result;
        for (const name of stores)
          if (!d.objectStoreNames.contains(name))
            d.createObjectStore(name, { keyPath: "id" });
        const tx = request.transaction!;
        const index = (table: TableName, name: string, key: string) => {
          const s = tx.objectStore(table);
          if (!s.indexNames.contains(name)) s.createIndex(name, key);
        };
        index("transactions", "date", "date");
        index("transactions", "kind", "kind");
        index("transactions", "categoryId", "categoryId");
        index("transactions", "paymentSourceId", "paymentSourceId");
        index("obligations", "dueDate", "dueDate");
        index("obligations", "status", "status");
        index("recurrenceRules", "templateId", "templateId");
        if (event.oldVersion < 3) {
          const cursor = tx.objectStore("transactions").openCursor();
          cursor.onsuccess = () => {
            const current = cursor.result;
            if (!current) return;
            if (typeof current.value.starred !== "boolean")
              current.update({ ...current.value, starred: false });
            current.continue();
          };
        }
        if (event.oldVersion < 6) {
          const settings = tx.objectStore("settings");
          const cursor = settings.openCursor();
          cursor.onsuccess = () => {
            const current = cursor.result;
            if (!current) return;
            current.update(settingsSchema.parse(current.value));
            current.continue();
          };
        }
        if (event.oldVersion < 5) {
          const sources = tx.objectStore("paymentSources");
          const sourceCursor = sources.openCursor();
          sourceCursor.onsuccess = () => {
            const current = sourceCursor.result;
            if (!current) return;
            if (!/^#[0-9a-fA-F]{6}$/.test(current.value.color || ""))
              current.update({ ...current.value, color: "#285646" });
            current.continue();
          };
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = null;
        reject(new Error("پایگاه داده در زبانه دیگری باز است"));
      };
    });
  return connection;
}
function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("تراکنش لغو شد"));
  });
}
function result<T>(r: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function all<K extends TableName>(name: K): Promise<Tables[K][]> {
  const d = await db();
  return result(d.transaction(name).objectStore(name).getAll());
}
export async function get<K extends TableName>(
  name: K,
  id: string,
): Promise<Tables[K] | undefined> {
  const d = await db();
  return result(d.transaction(name).objectStore(name).get(id));
}
export async function put<K extends TableName>(name: K, value: Tables[K]) {
  const valid = schemas[name].parse(value);
  const d = await db();
  const tx = d.transaction(name, "readwrite");
  tx.objectStore(name).put(valid);
  await done(tx);
}
export async function remove(name: TableName, id: string) {
  const d = await db();
  const tx = d.transaction(name, "readwrite");
  tx.objectStore(name).delete(id);
  await done(tx);
}
export async function atomicReplace(
  data: Partial<{ [K in TableName]: Tables[K][] }>,
  mode: "replace" | "merge",
) {
  for (const name of stores)
    for (const row of data[name] || []) schemas[name].parse(row);
  const d = await db();
  const tx = d.transaction(stores, "readwrite");
  for (const name of stores) {
    const s = tx.objectStore(name);
    if (mode === "replace") s.clear();
    for (const row of data[name] || []) s.put(row);
  }
  await done(tx);
}
export async function reset() {
  const d = await db();
  const tx = d.transaction(stores, "readwrite");
  for (const name of stores) tx.objectStore(name).clear();
  await done(tx);
}
export async function initialize() {
  const s = await get("settings", "main");
  if (!s) {
    const settings = settingsSchema.parse({
      id: "main",
      theme: "system",
      onboarded: false,
      demo: false,
      lastBackupAt: null,
      lastBackupReminderMonth: null,
      currency: "toman",
    });
    await put("settings", settings);
  }
  const m = await get("metadata", "main");
  if (!m) {
    const metadata: Metadata = {
      id: "main",
      schemaVersion: DB_VERSION,
      seedProvenance: null,
      migratedAt: new Date().toISOString(),
    };
    await put("metadata", metadata);
  } else if (m.schemaVersion < DB_VERSION)
    await put("metadata", {
      ...m,
      schemaVersion: DB_VERSION,
      migratedAt: new Date().toISOString(),
    });
}
export async function closeForTests() {
  const old = connection;
  connection = null;
  if (old) (await old).close();
}
