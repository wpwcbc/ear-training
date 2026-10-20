import assert from "node:assert/strict";
import { configure, ready, navigate, labURL } from "./browser-support.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(labURL);
  await page.evaluate(() =>
    localStorage.setItem("eartrain:questionHistory", "preserve-me"),
  );
  await configure(page, { mode: "m1", degree: "9" });
  await ready(page);
  assert.equal(await page.locator("#answer").isVisible(), false);
  await page.locator("#reveal").click();
  assert.match(await page.locator("#answer").innerText(), /E = 9/);
  await page.locator("[data-grade=correct]").click();
  await configure(page, { mode: "m3" });
  await ready(page);
  for (const [i, degree] of ["b3", "b7", "11"].entries())
    await page.locator("#choices select").nth(i).selectOption(degree);
  await page.locator("#reveal").click();
  assert.match(await page.locator("#status").innerText(), /Correct/);
  await configure(page, { mode: "m4", progression: "major-c" });
  await ready(page);
  assert.deepEqual(
    await page.evaluate(() => window.audioCalls.map((c) => c.chords)),
    [["Dm7"]],
  );
  await page.locator("#pause").click();
  assert.equal(await page.locator("#reveal").isDisabled(), true);
  await page.locator("#pause").click();
  await page.locator("#reveal").click();
  assert.deepEqual(
    await page.evaluate(() => window.audioCalls.map((c) => c.chords)),
    [["Dm7"], ["G7"]],
  );
  assert.match(await page.locator("#answer").innerText(), /B = 3/);
  await page.locator("[data-grade=close]").click();
  await page.locator("#next").click();
  assert.equal(await page.evaluate(() => window.audioCalls.length), 2);
  await page.locator("#replay").click();
  await ready(page);
  assert.deepEqual(await page.evaluate(() => window.audioCalls.at(-1).chords), [
    "G7",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.reload();
  assert.equal(await page.locator("#mode").inputValue(), "m4");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("eartrain:questionHistory")),
    "preserve-me",
  );
  await navigate(page, "suggested");
  assert.equal(await page.locator("#path-list article").count(), 7);
  assert.equal(
    await page.locator("#path-list article button:disabled").count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Core browser checks passed: M1 reveal, M3 recognition, M4 audio ordering/pause/replay, reload, unlocked path and mobile layout.",
  );
} finally {
  await browser.close();
}
