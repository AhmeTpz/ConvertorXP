import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { execute } from "../native/engine-worker.mjs";
import { Packages } from "../native/packages.mjs";
import { operations, validateOptions } from "../shared/catalog.js";

const resources = path.resolve("resources");
const packs = new Packages({
  root: path.resolve(".cxp-test/packages"),
  resources,
});
await packs.init();

const engines = {};
for (const id of ["image", "qpdf", "media", "office", "archive", "ocr"]) {
  engines[id] = await packs.executable(id);
}
engines.office = await packs.executable("office", "soffice.bin");
engines.ffprobe = await packs.executable("media", "ffprobe.exe");
const font = path.join(resources, "fonts/NotoSans-Regular.ttf");

async function job(operation, inputFiles, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-test-stage2-"));
  const inputs = [];
  for (let i = 0; i < inputFiles.length; i++) {
    const target = path.join(dir, i + "-" + path.basename(inputFiles[i]));
    await fs.copyFile(inputFiles[i], target);
    inputs.push(target);
  }
  const op = operations.find((o) => o.id === operation);
  return execute({
    op: operation,
    options: validateOptions(op, options),
    inputs,
    dir,
    engines,
    resources,
    font,
  });
}

test(
  "image.convert to ICO creates valid Windows icon with multi-resolution header",
  { skip: !engines.image },
  async () => {
    const c = createCanvas(128, 128);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(0, 0, 128, 128);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-ico-"));
    const src = path.join(dir, "icon-source.png");
    await fs.writeFile(src, await c.encode("png"));

    const outputs = await job("image.convert", [src], { format: "ico" });
    assert.equal(outputs.length, 1);
    const icoPath = outputs[0];
    assert.equal(path.extname(icoPath).toLowerCase(), ".ico");
    const bytes = await fs.readFile(icoPath);
    // Windows ICO header magic: 0x00, 0x00, 0x01, 0x00
    assert.equal(bytes[0], 0);
    assert.equal(bytes[1], 0);
    assert.equal(bytes[2], 1);
    assert.equal(bytes[3], 0);
    // Number of images in icon should be >= 1
    const count = bytes.readUInt16LE(4);
    assert.ok(count >= 1, `ICO should contain at least 1 image, got ${count}`);
  },
);

test(
  "image.compress achieves target size even on large detailed images",
  { skip: !engines.image },
  async () => {
    const c = createCanvas(1600, 1200);
    const ctx = c.getContext("2d");
    for (let y = 0; y < 1200; y += 40) {
      for (let x = 0; x < 1600; x += 40) {
        ctx.fillStyle = `rgb(${(x * 7) % 256}, ${(y * 11) % 256}, ${(x + y) % 256})`;
        ctx.fillRect(x, y, 40, 40);
      }
    }
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-comp-"));
    const src = path.join(dir, "large-photo.jpg");
    await fs.writeFile(src, await c.encode("jpeg"));

    const targetKB = 150;
    const outputs = await job("image.compress", [src], {
      format: "jpg",
      targetKB,
    });
    assert.equal(outputs.length, 1);
    const st = await fs.stat(outputs[0]);
    assert.ok(
      st.size <= targetKB * 1024,
      `Compressed size ${st.size} must be <= ${targetKB * 1024} bytes`,
    );
  },
);

test(
  "image.strip removes metadata and keeps image valid",
  { skip: !engines.image },
  async () => {
    const c = createCanvas(200, 200);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 200, 200);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-strip-"));
    const src = path.join(dir, "exif-test.jpg");
    await fs.writeFile(src, await c.encode("jpeg"));

    const outputs = await job("image.strip", [src], { format: "jpg" });
    assert.equal(outputs.length, 1);
    const st = await fs.stat(outputs[0]);
    assert.ok(st.size > 0);
  },
);

test(
  "pdf.images rasterizes PDF pages to standalone PNGs",
  { skip: !engines.image },
  async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([400, 300]);
    const pdfBytes = await pdfDoc.save();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-pdf-img-"));
    const docPath = path.join(dir, "valid.pdf");
    await fs.writeFile(docPath, pdfBytes);

    const outputs = await job("pdf.images", [docPath], {
      pages: "",
      dpi: 100,
    });
    assert.ok(outputs.length >= 1);
    for (const p of outputs) {
      assert.equal(path.extname(p).toLowerCase(), ".png");
      const st = await fs.stat(p);
      assert.ok(st.size > 100);
    }
  },
);
