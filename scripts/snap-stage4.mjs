import { _electron as electron } from "playwright";
import path from "node:path";
import os from "node:os";

async function main() {
  const tmpDir = path.join(os.tmpdir(), "cxp-snap4-" + Date.now());
  const app = await electron.launch({
    args: [".", `--user-data-dir=${tmpDir}`],
  });
  const page = await app.firstWindow();
  await page.waitForSelector(".taskbar");

  // 1. Taskbar crop
  const lang = await page.locator("#trayLangBand").boundingBox();
  const tray = await page.locator(".tray").boundingBox();
  if (lang && tray) {
    const x = Math.min(lang.x, tray.x) - 15;
    const y = Math.min(lang.y, tray.y);
    const width = tray.x + tray.width - x + 5;
    const height = Math.max(lang.height, tray.height);
    await page.screenshot({
      path: "C:/Users/ahmet/.gemini/antigravity/brain/6217bb33-9c15-4045-8abf-1dc2b0219f2c/taskbar-authentic-lang.png",
      clip: { x, y, width, height },
    });
  }

  // 2. Open Paint from Start Menu
  await page.click("#start");
  await page.click("[data-start='paint']");
  await page.waitForSelector(".xp-paint-studio");
  await page.waitForTimeout(500);

  await page.screenshot({
    path: "C:/Users/ahmet/.gemini/antigravity/brain/6217bb33-9c15-4045-8abf-1dc2b0219f2c/paint-studio-preview.png",
  });

  await app.close();
  console.log("Snapshots saved successfully!");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
