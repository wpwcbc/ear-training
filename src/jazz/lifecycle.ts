import {
  defaults,
  generate,
  validateConfig,
  type Config,
  type Session,
  type StorageLike,
  type Challenge,
} from "./model.js";
import type { Progression } from "./progressions.js";

export const flowKeys = {
  recent: "jazzEarLab:v1:recentConfigs",
  presets: "jazzEarLab:v1:savedPresets",
  draft: "jazzEarLab:v1:wizardDraft",
};
export const generatorVersion = "jazz-ux-1";
export interface Preset {
  id: string;
  name: string;
  config: Config;
  customs: Progression[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}
export interface Recent {
  configHash: string;
  config: Config;
  customs: Progression[];
  lastUsedAt: string;
  useCount: number;
  source: string;
}
export function readList<T>(storage: StorageLike, key: string): T[] {
  const value = storage.getItem(key);
  if (!value) return [];
  const data: unknown = JSON.parse(value);
  if (!Array.isArray(data))
    throw new Error(
      "Saved data has an unsupported format. Existing data was preserved.",
    );
  return data as T[];
}
export function canonicalizeConfig(config: Config): string {
  // Volume does not change musical material; pool order matters only for root cycles.
  const value: Record<string, unknown> = { ...defaults, ...config };
  delete value.volume;
  for (const key of ["qualityPool", "degreePool", "progressionPool"]) {
    if (Array.isArray(value[key]))
      value[key] = [...new Set(value[key] as string[])].sort();
  }
  if (config.rootOrder === "random" || config.rootOrder === "fifths")
    value.roots = [...new Set(config.roots.split(/[\s,]+/).filter(Boolean))]
      .sort()
      .join(" ");
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, value[key]]),
    ),
  );
}
export function rememberConfig(
  storage: StorageLike,
  config: Config,
  customs: Progression[],
  source: string,
): void {
  const configHash = canonicalizeConfig(config);
  const all = readList<Recent>(storage, flowKeys.recent);
  const previous = all.find((r) => r.configHash === configHash);
  const item: Recent = {
    configHash,
    config: structuredClone(config),
    customs: structuredClone(customs),
    source,
    lastUsedAt: new Date().toISOString(),
    useCount: (previous?.useCount ?? 0) + 1,
  };
  storage.setItem(
    flowKeys.recent,
    JSON.stringify(
      [item, ...all.filter((r) => r.configHash !== configHash)].slice(0, 20),
    ),
  );
}
export function seededRandom(seed: string, index: number): () => number {
  let state = 2166136261;
  for (const character of `${seed}:${index}`)
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function sessionQuestion(session: Session, index: number): Challenge {
  session.questions ??= [];
  if (!session.questions[index])
    session.questions[index] = generate(
      session.config,
      index,
      session.customSnapshot ?? [],
      seededRandom(session.rngSeed ?? session.id, index),
    );
  return structuredClone(session.questions[index]);
}
export function createSession(
  config: Config,
  customs: Progression[],
  source: string,
  presetId?: string,
): Session {
  const checked = validateConfig(config, customs);
  if (checked.progressionPool)
    for (const progression of checked.progressionPool)
      generate(
        { ...checked, progression, progressionPool: undefined },
        0,
        customs,
        seededRandom("validate", 0),
      );
  const session: Session = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    mode: checked.mode,
    config: structuredClone(checked),
    customSnapshot: structuredClone(customs),
    questionCount: checked.count,
    totalTime: 0,
    completedCount: 0,
    records: [],
    timeSource: "active-session",
    status: "active",
    source,
    sourcePresetId: presetId,
    rngSeed: crypto.randomUUID(),
    generatorVersion,
    questions: [],
  };
  // Validate the complete finite session before navigating or updating Recent.
  for (let i = 0; i < (checked.count || 1); i++) sessionQuestion(session, i);
  return session;
}
export function sessionStatus(session: Session): string {
  return (
    session.status ??
    (session.questionCount > 0 &&
    session.completedCount >= session.questionCount
      ? "completed"
      : "abandoned")
  );
}
export function missedQuestions(session: Session): Challenge[] {
  const indices = new Set(
    session.records
      .filter(
        (r) =>
          !r.referenceAssisted &&
          ["missed", "close", "skipped"].includes(r.grade),
      )
      .map((r) => r.questionIndex),
  );
  return (session.questions ?? []).filter((_, i) => indices.has(i));
}
