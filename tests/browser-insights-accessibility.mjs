import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { labURL, navigate } from "./browser-support.mjs";
import { assessment, supportedParent, now } from "./summary-fixtures.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const profile = await mkdtemp(path.join(os.tmpdir(), "jazz-insights-zoom-"));
const extension = path.resolve("tests/fixtures/zoom-extension");
const context = await chromium.launchPersistentContext(profile, {
  channel: "msedge",
  headless: true,
  viewport: { width: 1280, height: 900 },
  args: [
    "--disable-extensions-except=" + extension,
    "--load-extension=" + extension,
  ],
});
const page = context.pages()[0];
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  await page.clock.setFixedTime(new Date(now));
  await page.goto(labURL + "#/insights");
  await page.locator(".smart-summary").waitFor();
  await page.evaluate(async (rows) => {
    const r = await import("/js/jazz/analytics/repository.js");
    for (const row of rows) await r.put("assessments", row);
  }, supportedParent());
  await navigate(page, "insights/m1?days=all");
  await page.locator(".aggregate-matrix").waitFor();
  const zoom = await worker.evaluate(async () => {
    const tab = (await chrome.tabs.query({})).find((t) =>
      t.url?.includes("jazz-ear-lab"),
    );
    await chrome.tabs.setZoom(tab.id, 2);
    return chrome.tabs.getZoom(tab.id);
  });
  assert.equal(zoom, 2);
  for (const width of [1280, 780, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForFunction(
      (expected) => innerWidth === expected,
      Math.round(width / 2),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "200% browser zoom overflow at physical width " + width,
    );
  }
  await page.setViewportSize({ width: 780, height: 1000 });
  await page.locator(".aggregate-matrix [data-cell-id]").first().focus();
  await page.keyboard.press("Enter");
  await page.locator("#selected-cell").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator("#selected-cell").press("Escape");
  const cdp = await context.newCDPSession(page);
  // Native zoom makes Playwright's CSS-based full-page clip inaccurate.
  const capture = async (filename) => {
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const visiblePixels = await page.evaluate(async (data) => {
      const img = new Image();
      img.src = "data:image/png;base64," + data;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 16)
        if (
          Math.abs(pixels[i] - pixels[0]) +
            Math.abs(pixels[i + 1] - pixels[1]) +
            Math.abs(pixels[i + 2] - pixels[2]) >
          60
        )
          count++;
      return count;
    }, shot.data);
    assert.ok(
      visiblePixels > 100,
      "Screenshot must contain rendered content, not a blank surface",
    );
    await writeFile(
      path.join(os.tmpdir(), filename),
      Buffer.from(shot.data, "base64"),
    );
  };
  for (const type of ["deuteranopia", "protanopia", "achromatopsia"]) {
    await cdp.send("Emulation.setEmulatedVisionDeficiency", { type });
    assert.match(await page.locator("#skill-stats").innerText(), /25\/50/);
    assert.ok(await page.locator(".aggregate-matrix [data-cell-id]").count());
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(100);
    await capture("jazz-insights-" + type + "-200pct.png");
    await page.evaluate(() =>
      scrollTo(
        0,
        document.querySelector(".aggregate-matrix").getBoundingClientRect()
          .top +
          scrollY -
          30,
      ),
    );
    await page.waitForTimeout(100);
    await capture("jazz-insights-" + type + "-matrix-200pct.png");
  }
  await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "none" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const performance = await page.evaluate(
    async ({ base, fixedNow }) => {
      const { computeSummary } =
        await import("/js/jazz/analytics/summary/client.js");
      const rows = Array.from({ length: 10000 }, (_, i) => ({
        ...base,
        id: "throttle:" + i,
        questionId: "throttle:q" + i,
        sessionId: "throttle:s" + (i % 5),
        createdAt: new Date(fixedNow - (i % 5) * 86400000 - 1000).toISOString(),
        record: { ...base.record, grade: i % 2 ? "correct" : "missed" },
      }));
      const query = {
        mode: "m1",
        subtask: "produce",
        source: "self",
        metricId: "outcome",
        startInclusive: null,
        endExclusive: new Date(fixedNow).toISOString(),
        timezone: "Asia/Hong_Kong",
        exposure: "fresh",
        assistance: "none",
        dataVersions: ["standard", "historical"],
        contextFilters: {},
      };
      let ticks = 0;
      const timer = setInterval(() => ticks++, 20),
        start = globalThis.performance.now();
      const result = await computeSummary(rows, query, fixedNow, rows);
      clearInterval(timer);
      return {
        elapsedMs: Math.round(globalThis.performance.now() - start),
        ticks,
        n: result.reconciliation.diagnostic,
      };
    },
    { base: assessment(0), fixedNow: now },
  );
  assert.equal(performance.n, 10000);
  assert.ok(performance.ticks > 2);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  assert.deepEqual(errors, []);
  console.log(
    "Actual 200% browser zoom and vision-emulation checks passed; physical widths 1280/780/390, CSS widths 640/390/195.",
  );
  console.log(
    "4x CDP CPU-throttled diagnostic (simulation, not physical mid-range hardware):",
    { cpu: os.cpus()[0]?.model, ...performance },
  );
} finally {
  await context.close();
  assert.equal(path.dirname(profile), path.resolve(os.tmpdir()));
  assert.ok(path.basename(profile).startsWith("jazz-insights-zoom-"));
  await rm(profile, { recursive: true, force: true });
}
