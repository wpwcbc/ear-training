/**
 * Builds a standard toggle row used across pages.
 *
 * DOM structure matches existing pages:
 * .mode2-row.simple[data-option-id]
 *   .field
 *     label.toggle
 *       input.option-toggle[type=checkbox][data-option-id]
 *       span.toggle-track
 *       span.toggle-label
 */
export const buildToggleRow = (options) => {
    const row = document.createElement("div");
    row.className = options.rowClassName ?? "mode2-row simple";
    row.dataset.optionId = options.id;
    const field = document.createElement("div");
    field.className = "field";
    const toggle = document.createElement("label");
    toggle.className = "toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = options.checked;
    input.disabled = Boolean(options.disabled);
    input.dataset.optionId = options.id;
    input.className = options.inputClassName ?? "option-toggle";
    const track = document.createElement("span");
    track.className = "toggle-track";
    const text = document.createElement("span");
    text.className = "toggle-label";
    text.textContent = options.label;
    toggle.append(input, track, text);
    field.append(toggle);
    row.append(field);
    return row;
};
export const getCheckedToggleIds = (container) => {
    return Array.from(container.querySelectorAll("input.option-toggle[type='checkbox']"))
        .filter((toggle) => toggle.checked)
        .map((toggle) => toggle.dataset.optionId || "")
        .filter(Boolean);
};
