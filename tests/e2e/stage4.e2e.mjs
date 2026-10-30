import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { _electron as electron } from "playwright";

const rootDir = path.resolve(".");
const runId = "stage4-e2e-" + Math.random().toString(36).slice(2, 8);
const testDir = path.resolve(".cxp-e2e", runId);
const home = path.join(testDir, "home");
const fixtures = path.join(testDir, "fixtures");
await fs.mkdir(home, { recursive: true });
await fs.mkdir(fixtures, { recursive: true });

// Copy fixtures for two test photos
const samplePng = await fs.readFile(
  path.join(rootDir, "tests/fixtures/sample.png"),
);
const photo1Path = path.join(fixtures, "photo1.png");
const photo2Path = path.join(fixtures, "photo2.png");
await fs.writeFile(photo1Path, samplePng);
await fs.writeFile(photo2Path, samplePng);

const hash1Orig = crypto.createHash("sha256").update(samplePng).digest("hex");
const hash2Orig = crypto.createHash("sha256").update(samplePng).digest("hex");

const app = await electron.launch({
  args: [rootDir, `--user-data-dir=${path.join(testDir, "userData")}`],
  env: { ...process.env, CXP_TEST_HOME: home },
  timeout: 60000,
});

const stubOpen = (filePaths) =>
  app.evaluate(({ dialog }, filePaths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths });
  }, filePaths);

try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.waitForSelector("#start");

  // 1. Verify Taskbar Language Indicator is authentic and clean
  const trayLang = page.locator("#trayLang");
  await trayLang.waitFor();
  assert.equal(
    await trayLang.isVisible(),
    true,
    "Language button must be visible",
  );
  const langText = await page.locator("#trayLangCode").textContent();
  assert.ok(
    ["EN", "TR"].includes(langText.trim()),
    "Language code should be EN or TR",
  );
  const gripper = await page.$(".band-gripper");
  assert.equal(gripper, null, "Band gripper must not exist on taskbar");
  console.log("PASS Authentic language indicator verified");

  // 2. Add test photos to desktop
  await stubOpen([photo1Path, photo2Path]);
  await page.click("#upload");
  await page.waitForSelector("#files .file:nth-child(2)");
  console.log("PASS 2 test photos added to desktop");

  // 3. Double-click first photo to open Paint Studio
  const photo1 = page.locator("#files .file").first();
  await photo1.dblclick();
  await page.waitForSelector(".xp-paint-studio");
  console.log("PASS Paint Studio window opened for photo1");

  // Verify Paint tools and palette
  const tools = page.locator(".tool-btn");
  assert.equal(await tools.count(), 16, "Toolbox must contain 16 tools");
  const colorBoxes = page.locator(".color-box");
  assert.equal(
    await colorBoxes.count(),
    28,
    "Palette must contain 28 color chips",
  );

  // Rotate image 90 degrees via menu
  const imageMenu = page.locator(".paint-menu-item").nth(2);
  await imageMenu.click();
  const rotateBtn = page.locator("[data-menu='rotate-cw']");
  await rotateBtn.waitFor({ state: "visible" });
  await rotateBtn.click();
  await page.waitForTimeout(200);

  // Click Save Copy (Kopya Kaydet)
  const quickSave = page.locator("#btnQuickSave");
  await quickSave.click();

  // Verify Save As modal opens with format choice and calculated size
  const saveModal = page.locator("#saveModal");
  await saveModal.waitFor({ state: "visible" });
  const calcSize = page.locator("#saveCalculatedSize");
  await page.waitForTimeout(400);
  const sizeText = (await calcSize.textContent()).trim();
  assert.ok(
    sizeText.length > 0 && sizeText !== "—",
    "Calculated file size must be visible",
  );
  console.log(`PASS Save As modal opened with calculated size: ${sizeText}`);

  // Test format dropdown choice (e.g. jpeg) and verify quality slider appears
  await page.selectOption("#saveFormat", "jpeg");
  await page.waitForTimeout(300);
  const qualityRow = page.locator("#qualityRow");
  assert.equal(
    await qualityRow.isVisible(),
    true,
    "Quality slider visible for JPEG format",
  );

  // Confirm save
  const confirmSave = page.locator("#btnConfirmSave");
  await confirmSave.click();
  await page.waitForTimeout(500);
  console.log(
    "PASS Paint edit completed and Save Copy invoked with chosen format",
  );

  // Close Paint window
  const closeWindowBtn = page.locator(".window-close").first();
  if (await closeWindowBtn.isVisible()) {
    await closeWindowBtn.click();
  }

  // 4. Test Multi-Image Collage
  // Select both photos on desktop
  const files = page.locator("#files .file");
  await files.first().click();
  await page.keyboard.down("Control");
  await files.nth(1).click();
  await page.keyboard.up("Control");

  // Right-click desktop or selection to open context menu
  await files.first().click({ button: "right" });
  await page.waitForSelector("#contextMenu:not([hidden])");

  // Click collage menu item
  const collageMenuItem = page.locator("[data-action='collage-create']");
  await collageMenuItem.waitFor();
  await collageMenuItem.click();

  // Verify Paint Studio opens in collage mode
  await page.waitForSelector(".xp-paint-studio");
  await page.waitForSelector(".xp-collage-bar:not([hidden])");
  const tplBtns = page.locator(".collage-tpl-btn");
  assert.ok(
    (await tplBtns.count()) >= 6,
    "Collage bar must offer layout templates",
  );
  console.log("PASS Multi-photo collage opened with template selector");

  // Click a different collage template (e.g. 2-v or 4-grid)
  await tplBtns.nth(1).click();
  await page.waitForTimeout(200);

  // Save collage copy
  await page.locator("#btnQuickSave").click();
  const confirmCollageSave = page.locator("#btnConfirmSave");
  await confirmCollageSave.waitFor({ state: "visible" });
  await confirmCollageSave.click();
  await page.waitForTimeout(500);
  console.log("PASS Collage copy saved successfully");

  // 5. Verify non-destructive preservation of source photo files
  const currentBytes1 = await fs.readFile(photo1Path);
  const currentBytes2 = await fs.readFile(photo2Path);
  const hash1Curr = crypto
    .createHash("sha256")
    .update(currentBytes1)
    .digest("hex");
  const hash2Curr = crypto
    .createHash("sha256")
    .update(currentBytes2)
    .digest("hex");

  assert.equal(
    hash1Curr,
    hash1Orig,
    "photo1.png must NEVER be modified (lossless source integrity)",
  );
  assert.equal(
    hash2Curr,
    hash2Orig,
    "photo2.png must NEVER be modified (lossless source integrity)",
  );
  console.log("PASS source files 100% untouched and preserved");

  console.log("ALL STAGE 4 E2E CHECKS PASSED SUCCESSFULLY");
} finally {
  await app.close();
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}
}
