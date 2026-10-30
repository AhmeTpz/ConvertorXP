import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { _electron as electron } from "playwright";
import { PDFDocument } from "pdf-lib";

const rootDir = path.resolve(".");
const runId = "stage3-e2e-" + Math.random().toString(36).slice(2, 8);
const testDir = path.resolve(".cxp-e2e", runId);
const home = path.join(testDir, "home");
const fixtures = path.join(testDir, "fixtures");
await fs.mkdir(home, { recursive: true });
await fs.mkdir(fixtures, { recursive: true });

// Create a valid 3-page test PDF
const doc = await PDFDocument.create();
for (let i = 0; i < 3; i++) {
  const p = doc.addPage([595, 842]);
  p.drawText(`Page Number ${i + 1}`, { x: 50, y: 800, size: 24 });
}
const testPdfPath = path.join(fixtures, "report.pdf");
const originalPdfBytes = await doc.save();
await fs.writeFile(testPdfPath, originalPdfBytes);
const originalHash = crypto
  .createHash("sha256")
  .update(originalPdfBytes)
  .digest("hex");

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

  // 1. Add PDF to desktop
  await stubOpen([testPdfPath]);
  await page.click("#upload");
  const pdfFile = page.locator("#files .file").first();
  await pdfFile.waitFor();
  console.log("PASS test PDF added to desktop");

  // 2. Double-click PDF to open PDF Workspace window
  await pdfFile.dblclick();
  await page.waitForSelector(".xp-pdf-workspace");
  console.log("PASS PDF Workspace window opened");

  // 3. Verify thumbnails sidebar and initial page count
  await page.waitForSelector(".pdf-thumbnails .pdf-page-card");
  const cards = page.locator(".pdf-thumbnails .pdf-page-card");
  assert.equal(
    await cards.count(),
    3,
    "Sidebar should display 3 thumbnail cards",
  );
  console.log("PASS thumbnails sidebar rendered 3 page cards");

  // 4. Verify center canvas render
  const mainCanvas = page.locator(".pdf-main-canvas");
  await mainCanvas.waitFor();
  const canvasBox = await mainCanvas.boundingBox();
  assert.ok(
    canvasBox.width > 100 && canvasBox.height > 100,
    "Main viewport canvas should be sized",
  );
  console.log("PASS high-res center viewport rendered");

  // 5. Test page rotation
  const rotateBtn = page.locator("[data-act='rotate']");
  await rotateBtn.click();
  await page.waitForTimeout(300);
  const statusDirty = page.locator("#pdfStatusDirty");
  assert.ok(
    (await statusDirty.textContent()).length > 0,
    "Dirty status indicator should update",
  );
  console.log("PASS page rotation applied and marked document dirty");

  // 6. Test page deletion from thumbnail card hover button
  const firstCardDel = cards.first().locator(".btn-del");
  await firstCardDel.click();
  await page.waitForTimeout(300);
  assert.equal(await cards.count(), 2, "Page count should now be 2");
  console.log("PASS page deleted, remaining cards count is 2");

  // 7. Test Save As (Farklı Kaydet)
  const saveBtn = page.locator("[data-act='save']");
  await saveBtn.click();

  // Wait for new saved file to appear on desktop or balloon notification
  await page.waitForSelector("#trayBalloon:not([hidden])", { timeout: 10000 });
  console.log("PASS Save As completed and XP balloon notification triggered");

  // 8. Verify original PDF file hash is strictly unchanged
  const currentBytes = await fs.readFile(testPdfPath);
  const currentHash = crypto
    .createHash("sha256")
    .update(currentBytes)
    .digest("hex");
  assert.equal(
    currentHash,
    originalHash,
    "Source PDF file must NEVER be modified",
  );
  console.log("PASS original source PDF hash is strictly preserved");

  console.log("ALL STAGE 3 E2E CHECKS PASSED");
} finally {
  await app.close();
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}
}
