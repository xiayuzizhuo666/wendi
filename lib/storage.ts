import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ReportDoc, ResearchRun } from "@/types";

interface WendiDB extends DBSchema {
  runs: {
    key: string;
    value: ResearchRun;
    indexes: { "by-updated": number };
  };
  reports: {
    key: string;
    value: ReportDoc;
    indexes: { "by-completed": number };
  };
}

let dbPromise: Promise<IDBPDatabase<WendiDB>> | null = null;

function getDb(): Promise<IDBPDatabase<WendiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WendiDB>("wendi", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("runs")) {
          const store = db.createObjectStore("runs", { keyPath: "id" });
          store.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("reports")) {
          const store = db.createObjectStore("reports", { keyPath: "id" });
          store.createIndex("by-completed", "meta.completedAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveRun(run: ResearchRun): Promise<void> {
  try {
    const db = await getDb();
    await db.put("runs", run);
  } catch {
    // The app remains usable if local storage is unavailable.
  }
}

export async function getRun(id: string): Promise<ResearchRun | undefined> {
  try {
    return await (await getDb()).get("runs", id);
  } catch {
    return undefined;
  }
}

export async function listRuns(): Promise<ResearchRun[]> {
  try {
    const db = await getDb();
    const runs = await db.getAll("runs");
    return runs.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deleteRun(id: string): Promise<void> {
  try {
    await (await getDb()).delete("runs", id);
  } catch {
    // Ignore.
  }
}

export async function saveReport(report: ReportDoc): Promise<void> {
  try {
    await (await getDb()).put("reports", report);
  } catch {
    // Ignore.
  }
}

export async function getReport(id: string): Promise<ReportDoc | undefined> {
  try {
    return await (await getDb()).get("reports", id);
  } catch {
    return undefined;
  }
}

export async function listReports(): Promise<ReportDoc[]> {
  try {
    const db = await getDb();
    const reports = await db.getAll("reports");
    return reports.sort((a, b) => b.meta.completedAt - a.meta.completedAt);
  } catch {
    return [];
  }
}

export async function deleteReport(id: string): Promise<void> {
  try {
    await (await getDb()).delete("reports", id);
  } catch {
    // Ignore.
  }
}

export async function clearAll(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear("runs");
    await db.clear("reports");
  } catch {
    // Ignore.
  }
}
