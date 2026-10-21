export const labURL = "http://127.0.0.1:4173/jazz-ear-lab/";
export async function configure(page, config, customs) {
  await page.goto(labURL + "#/home");
  await page.evaluate(
    async ({ config, customs }) => {
      const { defaults } = await import("/js/jazz/model.js");
      localStorage.setItem(
        "jazzEarLab:v1:wizardDraft",
        JSON.stringify({
          schemaVersion: 1,
          config: { ...defaults, bpm: 240, beats: 1, count: 5, ...config },
          customs:
            customs ??
            JSON.parse(
              localStorage.getItem("jazzEarLab:v1:progressions") || "[]",
            ),
          step: 4,
          maxStep: 4,
        }),
      );
    },
    { config, customs },
  );
  await page.goto(labURL + "#/setup/5");
  await page.reload();
  await page.evaluate(async () => {
    const { AudioEngine } = await import("/js/jazz/audio.js");
    const play = AudioEngine.prototype.play,
      stop = AudioEngine.prototype.stop;
    window.audioCalls = [];
    window.audioStops = 0;
    AudioEngine.prototype.play = function (
      targets,
      config,
      melody,
      melodyOnly,
      options,
    ) {
      window.engine = this;
      window.audioCalls.push({
        chords: targets.map((t) => t.chord.symbol),
        midis: targets.map((t) => t.midi),
        seconds: targets.map((t) => t.secondMidi),
        beats: targets.map((t) => t.beats),
        melody,
        options,
      });
      return play.call(this, targets, config, melody, melodyOnly, options);
    };
    AudioEngine.prototype.stop = function () {
      window.audioStops++;
      return stop.call(this);
    };
  });
  await page.locator("#wizard-next").click();
  await page.waitForURL(/#\/session\/[^/]+$/);
  if ((config.mode ?? "m1") !== "m1") await page.locator("#start").click();
}
export const ready = (page) =>
  page.waitForFunction(() => !document.getElementById("reveal").disabled);
export async function navigate(page, route) {
  await page.evaluate((route) => {
    location.hash = "#/" + route;
  }, route);
  await page.waitForURL((url) => url.hash === "#/" + route);
}
