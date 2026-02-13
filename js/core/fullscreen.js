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
			<div class="fullscreen-topbar">
				<div class="fullscreen-title" id="fullscreenTitle">Live</div>
				<div class="fullscreen-actions">
					<button type="button" class="ghost fullscreen-close" data-fs-close>
						Close
					</button>
				</div>
			</div>
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
export const isFullscreenOpen = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    return !!overlay && !overlay.classList.contains("hidden");
};
export const openFullscreen = (panel, title = "Live") => {
    const overlay = ensureOverlay();
    const body = overlay.querySelector("#fullscreenBody");
    const titleEl = overlay.querySelector("#fullscreenTitle");
    if (!body || !titleEl) {
        return;
    }
    if (mounted?.panel === panel && isFullscreenOpen()) {
        return;
    }
    // If another panel is mounted, restore it first.
    if (mounted) {
        closeFullscreen();
    }
    titleEl.textContent = title;
    mounted = {
        panel,
        placeholder: document.createComment("fullscreen-placeholder"),
        parent: panel.parentNode,
        nextSibling: panel.nextSibling,
    };
    mounted.parent.insertBefore(mounted.placeholder, panel);
    panel.classList.add("fullscreen-live");
    body.appendChild(panel);
    overlay.classList.remove("hidden");
    document.body.classList.add("fullscreen-open");
};
export const closeFullscreen = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
        return;
    }
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
    // Toggle can open/close while running
    toggle.addEventListener("change", () => {
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
