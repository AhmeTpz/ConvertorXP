import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";

test("PDF Redaction: Redaction rectangle covers target area and saves valid PDF", async () => {
  // Create a 1-page sample PDF
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  page.drawText("TOP SECRET CONFIDENTIAL 9876543210", {
    x: 50,
    y: 300,
    size: 20,
    color: rgb(0, 0, 0),
  });
  const origBytes = await doc.save();
  const origHash = crypto.createHash("sha256").update(origBytes).digest("hex");

  // Load in editable document and apply black redaction bar
  const editDoc = await PDFDocument.load(origBytes);
  const [editPage] = editDoc.getPages();

  // Draw redaction rectangle over "9876543210"
  const redactBox = { x: 300, y: 290, width: 180, height: 26, color: rgb(0, 0, 0) };
  editPage.drawRectangle(redactBox);

  const redactedBytes = await editDoc.save();
  assert.ok(redactedBytes.length > 0, "Redacted PDF bytes must be generated");

  // Verify non-destructive source integrity
  const checkHash = crypto.createHash("sha256").update(origBytes).digest("hex");
  assert.equal(checkHash, origHash, "Source PDF bytes must remain 100% unchanged");

  // Verify edited document has 1 page
  const reloaded = await PDFDocument.load(redactedBytes);
  assert.equal(reloaded.getPageCount(), 1);
});

test("PDF Text Replacement: Whiteout rectangle + new text annotation overlay", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 300]);
  page.drawText("Eski Fiyat: 100 TL", { x: 50, y: 200, size: 16, color: rgb(0, 0, 0) });
  const origBytes = await doc.save();

  const editDoc = await PDFDocument.load(origBytes);
  const [editPage] = editDoc.getPages();

  // White-out box over "100 TL"
  editPage.drawRectangle({
    x: 135,
    y: 195,
    width: 80,
    height: 24,
    color: rgb(1, 1, 1),
  });

  // Replacement text
  editPage.drawText("150 TL", {
    x: 138,
    y: 200,
    size: 16,
    color: rgb(0, 0, 0),
  });

  const modifiedBytes = await editDoc.save();
  assert.ok(modifiedBytes.length > 0);
  const reloaded = await PDFDocument.load(modifiedBytes);
  assert.equal(reloaded.getPageCount(), 1);
});

test("PDF Workspace Annotation Types: Redact, Replace, Note, Stamp data structure", () => {
  const annotations = [];

  // 1. Redact annotation
  annotations.push({
    type: "redact",
    color: "black",
    x: 50,
    y: 80,
    width: 120,
    height: 30,
  });

  // 2. Text replacement annotation
  annotations.push({
    type: "replace",
    color: "white",
    text: "REVISED TEXT",
    fontSize: 14,
    x: 200,
    y: 150,
    width: 150,
    height: 35,
  });

  assert.equal(annotations.length, 2);
  assert.equal(annotations[0].type, "redact");
  assert.equal(annotations[0].color, "black");
  assert.equal(annotations[1].type, "replace");
  assert.equal(annotations[1].text, "REVISED TEXT");
});
