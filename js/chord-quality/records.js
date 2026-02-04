import { dom } from "./dom.js";
import { state, STORAGE_KEYS, TEST_FILTER_ALL, } from "./state.js";
import { QUALITY_OPTIONS, VOICING_OPTIONS } from "./options.js";
const loadHistory = (key) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
};
const saveHistory = (key, records) => {
    localStorage.setItem(key, JSON.stringify(records));
};
export const addRecord = (key, record, limit = 200) => {
    const records = loadHistory(key);
    records.unshift(record);
    if (records.length > limit) {
        records.length = limit;
    }
    saveHistory(key, records);
};
export const addRecords = (key, newRecords, limit = 200) => {
    if (!newRecords.length) {
        return;
    }
    const records = loadHistory(key);
    const merged = [...newRecords, ...records];
    if (merged.length > limit) {
        merged.length = limit;
    }
    saveHistory(key, merged);
};
const updateStatsToggle = () => {
    dom.elStatsGroupSelect.value = state.statsGrouping;
    dom.elStatsOrderSelect.value = state.statsOrder;
};
const updateRecordsTabs = () => {
    dom.elRecordsTabButtons.forEach((button) => {
        const tab = button.dataset.recordsTab;
        const isActive = tab === state.recordsTab;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });
    dom.elRecordsTabPanels.forEach((panel) => {
        const panelTab = panel.dataset.recordsPanel;
        panel.classList.toggle("active", panelTab === state.recordsTab);
    });
};
export const renderRecords = () => {
    const tests = loadHistory(STORAGE_KEYS.testHistory);
    const questions = loadHistory(STORAGE_KEYS.questionHistory);
    dom.elTestRecords.innerHTML = "";
    dom.elStatsRecords.innerHTML = "";
    const buildCell = (text, className = "stats-cell") => {
        const cell = document.createElement("div");
        cell.className = className;
        cell.textContent = text;
        return cell;
    };
    const uniqueTests = Array.from(new Set(tests.map((record) => record.progressionName)));
    dom.elTestFilterSelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = TEST_FILTER_ALL;
    allOption.textContent = "All progressions";
    dom.elTestFilterSelect.appendChild(allOption);
    uniqueTests.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        dom.elTestFilterSelect.appendChild(option);
    });
    dom.elTestFilterSelect.value = state.testFilter;
    const filteredTests = state.testFilter === TEST_FILTER_ALL
        ? tests
        : tests.filter((record) => record.progressionName === state.testFilter);
    if (!filteredTests.length) {
        const empty = document.createElement("div");
        empty.className = "record-card empty";
        empty.textContent =
            state.testFilter === TEST_FILTER_ALL
                ? "No test records yet."
                : "No records for this selection.";
        dom.elTestRecords.appendChild(empty);
    }
    else {
        const table = document.createElement("div");
        table.className = "stats-table tests-table tests-table--compact";
        const header = document.createElement("div");
        header.className = "stats-row stats-header";
        header.append(buildCell("Test", "stats-cell stats-label"), buildCell("Avg time"), buildCell("Avg attempts"), buildCell("Date"));
        table.appendChild(header);
        filteredTests.slice(0, 20).forEach((record) => {
            const row = document.createElement("div");
            row.className = "stats-row";
            row.append(buildCell(record.progressionName, "stats-cell stats-label"), buildCell(`${record.avgTimeSeconds}s`), buildCell(String(record.avgAttempts)), buildCell(new Date(record.datetime).toLocaleString()));
            table.appendChild(row);
        });
        dom.elTestRecords.appendChild(table);
    }
    const calculateStats = (items) => {
        const count = items.length || 1;
        const totalTime = items.reduce((sum, item) => sum + item.timeSeconds, 0);
        const totalAttempts = items.reduce((sum, item) => sum + item.attempts, 0);
        return {
            avgTime: Number((totalTime / count).toFixed(3)),
            avgAttempts: Number((totalAttempts / count).toFixed(2)),
            count: items.length,
        };
    };
    const groupRecords = (items, keyFn) => {
        const groups = new Map();
        items.forEach((record) => {
            const key = keyFn(record);
            const list = groups.get(key) ?? [];
            list.push(record);
            groups.set(key, list);
        });
        return groups;
    };
    const qualityOrder = new Map(QUALITY_OPTIONS.map((quality, index) => [quality.id, index]));
    const voicingOrder = new Map(VOICING_OPTIONS.map((voicing, index) => [voicing.id, index]));
    const getQualityIndex = (quality) => qualityOrder.get(quality) ?? Number.MAX_SAFE_INTEGER;
    const getVoicingIndex = (voicing) => voicingOrder.get(voicing) ?? Number.MAX_SAFE_INTEGER;
    const compareByName = (a, b, grouping) => {
        if (grouping === "voicing") {
            return getVoicingIndex(a.key) - getVoicingIndex(b.key);
        }
        return Number(a.key) - Number(b.key);
    };
    const compareByTime = (a, b, desc) => (desc ? b.avgTime - a.avgTime : a.avgTime - b.avgTime);
    if (!questions.length) {
        const empty = document.createElement("div");
        empty.className = "record-card empty";
        empty.textContent = "No question records yet.";
        dom.elStatsRecords.appendChild(empty);
        return;
    }
    const modeGroups = new Map();
    questions.forEach((record) => {
        const mode = record.playbackMode || "stacked";
        const list = modeGroups.get(mode) ?? [];
        list.push(record);
        modeGroups.set(mode, list);
    });
    const grouping = state.statsGrouping;
    const modeLabels = [
        { id: "stacked", label: "Stacked" },
        { id: "arpeggiated", label: "Arpeggiated" },
    ];
    const qualityLabelMap = new Map(QUALITY_OPTIONS.map((quality) => [quality.id, quality.label]));
    const voicingLabelMap = new Map(VOICING_OPTIONS.map((voicing) => [voicing.id, voicing.label]));
    const formatQualityLabel = (quality) => qualityLabelMap.get(quality) ?? quality;
    const formatVoicingLabel = (voicing) => voicingLabelMap.get(voicing) ?? voicing;
    const formatInversionLabel = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return "Inversion ?";
        }
        if (numeric === 0) {
            return "Root position";
        }
        const suffix = numeric % 10 === 1 && numeric % 100 !== 11
            ? "st"
            : numeric % 10 === 2 && numeric % 100 !== 12
                ? "nd"
                : numeric % 10 === 3 && numeric % 100 !== 13
                    ? "rd"
                    : "th";
        return `${numeric}${suffix} inversion`;
    };
    const buildStatsTable = (records) => {
        const getInversionKey = (record) => {
            const inversion = Number.isFinite(record.chordInversion)
                ? record.chordInversion
                : 0;
            return String(inversion);
        };
        const groupedByQuality = groupRecords(records, (record) => record.chordQuality);
        let qualityStats = Array.from(groupedByQuality.entries()).map(([key, items]) => {
            const stats = calculateStats(items);
            return { key, items, ...stats };
        });
        if (state.statsOrder === "name") {
            qualityStats = qualityStats.sort((a, b) => getQualityIndex(a.key) - getQualityIndex(b.key));
        }
        else {
            const desc = state.statsOrder === "time-desc";
            qualityStats = qualityStats.sort((a, b) => compareByTime(a, b, desc));
        }
        const table = document.createElement("div");
        table.className = "stats-table";
        const header = document.createElement("div");
        header.className = "stats-row stats-header";
        header.append(buildCell("Quality", "stats-cell stats-label"), buildCell("Avg time"), buildCell("Avg attempts"), buildCell("Questions"));
        table.appendChild(header);
        qualityStats.forEach((group) => {
            const row = document.createElement("div");
            row.className = "stats-row stats-row--group";
            row.append(buildCell(formatQualityLabel(group.key), "stats-cell stats-label"), buildCell(`${group.avgTime}s`), buildCell(String(group.avgAttempts)), buildCell(String(group.count)));
            table.appendChild(row);
            const primaryGrouped = groupRecords(group.items, (record) => grouping === "voicing" ? record.chordVoicing : getInversionKey(record));
            let primaryStats = Array.from(primaryGrouped.entries()).map(([key, items]) => {
                const stats = calculateStats(items);
                return { key, items, ...stats };
            });
            if (state.statsOrder === "name") {
                primaryStats = primaryStats.sort((a, b) => compareByName(a, b, grouping));
            }
            else {
                const desc = state.statsOrder === "time-desc";
                primaryStats = primaryStats.sort((a, b) => compareByTime(a, b, desc));
            }
            const secondaryGrouping = grouping === "voicing" ? "inversion" : "voicing";
            primaryStats.forEach((primary) => {
                const primaryRow = document.createElement("div");
                primaryRow.className = "stats-row stats-row--sub";
                const primaryLabel = grouping === "voicing"
                    ? formatVoicingLabel(primary.key)
                    : formatInversionLabel(primary.key);
                primaryRow.append(buildCell(`↳ ${primaryLabel}`, "stats-cell stats-label"), buildCell(`${primary.avgTime}s`), buildCell(String(primary.avgAttempts)), buildCell(String(primary.count)));
                table.appendChild(primaryRow);
                const secondaryGrouped = groupRecords(primary.items, (record) => secondaryGrouping === "voicing"
                    ? record.chordVoicing
                    : getInversionKey(record));
                let secondaryStats = Array.from(secondaryGrouped.entries()).map(([key, items]) => {
                    const stats = calculateStats(items);
                    return { key, ...stats };
                });
                if (state.statsOrder === "name") {
                    secondaryStats = secondaryStats.sort((a, b) => compareByName(a, b, secondaryGrouping));
                }
                else {
                    const desc = state.statsOrder === "time-desc";
                    secondaryStats = secondaryStats.sort((a, b) => compareByTime(a, b, desc));
                }
                secondaryStats.forEach((secondary) => {
                    const secondaryRow = document.createElement("div");
                    secondaryRow.className = "stats-row stats-row--sub stats-row--sub2";
                    const secondaryLabel = secondaryGrouping === "voicing"
                        ? formatVoicingLabel(secondary.key)
                        : formatInversionLabel(secondary.key);
                    secondaryRow.append(buildCell(`↳↳ ${secondaryLabel}`, "stats-cell stats-label"), buildCell(`${secondary.avgTime}s`), buildCell(String(secondary.avgAttempts)), buildCell(String(secondary.count)));
                    table.appendChild(secondaryRow);
                });
            });
        });
        return table;
    };
    modeLabels.forEach((mode) => {
        const records = modeGroups.get(mode.id);
        if (!records || !records.length) {
            return;
        }
        const block = document.createElement("div");
        block.className = "records-block";
        const header = document.createElement("div");
        header.className = "records-header";
        const title = document.createElement("h3");
        title.textContent = mode.label;
        header.appendChild(title);
        block.append(header, buildStatsTable(records));
        dom.elStatsRecords.appendChild(block);
    });
};
export const initRecords = () => {
    updateStatsToggle();
    updateRecordsTabs();
    renderRecords();
    dom.elStatsGroupSelect.addEventListener("change", () => {
        state.statsGrouping = dom.elStatsGroupSelect.value;
        renderRecords();
    });
    dom.elStatsOrderSelect.addEventListener("change", () => {
        state.statsOrder = dom.elStatsOrderSelect.value;
        renderRecords();
    });
    dom.elTestFilterSelect.addEventListener("change", () => {
        state.testFilter = dom.elTestFilterSelect.value;
        renderRecords();
    });
    dom.elRecordsTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tab = button.dataset.recordsTab;
            if (!tab) {
                return;
            }
            state.recordsTab = tab;
            updateRecordsTabs();
        });
    });
};
