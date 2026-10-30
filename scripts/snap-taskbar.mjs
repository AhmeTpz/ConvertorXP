import { _electron as electron } from "playwright";
import path from "node:path";
import os from "node:os";

async function main() {
  const tmpDir = path.join(os.tmpdir(), "cxp-snap-" + Date.now());
  const app = await electron.launch({
    args: [".", `--user-data-dir=${tmpDir}`],
  });
  const page = await app.firstWindow();
  await page.waitForSelector(".taskbar");

  // Screenshot the right side of the taskbar (from trayLangBand through tray)
  const langBand = await page.locator("#trayLangBand").boundingBox();
  const tray = await page.locator(".tray").boundingBox();

  if (langBand && tray) {
    const x = Math.min(langBand.x, tray.x) - 10;
    const y = Math.min(langBand.y, tray.y);
    const width = tray.x + tray.width - x + 5;
    const height = Math.max(langBand.height, tray.height);

    await page.screenshot({
      path: "C:/Users/ahmet/.gemini/antigravity/brain/6217bb33-9c15-4045-8abf-1dc2b0219f2c/tray-lang-crop.png",
      clip: { x, y, width, height },
    });
    console.log("Tray crop saved: x=", x, "w=", width);
  }

  await app.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
