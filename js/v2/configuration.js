// Shared native disclosure presentation; musical drafts stay in their existing controllers.
export const configurationChapters = ["Harmony", "Target degrees", "Practice", "Sound"];
export function rememberGroups(root, state) {
    root.querySelectorAll("details[data-config-group]").forEach(node => {
        state.set(node.dataset.configGroup, node.open);
    });
}
export function configurationGroup(state, key, title, selected, content, initiallyOpen = false) {
    const group = document.createElement("details");
    group.className = "config-group";
    group.dataset.configGroup = key;
    group.open = state.get(key) ?? initiallyOpen;
    const header = document.createElement("summary"), name = document.createElement("span"), summary = document.createElement("span");
    name.textContent = title;
    summary.textContent = selected;
    summary.className = "config-selected";
    header.dataset.focusKey = "group:" + key;
    header.dataset.control = "group:" + key;
    header.append(name, summary);
    const body = document.createElement("div");
    body.className = "config-group-body";
    body.append(...content);
    group.append(header, body);
    group.ontoggle = () => { if (group.isConnected)
        state.set(key, group.open); };
    return group;
}
export function practiceSummary(state, key, content) {
    const group = configurationGroup(state, key, "This practice", "", content);
    group.className = "practice-summary";
    group.dataset.practiceSummary = "";
    group.open = window.matchMedia("(min-width: 701px)").matches || (state.get(key) ?? false);
    return group;
}
if (typeof window !== "undefined") {
    const desktop = window.matchMedia("(min-width: 701px)");
    desktop.addEventListener("change", () => {
        document.querySelectorAll("details[data-practice-summary]").forEach(group => group.open = desktop.matches);
    });
}
