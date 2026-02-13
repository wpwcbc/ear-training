const OVERLAY_ID = "fullscreenOverlay";
const ensureOverlay = () => {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        return overlay;
    }
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "fullscreen-overlay hidden";
    overlay.innerHTML = `
		<div class="fullscreen-backdrop" data-fs-close></div>
		<div class="fullscreen-sheet" role="dialog" aria-modal="true">
			<button type="button" class="ghost fullscreen-close" data-fs-close>
				Close
			</button>
			<div class="fullscreen-body" id="fullscreenBody"></div>
		</div>
	`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => {
        const target = event.target;
        if (!target) {
            return;
        }
        if (target.closest("[data-fs-close]")) {
            closeFullscreen();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isFullscreenOpen()) {
            event.preventDefault();
            closeFullscreen();
        }
    });
    return overlay;
};
let mounted = null;
let docked = null;
// dockedTopAction removed (no top bar actions)
export const isFullscreenOpen = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    return !!overlay && !overlay.classList.contains("hidden");
};
export const openFullscreen = (panel, title = "Live") => {
    const overlay = ensureOverlay();
    const body = overlay.querySelector("#fullscreenBody");
    if (!body) {
        return;
    }
    if (mounted?.panel === panel && isFullscreenOpen()) {
        return;
    }
    // If another panel is mounted, restore it first.
    if (mounted) {
        closeFullscreen();
    }
    // title is shown inside the panel; overlay has no top bar
    mounted = {
        panel,
        placeholder: document.createComment("fullscreen-placeholder"),
        parent: panel.parentNode,
        nextSibling: panel.nextSibling,
    };
    mounted.parent.insertBefore(mounted.placeholder, panel);
    panel.classList.add("fullscreen-live");
    body.appendChild(panel);
    // Optional UX (fullscreen only): if a panel has a "Next chord" button,
    // move it to the bottom of the panel as a normal flow element.
    const nextBtn = panel.querySelector("#btnNextChord");
    if (nextBtn) {
        docked = {
            el: nextBtn,
            placeholder: document.createComment("fullscreen-dock-placeholder"),
            parent: nextBtn.parentNode,
            nextSibling: nextBtn.nextSibling,
        };
        docked.parent.insertBefore(docked.placeholder, nextBtn);
        nextBtn.classList.add("fullscreen-primary-action");
        let slot = panel.querySelector(".fullscreen-bottom-action");
        if (!slot) {
            slot = document.createElement("div");
            slot.className = "fullscreen-bottom-action";
            panel.appendChild(slot);
        }
        slot.appendChild(nextBtn);
    }
    // Stop button stays inside the panel in fullscreen (no top bar actions).
    overlay.classList.remove("hidden");
    document.body.classList.add("fullscreen-open");
};
export const closeFullscreen = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
        return;
    }
    if (docked) {
        const { el, placeholder, parent, nextSibling } = docked;
        el.classList.remove("fullscreen-primary-action");
        if (nextSibling) {
            parent.insertBefore(el, nextSibling);
        }
        else {
            parent.appendChild(el);
        }
        placeholder.remove();
        docked = null;
    }
    // no top-bar actions to restore
    if (mounted) {
        const { panel, placeholder, parent, nextSibling } = mounted;
        panel.classList.remove("fullscreen-live");
        if (nextSibling) {
            parent.insertBefore(panel, nextSibling);
        }
        else {
            parent.appendChild(panel);
        }
        placeholder.remove();
        mounted = null;
    }
    overlay.classList.add("hidden");
    document.body.classList.remove("fullscreen-open");
};
const getToggle = (toggleId) => {
    return document.getElementById(toggleId);
};
export const initFullscreenLive = (opts) => {
    ensureOverlay();
    const panel = document.getElementById(opts.panelId);
    const toggle = getToggle(opts.toggleId);
    const startBtn = document.getElementById(opts.startButtonId);
    if (!panel || !toggle || !startBtn) {
        return;
    }
    const title = panel.querySelector("h2")?.textContent?.trim() || "Live";
    // Start → open fullscreen if enabled (do not interrupt the test)
    startBtn.addEventListener("click", () => {
        if (toggle.checked) {
            // Let the click handler start the test first, then open.
            window.setTimeout(() => openFullscreen(panel, title), 0);
        }
    }, { capture: true });
    // Toggle behavior:
    // - When NOT running: it's a preference for "open on start" (do not open immediately).
    // - When running: allow open/close without stopping the test.
    toggle.addEventListener("change", () => {
        const isRunning = !!startBtn.disabled;
        if (!isRunning) {
            return;
        }
        if (toggle.checked) {
            openFullscreen(panel, title);
        }
        else {
            closeFullscreen();
        }
    });
    // Optional: close on stop button
    if (opts.stopButtonId && opts.closeOnStop) {
        const stopBtn = document.getElementById(opts.stopButtonId);
        if (stopBtn) {
            stopBtn.addEventListener("click", () => {
                window.setTimeout(() => {
                    if (toggle.checked) {
                        closeFullscreen();
                    }
                }, 0);
            });
        }
    }
    // Auto-close on completion panel showing
    if (opts.completionPanelId) {
        const completion = document.getElementById(opts.completionPanelId);
        if (completion) {
            const observer = new MutationObserver(() => {
                const isHidden = completion.classList.contains("hidden");
                if (!isHidden && toggle.checked) {
                    closeFullscreen();
                }
            });
            observer.observe(completion, {
                attributes: true,
                attributeFilter: ["class"],
            });
        }
    }
};
export const closeFullscreenIfEnabled = (toggleId) => {
    const toggle = getToggle(toggleId);
    if (toggle?.checked) {
        closeFullscreen();
    }
};
