import {
	CHORD_VOICE_VELOCITIES,
	LEAD_VELOCITY_DEFAULT,
} from "../core/constants.js";
import { dom } from "./dom.js";
import { state, STORAGE_KEYS } from "./state.js";
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
		return {
			root: clampVelocity(parsed.root ?? defaults.root, defaults.root),
			fifth: clampVelocity(parsed.fifth ?? defaults.fifth, defaults.fifth),
			seventh: clampVelocity(
				parsed.seventh ?? defaults.seventh,
				defaults.seventh,
			),
			third: clampVelocity(parsed.third ?? defaults.third, defaults.third),
			lead: clampVelocity(parsed.lead ?? defaults.lead, defaults.lead),
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
	lead: state.cachedLeadVelocity,
});

const saveVelocitySettings = (): void => {
	const settings = collectVelocitySettings();
	localStorage.setItem(STORAGE_KEYS.velocityMix, JSON.stringify(settings));
};

export const initVelocityControls = (): void => {
	const saved = loadVelocitySettings();
	const items = [
		{
			key: "root",
			input: dom.elVelocityRoot,
			label: dom.elVelocityRootValue,
			defaultValue: CHORD_VOICE_VELOCITIES.root,
		},
		{
			key: "fifth",
			input: dom.elVelocityFifth,
			label: dom.elVelocityFifthValue,
			defaultValue: CHORD_VOICE_VELOCITIES.fifth,
		},
		{
			key: "seventh",
			input: dom.elVelocitySeventh,
			label: dom.elVelocitySeventhValue,
			defaultValue: CHORD_VOICE_VELOCITIES.seventh,
		},
		{
			key: "third",
			input: dom.elVelocityThird,
			label: dom.elVelocityThirdValue,
			defaultValue: CHORD_VOICE_VELOCITIES.third,
		},
	] as const;

	state.cachedLeadVelocity = saved.lead ?? LEAD_VELOCITY_DEFAULT;

	items.forEach((item) => {
		const initial = saved[item.key] ?? item.defaultValue;
		item.input.value = String(initial);
		item.label.textContent = formatVelocity(initial);
		item.input.addEventListener("input", () => {
			item.label.textContent = formatVelocity(Number(item.input.value));
			saveVelocitySettings();
		});
	});
};
