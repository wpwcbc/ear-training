const counts = ["focus", "scope", "k", "n", "noncorrect"];
const definitions = {
    "tentative-positive": {
        keys: ["focus", "k", "n", "days", "roots", "context", "sourceLabel"],
        en: (p) => `${p.focus}: ${p.k}/${p.n} ${p.sourceLabel} correct. A positive observation, not established mastery: ${p.days} ${Number(p.days) === 1 ? "local day" : "local days"}, roots ${p.roots}; ${p.context}.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 次${p.sourceLabel} correct。這是正向觀察，尚非已掌握：${p.days} 個本地日期，根音 ${p.roots}；${p.context}。`,
    },
    "tentative-difficulty": {
        keys: ["focus", "k", "n", "days", "roots", "context", "sourceLabel"],
        en: (p) => `${p.focus}: ${p.k}/${p.n} ${p.sourceLabel} correct. Worth checking with consistent settings, not an established weakness: ${p.days} local days, roots ${p.roots}; ${p.context}.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 次${p.sourceLabel} correct。值得用一致設定再確認，尚非確立弱項：${p.days} 個本地日期，根音 ${p.roots}；${p.context}。`,
    },
    "descriptive-peer": {
        keys: ["focus", "other", "k", "n", "otherK", "otherN", "sourceLabel"],
        en: (p) => `${p.focus}: ${p.k}/${p.n} ${p.sourceLabel} correct; ${p.other}: ${p.otherK}/${p.otherN}. Descriptive contrast only: settings or evidence do not support a like-for-like conclusion.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 次${p.sourceLabel} correct；${p.other}：${p.otherK}/${p.otherN}。僅為描述性對照：設定或證據尚不足以支持同條件結論。`,
    },
    "cross-quality": {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus}, ${p.k}/${p.n} first outcomes ${p.sourceLabel ?? "self-rated"} correct across the supported quality strata. This describes practised contexts, not every harmony.`,
        zh: (p) => `${p.scope}：${p.focus} 在通過檢查的和弦品質層中有 ${p.k}/${p.n} 次首次結果${p.sourceLabel ?? "自評"} correct；只描述已練情境，不代表所有和聲。`,
    },
    m1: {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus} was self-rated close/missed on ${p.noncorrect}/${p.n} questions (${p.k} correct).`,
        zh: (p) => `${p.scope}：${p.focus} 有 ${p.noncorrect}/${p.n} 題被你自評為 close/missed（${p.k} 題 correct）。`,
    },
    m2: {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus}, ${p.k}/${p.n} first ${p.component ?? "degree"} answers correct.`,
        zh: (p) => `${p.scope}：${p.focus} 首次 ${p.component ?? "degree"} 作答有 ${p.k}/${p.n} 題正確。`,
    },
    "m3-recognize": {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus}, ${p.k}/${p.n} role items correct in the one-item-per-sequence diagnostic sample. Sequence exactness is separate.`,
        zh: (p) => `${p.scope}：${p.focus} 在每段只取一項的診斷樣本中有 ${p.k}/${p.n} 個角色作答正確；整段全對另行統計。`,
    },
    "m3-produce": {
        keys: counts,
        en: (p) => `${p.focus}: ${p.noncorrect}/${p.n} sequences self-rated close/missed; this does not locate an individual chord.`,
        zh: (p) => `${p.focus} 有 ${p.noncorrect}/${p.n} 段被自評為 close/missed；不能定位到單一和弦。`,
    },
    m4: {
        keys: counts,
        en: (p) => `${p.focus}: ${p.noncorrect}/${p.n} assessed transitions self-rated close/missed. Ready does not measure pitch correctness.`,
        zh: (p) => `${p.focus}：${p.noncorrect}/${p.n} 次受評轉換被自評為 close/missed。Ready 不代表音高正確。`,
    },
    "m5-step": {
        keys: counts,
        en: (p) => `${p.focus}: ${p.k}/${p.n} assessed steps or pairs self-rated correct; a pair shares one rating.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 個受評步驟或音對自評 correct；音對共用一個評分。`,
    },
    "m5-run": {
        keys: counts,
        en: (p) => `${p.focus}: ${p.k}/${p.n} complete runs self-rated correct. Target occurrences are coverage, not note accuracy.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 次完整連奏自評 correct；目標音只代表曝光，不是逐音正確率。`,
    },
    "m6-whole": {
        keys: counts,
        en: (p) => `${p.focus}: ${p.k}/${p.n} whole activities self-rated correct; stage difficulty cannot be inferred.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 次整體活動自評 correct；不能推斷個別階段難度。`,
    },
    "m6-stage": {
        keys: counts,
        en: (p) => `${p.focus}: ${p.k}/${p.n} recorded stage assessments correct. Singing/playing ratings remain self-assessed; marking is scored separately.`,
        zh: (p) => `${p.focus}：${p.k}/${p.n} 次階段評分為 correct。唱奏仍是自評；標記結果另行計分。`,
    },
    "m7-mapping": {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus}, ${p.k}/${p.n} pre-reference locked positions matched exact MIDI. Physical playing is not measured.`,
        zh: (p) => `${p.scope}：${p.focus} 在參考音前鎖定的位置有 ${p.k}/${p.n} 次符合 exact MIDI；未量測實際演奏。`,
    },
    "m7-self": {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus}, ${p.k}/${p.n} physical practice outcomes self-rated correct, separately from diagram mapping.`,
        zh: (p) => `${p.scope}：${p.focus} 的實際演奏練習有 ${p.k}/${p.n} 次自評 correct，與圖上選位分開統計。`,
    },
    coverage: {
        keys: ["focus", "n"],
        en: (p) => `${p.focus}: ${p.n} independent diagnostic ${new Intl.PluralRules("en").select(Number(String(p.n).replace(/,/g, ""))) === "one" ? "question" : "questions"}. More observations needed; not a demonstrated weakness.`,
        zh: (p) => `${p.focus}：${p.n} 題獨立診斷觀察。需要更多資料；尚未顯示為弱項。`,
    },
    "coverage-unknown": {
        keys: ["focus", "rows"],
        en: (p) => `${p.focus}: ${p.rows} retained assessments; independent question identity or eligibility is unavailable. Inspect evidence or collect new observations.`,
        zh: (p) => `${p.focus}：保留 ${p.rows} 筆評分；缺少獨立題目身分或符合條件的資料。可查看證據或收集新觀察。`,
    },
    confusion: {
        keys: [
            "focus",
            "expected",
            "selected",
            "errors",
            "n",
            "component",
            "scope",
        ],
        en: (p) => `${p.scope}: when the expected ${p.component} was ${p.expected}, you selected ${p.selected} on ${p.errors}/${p.n} questions.`,
        zh: (p) => `${p.scope}：預期 ${p.component} 為 ${p.expected} 時，你有 ${p.errors}/${p.n} 題選了 ${p.selected}。`,
    },
    relative: {
        keys: [
            "focus",
            "other",
            "k",
            "n",
            "otherK",
            "otherN",
            "scope",
            "qualification",
            "sourceLabel",
        ],
        en: (p) => `${p.scope}: ${p.focus} had relatively more ${p.sourceLabel} correct outcomes (${p.k}/${p.n}) than ${p.other} (${p.otherK}/${p.otherN}) in matched practice. ${p.qualification}`,
        zh: (p) => `${p.scope}：相近條件下，${p.focus} 的${p.sourceLabel} correct（${p.k}/${p.n}）比 ${p.other}（${p.otherK}/${p.otherN}）相對較穩定。${p.qualification}`,
    },
    stable: {
        keys: counts,
        en: (p) => `${p.scope}: ${p.focus} was consistently ${p.sourceLabel ?? "self-rated"} correct (${p.k}/${p.n}) in this retained context.`,
        zh: (p) => `${p.scope}：${p.focus} 在此保留情境中持續${p.sourceLabel ?? "自評"} correct（${p.k}/${p.n}）。`,
    },
    trend: {
        keys: [
            "focus",
            "k",
            "n",
            "priorK",
            "priorN",
            "pp",
            "period",
            "sourceLabel",
        ],
        en: (p) => `${p.focus}: ${p.sourceLabel} outcomes changed from ${p.priorK}/${p.priorN} to ${p.k}/${p.n} (${p.pp} pp), ${p.period}, in the exact matched cohort.`,
        zh: (p) => `${p.focus}：在完全相符的情境中，${p.sourceLabel}結果由 ${p.priorK}/${p.priorN} 變為 ${p.k}/${p.n}（${p.pp} 個百分點），${p.period}。`,
    },
    tradeoff: {
        keys: ["focus", "priorSeconds", "seconds", "priorK", "priorN", "k", "n"],
        en: (p) => `${p.focus}: recorded response median shortened (${p.priorSeconds}s to ${p.seconds}s), but outcome rate fell (${p.priorK}/${p.priorN} to ${p.k}/${p.n}); this is a trade-off, not overall progress.`,
        zh: (p) => `${p.focus}：已記錄作答中位時間縮短（${p.priorSeconds} 秒至 ${p.seconds} 秒），但正確率下降（${p.priorK}/${p.priorN} 至 ${p.k}/${p.n}）；這是取捨，不能判定整體進步。`,
    },
    marks: {
        keys: ["focus", "hits", "selected", "expected", "phrases"],
        en: (p) => `${p.focus}: marking precision ${p.hits}/${p.selected}, recall ${p.hits}/${p.expected}, across ${p.phrases} independently identified phrases. Singing is not assessed by these marks.`,
        zh: (p) => `${p.focus}：目標音標記 precision ${p.hits}/${p.selected}、recall ${p.hits}/${p.expected}，來自 ${p.phrases} 個獨立辨識的片語；這些標記不評估唱奏。`,
    },
    legacy: {
        keys: ["focus", "k", "n"],
        en: (p) => `${p.focus}: first-try success on ${p.k}/${p.n} retained solved rows; unfinished questions were not included.`,
        zh: (p) => `${p.focus}：保留的已解答題目中首次即答對 ${p.k}/${p.n}；未完成題目未包含在內。`,
    },
    "legacy-progression": {
        keys: [],
        en: () => "These are chord exposures saved after a joint progression was solved; they cannot identify a weaker chord.",
        zh: () => "這些是整段答對後保存的和弦曝光紀錄；不能判斷哪一個和弦較弱。",
    },
    drone: {
        keys: [],
        en: () => "Practice activity not recorded yet.",
        zh: () => "目前未記錄可分析的練習活動。",
    },
};
export function renderTemplate(id, params, locale = "en") {
    const t = definitions[id];
    if (!t ||
        t.keys.some((k) => params[k] === undefined) ||
        Object.values(params).some((v) => typeof v !== "string" && (typeof v !== "number" || !Number.isFinite(v))))
        return null;
    const allowed = new Set([...t.keys, "component", "sourceLabel"]);
    if (Object.keys(params).some((k) => !allowed.has(k)))
        return null;
    const localized = { ...params };
    const format = new Intl.NumberFormat(locale === "zh-Hant" ? "zh-Hant" : "en", { maximumFractionDigits: 2 });
    for (const [key, value] of Object.entries(params))
        if (typeof value === "number")
            localized[key] = format.format(value);
    if (typeof params.scope === "string") {
        const [kind, ...rest] = params.scope.split(":"), value = rest.join(":");
        localized.scope =
            kind === "observed-roots"
                ? locale === "zh-Hant"
                    ? `在已練過的 ${value} 個根音中`
                    : `Across ${value} practised roots`
                : kind === "root"
                    ? locale === "zh-Hant"
                        ? `在 ${value} 根音情境`
                        : `At ${value}`
                    : locale === "zh-Hant"
                        ? `在已練情境（${value}）；尚未確立其他根音的表現`
                        : `In practised contexts (${value}); transfer is not established`;
    }
    if (locale === "zh-Hant") {
        if (params.sourceLabel)
            localized.sourceLabel =
                params.sourceLabel === "self-rated"
                    ? "自評"
                    : params.sourceLabel === "visually mapped"
                        ? "圖上選位"
                        : "記錄的";
        if (params.period)
            localized.period = "目前與之前各 28 天";
        if (params.context)
            localized.context =
                params.context === "matched"
                    ? "相同已知設定"
                    : params.context === "mixed-descriptive"
                        ? "混合設定，僅供描述"
                        : "設定不明";
        if (params.qualification)
            localized.qualification = "此比較中較不困難；兩者仍有練習空間。";
    }
    else if (params.context) {
        localized.context =
            params.context === "matched"
                ? "matched known settings"
                : params.context === "mixed-descriptive"
                    ? "mixed settings; descriptive only"
                    : "unknown settings";
    }
    return (locale === "zh-Hant" ? t.zh : t.en)(localized);
}
export function renderInsight(i, locale = "en") {
    const text = renderTemplate(i.templateId, i.params, locale);
    if (!text)
        return null;
    return ((i.certainty === "tentative"
        ? locale === "zh-Hant"
            ? "初步資料；尚不足以判斷規律。 "
            : "Tentative; too little evidence for a pattern. "
        : "") + text);
}
