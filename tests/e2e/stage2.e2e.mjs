import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { _electron as electron } from "playwright";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";

const rootDir = path.resolve(".");
const runId = "stage2-e2e-" + Math.random().toString(36).slice(2, 8);
const testDir = path.resolve(".cxp-e2e", runId);
const home = path.join(testDir, "home");
const fixtures = path.join(testDir, "fixtures");
await fs.mkdir(home, { recursive: true });
await fs.mkdir(fixtures, { recursive: true });

// Create test image fixture (large enough to compress)
const c = createCanvas(1200, 900);
const ctx = c.getContext("2d");
for (let y = 0; y < 900; y += 30) {
  for (let x = 0; x < 1200; x += 30) {
    ctx.fillStyle = `rgb(${(x * 5) % 256}, ${(y * 9) % 256}, ${(x + y) % 256})`;
    ctx.fillRect(x, y, 30, 30);
  }
}
const testImgPath = path.join(fixtures, "photo.jpg");
await fs.writeFile(testImgPath, await c.encode("jpeg"));

const app = await electron.launch({
  args: [rootDir],
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

  // 1. Verify language bar layout matching Windows XP
  const langBand = await page.locator("#trayLangBand").boundingBox();
  const tray = await page.locator(".tray").boundingBox();
  assert.ok(langBand, "Language band exists");
  assert.ok(tray, "Tray exists");
  assert.ok(
    Math.abs(langBand.x + langBand.width - tray.x) <= 2,
    `Lang band should abut tray: langBand right=${langBand.x + langBand.width}, tray left=${tray.x}`,
  );
  console.log("PASS language band docked flush to the left of tray icons");

  // 2. Add image file to desktop
  await stubOpen([testImgPath]);
  await page.click("#upload");
  const file = page.locator("#files .file").first();
  await file.waitFor();
  console.log("PASS test image added to desktop");

  // 3. Right-click image and test compress preset
  await file.click({ button: "right" });
  await page.waitForSelector("#contextMenu:not([hidden])");

  const compressItem = page.locator("#contextMenu button", {
    hasText: "Compress",
  });
  assert.ok(
    (await compressItem.count()) > 0,
    "Compress menu action should exist",
  );
  console.log("PASS compress menu item visible in context menu");

  // 4. Test Clipboard Paste integration helper
  const clipboardSupport = await page.evaluate(async () => {
    return typeof window.convertorDesktop?.readClipboard === "function";
  });
  assert.ok(clipboardSupport, "readClipboard IPC bridge available");
  console.log("PASS clipboard IPC bridge verified");

  console.log("ALL STAGE 2 E2E CHECKS PASSED");
} finally {
  await app.close();
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}
}
