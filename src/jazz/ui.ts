export function icon(element: HTMLElement, name: string, only = false): void {
  element.style.setProperty("--icon", `url("icons/${name}.svg")`);
  element.classList.add("with-icon");
  element.classList.toggle("icon-only", only);
  if (only) {
    const label = element.textContent?.trim() || "More actions";
    element.setAttribute("aria-label", label);
    element.title = label;
  }
}
export function commandIcon(element: HTMLElement): void {
  const label = element.textContent?.trim() ?? "";
  const icons: [RegExp, string][] = [
    [/^(Practice|Start|Resume|Play|Review & Practice)/, "play"],
    [/^(Edit|Customize|Rename)/, "pencil"],
    [/^(Save|Favorite|Unfavorite)/, "bookmark"],
    [/^(Back|Exit)/, "arrow-left"],
    [/^(Continue|Next)/, "arrow-right"],
    [/^(Review Missed|Replay|Repeat|Reset)/, "rotate-ccw"],
    [/^Duplicate/, "copy"],
    [/^Delete/, "trash-2"],
  ];
  const match = icons.find(([pattern]) => pattern.test(label));
  if (match) icon(element, match[1]);
}
export function relativeDate(value?: string): string {
  if (!value) return "Not practiced yet";
  const date = new Date(value);
  const today = new Date();
  const days = Math.floor(
    (new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86400000,
  );
  return days === 0
    ? "Today"
    : days === 1
      ? "Yesterday"
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export function duration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return total < 60 ? `${total}s` : `${Math.floor(total / 60)}m ${total % 60}s`;
}
