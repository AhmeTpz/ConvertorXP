import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { _electron as electron } from "playwright";

const rootDir = path.resolve(".");
const runId = "stage5-e2e-" + Math.random().toString(36).slice(2, 8);
const testDir = path.resolve(".cxp-e2e", runId);
const home = path.join(testDir, "home");
const fixtures = path.join(testDir, "fixtures");
await fs.mkdir(home, { recursive: true });
await fs.mkdir(fixtures, { recursive: true });

// Copy test images
const samplePng = await fs.readFile(
  path.join(rootDir, "tests/fixtures/sample.png"),
);
const avatarPath = path.join(fixtures, "avatar.png");
await fs.writeFile(avatarPath, samplePng);
const origAvatarHash = crypto
  .createHash("sha256")
  .update(samplePng)
  .digest("hex");

// Copy test audio
const sampleWav = await fs.readFile(path.join(rootDir, "tests/fixtures/tone.wav"));
const audioPath = path.join(fixtures, "audio.wav");
await fs.writeFile(audioPath, sampleWav);

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

  // 1. Add avatar image to desktop
  await stubOpen([avatarPath]);
  await page.click("#upload");
  const avatarFile = page.locator("#files .file").first();
  await avatarFile.waitFor();
  console.log("PASS avatar image added to desktop");

  // 2. Right-click avatar on desktop to trigger Background Removal
  await avatarFile.click({ button: "right" });
  await page.waitForSelector("#contextMenu:not([hidden])");

  const rembgMenu = page.locator("[data-action='image-rembg']");
  await rembgMenu.waitFor();
  assert.equal(await rembgMenu.isVisible(), true, "RemBg menu item must be visible");
  await rembgMenu.click();

  // Wait for new saved file on desktop or yellow XP balloon notification
  await page.waitForSelector("#trayBalloon:not([hidden])", { timeout: 10000 });
  console.log("PASS Desktop 1-click Background Removal completed with XP balloon");

  // 3. Test Paint Studio Background Removal
  await avatarFile.dblclick();
  await page.waitForSelector(".xp-paint-studio");

  // Click Görsel menu -> Arka Planı Kaldır
  const imageMenu = page.locator(".paint-menu-item").nth(2);
  await imageMenu.click();
  const rembgItem = page.locator("[data-menu='rembg']");
  await rembgItem.waitFor({ state: "visible" });
  await rembgItem.click();

  // Verify RemBg modal dialog appears
  const rembgModal = page.locator("#rembgModal");
  await rembgModal.waitFor({ state: "visible" });
  console.log("PASS Paint RemBg modal dialog opened");

  // Click Apply to Canvas
  const applyBtn = page.locator("#btnApplyRembg");
  await applyBtn.click();
  await page.waitForTimeout(300);

  // Verify transparent checkerboard grid is applied
  const stage = page.locator("#paintStage");
  const stageClass = await stage.getAttribute("class");
  assert.ok(
    stageClass.includes("transparent-grid"),
    "Stage must have transparent-grid class applied",
  );
  console.log("PASS Canvas transformed with transparent checkerboard grid");

  // Close Paint window
  const closeBtn = page.locator(".window-close").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  }

  // 4. Test Media Tools context menu
  await stubOpen([audioPath]);
  await page.click("#upload");
  const audioFile = page.locator('.file[title="audio.wav"]');
  await audioFile.waitFor({ state: "visible" });

  await audioFile.click({ button: "right" });
  await page.waitForSelector("#contextMenu:not([hidden])");

  const trimMenu = page.locator("[data-action='media-trim']");
  const compressMenu = page.locator("[data-action='media-compress']");
  const audioExtractMenu = page.locator("[data-action='media-audio']");

  assert.equal(await trimMenu.isVisible(), true, "Media trim must be visible");
  assert.equal(await compressMenu.isVisible(), true, "Media compress must be visible");
  assert.equal(await audioExtractMenu.isVisible(), true, "Audio extract must be visible");
  console.log("PASS Media tools (Trim, Compress, Audio Extract) verified in context menu");

  // 5. Verify non-destructive source integrity
  const currAvatarBytes = await fs.readFile(avatarPath);
  const currAvatarHash = crypto
    .createHash("sha256")
    .update(currAvatarBytes)
    .digest("hex");
  assert.equal(
    currAvatarHash,
    origAvatarHash,
    "Source avatar.png must NEVER be modified",
  );
  console.log("PASS Source image SHA-256 hash strictly preserved");

  console.log("ALL STAGE 5 E2E CHECKS PASSED SUCCESSFULLY");
} finally {
  await app.close();
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}
}
