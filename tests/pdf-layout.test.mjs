import test from "node:test";
import assert from "node:assert/strict";
import { pdfLayout, isOffice } from "../shared/pdf-layout.js";
import { operations, validateOptions, eligible } from "../shared/catalog.js";
test("PDF layout preserves aspect, margins, orientation and physical dimensions", () => {
  const p = pdfLayout(400, 200);
  assert.ok(p.pageWidth > p.pageHeight);
  assert.ok(p.x >= (10 * 72) / 25.4 - 1e-8 && p.y >= (10 * 72) / 25.4 - 1e-8);
  assert.equal(p.width / p.height, 2);
  assert.deepEqual(pdfLayout(400, 200, { paper: "image", margin: 0 }), {
    pageWidth: 300,
    pageHeight: 150,
    x: 0,
    y: 0,
    width: 300,
    height: 150,
  });
  assert.ok(
    pdfLayout(200, 400, { orientation: "landscape" }).pageWidth >
      pdfLayout(200, 400, { orientation: "landscape" }).pageHeight,
  );
  assert.throws(() => pdfLayout(1, 1, { paper: "image", margin: 10 }));
  assert.throws(() => pdfLayout(NaN, 200));
});
test("direct PDF actions accept Office families but not mixed image/document selections", () => {
  const op = operations.find((o) => o.id === "office.pdf");
  assert.equal(
    eligible(op, [{ name: "a.docx" }, { name: "b.ppt" }, { name: "c.xlsx" }]),
    true,
  );
  assert.equal(eligible(op, [{ name: "a.docx" }, { name: "b.png" }]), false);
  assert.equal(isOffice({ name: "Türkçe.PPTX" }), true);
  assert.deepEqual(
    validateOptions(operations.find((o) => o.id === "pdf.create")),
    { paper: "A4", orientation: "auto", margin: 10, output: "combined" },
  );
});
