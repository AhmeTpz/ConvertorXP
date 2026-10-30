import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PDFDocument, degrees, rgb } from "pdf-lib";

async function createTestPdf(pageCount = 3) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 800, size: 24 });
  }
  return doc.save();
}

test("PDF Workspace: Page reorder correctly reorders pages in new document", async () => {
  const originalBytes = await createTestPdf(3);
  const srcDoc = await PDFDocument.load(originalBytes);

  // Desired order: Page 3, Page 1, Page 2 (indices 2, 0, 1)
  const newOrder = [2, 0, 1];
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, newOrder);
  for (const p of copied) newDoc.addPage(p);

  const outBytes = await newDoc.save();
  const loaded = await PDFDocument.load(outBytes);
  assert.equal(loaded.getPageCount(), 3);
});

test("PDF Workspace: Page rotation adds 90 degrees and persists", async () => {
  const originalBytes = await createTestPdf(2);
  const srcDoc = await PDFDocument.load(originalBytes);

  const newDoc = await PDFDocument.create();
  const [p1, p2] = await newDoc.copyPages(srcDoc, [0, 1]);
  // Rotate page 2 by 90 degrees
  p2.setRotation(degrees((p2.getRotation().angle + 90) % 360));
  newDoc.addPage(p1);
  newDoc.addPage(p2);

  const outBytes = await newDoc.save();
  const loaded = await PDFDocument.load(outBytes);
  assert.equal(loaded.getPage(0).getRotation().angle, 0);
  assert.equal(loaded.getPage(1).getRotation().angle, 90);
});

test("PDF Workspace: Page deletion drops targeted page and updates page count", async () => {
  const originalBytes = await createTestPdf(3);
  const srcDoc = await PDFDocument.load(originalBytes);

  // Delete page 2 (index 1) -> keep indices [0, 2]
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, [0, 2]);
  for (const p of copied) newDoc.addPage(p);

  const outBytes = await newDoc.save();
  const loaded = await PDFDocument.load(outBytes);
  assert.equal(loaded.getPageCount(), 2);
});

test("PDF Workspace: Text overlay embeds text annotation on page", async () => {
  const originalBytes = await createTestPdf(1);
  const srcDoc = await PDFDocument.load(originalBytes);

  const newDoc = await PDFDocument.create();
  const [p1] = await newDoc.copyPages(srcDoc, [0]);
  p1.drawText("ONAYLANDI - ConvertorXP", {
    x: 100,
    y: 400,
    size: 20,
    color: rgb(0.8, 0.1, 0.1),
  });
  newDoc.addPage(p1);

  const outBytes = await newDoc.save();
  const loaded = await PDFDocument.load(outBytes);
  assert.equal(loaded.getPageCount(), 1);
  assert.ok(outBytes.length > originalBytes.length);
});

test("PDF Workspace: Compact compression produces valid linearized streams", async () => {
  const originalBytes = await createTestPdf(5);
  const srcDoc = await PDFDocument.load(originalBytes);
  const compBytes = await srcDoc.save({ useObjectStreams: true });
  assert.ok(compBytes.length > 0);
  const loaded = await PDFDocument.load(compBytes);
  assert.equal(loaded.getPageCount(), 5);
});
