import { cachedSummary, clearPresentationCache } from "./rules.js";
import { dataRevision } from "../hierarchy.js";
let worker, sequence = 0;
const jobs = new Map();
export function clearSummaryCache() {
    clearPresentationCache();
    if (!jobs.size) {
        worker?.terminate();
        worker = undefined;
    }
}
export async function computeSummary(rows, query, now, history) {
    if (history.length < 1000 || typeof Worker === "undefined")
        return cachedSummary(rows, query, dataRevision(history), now, history);
    if (!worker) {
        worker = new Worker(new URL("./worker.js", import.meta.url), {
            type: "module",
        });
        worker.onmessage = (event) => {
            const job = jobs.get(event.data.id);
            if (!job)
                return;
            jobs.delete(event.data.id);
            if (event.data.model)
                job.resolve(event.data.model);
            else
                job.reject(new Error(event.data.error ?? "Summary unavailable"));
        };
        worker.onerror = () => {
            for (const job of jobs.values())
                job.reject(new Error("Background summary failed. Original evidence is preserved; reload to retry."));
            jobs.clear();
            worker?.terminate();
            worker = undefined;
        };
    }
    const id = ++sequence;
    return new Promise((resolve, reject) => {
        jobs.set(id, { resolve, reject });
        worker.postMessage({ id, rows, history, query, now });
    });
}
