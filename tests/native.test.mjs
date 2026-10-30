import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PDFDocument } from "pdf-lib";
import { execute } from "../native/engine-worker.mjs";
import { Packages } from "../native/packages.mjs";
import { operations, validateOptions } from "../shared/catalog.js";
import { pageList, inside, uniqueCopy, run } from "../native/util.mjs";
import { archiveEntries } from "../native/extra-engines.mjs";
const resources = path.resolve("resources");
const packs = new Packages({
  root: path.resolve(".cxp-test/packages"),
  resources,
});
await packs.init();
const engines = {};
for (const id of ["image", "qpdf", "media", "office", "archive", "ocr"])
  engines[id] = await packs.executable(id);
engines.office = await packs.executable("office", "soffice.bin");
engines.ffprobe = await packs.executable("media", "ffprobe.exe");
const font = path.join(resources, "fonts/NotoSans-Regular.ttf");
async function job(operation, inputFiles, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-test-"));
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
const sample = path.resolve("tests/fixtures/sample.png");
test("page ranges, traversal, option bounds", () => {
  assert.deepEqual(pageList("3,1-2", 3), [2, 0, 1]);
  assert.throws(() => pageList("0", 3));
  assert.equal(inside("C:/root", "C:/outside"), false);
  assert.throws(() => archiveEntries("Path = ../escape\nSize = 4", "C:/safe"));
  assert.throws(() =>
    validateOptions(
      operations.find((o) => o.id === "image.resize"),
      { width: -5 },
    ),
  );
});
test(
  "native TIFF, rotation, crop and corrupt input",
  { skip: !engines.image },
  async () => {
    const [out] = await job("image.convert", [sample], { format: "tiff" });
    assert.ok((await fs.stat(out)).size > 0);
    const [rotated] = await job("image.rotate", [sample], { angle: "90" });
    assert.equal(
      (await run(engines.image, ["identify", "-format", "%wx%h", rotated]))
        .stdout,
      "240x320",
    );
    await assert.rejects(job("image.crop", [sample], { x: 300, width: 100 }));
    await assert.rejects(
      job("image.convert", [path.resolve("tests/fixtures/broken.png")]),
    );
  },
);
test(
  "PDF creation, merge, split, text and form",
  { skip: !engines.image },
  async () => {
    const [pdf] = await job("pdf.create", [sample, sample]);
    assert.equal(
      (await PDFDocument.load(await fs.readFile(pdf))).getPageCount(),
      2,
    );
    const parts = await job("pdf.split", [pdf]);
    assert.equal(parts.length, 2);
    const [merged] = await job("pdf.merge", parts);
    assert.equal(
      (await PDFDocument.load(await fs.readFile(merged))).getPageCount(),
      2,
    );
    const [watermarked] = await job("pdf.watermark", [pdf], {
      text: "Türkçe deneme ığüşöç",
    });
    const [txt] = await job("pdf.text", [watermarked]);
    assert.match(await fs.readFile(txt, "utf8"), /Türkçe/);
    const imgs = await job("pdf.images", [pdf], { pages: "1", dpi: 72 });
    assert.equal(imgs.length, 1);
  },
);
test("PDF form discovery and password validation", { skip: !engines.qpdf }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-pdf-password-"));
  const source = path.join(dir, "form.pdf");
  const locked = path.join(dir, "locked.pdf");
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  doc.getForm().createTextField("adSoyad").addToPage(page);
  await fs.writeFile(source, await doc.save());
  const [fields] = await job("pdf.fields", [source]);
  assert.deepEqual(JSON.parse(await fs.readFile(fields, "utf8")), [{ name: "adSoyad", type: "PDFTextField" }]);
  await run(engines.qpdf, ["--encrypt", "test-password", "owner-password", "256", "--", source, locked]);
  await assert.rejects(job("pdf.unlock", [locked], { password: "wrong-password" }));
  const [unlocked] = await job("pdf.unlock", [locked], { password: "test-password" });
  assert.equal((await PDFDocument.load(await fs.readFile(unlocked))).getPageCount(), 1);
});

test('PDF page layout, separate outputs and animated input rejection', {skip:!engines.image},async()=>{
  const [combined]=await job('pdf.create',[sample,sample],{paper:'Letter',orientation:'portrait',margin:12});
  const doc=await PDFDocument.load(await fs.readFile(combined));
  assert.equal(doc.getPageCount(),2);
  assert.deepEqual(doc.getPage(0).getSize(),{width:612,height:792});
  const separate=await job('pdf.create',[sample,sample],{paper:'image',margin:0,output:'separate'});
  assert.equal(separate.length,2);
  for(const file of separate){const d=await PDFDocument.load(await fs.readFile(file));assert.equal(d.getPageCount(),1);assert.deepEqual(d.getPage(0).getSize(),{width:240,height:180});}
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cxp-animated-pdf-'));
  const gif=path.join(dir,'two.gif');
  await run(engines.image,[sample,sample,'-delay','10',gif]);
  await assert.rejects(job('pdf.create',[gif]));
});

test("JSON and Turkish encodings round trip", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-text-"));
  const txt = path.join(dir, "turkce.txt");
  await fs.writeFile(txt, "Türkçe ığüşöç\nDeneme");
  const [encoded] = await job("text.edit", [txt], {
    encoding: "windows1254",
    newline: "crlf",
  });
  const [decoded] = await job("text.edit", [encoded], {
    inputEncoding: "windows1254",
    encoding: "utf8",
  });
  assert.equal(await fs.readFile(decoded, "utf8"), "Türkçe ığüşöç\nDeneme");
  const json = path.join(dir, "bad.json");
  await fs.writeFile(json, "{bad}");
  await assert.rejects(job("text.json", [json]));
});
test("media WAV to FLAC and trim", { skip: !engines.media }, async () => {
  const [out] = await job(
    "media.convert",
    [path.resolve("tests/fixtures/tone.wav")],
    { format: "flac" },
  );
  assert.ok((await fs.stat(out)).size > 0);
  const [cut] = await job("media.trim", [out], {
    format: "wav",
    duration: 0.5,
  });
  assert.ok((await fs.stat(cut)).size > 0);
});
test(
  "ZIP create, list, extract and integrity",
  { skip: !engines.archive },
  async () => {
    const [zip] = await job("archive.create", [sample], { format: "zip" });
    const [list] = await job("archive.list", [zip]);
    assert.match(await fs.readFile(list, "utf8"), /sample.png/);
    const files = await job("archive.extract", [zip]);
    assert.equal(files.length, 1);
    assert.deepEqual(await fs.readFile(files[0]), await fs.readFile(sample));
  },
);
test("Office TXT to PDF", { skip: !engines.office }, async () => {
  const [pdf] = await job(
    "office.document",
    [path.resolve("tests/fixtures/note.txt")],
    { format: "pdf" },
  );
  assert.ok(
    (await PDFDocument.load(await fs.readFile(pdf))).getPageCount() > 0,
  );
});
test(
  "OCR English text and searchable PDF",
  { skip: !engines.ocr || !engines.image },
  async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-ocr-"));
    const img = path.join(dir, "text.png");
    await run(engines.image, [
      "-size",
      "800x140",
      "xc:white",
      "-font",
      font,
      "-pointsize",
      "50",
      "-fill",
      "black",
      "-annotate",
      "+20+80",
      "CONVERTOR TEST 123",
      img,
    ]);
    const [txt] = await job("ocr.read", [img], {
      language: "eng",
      format: "txt",
    });
    assert.match(await fs.readFile(txt, "utf8"), /CONVERTOR/);
    const [pdf] = await job("ocr.read", [img], {
      language: "eng",
      format: "pdf",
    });
    assert.equal(
      (await PDFDocument.load(await fs.readFile(pdf))).getPageCount(),
      1,
    );
  },
);
