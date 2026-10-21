import { cachedSummary } from "./rules.js";
import { dataRevision } from "../hierarchy.js";
const scope = self;
scope.onmessage = (event) => {
    const { id, rows, history, query, now } = event.data;
    try {
        const revision = dataRevision(history);
        scope.postMessage({
            id,
            model: cachedSummary(rows, query, revision, now, history),
        });
    }
    catch (error) {
        scope.postMessage({ id, error: String(error) });
    }
};
