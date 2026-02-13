type FullscreenOptions = {
	panelId: string;
	toggleId: string;
	startButtonId: string;
	stopButtonId?: string;
	completionPanelId?: string;
	closeOnStop?: boolean;
};

type MountedPanel = {
	panel: HTMLElement;
	placeholder: Comment;
	parent: Node;
	nextSibling: ChildNode | null;
};

type DockedElement = {
	el: HTMLElement;
	placeholder: Comment;
	parent: Node;
	nextSibling: ChildNode | null;
};

const OVERLAY_ID = "fullscreenOverlay";

const ensureOverlay = (): HTMLElement => {
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
		const target = event.target as HTMLElement | null;
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

let mounted: MountedPanel | null = null;
let docked: DockedElement | null = null;
let dockedTopAction: DockedElement | null = null;

export const isFullscreenOpen = (): boolean => {
	const overlay = document.getElementById(OVERLAY_ID);
	return !!overlay && !overlay.classList.contains("hidden");
};

export const openFullscreen = (panel: HTMLElement, title = "Live"): void => {
	const overlay = ensureOverlay();
	const body = overlay.querySelector<HTMLElement>("#fullscreenBody");
	const titleEl = overlay.querySelector<HTMLElement>("#fullscreenTitle");
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
		parent: panel.parentNode as Node,
		nextSibling: panel.nextSibling,
	};
	mounted.parent.insertBefore(mounted.placeholder, panel);

	panel.classList.add("fullscreen-live");
	body.appendChild(panel);

	// Optional UX (fullscreen only): if a panel has a "Next chord" button,
	// move it to the bottom of the panel as a normal flow element.
	const nextBtn = panel.querySelector<HTMLElement>("#btnNextChord");
	if (nextBtn) {
		docked = {
			el: nextBtn,
			placeholder: document.createComment("fullscreen-dock-placeholder"),
			parent: nextBtn.parentNode as Node,
			nextSibling: nextBtn.nextSibling,
		};
		docked.parent.insertBefore(docked.placeholder, nextBtn);
		nextBtn.classList.add("fullscreen-primary-action");

		let slot = panel.querySelector<HTMLElement>(".fullscreen-bottom-action");
		if (!slot) {
			slot = document.createElement("div");
			slot.className = "fullscreen-bottom-action";
			panel.appendChild(slot);
		}
		slot.appendChild(nextBtn);
	}

	// Also: if there's a Stop button, dock it into the top bar (easy reach on phones).
	const stopBtn =
		panel.querySelector<HTMLElement>("#btnStopDrone") ||
		panel.querySelector<HTMLElement>("#btnStopTest");
	const actions = overlay.querySelector<HTMLElement>(".fullscreen-actions");
	const closeBtn = overlay.querySelector<HTMLElement>(".fullscreen-close");
	if (stopBtn && actions && closeBtn) {
		dockedTopAction = {
			el: stopBtn,
			placeholder: document.createComment("fullscreen-topaction-placeholder"),
			parent: stopBtn.parentNode as Node,
			nextSibling: stopBtn.nextSibling,
		};
		dockedTopAction.parent.insertBefore(dockedTopAction.placeholder, stopBtn);
		stopBtn.classList.add("fullscreen-top-action");
		actions.insertBefore(stopBtn, closeBtn);
	}

	overlay.classList.remove("hidden");
	document.body.classList.add("fullscreen-open");
};

export const closeFullscreen = (): void => {
	const overlay = document.getElementById(OVERLAY_ID);
	if (!overlay) {
		return;
	}
	if (docked) {
		const { el, placeholder, parent, nextSibling } = docked;
		el.classList.remove("fullscreen-primary-action");
		if (nextSibling) {
			parent.insertBefore(el, nextSibling);
		} else {
			parent.appendChild(el);
		}
		placeholder.remove();
		docked = null;
	}
	if (dockedTopAction) {
		const { el, placeholder, parent, nextSibling } = dockedTopAction;
		el.classList.remove("fullscreen-top-action");
		if (nextSibling) {
			parent.insertBefore(el, nextSibling);
		} else {
			parent.appendChild(el);
		}
		placeholder.remove();
		dockedTopAction = null;
	}
	if (mounted) {
		const { panel, placeholder, parent, nextSibling } = mounted;
		panel.classList.remove("fullscreen-live");
		if (nextSibling) {
			parent.insertBefore(panel, nextSibling);
		} else {
			parent.appendChild(panel);
		}
		placeholder.remove();
		mounted = null;
	}
	overlay.classList.add("hidden");
	document.body.classList.remove("fullscreen-open");
};

const getToggle = (toggleId: string): HTMLInputElement | null => {
	return document.getElementById(toggleId) as HTMLInputElement | null;
};

export const initFullscreenLive = (opts: FullscreenOptions): void => {
	ensureOverlay();

	const panel = document.getElementById(opts.panelId) as HTMLElement | null;
	const toggle = getToggle(opts.toggleId);
	const startBtn = document.getElementById(opts.startButtonId) as
		| HTMLButtonElement
		| null;

	if (!panel || !toggle || !startBtn) {
		return;
	}

	const title = panel.querySelector("h2")?.textContent?.trim() || "Live";

	// Start → open fullscreen if enabled (do not interrupt the test)
	startBtn.addEventListener(
		"click",
		() => {
			if (toggle.checked) {
				// Let the click handler start the test first, then open.
				window.setTimeout(() => openFullscreen(panel, title), 0);
			}
		},
		{ capture: true },
	);

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
		} else {
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

export const closeFullscreenIfEnabled = (toggleId: string): void => {
	const toggle = getToggle(toggleId);
	if (toggle?.checked) {
		closeFullscreen();
	}
};
