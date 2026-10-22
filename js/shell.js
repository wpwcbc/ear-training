const base = new URL("../", import.meta.url);
const lab = new URL("jazz-ear-lab/", base);
const isLab = location.pathname.replace(/\/$/, "").endsWith("/jazz-ear-lab");
const themeKey = "earTrain:ui:theme";
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
let preference = null;
try {
    const saved = localStorage.getItem(themeKey);
    if (saved === "light" || saved === "dark")
        preference = saved;
}
catch {
    /* A blocked preference store must not block practice. */
}
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const button = document.getElementById("app-theme");
    if (button) {
        button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
        button.title = button.getAttribute("aria-label");
        button.style.setProperty("--app-icon", iconURL(theme === "dark" ? "sun" : "moon"));
    }
    window.dispatchEvent(new Event("eartrain:theme"));
}
function iconURL(name) {
    return `url("${new URL(`jazz-ear-lab/icons/${name}.svg`, base)}")`;
}
setTheme(preference ?? (systemTheme.matches ? "dark" : "light"));
systemTheme.addEventListener("change", () => {
    if (!preference)
        setTheme(systemTheme.matches ? "dark" : "light");
});
window.addEventListener("storage", (event) => {
    if (event.key !== themeKey)
        return;
    preference =
        event.newValue === "light" || event.newValue === "dark"
            ? event.newValue
            : null;
    setTheme(preference ?? (systemTheme.matches ? "dark" : "light"));
});
function mount() {
    const main = document.querySelector("main");
    if (!main)
        return;
    document.body.classList.add("app-ready");
    const toolNames = {
        "degree-trainer": "Scale Degree Trainer",
        "interval-trainer": "Interval Trainer",
        "chord-quality": "Chord Quality ID",
        "progression-id": "Progression ID",
        drone: "Drone & Metronome",
        heatmap: "Legacy Heatmap",
    };
    const tool = Object.keys(toolNames).find((path) => location.pathname.includes(`/${path}/`));
    if (tool && main.querySelector("h1"))
        main.querySelector("h1").textContent = toolNames[tool];
    if (!isLab && !tool)
        document.body.classList.add("tool-hub");
    const shell = document.createElement("div");
    shell.className = "app-shell";
    shell.innerHTML = `<a class="app-skip" href="#app-content">Skip to content</a>
    <div class="app-backdrop" hidden></div>
    <aside class="app-sidebar" id="app-sidebar" aria-label="Application sidebar">
      <a class="app-brand" href="${lab}#/home"><span class="app-brand-mark app-icon" style='--app-icon:${iconURL("audio-lines")}'></span><span>Ear Train<small>Jazz Ear Lab</small></span></a>
      <button class="app-drawer-close app-icon-button" type="button" aria-label="Close navigation" title="Close navigation" style='--app-icon:${iconURL("x")}'></button>
      <nav class="app-navigation" aria-label="Main navigation"></nav>
      <nav class="app-legacy" aria-label="Legacy training"><h2>Training tools</h2></nav>
      <a class="app-rail-tools app-nav-link" href="${base}" aria-label="Training tools" title="Training tools"><span class="app-icon" style='--app-icon:${iconURL("library")}'></span><span>Training tools</span></a>
      <div class="app-sidebar-bottom"><a class="app-nav-link" data-route="settings" href="${lab}#/insights/data" aria-label="Settings" title="Settings"><span class="app-icon" style='--app-icon:${iconURL("settings")}'></span><span>Settings</span></a><p>Local practice. Your pace.</p></div>
    </aside>
    <div class="app-workspace"><header class="app-topbar">
      <button id="app-nav-toggle" class="app-icon-button" type="button" aria-controls="app-sidebar" aria-expanded="false" aria-label="Open navigation" title="Open navigation" style='--app-icon:${iconURL("menu")}'></button>
      <div class="app-breadcrumb"><span>Ear Train</span><span aria-hidden="true">/</span><strong id="app-page-name">Practice</strong></div>
      <button id="app-theme" class="app-icon-button" type="button"></button>
    </header><div class="app-content" id="app-content" tabindex="-1"></div></div>`;
    document.body.prepend(shell);
    shell.querySelector(".app-content").append(main);
    shell.querySelector(".app-skip").onclick = (event) => {
        event.preventDefault();
        shell.querySelector(".app-content").focus();
    };
    const nav = shell.querySelector(".app-navigation");
    for (const [route, name, icon] of [
        ["home", "Practice", "headphones"],
        ["suggested", "Learning path", "route"],
        ["history", "History", "rotate-ccw"],
        ["insights", "Insights", "chart-no-axes-combined"],
        ["review", "Review", "bookmark"],
    ]) {
        const link = document.createElement("a");
        link.className = "app-nav-link";
        link.href = `${lab}#/${route}`;
        link.dataset.route = route;
        link.innerHTML = `<span class="app-icon" style='--app-icon:${iconURL(icon)}'></span><span>${name}</span>`;
        link.title = name;
        nav.append(link);
    }
    const legacy = shell.querySelector(".app-legacy");
    for (const [path, name] of [
        ["degree-trainer", "Scale degrees"],
        ["interval-trainer", "Intervals"],
        ["chord-quality", "Chord quality"],
        ["progression-id", "Progressions"],
        ["drone", "Drone & metronome"],
        ["heatmap", "Legacy heatmap"],
    ]) {
        const link = document.createElement("a");
        link.className = "app-tool-link";
        link.href = new URL(`${path}/`, base).href;
        link.textContent = name;
        link.title = name;
        if (location.pathname.includes(`/${path}/`))
            link.setAttribute("aria-current", "page");
        legacy.append(link);
    }
    const toggle = document.getElementById("app-nav-toggle");
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = shell.querySelector(".app-backdrop");
    const close = shell.querySelector(".app-drawer-close");
    const mobile = matchMedia("(max-width: 767px)");
    function drawer(open, restore = true) {
        document.body.classList.toggle("app-drawer-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        backdrop.hidden = !open;
        sidebar.inert = mobile.matches && !open;
        shell.querySelector(".app-workspace").inert = open;
        if (open)
            close.focus();
        else if (restore)
            toggle.focus();
    }
    toggle.onclick = () => drawer(!document.body.classList.contains("app-drawer-open"));
    close.onclick = () => drawer(false);
    backdrop.onclick = () => drawer(false);
    sidebar.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            drawer(false, false);
            if (mobile.matches)
                shell
                    .querySelector(".app-content")
                    .focus({ preventScroll: true });
        }
    });
    document.addEventListener("keydown", (event) => {
        if (!document.body.classList.contains("app-drawer-open"))
            return;
        if (event.key === "Escape") {
            event.preventDefault();
            drawer(false);
        }
        if (event.key === "Tab") {
            const items = Array.from(sidebar.querySelectorAll("a, button")).filter((item) => item.getClientRects().length > 0);
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
    mobile.addEventListener("change", () => drawer(false, false));
    drawer(false, false);
    document.getElementById("app-theme").onclick = () => {
        preference =
            document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        try {
            localStorage.setItem(themeKey, preference);
        }
        catch {
            /* Theme still works for this page. */
        }
        setTheme(preference);
    };
    setTheme(document.documentElement.dataset.theme);
    function route() {
        const hash = location.hash.replace(/^#\/?/, "").split("?")[0];
        const section = hash.startsWith("insights/data") || hash.startsWith("insights/settings")
            ? "settings"
            : hash.startsWith("setup/") || hash.startsWith("session/")
                ? "home"
                : hash.split("/")[0] || "home";
        const names = {
            home: "Practice",
            suggested: "Learning path",
            history: "History",
            insights: "Insights",
            review: "Review",
            settings: "Settings",
        };
        shell.querySelectorAll("[data-route]").forEach((link) => {
            if (isLab && section === link.dataset.route)
                link.setAttribute("aria-current", "page");
            else
                link.removeAttribute("aria-current");
        });
        const focused = isLab && hash.startsWith("session/") && !hash.endsWith("/summary");
        document.body.classList.toggle("practice-focus", focused);
        document.getElementById("app-page-name").textContent = isLab
            ? focused
                ? "Practice session"
                : hash.startsWith("setup/")
                    ? "Set up practice"
                    : (names[section] ?? "Practice")
            : (document.querySelector("h1")?.textContent ?? "Training tools");
        drawer(false, false);
    }
    window.addEventListener("hashchange", route);
    route();
}
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
else
    mount();
export {};
