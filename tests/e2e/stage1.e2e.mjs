// End-to-end UI acceptance test for Stage 1 (images → PDF, Office → PDF, Save As).
// Drives the real Electron app with Playwright. Native open/save dialogs are
// replaced only inside the test's main process; the app code has no test hooks.
//
//   node tests/e2e/stage1.e2e.mjs          # development build (npm run build first)
//   node tests/e2e/stage1.e2e.mjs --exe    # packaged release/win-unpacked/ConvertorXP.exe
import { _electron as electron } from "playwright";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { pdfLayout } from "../../shared/pdf-layout.js";

const useExe = process.argv.includes("--exe");
const rootDir = path.resolve(".");
await fs.mkdir(path.join(rootDir, ".cxp-e2e"), { recursive: true });
const run = await fs.mkdtemp(path.join(rootDir, ".cxp-e2e", "run-"));
const home = path.join(run, "home"),
  fixtures = path.join(run, "fixtures"),
  saved = path.join(run, "saved");
await Promise.all(
  [home, fixtures, saved].map((d) => fs.mkdir(d, { recursive: true })),
);

const report = { mode: useExe ? "exe" : "dev", run, passed: [], skipped: [] };
const pass = (name) => {
  report.passed.push(name);
  console.log("PASS", name);
};
const skip = (name, why) => {
  report.skipped.push({ name, why });
  console.log("SKIP", name, "-", why);
};
const sha = async (p) =>
  createHash("sha256")
    .update(await fs.readFile(p))
    .digest("hex");

// Three images with distinct sizes so page order can be proven from page sizes.
const images = [
  { name: "a-red.png", w: 400, h: 300, color: "#d33" },
  { name: "b-green.png", w: 300, h: 500, color: "#3a3" },
  { name: "c-blue.png", w: 600, h: 200, color: "#33d" },
];
for (const img of images) {
  const c = createCanvas(img.w, img.h),
    ctx = c.getContext("2d");
  ctx.fillStyle = img.color;
  ctx.fillRect(0, 0, img.w, img.h);
  img.path = path.join(fixtures, img.name);
  await fs.writeFile(img.path, await c.encode("png"));
  img.hash = await sha(img.path);
}

// Office engine: reuse the prepared test package through a directory junction.
const officePack = path.join(rootDir, ".cxp-test", "packages", "office");
const officeDoc = path.join(
  rootDir,
  ".cxp-stage1",
  "fixtures",
  "Türkçe belge.docx",
);
let officeReady = false;
if (existsSync(officePack) && existsSync(officeDoc)) {
  await fs.mkdir(path.join(home, "packages"), { recursive: true });
  execFileSync(
    "cmd",
    ["/c", "mklink", "/J", path.join(home, "packages", "office"), officePack],
    {
      stdio: "ignore",
    },
  );
  officeReady = true;
}

const app = await electron.launch({
  ...(useExe
    ? {
        executablePath: path.join(
          rootDir,
          "release",
          "win-unpacked",
          "ConvertorXP.exe",
        ),
        args: [],
      }
    : { args: [rootDir] }),
  env: { ...process.env, CXP_TEST_HOME: home },
  timeout: 60000,
});
const stubOpen = (filePaths) =>
  app.evaluate(({ dialog }, filePaths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths });
  }, filePaths);
const stubSave = (filePath) =>
  app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () =>
      filePath
        ? { canceled: false, filePath }
        : { canceled: true, filePath: "" };
  }, filePath);

let failed = false;
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.waitForSelector("#start");
  const files = page.locator("#files .file");

  // 1. Add images through the regular "upload" button.
  await stubOpen(images.map((i) => i.path));
  await page.click("#upload");
  await assert.doesNotReject(files.nth(2).waitFor());
  assert.equal(await files.count(), 3);
  pass("images added to desktop");

  // 2. Select all → context menu → Create PDF.
  await files.first().click();
  await page.keyboard.press("Control+A");
  await files.first().click({ button: "right" });
  await page.click('#contextMenu [data-action="pdf-create"]');
  const panel = page.locator(".conversion-panel").last();
  const cards = panel.locator(".conversion-page");
  await cards.nth(2).waitFor();
  const order = async () =>
    (await cards.locator("strong").allTextContents()).map((t) =>
      t.replace(/^\d+\.\s*/, ""),
    );
  assert.deepEqual(
    await order(),
    images.map((i) => i.name),
  );
  pass("PDF window opened with selection order");

  // 3. Drag the third card onto the left half of the first card.
  const first = await cards.nth(0).boundingBox();
  await cards.nth(2).dragTo(cards.nth(0), {
    targetPosition: { x: 8, y: first.height / 2 },
  });
  assert.deepEqual(await order(), ["c-blue.png", "a-red.png", "b-green.png"]);
  // And the (now) first card onto the right half of the last card.
  const last = await cards.nth(2).boundingBox();
  await cards.nth(0).dragTo(cards.nth(2), {
    targetPosition: { x: last.width - 8, y: last.height / 2 },
  });
  assert.deepEqual(await order(), ["a-red.png", "b-green.png", "c-blue.png"]);
  await cards.nth(1).dragTo(cards.nth(0), { targetPosition: { x: 8, y: 20 } });
  const expected = ["b-green.png", "a-red.png", "c-blue.png"];
  assert.deepEqual(await order(), expected);
  assert.equal(
    await page.locator("body.dragging").count(),
    0,
    "drop overlay must stay hidden",
  );
  pass("drag-and-drop reordering (before/after)");

  // 4. Image-sized pages, create PDF.
  await panel.locator('select[name="paper"]').selectOption("image");
  const before = await files.count();
  await panel.locator('button[type="submit"]').click();
  const done = panel.locator('.conversion-result[data-status="completed"]');
  await done.first().waitFor({ timeout: 120000 });
  await page.waitForFunction(
    (n) => document.querySelectorAll("#files .file").length === n,
    before + 1,
  );
  pass("PDF created; output added to desktop exactly once");

  // XP Tray balloon notification
  const balloon = page.locator("#trayBalloon");
  await balloon.waitFor({ state: "visible", timeout: 10000 });
  assert.equal(
    await page.locator("#balloonTitle").textContent(),
    "Operation completed",
  );
  await page.locator("#balloonClose").click();
  await balloon.waitFor({ state: "hidden", timeout: 5000 });
  pass("XP tray balloon notification shown on job completion");

  // 5. Save As → real file on disk; verify pages, order and sizes.
  const target = path.join(saved, "gorseller.pdf");
  await stubSave(target);
  await done.first().locator('[data-action="save-as"]').click();
  for (let i = 0; i < 100 && !existsSync(target); i++)
    await new Promise((r) => setTimeout(r, 100));
  assert.ok(existsSync(target), "saved PDF must exist");
  const pdf = await PDFDocument.load(await fs.readFile(target));
  assert.equal(pdf.getPageCount(), 3);
  const opts = { paper: "image", orientation: "auto", margin: 10 };
  pdf.getPages().forEach((p, i) => {
    const img = images.find((x) => x.name === expected[i]);
    const want = pdfLayout(img.w, img.h, opts);
    const { width, height } = p.getSize();
    assert.ok(
      Math.abs(width - want.pageWidth) < 1 &&
        Math.abs(height - want.pageHeight) < 1,
      `page ${i + 1} size ${width}x${height} != ${want.pageWidth}x${want.pageHeight}`,
    );
  });
  pass("Save As wrote PDF: 3 pages in dragged order with image-sized pages");

  // 6. Cancelled Save As writes nothing.
  await stubSave(null);
  await done.first().locator('[data-action="save-as"]').click();
  await new Promise((r) => setTimeout(r, 1000));
  assert.deepEqual(await fs.readdir(saved), ["gorseller.pdf"]);
  pass("cancelled Save As creates no file");

  // Close the open window so it does not obstruct desktop icons
  await page.locator(".xp-window .window-close").first().click();
  await new Promise((r) => setTimeout(r, 500));

  // 7. Office → PDF → Save As.
  if (!officeReady)
    skip("Office → PDF → Save As", "office test package or fixture missing");
  else {
    const docHash = await sha(officeDoc);
    await stubOpen([officeDoc]);
    await page.click("#upload");
    const doc = page.locator(
      `#files .file[title="${path.basename(officeDoc)}"]`,
    );
    await doc.waitFor();
    await doc.click();
    await doc.click({ button: "right" });
    await page.click('#contextMenu [data-action="pdf-convert"]');
    const officePanel = page.locator(".conversion-panel").last();
    await officePanel.locator('button[type="submit"]').click();
    const officeDone = officePanel.locator(
      '.conversion-result[data-status="completed"]',
    );
    await officeDone.first().waitFor({ timeout: 240000 });
    const officeTarget = path.join(saved, "belge.pdf");
    await stubSave(officeTarget);
    await officeDone.first().locator('[data-action="save-as"]').click();
    for (let i = 0; i < 100 && !existsSync(officeTarget); i++)
      await new Promise((r) => setTimeout(r, 100));
    const officePdf = await PDFDocument.load(await fs.readFile(officeTarget));
    assert.ok(officePdf.getPageCount() >= 1);
    assert.equal(
      await sha(officeDoc),
      docHash,
      "Office source must be unchanged",
    );
    pass(`Office DOCX → PDF → Save As (${officePdf.getPageCount()} pages)`);
  }

  // 8. Sources untouched.
  for (const img of images)
    assert.equal(await sha(img.path), img.hash, img.name + " changed");
  pass("source image hashes unchanged");

  // 9. Language Switcher in tray (EN <-> TR)
  assert.equal(await page.locator("#trayLangCode").textContent(), "EN");
  await page.click("#trayLang");
  assert.ok(await page.locator("#langMenu").isVisible());
  await page.click('#langMenu [data-lang="tr"]');
  await new Promise((r) => setTimeout(r, 1000));
  await page.waitForSelector("#start");
  assert.equal(await page.locator("#trayLangCode").textContent(), "TR");
  assert.ok((await page.locator("#start").textContent()).includes("başlat"));
  // Switch back to EN
  await page.click("#trayLang");
  await page.click('#langMenu [data-lang="en"]');
  await new Promise((r) => setTimeout(r, 1000));
  await page.waitForSelector("#start");
  assert.equal(await page.locator("#trayLangCode").textContent(), "EN");
  assert.ok((await page.locator("#start").textContent()).includes("start"));
  pass("tray language switcher (EN <-> TR) toggles and persists");
} catch (e) {
  failed = true;
  console.error("FAIL", e);
  try {
    const page = await app.firstWindow();
    await page.screenshot({ path: path.join(run, "failure.png") });
    console.error("screenshot:", path.join(run, "failure.png"));
  } catch {}
} finally {
  await app.close().catch(() => {});
  report.failed = failed;
  await fs.writeFile(
    path.join(run, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("report:", path.join(run, "report.json"));
}
process.exit(failed ? 1 : 0);
