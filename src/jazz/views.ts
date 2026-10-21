import { strings } from "./bass.js";
import { type Phrase, phraseNoteName } from "./phrases.js";
const names = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export function drawBass(
  container: HTMLElement,
  low: number,
  high: number,
  showNames: boolean,
  target: number | undefined,
  selected: number | undefined,
  onSelect: (
    midi: number,
    position: { string: string; fret: number; midi: number },
  ) => void,
): void {
  container.replaceChildren();
  const table = document.createElement("table");
  table.className = "fretboard";
  const head = document.createElement("tr");
  head.append(document.createElement("th"));
  for (let fret = low; fret <= high; fret++) {
    const th = document.createElement("th");
    th.textContent = String(fret);
    head.append(th);
  }
  const thead = document.createElement("thead");
  thead.append(head);
  table.append(thead);
  const body = document.createElement("tbody");
  strings.forEach((string) => {
    const row = document.createElement("tr"),
      label = document.createElement("th");
    label.textContent = string.name;
    label.scope = "row";
    row.append(label);
    for (let fret = low; fret <= high; fret++) {
      const midi = string.midi + fret,
        cell = document.createElement("td"),
        button = document.createElement("button");
      button.className =
        "fret" +
        (target === midi ? " target" : "") +
        (selected === midi ? " picked" : "");
      button.textContent = showNames
        ? names[midi % 12]
        : target === midi
          ? "●"
          : [3, 5, 7, 9, 12, 15, 17, 19, 21, 24].includes(fret)
            ? "·"
            : "";
      button.setAttribute(
        "aria-label",
        `${string.name} string, fret ${fret}${showNames ? ", " + names[midi % 12] : ""}`,
      );
      button.onclick = () =>
        onSelect(midi, { string: string.name, fret, midi });
      cell.append(button);
      row.append(cell);
    }
    body.append(row);
  });
  table.append(body);
  container.append(table);
}
export function drawScore(
  container: HTMLElement,
  phrase: Phrase,
  marked: Set<number>,
): void {
  container.replaceChildren();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 310;
  canvas.setAttribute(
    "aria-label",
    "Revealed phrase score; a text event table follows.",
  );
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1080, 310);
  ctx.strokeStyle = "#596b63";
  ctx.fillStyle = "#163c30";
  const total = phrase.notes.reduce((sum, n) => sum + n.beats, 0),
    width = 1000,
    origin = 50;
  for (let line = 0; line < 5; line++) {
    ctx.beginPath();
    ctx.moveTo(25, 120 + line * 10);
    ctx.lineTo(1060, 120 + line * 10);
    ctx.stroke();
  }
  let beat = 0,
    previousChord = -1;
  ctx.font = "14px Segoe UI";
  ctx.fillText("Treble / 4/4", 25, 55);
  phrase.notes.forEach((note) => {
    const name = phraseNoteName(phrase, note),
      x = origin + (beat / total) * width;
    const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[
      name[0] as "C"
    ];
    const alteration =
      (name.match(/#/g) || []).length - (name.match(/b/g) || []).length;
    const octave = Math.round((note.midi - natural - alteration) / 12) - 1;
    const step = octave * 7 + "CDEFGAB".indexOf(name[0]);
    const y = 160 - (step - 30) * 5;
    if (note.chord !== previousChord) {
      ctx.fillText(phrase.chords[note.chord], x, 25);
      ctx.beginPath();
      ctx.moveTo(x - 15, 110);
      ctx.lineTo(x - 15, 180);
      ctx.stroke();
      previousChord = note.chord;
    }
    ctx.fillStyle = note.target ? "#217558" : "#273736";
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4, -0.3, 0, Math.PI * 2);
    if (note.beats >= 2) {
      ctx.stroke();
    } else ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + 5, y - 30);
    ctx.stroke();
    if (note.beats < 1) {
      const flags = note.beats <= 0.25 ? 2 : 1;
      for (let flag = 0; flag < flags; flag++) {
        ctx.beginPath();
        ctx.moveTo(x + 5, y - 30 + flag * 6);
        ctx.lineTo(x + 13, y - 20 + flag * 6);
        ctx.stroke();
      }
    }
    if (note.beats === 0.75 || note.beats === 1.5) {
      ctx.beginPath();
      ctx.arc(x + 12, y - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (y >= 170 || y <= 110)
      for (
        let ledger = y >= 170 ? 170 : 110;
        y >= 170 ? ledger <= y : ledger >= y;
        ledger += y >= 170 ? 10 : -10
      ) {
        ctx.beginPath();
        ctx.moveTo(x - 10, ledger);
        ctx.lineTo(x + 10, ledger);
        ctx.stroke();
      }
    if (name.length > 1) ctx.fillText(name.slice(1), x - 21, y + 4);
    ctx.fillText(String(note.beats), x - 5, 290);
    beat += note.beats;
  });
  container.append(canvas);
  const table = document.createElement("table"),
    thead = document.createElement("thead"),
    tr = document.createElement("tr");
  for (const label of ["Chord", "Note", "Beats", "Role", "Your target mark"]) {
    const th = document.createElement("th");
    th.textContent = label;
    tr.append(th);
  }
  thead.append(tr);
  table.append(thead);
  const tbody = document.createElement("tbody");
  phrase.notes.forEach((note, i) => {
    const row = document.createElement("tr");
    for (const value of [
      phrase.chords[note.chord],
      phraseNoteName(phrase, note),
      String(note.beats),
      note.role,
      marked.has(i) ? "Marked" : "",
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      row.append(td);
    }
    tbody.append(row);
  });
  table.append(tbody);
  const details = document.createElement("details"),
    summary = document.createElement("summary");
  summary.textContent = "Note analysis";
  details.append(summary, table);
  container.append(details);
}
