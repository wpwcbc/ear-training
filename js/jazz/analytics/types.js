export function stable(value) {
    if (Array.isArray(value))
        return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object")
        return ("{" +
            Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
                .join(",") +
            "}");
    return JSON.stringify(value) ?? "null";
}
export function hash(value) {
    let n = 2166136261;
    for (const c of stable(value))
        n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return (n >>> 0).toString(16);
}
export function task(config) {
    switch (config.mode) {
        case "m2":
            return config.showChords ? "visible" : "hidden";
        case "m3":
            return config.commonMode;
        case "m5":
            return config.runMode + "-" + config.targetPattern;
        case "m7":
            return config.bassTask;
        case "m6":
            return "whole-activity";
        default:
            return config.mode === "m4" ? config.revealMode : "produce";
    }
}
export function grain(config) {
    return config.mode === "m3"
        ? "sequence"
        : config.mode === "m4"
            ? "transition"
            : config.mode === "m5"
                ? config.runMode === "continuous"
                    ? "run"
                    : config.targetPattern === "two"
                        ? "target-pair"
                        : "transition"
                : config.mode === "m6"
                    ? "run"
                    : "answer";
}
export function analyticsCohortKey(config, material, source, exposure, version, options) {
    const normalized = { ...config };
    for (const key of ["volume", "count", "autoAdvance", "prepareSeconds"])
        delete normalized[key];
    return stable({
        version: 1,
        config: normalized,
        material,
        source,
        exposure,
        timing: version,
        options,
    });
}
