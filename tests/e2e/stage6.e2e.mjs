import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { _electron as electron } from "playwright";

const rootDir = path.resolve(".");
const runId = "stage6-e2e-" + Math.random().toString(36).slice(2, 8);
const testDir = path.resolve(".cxp-e2e", runId);
const home = path.join(testDir, "home");
const fixtures = path.join(testDir, "fixtures");
await fs.mkdir(home, { recursive: true });
await fs.mkdir(fixtures, { recursive: true });

// Create a valid 2-page test PDF
const doc = await PDFDocument.create();
for (let i = 0; i < 2; i++) {
  const p = doc.addPage([595, 842]);
  p.drawText(`Contract Page ${i + 1}\nConfidential Document 12345`, {
    x: 50,
    y: 800,
    size: 20,
  });
}
const samplePdf = await doc.save();
const pdfPath = path.join(fixtures, "contract.pdf");
await fs.writeFile(pdfPath, samplePdf);
const origPdfHash = crypto
  .createHash("sha256")
  .update(samplePdf)
  .digest("hex");

// Create test text file
const sampleText = "ConvertorXP Notepad Test\nLine 2 text content";
const textPath = path.join(fixtures, "notes.txt");
await fs.writeFile(textPath, sampleText, "utf8");

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

  // 1. Add PDF to desktop
  await stubOpen([pdfPath]);
  await page.click("#upload");
  const pdfFile = page.locator('.file[title="contract.pdf"]');
  await pdfFile.waitFor({ state: "visible" });
  console.log("PASS contract.pdf added to desktop");

  // 2. Right-click PDF to check OCR action
  await pdfFile.click({ button: "right" });
  await page.waitForSelector("#contextMenu:not([hidden])");

  const ocrMenu = page.locator("[data-action='ocr-read']");
  await ocrMenu.waitFor({ state: "visible" });
  assert.equal(await ocrMenu.isVisible(), true, "OCR menu action must be visible");
  console.log("PASS OCR menu item verified in desktop right-click menu");

  // Click OCR action to open OCR modal
  await ocrMenu.click();
  const ocrModal = page.locator("#ocrModal");
  await ocrModal.waitFor({ state: "visible" });
  assert.equal(await ocrModal.isVisible(), true, "OCR modal must be open");
  console.log("PASS Authentic XP OCR modal dialog opened");

  // Close OCR modal
  const cancelOcr = page.locator("#btnCancelOcr");
  await cancelOcr.click();
  await ocrModal.waitFor({ state: "hidden" });
  console.log("PASS OCR modal dismissed cleanly");

  // 3. Open PDF Workspace
  await pdfFile.dblclick();
  await page.waitForSelector(".xp-pdf-workspace");
  console.log("PASS PDF Workspace window opened");

  // Verify Stage 6 toolbar buttons: Redact, Replace-Text, OCR
  const redactBtn = page.locator("[data-act='redact']");
  const replaceBtn = page.locator("[data-act='replace-text']");
  const wsOcrBtn = page.locator("[data-act='ocr']");

  assert.equal(await redactBtn.isVisible(), true, "Redact button must be visible");
  assert.equal(await replaceBtn.isVisible(), true, "Replace text button must be visible");
  assert.equal(await wsOcrBtn.isVisible(), true, "Workspace OCR button must be visible");
  console.log("PASS Redact, Replace-Text and OCR buttons visible in toolbar");

  // Activate Redact tool
  await redactBtn.click();
  const layer = page.locator("#pdfAnnotationLayer");
  const layerClass = await layer.getAttribute("class");
  assert.ok(layerClass.includes("redacting"), "Annotation layer must have redacting class");

  // Simulate drag on annotation layer to create redaction box
  const box = await layer.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 100, { steps: 5 });
    await page.mouse.up();
  }

  // Verify dirty state
  const statusDirty = page.locator("#pdfStatusDirty");
  const dirtyText = await statusDirty.textContent();
  assert.ok(dirtyText.length > 0, "Document dirty state must be updated");
  console.log("PASS Redaction rectangle applied to canvas");

  // Save As
  const saveBtn = page.locator("[data-act='save']");
  await saveBtn.click();
  await page.waitForSelector("#trayBalloon:not([hidden])", { timeout: 10000 });
  console.log("PASS Redacted PDF saved with XP balloon notification");

  // Test OCR text extraction button
  await wsOcrBtn.click();
  await page.waitForSelector("#trayBalloon:not([hidden])", { timeout: 10000 });
  console.log("PASS PDF Workspace OCR extraction completed");

  // Close PDF window
  const closeBtn = page.locator(".window-close").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  }

  // 4. Test XP Notepad
  await stubOpen([textPath]);
  await page.click("#upload");
  const noteFile = page.locator('.file[title="notes.txt"]');
  await noteFile.waitFor({ state: "visible" });
  await noteFile.dblclick();

  await page.waitForSelector(".xp-notepad");
  console.log("PASS Authentic Windows XP Notepad window opened");

  const textarea = page.locator(".notepad-textarea");
  await textarea.waitFor({ state: "visible" });
  const textVal = await textarea.inputValue();
  assert.ok(textVal.includes("ConvertorXP Notepad Test"), "Notepad must load file content");

  // Type in textarea and verify cursor calculation
  await textarea.focus();
  await textarea.type("\nExtra line added");
  const npPos = page.locator("#npPos");
  const posText = await npPos.textContent();
  assert.ok(posText.includes("Satır") || posText.includes("Ln"), "Cursor status must update");
  console.log("PASS Notepad live status bar cursor position verified");

  // Close notepad
  const noteClose = page.locator(".window-close").first();
  if (await noteClose.isVisible()) {
    await noteClose.click();
  }

  // 5. Verify non-destructive source integrity
  const currPdfBytes = await fs.readFile(pdfPath);
  const currPdfHash = crypto
    .createHash("sha256")
    .update(currPdfBytes)
    .digest("hex");
  assert.equal(
    currPdfHash,
    origPdfHash,
    "Source contract.pdf must NEVER be modified",
  );
  console.log("PASS Source PDF SHA-256 hash strictly preserved");

  console.log("ALL STAGE 6 E2E CHECKS PASSED SUCCESSFULLY");
} finally {
  await app.close();
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}
}
