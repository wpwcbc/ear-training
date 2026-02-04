import * as theory from "../core/theory.js";
import { buildToggleRow } from "../ui/toggles.js";
import { dom } from "./dom.js";
import { FIVE_NOTE_QUALITIES, QUALITY_OPTIONS, VOICING_OPTIONS, } from "./options.js";
export const renderQualityOptions = () => {
    dom.elQualityOptions.innerHTML = "";
    QUALITY_OPTIONS.forEach((option) => {
        const row = buildToggleRow({ label: option.label, id: option.id, checked: true });
        dom.elQualityOptions.appendChild(row);
    });
};
export const renderVoicingOptions = () => {
    dom.elVoicingOptions.innerHTML = "";
    VOICING_OPTIONS.forEach((option) => {
        const row = buildToggleRow({ label: option.label, id: option.id, checked: true });
        dom.elVoicingOptions.appendChild(row);
    });
};
export const renderInversionOptions = () => {
    dom.elInversionOptions.innerHTML = "";
    const labels = [
        { id: "0", label: "Root position", checked: true },
        { id: "1", label: "1st inversion", checked: false },
        { id: "2", label: "2nd inversion", checked: false },
        { id: "3", label: "3rd inversion", checked: false },
    ];
    labels.forEach((option) => {
        const row = buildToggleRow({
            label: option.label,
            id: option.id,
            checked: option.checked,
        });
        dom.elInversionOptions.appendChild(row);
    });
};
const readEnabledOptions = (container) => {
    const toggles = Array.from(container.querySelectorAll(".option-toggle"));
    const enabled = toggles.filter((toggle) => toggle.checked);
    const ids = enabled.map((toggle) => toggle.dataset.optionId || "");
    const qualities = ids.filter((id) => QUALITY_OPTIONS.some((option) => option.id === id));
    const voicings = ids.filter((id) => VOICING_OPTIONS.some((option) => option.id === id));
    return { qualities, voicings };
};
const getSelectedInversions = () => {
    const toggles = Array.from(dom.elInversionOptions.querySelectorAll(".option-toggle"));
    return toggles
        .filter((toggle) => toggle.checked)
        .map((toggle) => Number(toggle.dataset.optionId))
        .filter((value) => Number.isFinite(value));
};
const syncFiveNoteAvailability = () => {
    const inversions = getSelectedInversions();
    const hasInversion = inversions.some((value) => value > 0);
    dom.elInversionWarning.textContent = hasInversion
        ? "5-note qualities are disabled when inversions are selected."
        : "";
    const qualityToggles = Array.from(dom.elQualityOptions.querySelectorAll(".option-toggle"));
    qualityToggles.forEach((toggle) => {
        const qualityId = toggle.dataset.optionId || "";
        const row = toggle.closest(".mode2-row");
        if (FIVE_NOTE_QUALITIES.includes(qualityId)) {
            toggle.disabled = hasInversion;
            if (hasInversion) {
                toggle.checked = false;
                row?.classList.add("is-disabled");
            }
            else {
                row?.classList.remove("is-disabled");
            }
        }
    });
};
const attachInversionListeners = () => {
    dom.elInversionOptions
        .querySelectorAll(".option-toggle")
        .forEach((toggle) => {
        toggle.addEventListener("change", () => {
            syncFiveNoteAvailability();
        });
    });
};
export const readConfig = () => {
    const playbackMode = dom.elPlaybackRadios.find((radio) => radio.checked)?.value ===
        "arpeggiated"
        ? "arpeggiated"
        : "stacked";
    const totalQuestions = Number(dom.elQuestionCount.value || 1);
    if (!Number.isFinite(totalQuestions) || totalQuestions < 1) {
        throw new Error("Questions per test must be at least 1.");
    }
    const minRootNote = dom.elMinRootInput.value.trim();
    if (!minRootNote) {
        throw new Error("Enter a minimum chord root (e.g., G2).");
    }
    const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
    const qualityEnabled = readEnabledOptions(dom.elQualityOptions).qualities;
    const voicingEnabled = readEnabledOptions(dom.elVoicingOptions).voicings;
    const enabledInversions = getSelectedInversions();
    if (!qualityEnabled.length) {
        throw new Error("Select at least one chord quality.");
    }
    if (!voicingEnabled.length) {
        throw new Error("Select at least one voicing.");
    }
    if (!enabledInversions.length) {
        throw new Error("Select at least one inversion.");
    }
    const hasInversion = enabledInversions.some((value) => value > 0);
    const filteredQualities = hasInversion
        ? qualityEnabled.filter((quality) => !FIVE_NOTE_QUALITIES.includes(quality))
        : qualityEnabled;
    return {
        totalQuestions: Math.floor(totalQuestions),
        minRootNote,
        minRootMidi,
        enabledQualities: filteredQualities,
        enabledVoicings: voicingEnabled,
        enabledInversions,
        playbackMode,
    };
};
export const initChordQualityControls = () => {
    renderQualityOptions();
    renderVoicingOptions();
    renderInversionOptions();
    syncFiveNoteAvailability();
    attachInversionListeners();
};
