import { normalize, legacyData } from "./adapters.js";
import type { Evidence } from "./types.js";
import { loadSessions, type Session } from "../model.js";
const stores = [
  "sessions",
  "questions",
  "events",
  "assessments",
  "imports",
  "drillPlans",
  "metadata",
] as const;
type Store = (typeof stores)[number];
const outboxKey = "jazzEarLab:insights:outbox";
export let persistenceError = "";
let connection: Promise<IDBDatabase> | undefined;
function failure(error: unknown) {
  persistenceError = `Insights could not save: ${String(error)}. Existing data is preserved. Export your data before closing.`;
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("insights-storage-error", { detail: persistenceError }),
    );
}
function open(): Promise<IDBDatabase> {
  return (connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("earTrainingInsights", 1);
    request.onupgradeneeded = () =>
      stores.forEach((name) => {
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name, { keyPath: "id" });
      });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      connection = undefined;
      reject(new Error("Close older Insights tabs and retry."));
    };
  }));
}
export async function readAll<T>(store: Store): Promise<T[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function put(store: Store, value: { id: string }): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite"),
      target = tx.objectStore(store);
    if (["events", "assessments", "questions"].includes(store)) {
      const previous = target.get(value.id);
      previous.onsuccess = () => {
        if (!previous.result) target.add(value);
      };
    } else target.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
interface Envelope {
  id: string;
  store: Store;
  value: { id: string };
}
function pending(): Envelope[] {
  const parsed: unknown = JSON.parse(localStorage.getItem(outboxKey) ?? "[]");
  if (!Array.isArray(parsed))
    throw new Error("Invalid Insights outbox; export before repair.");
  return parsed;
}
let draining: Promise<void> | undefined;
export function flush(): Promise<void> {
  return (draining ??= (async () => {
    try {
      for (const row of pending()) {
        await put(row.store, row.value);
        localStorage.setItem(
          outboxKey,
          JSON.stringify(pending().filter((p) => p.id !== row.id)),
        );
      }
      await put("metadata", {
        id: "last-save",
        ...{ at: new Date().toISOString() },
      });
      persistenceError = "";
    } catch (error) {
      failure(error);
    } finally {
      draining = undefined;
    }
  })());
}
export function enqueue(store: Store, value: { id: string }): void {
  try {
    const id = store + ":" + value.id,
      rows = pending();
    localStorage.setItem(
      outboxKey,
      JSON.stringify([
        ...rows.filter((r) => r.id !== id),
        { id, store, value },
      ]),
    );
    void flush().then(() => {
      if (!persistenceError && pending().length) void flush();
    });
  } catch (error) {
    failure(error);
  }
}
export function captureAssessment(session: Session, index: number): void {
  try {
    const evidence = normalize(session, session.records[index], index);
    enqueue("events", {
      id: evidence.id + ":submitted",
      ...{
        schemaVersion: 2,
        type:
          evidence.source === "self"
            ? "self_grade_submitted"
            : "answer_committed",
        sessionId: session.id,
        questionId: evidence.questionId,
        occurredAt: evidence.createdAt,
        assessment: evidence,
      },
    });
    enqueue("assessments", evidence);
  } catch (error) {
    failure(error);
  }
}
export async function reconcile(sessions: Session[]): Promise<Evidence[]> {
  await flush();
  const imports = await readAll<{ id: string; suppressedIds?: string[] }>(
    "imports",
  );
  const initial = !imports.some((i) => i.id === "historical-v1");
  const existing = await readAll<Evidence>("assessments"),
    ids = new Set(existing.map((e) => e.id));
  const suppressed = new Set(
    imports.find((i) => i.id === "historical-v1")?.suppressedIds ?? [],
  );
  // Completed submission events can rebuild the disposable assessment projection.
  for (const event of await readAll<{ assessment?: Evidence }>("events"))
    if (
      event.assessment &&
      !ids.has(event.assessment.id) &&
      !suppressed.has(event.assessment.id)
    ) {
      await put("assessments", event.assessment);
      existing.push(event.assessment);
      ids.add(event.assessment.id);
    }
  let quarantined = 0;
  for (const session of sessions)
    for (let i = 0; i < session.records.length; i++) {
      const record = session.records[i];
      if (!initial && !record.analytics) continue;
      try {
        const row = normalize(session, record, i);
        if (!ids.has(row.id) && !suppressed.has(row.id)) {
          await put("assessments", row);
          existing.push(row);
          ids.add(row.id);
        }
      } catch {
        quarantined++;
      }
    }
  let sourceError = "";
  if (initial) {
    try {
      const raw = JSON.parse(
        localStorage.getItem("jazzEarLab:v1:sessions") ?? "[]",
      );
      if (!Array.isArray(raw)) throw new Error("Unsupported session history");
      quarantined += raw.filter(
        (s) => !s || !Array.isArray(s.records) || typeof s.id !== "string",
      ).length;
    } catch (error) {
      sourceError = String(error);
    }
  }
  if (initial)
    await put("imports", {
      id: "historical-v1",
      ...{
        schemaVersion: 1,
        at: new Date().toISOString(),
        quarantined,
        sourceError,
        legacy: legacyData(localStorage),
        raw: localStorage.getItem("jazzEarLab:v1:sessions"),
      },
    });
  return existing;
}
export async function exportData(): Promise<string> {
  const data: Record<string, unknown> = {
    format: "earTrainingInsights",
    version: 1,
  };
  for (const name of stores) data[name] = await readAll(name);
  data.outbox = pending();
  return JSON.stringify(data, null, 2);
}
export async function importData(text: string): Promise<void> {
  const data = JSON.parse(text);
  if (data.format !== "earTrainingInsights" || data.version !== 1)
    throw new Error("Unsupported export. Existing data preserved.");
  for (const name of stores)
    if (
      !Array.isArray(data[name]) ||
      data[name].some((r: { id?: unknown }) => !r || typeof r.id !== "string")
    )
      throw new Error("Invalid " + name);
  for (const row of data.assessments) {
    if (
      row.schemaVersion !== 2 ||
      !row.record ||
      !row.config ||
      !row.capabilities ||
      !row.sessionId ||
      !row.session ||
      !["historical", "standard"].includes(row.version)
    )
      throw new Error("Invalid assessment schema");
    normalize(row.session, row.record, row.rawSource?.index ?? 0);
  }
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([...stores], "readwrite");
    for (const name of stores)
      for (const row of data[name]) {
        const target = tx.objectStore(name),
          read = target.get(row.id);
        read.onsuccess = () => {
          if (!read.result) target.add(row);
        };
      }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  if (Array.isArray(data.outbox))
    for (const row of data.outbox)
      if (stores.includes(row.store) && typeof row.value?.id === "string")
        enqueue(row.store, row.value);
}
export async function clearInsights(): Promise<void> {
  await flush();
  const db = await open();
  const suppressedIds = loadSessions(localStorage).flatMap((s) =>
    s.records.map((r, i) => r.analytics?.id ?? `v1:${s.id}:${i}`),
  );
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([...stores], "readwrite");
    stores.forEach((s) => tx.objectStore(s).clear());
    tx.objectStore("imports").put({
      id: "historical-v1",
      clearedAt: new Date().toISOString(),
      suppressedIds,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  localStorage.setItem(outboxKey, "[]");
}
