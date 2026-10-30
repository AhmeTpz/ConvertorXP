import { _electron as electron } from "playwright";
import path from "node:path";
import os from "node:os";

async function main() {
  const tmpDir = path.join(os.tmpdir(), "cxp-save-snap-" + Date.now());
  const app = await electron.launch({
    args: [".", `--user-data-dir=${tmpDir}`],
  });
  const page = await app.firstWindow();
  await page.waitForSelector(".taskbar");

  // Open Paint from Start Menu
  await page.click("#start");
  await page.click("[data-start='paint']");
  await page.waitForSelector(".xp-paint-studio");
  await page.waitForTimeout(400);

  // Click Save As to open modal
  await page.click("#btnQuickSave");
  await page.waitForSelector("#saveModal:not([hidden])");
  await page.waitForTimeout(500);

  await page.screenshot({
    path: "C:/Users/ahmet/.gemini/antigravity/brain/6217bb33-9c15-4045-8abf-1dc2b0219f2c/save-modal-preview.png",
  });

  await app.close();
  console.log("Save modal preview saved!");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
