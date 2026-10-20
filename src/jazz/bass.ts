export const strings = [
  { name: "G", midi: 43 },
  { name: "D", midi: 38 },
  { name: "A", midi: 33 },
  { name: "E", midi: 28 },
];
export interface Position {
  string: string;
  fret: number;
  midi: number;
}
export function bassPositions(midi: number, low = 0, high = 12): Position[] {
  if (
    !Number.isInteger(low) ||
    !Number.isInteger(high) ||
    low < 0 ||
    high > 24 ||
    low > high
  )
    throw new Error("Choose a fret range between 0 and 24.");
  return strings.flatMap((string) => {
    const fret = midi - string.midi;
    return fret >= low && fret <= high
      ? [{ string: string.name, fret, midi }]
      : [];
  });
}
export function bassTarget(
  pc: number,
  low: number,
  high: number,
  fretLow: number,
  fretHigh: number,
): number {
  const candidates = Array.from({ length: 128 }, (_, n) => n).filter(
    (n) =>
      n >= low &&
      n <= high &&
      n % 12 === pc &&
      bassPositions(n, fretLow, fretHigh).length,
  );
  if (!candidates.length)
    throw new Error(
      "This pitch is outside the selected bass position and register. Widen the fret or bass range.",
    );
  return candidates.sort(
    (a, b) => Math.abs(a - (low + high) / 2) - Math.abs(b - (low + high) / 2),
  )[0];
}
