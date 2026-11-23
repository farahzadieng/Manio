import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { closeForTests, initialize, get, put, all, reset, db } from "./db";
import { exportBackup, validateBackup, importBackup } from "./backup";
import { seedDemo } from "./demo";
beforeEach(async () => {
  await closeForTests();
  await reset();
  await initialize();
});
describe("storage and backup", () => {
  it("upgrades a version-one database without deleting records", async () => {
    await closeForTests();
    await new Promise<void>((resolve, reject) => {
      const drop = indexedDB.deleteDatabase("manio-local");
      drop.onsuccess = () => resolve();
      drop.onerror = () => reject(drop.error);
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("manio-local", 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore("settings", { keyPath: "id" });
      };
      open.onsuccess = () => {
        const tx = open.result.transaction("settings", "readwrite");
        tx.objectStore("settings").put({
          id: "main",
          theme: "dark",
          onboarded: true,
          demo: false,
          lastBackupAt: null,
          currency: "toman",
        });
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
    const upgraded = await db();
    expect(upgraded.version).toBe(4);
    expect((await get("settings", "main"))?.theme).toBe("dark");
    expect(upgraded.objectStoreNames.contains("transactions")).toBe(true);
  });
  it("migrates version-two transactions to unstarred without losing them", async () => {
    await closeForTests();
    await new Promise<void>((resolve, reject) => {
      const drop = indexedDB.deleteDatabase("manio-local");
      drop.onsuccess = () => resolve();
      drop.onerror = () => reject(drop.error);
    });
    const transaction = {
      id: "10000000-0000-4000-8000-000000000123",
      kind: "expense",
      amountTomans: 40000,
      date: "2026-11-19",
      categoryId: "10000000-0000-4000-8000-000000000124",
      categoryName: "خوراک",
      categoryEmoji: "🍽️",
      paymentSourceId: null,
      paymentSourceName: null,
      necessity: "necessary",
      note: "",
      createdAt: "2026-11-19T00:00:00.000Z",
      updatedAt: "2026-11-19T00:00:00.000Z",
    };
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("manio-local", 2);
      open.onupgradeneeded = () =>
        open.result.createObjectStore("transactions", { keyPath: "id" });
      open.onsuccess = () => {
        const tx = open.result.transaction("transactions", "readwrite");
        tx.objectStore("transactions").put(transaction);
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
    expect((await all("transactions"))[0]).toMatchObject({
      ...transaction,
      starred: false,
    });
  });
  it("adds reminder state to a version-three database without changing settings", async () => {
    await closeForTests();
    await new Promise<void>((resolve, reject) => {
      const drop = indexedDB.deleteDatabase("manio-local");
      drop.onsuccess = () => resolve();
      drop.onerror = () => reject(drop.error);
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("manio-local", 3);
      open.onupgradeneeded = () =>
        open.result.createObjectStore("settings", { keyPath: "id" });
      open.onsuccess = () => {
        const tx = open.result.transaction("settings", "readwrite");
        tx.objectStore("settings").put({
          id: "main",
          theme: "dark",
          onboarded: true,
          demo: false,
          lastBackupAt: null,
          currency: "toman",
        });
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
    expect(await get("settings", "main")).toMatchObject({
      theme: "dark",
      lastBackupReminderMonth: null,
    });
  });
  it("persists CRUD and resets", async () => {
    const s = (await get("settings", "main"))!;
    await put("settings", { ...s, theme: "dark" });
    expect((await get("settings", "main"))?.theme).toBe("dark");
    await reset();
    expect(await all("settings")).toEqual([]);
  });
  it("loads demo once, with searchable notes and multiple months", async () => {
    await seedDemo();
    expect(
      (await all("transactions")).some((t) => t.note.includes("VPN")),
    ).toBe(true);
    expect(
      new Set((await all("transactions")).map((t) => t.date.slice(0, 7))).size,
    ).toBeGreaterThanOrEqual(3);
    await expect(seedDemo()).rejects.toThrow();
  });
  it("round trips and rejects malformed references before mutation", async () => {
    await seedDemo();
    const b = await exportBackup();
    expect(
      validateBackup(JSON.parse(JSON.stringify(b))).data.transactions,
    ).toHaveLength(b.data.transactions.length);
    const invalid = structuredClone(b);
    invalid.data.transactions[0].categoryId = crypto.randomUUID();
    await expect(importBackup(invalid, "replace")).rejects.toThrow();
    expect(await all("transactions")).toHaveLength(b.data.transactions.length);
  });
  it("deduplicates merge collisions without mutation", async () => {
    await seedDemo();
    const b = await exportBackup();
    await importBackup(b, "merge");
    expect(await all("transactions")).toHaveLength(b.data.transactions.length);
  });
  it("imports a version-two backup with unstarred transactions", async () => {
    await seedDemo();
    const old = structuredClone(await exportBackup());
    old.data.metadata[0].schemaVersion = 2;
    delete (old.data.settings[0] as Partial<(typeof old.data.settings)[0]>)
      .lastBackupReminderMonth;
    for (const row of old.data.transactions)
      delete (row as Partial<typeof row>).starred;
    await importBackup(old, "replace");
    expect(
      (await all("transactions")).every((row) => row.starred === false),
    ).toBe(true);
    expect((await get("metadata", "main"))?.schemaVersion).toBe(4);
  });
});
