import {
	CHORD_VOICE_VELOCITIES,
	LEAD_VELOCITY_DEFAULT,
} from "../core/constants.js";
import { dom } from "./dom.js";
import { STORAGE_KEYS } from "./state.js";
import type { VelocitySettings } from "./types.js";

const clampVelocity = (value: number, fallback: number): number => {
	if (!Number.isFinite(value)) {
		return fallback;
	}
	return Math.min(1, Math.max(0, value));
};

const formatVelocity = (value: number): string =>
	clampVelocity(value, 0).toFixed(2);

const readVelocity = (input: HTMLInputElement, fallback: number): number =>
	clampVelocity(Number(input.value), fallback);

const loadVelocitySettings = (): VelocitySettings => {
	const defaults: VelocitySettings = {
		root: CHORD_VOICE_VELOCITIES.root,
		fifth: CHORD_VOICE_VELOCITIES.fifth,
		seventh: CHORD_VOICE_VELOCITIES.seventh,
		third: CHORD_VOICE_VELOCITIES.third,
		lead: LEAD_VELOCITY_DEFAULT,
	};
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.velocityMix);
		if (!raw) {
			return defaults;
		}
		const parsed = JSON.parse(raw) as Partial<VelocitySettings>;
		if (!parsed || typeof parsed !== "object") {
			return defaults;
		}
		return {
			root: clampVelocity(Number(parsed.root), defaults.root),
			fifth: clampVelocity(Number(parsed.fifth), defaults.fifth),
			seventh: clampVelocity(Number(parsed.seventh), defaults.seventh),
			third: clampVelocity(Number(parsed.third), defaults.third),
			lead: clampVelocity(Number(parsed.lead), defaults.lead),
		};
	} catch {
		return defaults;
	}
};

export const collectVelocitySettings = (): VelocitySettings => ({
	root: readVelocity(dom.elVelocityRoot, CHORD_VOICE_VELOCITIES.root),
	fifth: readVelocity(dom.elVelocityFifth, CHORD_VOICE_VELOCITIES.fifth),
	seventh: readVelocity(dom.elVelocitySeventh, CHORD_VOICE_VELOCITIES.seventh),
	third: readVelocity(dom.elVelocityThird, CHORD_VOICE_VELOCITIES.third),
	lead: readVelocity(dom.elVelocityLead, LEAD_VELOCITY_DEFAULT),
});

const saveVelocitySettings = (): void => {
	const settings = collectVelocitySettings();
	localStorage.setItem(STORAGE_KEYS.velocityMix, JSON.stringify(settings));
};

export const initVelocityControls = (): void => {
	const saved = loadVelocitySettings();
	const items: Array<{
		input: HTMLInputElement;
		label: HTMLSpanElement;
		key: keyof VelocitySettings;
	}> = [
		{
			input: dom.elVelocityRoot,
			label: dom.elVelocityRootValue,
			key: "root",
		},
		{
			input: dom.elVelocityFifth,
			label: dom.elVelocityFifthValue,
			key: "fifth",
		},
		{
			input: dom.elVelocitySeventh,
			label: dom.elVelocitySeventhValue,
			key: "seventh",
		},
		{
			input: dom.elVelocityThird,
			label: dom.elVelocityThirdValue,
			key: "third",
		},
		{
			input: dom.elVelocityLead,
			label: dom.elVelocityLeadValue,
			key: "lead",
		},
	];

	items.forEach((item) => {
		const initial = saved[item.key];
		item.input.value = String(initial);
		item.label.textContent = formatVelocity(initial);
		item.input.addEventListener("input", () => {
			item.label.textContent = formatVelocity(Number(item.input.value));
			saveVelocitySettings();
		});
	});
};
