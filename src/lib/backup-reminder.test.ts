import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { closeForTests, get, initialize, put, reset } from "./db";
import {
  claimBackupReminder,
  gregorianMonth,
  shouldRemindBackup,
} from "./backup-reminder";

beforeEach(async () => {
  await closeForTests();
  await reset();
  await initialize();
});

describe("monthly backup reminder", () => {
  it("uses local Gregorian months and respects backups", async () => {
    const settings = { ...(await get("settings", "main"))!, onboarded: true };
    expect(gregorianMonth(new Date(2026, 0, 1))).toBe("2026-01");
    expect(shouldRemindBackup(settings, new Date(2026, 0, 1))).toBe(true);
    expect(
      shouldRemindBackup(
        { ...settings, lastBackupAt: "2026-01-02T12:00:00.000Z" },
        new Date(2026, 0, 4),
      ),
    ).toBe(false);
    expect(shouldRemindBackup(settings, new Date(2026, 1, 1))).toBe(true);
  });

  it("claims once per month, then allows the next month", async () => {
    await put("settings", {
      ...(await get("settings", "main"))!,
      onboarded: true,
    });
    expect(await claimBackupReminder(new Date(2026, 0, 1))).toMatchObject({
      lastBackupReminderMonth: "2026-01",
    });
    expect(await claimBackupReminder(new Date(2026, 0, 15))).toBeNull();
    expect(await claimBackupReminder(new Date(2026, 1, 1))).toMatchObject({
      lastBackupReminderMonth: "2026-02",
    });
    expect((await get("settings", "main"))?.lastBackupReminderMonth).toBe(
      "2026-02",
    );
  });
});
