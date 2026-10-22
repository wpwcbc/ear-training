export type InsightsLocale = "en" | "zh-Hant";
const qualityNames: Record<string, [string, string]> = {
  "7": ["Dominant seventh", "屬七和弦"],
  m7: ["Minor seventh", "小七和弦"],
  maj7: ["Major seventh", "大七和弦"],
  m7b5: ["Half-diminished seventh", "半減七和弦"],
};
export const degreeName = (degree: string) => degree.replace(/^b/, "♭");
export function qualityName(quality: string, locale: InsightsLocale = "en") {
  return qualityNames[quality]?.[locale === "zh-Hant" ? 1 : 0] ?? quality;
}
export function focusName(label: string, locale: InsightsLocale = "en") {
  const parts = label.split(" / ");
  if (parts.length < 2 || parts.length > 3) return label;
  const degree = parts.pop()!,
    quality = parts.pop()!;
  if (!qualityNames[quality]) return label;
  return [parts[0], qualityName(quality, locale), degreeName(degree)]
    .filter(Boolean)
    .join(" · ");
}
const labels = {
  overview: ["Overview", "總覽"],
  exercise: ["Exercise", "練習"],
  allExercises: ["All exercises", "所有練習"],
  period: ["Period", "期間"],
  last7: ["Last 7 days", "最近 7 天"],
  last28: ["Last 28 days", "最近 28 天"],
  last90: ["Last 90 days", "最近 90 天"],
  allRetained: ["All retained", "全部保留紀錄"],
  filters: ["Filters", "篩選"],
  source: ["Assessment source", "評分來源"],
  task: ["Task", "任務"],
  self: ["Self-assessed production", "自評唱奏"],
  sort: ["Sort", "排序"],
  musicalOrder: ["Musical order", "音樂順序"],
  rateHigh: ["Rate: high to low", "比例：由高至低"],
  rateLow: ["Rate: low to high", "比例：由低至高"],
  sampleHigh: ["Sample: high to low", "樣本數：由多至少"],
  sampleLow: ["Sample: low to high", "樣本數：由少至多"],
  quality: ["Quality / context", "和弦品質 / 情境"],
  qualityDegree: ["Quality / degree", "和弦品質 / 音級"],
  degree: ["Degree", "音級"],
  metric: ["Metric", "指標"],
  correctN: ["Correct / n", "正確 / 題數"],
  grades: ["Grades: correct / close / missed", "評分：正確 / 接近 / 未達標"],
  evidence: ["Evidence", "證據"],
  daysSessions: ["Days / sessions", "日期數 / 練習節數"],
  settings: ["Settings", "設定"],
  details: ["Details", "詳情"],
  summaryLanguage: ["Summary language", "語言"],
  morePractice: ["More practice options", "其他練習選項"],
  worthChecking: ["Worth checking", "值得檢查"],
  priorities: ["Supported priorities", "有證據支持的優先項目"],
  collect: ["Collect more evidence", "收集更多證據"],
  retainedRatings: [
    "Retained self-ratings: correct / close / missed",
    "保留自評：正確 / 接近 / 未達標",
  ],
  independent: ["Independent fresh questions", "獨立首次題數"],
  localDays: ["Dated local days", "本地日曆日數"],
  reconciliation: ["How these counts reconcile", "數字如何對應"],
  cellDetails: ["Cell details", "格子詳情"],
  selectContext: ["Select an observed context.", "選擇一個已記錄的情境。"],
  closeCell: ["Close cell", "關閉詳情"],
  viewEvidence: ["View Evidence", "查看證據"],
  gates: ["Evidence gates", "證據門檻"],
  root: ["Root drilldown", "根音細分"],
  allRoots: ["All observed roots", "所有已記錄根音"],
  applyRoot: ["Apply root to page", "套用根音至整頁"],
  about: ["About these results", "關於這些結果"],
  data: ["Data & Diagnostics", "資料及診斷"],
  daily: [
    "Daily values and sample sizes (no-data days are gaps)",
    "每日數值與樣本數（沒有資料的日期留空）",
  ],
  periods: ["Comparable periods", "可比較期間"],
  boundary: ["Comparison window boundaries", "比較期間範圍"],
  timing: [
    "Standardized timing not recorded for these results.",
    "這些結果沒有標準化計時紀錄。",
  ],
  noPrior: [
    "Outcome results are available. No matched prior period is available for this selection.",
    "已有結果可供查看；這項選擇沒有可配對的過往期間。",
  ],
  why: ["Why?", "原因"],
} as const;
export function localizeLabels(root: HTMLElement, locale: InsightsLocale) {
  if (locale !== "zh-Hant") return;
  const dictionary = new Map<string, string>(
    Object.values(labels).map(([en, zh]) => [en, zh]),
  );
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    const translation = dictionary.get(text.nodeValue?.trim() ?? "");
    if (translation) text.nodeValue = translation;
  }
  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>("[aria-label], [title]"),
  ))
    for (const attribute of ["aria-label", "title"]) {
      const translation = dictionary.get(element.getAttribute(attribute) ?? "");
      if (translation) element.setAttribute(attribute, translation);
    }
}
