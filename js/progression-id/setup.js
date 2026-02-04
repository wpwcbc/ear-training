import * as theory from "../core/theory.js";
import { dom } from "./dom.js";
const buildToggleRow = (label, id, checked) => {
    const row = document.createElement("div");
    row.className = "mode2-row simple";
    row.dataset.optionId = id;
    const field = document.createElement("div");
    field.className = "field";
    const toggle = document.createElement("label");
    toggle.className = "toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.dataset.optionId = id;
    input.className = "option-toggle";
    const track = document.createElement("span");
    track.className = "toggle-track";
    const text = document.createElement("span");
    text.className = "toggle-label";
    text.textContent = label;
    toggle.append(input, track, text);
    field.append(toggle);
    row.append(field);
    return row;
};
export const renderSubstitutionOptions = () => {
    dom.elSubstitutionOptions.innerHTML = "";
    dom.elSubstitutionOptions.append(buildToggleRow("Secondary maj ii-V", "secondaryMajorIIV", true), buildToggleRow("Secondary minor iiø-Vb9", "secondaryMinorIIVb9", false), buildToggleRow("Tritone substitutions", "tritoneSubs", true), buildToggleRow("Backdoor (iv–bVII)", "backdoor", true), buildToggleRow("Borrowed bVII / bVI", "borrowed", true));
};
export const getMode = () => {
    const checked = document.querySelector("input[name='mode']:checked");
    if (!checked) {
        return "major";
    }
    return checked.value;
};
const readSubstitutionSettings = () => {
    const toggles = Array.from(dom.elSubstitutionOptions.querySelectorAll(".option-toggle"));
    const setting = (id) => toggles.find((toggle) => toggle.dataset.optionId === id)?.checked ??
        false;
    return {
        secondaryMajorIIV: setting("secondaryMajorIIV"),
        secondaryMinorIIVb9: setting("secondaryMinorIIVb9"),
        tritoneSubs: setting("tritoneSubs"),
        backdoor: setting("backdoor"),
        borrowed: setting("borrowed"),
    };
};
export const readConfig = () => {
    const keyCenter = dom.elKeyInput.value.trim() || "C";
    theory.noteNameToPitchClassSemitones(keyCenter);
    const minRootNote = dom.elMinRootInput.value.trim();
    if (!minRootNote) {
        throw new Error("Enter a minimum chord root (e.g., G2).");
    }
    const minRootMidi = theory.noteWithOctaveToMidi(minRootNote);
    return {
        keyCenter,
        mode: getMode(),
        minRootNote,
        minRootMidi,
        substitutions: readSubstitutionSettings(),
    };
};
