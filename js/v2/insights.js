import { metrics, targetsFor, editableConfig, validate as validateSingle } from './model.js';
import { pitchClass, parseChord } from '../jazz/theory.js';
import { exerciseNames } from './exercise-names.js';
import { validate as validateProgression } from './progression.js';
export const insightKeys = 'C C# D Eb E F F# G Ab A Bb B'.split(' ');
export function insightRoot(root) { try {
    return insightKeys[pitchClass(root)];
}
catch {
    return root;
} }
function timestamp(value) { if (typeof value !== 'string' || !value.trim())
    return null; const n = Date.parse(value); return Number.isFinite(n) ? n : null; }
export function insightRecords(sessions, runs, progression) {
    const metadata = new Map(runs.flatMap(run => run.questions.flatMap(q => q.notes.map(n => [n.id, { run, q }]))));
    const parents = new Map(sessions.map(s => [s.id, s]));
    const seen = new Set();
    return [...sessions.flatMap(s => s.attempts), ...progression].filter(a => {
        if (seen.has(a.id) || !(a.exercise in exerciseNames))
            return false;
        seen.add(a.id);
        return true;
    }).map(a => {
        const data = metadata.get(a.id), parent = parents.get(a.sessionId), q = data?.q;
        const exact = timestamp(q?.created), completed = timestamp(a.completedAt), started = timestamp(parent?.startedAt);
        const context = a.exercise.startsWith('progression-') ? 'Progression' : 'Single Chord';
        const root = insightRoot(a.target.chord.root);
        return { a, questionId: q?.id ?? a.questionId, sessionId: a.sessionId,
            time: exact ?? completed ?? started, dateSource: exact !== null ? 'question' : completed !== null ? 'completion' : started !== null ? 'session' : 'unknown',
            family: a.exercise.includes('play-by-ear') ? 'Play by Ear' : (a.exercise === 'm2' || a.exercise === 'progression-recognition') ? 'Degree Recognition' : 'Degree Audiation',
            context, key: context === 'Progression' && q?.practiceKey && insightKeys.includes(q.practiceKey) ? q.practiceKey : null,
            root, quality: a.target.chord.quality, chord: root + a.target.chord.quality, degree: a.target.degree,
            href: data ? `#progression/${data.run.config.mode}/results/${encodeURIComponent(data.run.id)}` : '#results/' + a.sessionId,
            source: q?.source ?? q?.config ?? a.configurationSnapshot, question: q,
            sourceKnown: !q || context === 'Single Chord' || !!q.source,
            generator: q ? (q.generatorVersion ?? null) : (a.target.generatorVersion ?? null),
            timing: q ? (q.completionTimingVersion ?? null) : (a.timingVersion ?? null),
            exposure: q ? (q.notes.find(n => n.id === a.id)?.exposure ?? null) : (a.exposure ?? null),
        };
    });
}
export function insightStats(records) {
    const unique = [...new Map(records.map(r => [r.a.id, r])).values()];
    return { ...metrics(unique.map(r => r.a)), questions: new Set(unique.map(r => r.questionId)).size, sessions: new Set(unique.map(r => r.sessionId)).size };
}
export function insightPeriod(days, now = new Date()) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
    const previous = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2 * days + 1);
    return { start: start.getTime(), end: end.getTime(), previous: previous.getTime() };
}
export function insightFilter(records, filters) {
    return records.filter(r => Object.entries(filters).every(([dimension, value]) => !value || (r[dimension] ?? 'Not recorded') === value));
}
export function insightGroups(records, dimension) {
    const groups = new Map();
    for (const r of records) {
        const label = dimension === 'degree' ? r.quality + ' / ' + r.degree : r[dimension] ?? 'Not recorded';
        const group = groups.get(label) ?? [];
        group.push(r);
        groups.set(label, group);
    }
    return [...groups].map(([label, items]) => ({ label, items, m: insightStats(items) }));
}
function stable(value) {
    if (Array.isArray(value))
        return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}';
    return JSON.stringify(value) ?? 'null';
}
function sourceConditions(r) {
    const c = r.source;
    if ('mode' in c)
        return { mode: c.mode, chords: r.context === 'Progression' ? c.chords : null, roots: c.roots?.slice().sort(), qualities: c.qualities?.slice().sort(), bpm: c.bpm, notes: c.notes, pools: Object.entries(c.pools).sort(([a], [b]) => a.localeCompare(b)).map(([q, p]) => [q, p?.slice().sort()]), levels: c.levels, volume: c.volume, keyMode: c.keyMode ?? 'fixed', keyPool: c.keyMode === 'random' ? c.keyPool?.slice().sort() : null };
    return { roots: c.roots.slice().sort(), qualities: c.qualities.slice().sort(), pools: c.qualities.slice().sort().map(q => [q, targetsFor(c, q).slice().sort()]), context: c.context, levels: c.voiceLevels ?? [1, 1, 1, 1, 1], volume: c.volume, autoAdvance: c.autoAdvance ?? true };
}
export function insightStratum(r, byKey = false) {
    if (!r.generator || !r.sourceKnown || !r.exposure || r.dateSource === 'unknown' || r.context === 'Progression' && !r.key || r.context === 'Single Chord' && r.family !== 'Play by Ear' && !r.timing)
        return null;
    const c = r.source;
    if ('mode' in c && (!Array.isArray(c.levels) || !Number.isFinite(c.bpm) || r.context === 'Progression' && (!c.keyMode || (c.keyMode === 'random' && !c.keyPool))))
        return null;
    return stable({ exercise: r.a.exercise, grading: r.a.gradingSource, method: r.a.responseMethod, exposure: r.exposure, generator: r.generator, timing: r.context === 'Single Chord' && r.family !== 'Play by Ear' ? r.timing : null, date: r.dateSource, conditions: sourceConditions(r), key: r.context === 'Progression' && !byKey ? r.key : null, root: r.context === 'Single Chord' && !byKey ? r.root : null });
}
export function insightEligible(records) { const m = insightStats(records); return m.n >= 20 && m.questions >= 10 && m.sessions >= 3; }
export function insightConditionLabel(r) {
    const c = r.source;
    if ('mode' in c)
        return `${r.context === 'Progression' ? c.chords.map(x => x.symbol + ' (' + x.beats + ' beats)').join(' → ') : (c.roots ?? []).join(', ') + ' · ' + (c.qualities ?? []).join(', ')} · ${c.bpm} BPM · ${c.notes} notes/chord · ${c.keyMode === 'random' ? 'Random: ' + c.keyPool?.join(', ') : 'Fixed ' + (r.key ?? 'key not recorded')}`;
    return `${c.roots.join(', ')} · ${c.qualities.join(', ')} · ${c.qualities.map(q => q + ': ' + targetsFor(c, q).join(', ')).join('; ')} · Context ${c.context ? 'on' : 'off'} · ${r.a.responseMethod}`;
}
export function insightPriorities(records, baselineId = '', filters = {}) {
    const strata = new Map();
    for (const r of records) {
        const k = insightStratum(r);
        if (k) {
            const group = strata.get(k) ?? [];
            group.push(r);
            strata.set(k, group);
        }
    }
    let candidates = [];
    const eligibleStrata = [];
    for (const items of strata.values()) {
        const groups = new Map();
        for (const r of items) {
            const options = [{ quality: r.quality }, { chord: r.chord }, { quality: r.quality, degree: r.degree }, { chord: r.chord, degree: r.degree }, ...(r.key ? [{ key: r.key }, { key: r.key, chord: r.chord, degree: r.degree }] : [])];
            for (const filters of options) {
                const k = stable(filters), g = groups.get(k) ?? { filters, items: [], label: Object.entries(filters).map(([key, value]) => value + (key === 'key' ? ' key' : '')).join(' · '), specificity: Object.keys(filters).length };
                g.items.push(r);
                groups.set(k, g);
            }
        }
        const qualified = [...groups.values()].filter(g => insightEligible(g.items) && g.items.filter(r => r.a.firstCorrect === false).length >= 3 && new Set(g.items.filter(r => r.a.firstCorrect === false).map(r => r.sessionId)).size >= 2).map(g => ({ ...g, m: insightStats(g.items), kind: 'error', basis: g.items[0] }));
        if (qualified.length)
            eligibleStrata.push({ items, candidates: qualified });
    }
    eligibleStrata.sort((a, b) => Math.max(...b.items.map(r => r.time ?? 0)) - Math.max(...a.items.map(r => r.time ?? 0)) || insightStats(b.items).n - insightStats(a.items).n);
    const usedErrors = new Set();
    candidates = (eligibleStrata[0]?.candidates ?? []).sort((a, b) => b.specificity - a.specificity).filter(c => { const k = c.items.filter(r => r.a.firstCorrect === false).map(r => r.a.id).sort().join('|'); if (usedErrors.has(k))
        return false; usedErrors.add(k); return true; });
    candidates.sort((a, b) => (b.m.n - b.m.correct) / b.m.n - (a.m.n - a.m.correct) / a.m.n || (b.m.n - b.m.correct) - (a.m.n - a.m.correct) || b.m.n - a.m.n || a.label.localeCompare(b.label));
    const setups = new Map();
    for (const r of records.filter(r => r.sourceKnown).sort((a, b) => (b.time ?? 0) - (a.time ?? 0))) {
        const k = stable(sourceConditions(r));
        if (!setups.has(k))
            setups.set(k, r);
    }
    const baselines = [...setups.values()], baseline = baselines.find(r => r.a.id === baselineId) ?? baselines[0];
    const gaps = [];
    if (baseline) {
        const setupRows = records.filter(r => stable(sourceConditions(r)) === stable(sourceConditions(baseline))), c = baseline.source;
        const dimension = baseline.context === 'Progression' ? 'key' : 'root';
        const pool = 'mode' in c ? (baseline.context === 'Progression' ? (c.keyMode === 'random' ? c.keyPool : baseline.key ? [baseline.key] : []) : c.roots) : c.roots;
        for (const name of pool ?? []) {
            if (filters[dimension] && filters[dimension] !== name)
                continue;
            const items = insightFilter(setupRows, { [dimension]: name });
            if (!insightEligible(items))
                gaps.push({ label: name + (dimension === 'key' ? ' key' : ' root'), items, m: insightStats(items), filters: { [dimension]: name }, kind: 'gap', basis: baseline, specificity: 1 });
        }
        const qualities = 'mode' in c ? (baseline.context === 'Progression' ? [...new Set(setupRows.map(r => r.quality))] : c.qualities) : c.qualities;
        for (const quality of qualities ?? []) {
            if (filters.quality && filters.quality !== quality || filters.chord && parseChord(filters.chord).quality !== quality)
                continue;
            const items = setupRows.filter(r => r.quality === quality);
            if (!insightEligible(items))
                gaps.push({ label: quality + ' chords', items, m: insightStats(items), filters: { quality }, kind: 'gap', basis: baseline, specificity: 1 });
        }
    }
    gaps.sort((a, b) => a.m.n - b.m.n || a.label.localeCompare(b.label));
    return { errors: candidates.slice(0, 3), gaps: gaps.slice(0, Math.max(0, 3 - candidates.length)), baseline, baselines, stratum: eligibleStrata[0]?.items };
}
export function insightPractice(record, filters, label = 'Insights practice') {
    if (!record.sourceKnown)
        throw Error('The original practice setup was not recorded. Review the evidence instead.');
    const quality = filters.quality ?? (filters.chord ? parseChord(filters.chord).quality : undefined);
    if ('mode' in record.source) {
        const c = structuredClone(record.source);
        if (record.context === 'Progression') {
            if (filters.key && insightKeys.includes(filters.key)) {
                c.keyMode = 'fixed';
                c.key = filters.key;
            }
        }
        else {
            if (filters.root)
                c.roots = [filters.root];
            if (filters.chord)
                c.roots = [parseChord(filters.chord).root];
            if (quality)
                c.qualities = [parseChord('C' + quality).quality];
        }
        if (quality && filters.degree)
            c.pools[quality] = [filters.degree];
        return { kind: 'progression', config: validateProgression(c), label };
    }
    const c = editableConfig(record.source);
    if (filters.root)
        c.roots = [filters.root];
    if (filters.chord)
        c.roots = [parseChord(filters.chord).root];
    if (quality)
        c.qualities = [parseChord('C' + quality).quality];
    if (filters.degree) {
        c.targetPools = { ...c.targetPools };
        for (const q of c.qualities)
            c.targetPools[q] = [filters.degree];
        c.targetMode = 'exact';
        c.targets = [filters.degree];
    }
    return { kind: 'single', config: validateSingle(c), label };
}
export function insightTrend(records, days, now = new Date()) {
    const p = insightPeriod(days || 28, now), current = records.filter(r => r.time !== null && r.time >= p.start && r.time < p.end), previous = records.filter(r => r.time !== null && r.time >= p.previous && r.time < p.start);
    const groups = new Map();
    for (const [name, items] of [['current', current], ['previous', previous]])
        for (const r of items) {
            const k = insightStratum(r);
            if (k) {
                const g = groups.get(k) ?? { current: [], previous: [] };
                g[name].push(r);
                groups.set(k, g);
            }
        }
    const eligible = days ? [...groups.values()].filter(g => insightEligible(g.current) && insightEligible(g.previous)) : [];
    const total = eligible.reduce((n, g) => n + insightStats(g.current).n + insightStats(g.previous).n, 0);
    let delta = null;
    if (total)
        delta = 100 * eligible.reduce((sum, g) => { const a = insightStats(g.current), b = insightStats(g.previous), weight = (a.n + b.n) / total; return sum + weight * (a.correct / a.n - b.correct / b.n); }, 0);
    return { delta, groups: eligible.length, current: insightStats(eligible.flatMap(g => g.current)), previous: insightStats(eligible.flatMap(g => g.previous)), totalCurrent: insightStats(current).n, details: eligible.map(g => ({ label: insightConditionLabel(g.current[0]), current: insightStats(g.current), previous: insightStats(g.previous) })) };
}
export function insightKeyComparison(records) {
    const strata = new Map();
    for (const r of records) {
        const k = insightStratum(r, true);
        if (k && r.key) {
            const items = strata.get(k) ?? [];
            items.push(r);
            strata.set(k, items);
        }
    }
    const groups = [...strata.values()].map(items => ({ items, keys: insightGroups(items, 'key').filter(g => insightEligible(g.items)) })).filter(g => g.keys.length >= 2).sort((a, b) => Math.max(...b.items.map(r => r.time ?? 0)) - Math.max(...a.items.map(r => r.time ?? 0)) || b.items.length - a.items.length);
    const chosen = groups[0];
    return { items: chosen?.keys.flatMap(g => g.items) ?? [], label: chosen ? insightConditionLabel(chosen.items[0]) : null };
}
export function insightEfficiency(records) {
    const values = new Map(), excluded = new Map();
    const unique = [...new Map(records.map(r => [r.family === 'Play by Ear' ? r.questionId : r.a.id, r])).values()];
    for (const r of unique) {
        let time = null, reason = 'Unavailable timing';
        const key = insightStratum(r);
        if (r.family === 'Play by Ear') {
            const q = r.question;
            if (!q || !q.submitted)
                reason = 'Incomplete';
            else if (q.notes.some(n => n.correct !== true))
                reason = 'Incorrect or unassessed';
            else if (q.before > 0)
                reason = 'Replay-assisted';
            else if (q.interrupted)
                reason = 'Interrupted';
            else if (key && q.completionTimingVersion && Number.isFinite(q.completionDelayMs) && q.completionDelayMs >= 0)
                time = q.completionDelayMs;
        }
        else if (r.context === 'Single Chord' && key && r.a.firstCorrect === true && r.a.timingValidity === 'valid' && r.a.firstResponseMs !== null && Number.isFinite(r.a.firstResponseMs) && r.a.firstResponseMs >= 0)
            time = r.a.firstResponseMs;
        if (time === null || !key) {
            excluded.set(reason, (excluded.get(reason) ?? 0) + 1);
            continue;
        }
        const timingKey = key + '|' + (r.question?.completionTimingVersion ?? r.timing), group = values.get(timingKey) ?? { label: insightConditionLabel(r), values: [] };
        group.values.push(time);
        values.set(timingKey, group);
    }
    return { groups: [...values.values()].map(g => { g.values.sort((a, b) => a - b); const n = g.values.length; return { label: g.label, n, median: (g.values[Math.floor(n / 2)] + g.values[Math.floor((n - 1) / 2)]) / 2 }; }), excluded: [...excluded].map(([reason, n]) => ({ reason, n })) };
}
export function insightSetupId(r) { return stable(sourceConditions(r)); }
