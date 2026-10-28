import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const base = "http://127.0.0.1:4173/";
try {
  for (const route of ["", "degree-trainer/", "jazz-ear-lab/"]) {
    await page.goto(base + route);
    await page.locator(".app-shell").waitFor();
    assert.equal(
      await page
        .locator('.app-navigation [data-route="home"]')
        .getAttribute("href"),
      base + "jazz-ear-lab-v2/#home",
    );
    assert.equal(
      await page.locator(".app-brand").getAttribute("href"),
      base + "jazz-ear-lab-v2/#home",
    );
  }
  await page.goto(base);
  await page.locator('a.tool-card[href="jazz-ear-lab-v2/"]').click();
  await page
    .getByRole("article", { name: "Single Chord · Degree Recognition", exact: true })
    .getByRole("button", { name: "Start", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Legacy", exact: true }).click();
  await page.locator("#mode-library article").first().waitFor();
  assert.equal(await page.locator("#mode-library article").count(), 7);
  await page.locator('.app-navigation [data-route="history"]').click();
  await page.waitForURL(/#\/history$/);
  await page.goto(base);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#app-nav-toggle").click();
  await page.locator('.app-navigation [data-route="home"]').click();
  await page.waitForURL(/jazz-ear-lab-v2\/#home$/);
  await page
    .getByRole("article", { name: "Single Chord · Degree Audiation", exact: true })
    .getByRole("button", { name: "Start", exact: true })
    .waitFor();
  console.log(
    "Entry passed: home card, desktop/mobile Practice and brand open V2; V1 remains reachable with seven modes and history.",
  );
} finally {
  await browser.close();
}
