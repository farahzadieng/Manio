import { db } from "./db";
import { settingsSchema, type Settings } from "./domain";

export function gregorianMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shouldRemindBackup(settings: Settings, now = new Date()) {
  const month = gregorianMonth(now);
  return (
    settings.onboarded &&
    settings.lastBackupReminderMonth !== month &&
    (!settings.lastBackupAt ||
      gregorianMonth(new Date(settings.lastBackupAt)) !== month)
  );
}

// Claim the monthly reminder in one IndexedDB transaction so two open tabs
// cannot both display it.
export async function claimBackupReminder(now = new Date()) {
  const database = await db();
  return new Promise<Settings | null>((resolve, reject) => {
    const tx = database.transaction("settings", "readwrite");
    const store = tx.objectStore("settings");
    let claimed: Settings | null = null;
    const request = store.get("main");
    request.onsuccess = () => {
      if (!request.result) return;
      const current = settingsSchema.parse(request.result);
      if (!shouldRemindBackup(current, now)) return;
      claimed = {
        ...current,
        lastBackupReminderMonth: gregorianMonth(now),
      };
      store.put(claimed);
    };
    tx.oncomplete = () => resolve(claimed);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
