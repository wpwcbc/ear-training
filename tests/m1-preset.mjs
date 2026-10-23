export async function seedM1Preset(page, overrides) {
  await page.evaluate(async (overrides) => {
    const { builtins, keys } = await import("/js/v2/model.js");
    localStorage.setItem(
      keys.presets,
      JSON.stringify([
        {
          ...builtins[0],
          config: {
            ...builtins[0].config,
            exercise: "m1",
            roots: ["G"],
            qualities: ["7"],
            targetMode: "exact",
            targets: ["3"],
            ...overrides,
          },
        },
      ]),
    );
  }, overrides);
  await page.reload();
}
