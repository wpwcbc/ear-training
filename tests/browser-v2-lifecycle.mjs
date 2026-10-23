import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
const url = `${process.env.BASE_URL || "http://127.0.0.1:4173"}/jazz-ear-lab-v2/`;
const latest = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1),
  );
async function start() {
  await page.goto(url);
  await page.evaluate(async () => {
    const { builtins, keys } = await import("/js/v2/model.js");
    localStorage.setItem(
      keys.presets,
      JSON.stringify([
        {
          ...builtins[0],
          config: {
            ...builtins[0].config,
            roots: ["G"],
            qualities: ["7"],
            targetMode: "exact",
            targets: ["b3"],
            autoAdvance: true,
            count: 0,
          },
        },
      ]),
    );
  });
  await page.reload();
  await page
    .locator('[data-preset-id="recognition-guides"]')
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector(".answers button:enabled"),
  );
}
try {
  await start();
  await page.evaluate(() => {
    const wrong = [...document.querySelectorAll(".answers button")].find(
      (b) => b.textContent === "5",
    );
    wrong.click();
    wrong.click();
  });
  assert.equal(
    (await latest()).attempts[0].retryCount,
    0,
    "queued clicks on a removed answer are not educational retries",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await start();
  await page.getByRole("button", { name: "b3", exact: true }).click();
  const first = (await latest()).attempts[0];
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.waitForTimeout(1400);
  assert.equal(
    (await latest()).attempts.length,
    1,
    "Replay cancels the old fast confirmation transition",
  );
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("jazzEarLab:v2:sessions")).at(-1).attempts
        .length === 2,
  );
  const replayed = (await latest()).attempts[0];
  assert.equal(replayed.replaysAfterFirst, 1);
  for (const key of [
    "firstAnswer",
    "firstCorrect",
    "firstResponseMs",
    "retryCount",
    "replaysBeforeFirst",
  ])
    assert.deepEqual(replayed[key], first[key]);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const stopped = await latest();
  await page.waitForTimeout(2800);
  assert.deepEqual(
    await latest(),
    stopped,
    "stopped session cannot receive a stale transition",
  );
  console.log(
    "V2 lifecycle passed: stale queued actions are ignored; resolved Replay gets its own full completion gate and preserves first evidence; Stop cancels remaining work.",
  );
} finally {
  await browser.close();
}
