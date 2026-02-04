const CADENCES = {
    major: {
        diatonic: [
            { degree: "2", quality: "m7" },
            { degree: "5", quality: "7" },
        ],
        secondaryMajorIIV: [
            { degree: "2", quality: "m7" },
            { degree: "5", quality: "7" },
        ],
        secondaryMinorIIVb9: [
            { degree: "2", quality: "m7b5" },
            { degree: "5", quality: "7b9" },
        ],
        tritoneSubs: [
            { degree: "2", quality: "m7" },
            { degree: "b2", quality: "7" },
        ],
        backdoor: [
            { degree: "4", quality: "m7" },
            { degree: "b7", quality: "7" },
        ],
        borrowed: [
            { degree: "b6", quality: "maj7" },
            { degree: "b7", quality: "7" },
        ],
    },
    minor: {
        diatonic: [
            { degree: "2", quality: "m7" },
            { degree: "5", quality: "7" },
        ],
        secondaryMajorIIV: [
            { degree: "2", quality: "m7" },
            { degree: "5", quality: "7" },
        ],
        secondaryMinorIIVb9: [
            { degree: "2", quality: "m7b5" },
            { degree: "5", quality: "7b9" },
        ],
        tritoneSubs: [
            { degree: "2", quality: "m7" },
            { degree: "b2", quality: "7" },
        ],
        backdoor: [
            { degree: "4", quality: "m7" },
            { degree: "b7", quality: "7" },
        ],
        borrowed: [
            { degree: "b6", quality: "maj7" },
            { degree: "b7", quality: "7" },
        ],
    },
};
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
const buildCadencePool = (config) => {
    const pool = [];
    if (config.substitutions.secondaryMajorIIV) {
        pool.push("secondaryMajorIIV");
    }
    if (config.substitutions.secondaryMinorIIVb9) {
        pool.push("secondaryMinorIIVb9");
    }
    if (config.substitutions.tritoneSubs) {
        pool.push("tritoneSubs");
    }
    if (config.substitutions.backdoor) {
        pool.push("backdoor");
    }
    if (config.substitutions.borrowed) {
        pool.push("borrowed");
    }
    if (!pool.length) {
        pool.push("diatonic");
    }
    return pool;
};
const getTonic = (mode) => mode === "major"
    ? { degree: "1", quality: "maj7" }
    : { degree: "6", quality: "m7" };
export const buildProgression = (config) => {
    const cadencePool = buildCadencePool(config);
    const cadence = pickRandom(cadencePool);
    const tonic = getTonic(config.mode);
    const middle = CADENCES[config.mode][cadence] ?? CADENCES[config.mode].diatonic;
    return [tonic, ...middle, tonic];
};
export const qualityLabel = (quality) => quality;
