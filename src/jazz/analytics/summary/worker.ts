import { cachedSummary } from "./rules.js";
import { dataRevision } from "../hierarchy.js";
import type { Evidence } from "../types.js";
import type { InsightsQuery } from "./types.js";
const scope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(value: unknown): void;
};
scope.onmessage = (
  event: MessageEvent<{
    id: number;
    rows: Evidence[];
    history: Evidence[];
    query: InsightsQuery;
    now: number;
  }>,
) => {
  const { id, rows, history, query, now } = event.data;
  try {
    const revision = dataRevision(history);
    scope.postMessage({
      id,
      model: cachedSummary(rows, query, revision, now, history),
    });
  } catch (error) {
    scope.postMessage({ id, error: String(error) });
  }
};
