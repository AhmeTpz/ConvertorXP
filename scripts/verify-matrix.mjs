import fs from "node:fs/promises";
import path from "node:path";
import { execute } from "../native/engine-worker.mjs";
import { Packages } from "../native/packages.mjs";
import { operations, validateOptions } from "../shared/catalog.js";
import { run } from "../native/util.mjs";
import { PDFDocument } from "pdf-lib";
const resources = path.resolve("resources");
const packs = new Packages({
  root: path.resolve(".cxp-test/packages"),
  resources,
});
await packs.init();
const engines = {};
for (const id of ["image", "qpdf", "media", "office", "archive", "ocr"])
  engines[id] = await packs.executable(id);
engines.ffprobe = await packs.executable("media", "ffprobe.exe");
engines.office = await packs.executable("office", "soffice.bin");
const matrixRoot = path.resolve(".cxp-matrix");
await fs.mkdir(matrixRoot, { recursive: true });
const root = await fs.mkdtemp(path.join(matrixRoot, "run-"));
const results = [];
let seq = 0;
async function check(id, source, options = {}) {
  const dir = path.join(root, String(++seq));
  await fs.mkdir(dir, { recursive: true });
  const inputs = [];
  for (let i = 0; i < source.length; i++) {
    const p = path.join(dir, i + "-" + path.basename(source[i]));
    await fs.copyFile(source[i], p);
    inputs.push(p);
  }
  try {
    const output = await execute({
      op: id,
      options: validateOptions(
        operations.find((o) => o.id === id),
        options,
      ),
      inputs,
      dir,
      engines,
      resources,
      font: path.join(resources, "fonts/NotoSans-Regular.ttf"),
    });
    results.push({ id, options, status: "passed", outputs: output.length });
    console.log("PASS", id, JSON.stringify(options));
    return output;
  } catch (error) {
    results.push({ id, options, status: "failed", error: error.message });
    console.log("FAIL", id, error.message);
    return [];
  }
}
const image = path.resolve("tests/fixtures/sample.png");
for (const format of [
  "png",
  "jpg",
  "webp",
  "tiff",
  "bmp",
  "gif",
  "ico",
  "avif",
])
  await check("image.convert", [image], { format });
for (const id of [
  "resize",
  "crop",
  "flip",
  "color",
  "watermark",
  "border",
  "strip",
  "metadata",
  "compress",
])
  await check(
    "image." + id,
    [image],
    id === "crop" ? { width: 100, height: 100 } : {},
  );
await check("image.merge", [image, image]);
const animated = await check("image.animate", [
  image,
  path.resolve("tests/fixtures/sample.bmp"),
]);
if (animated.length) await check("image.frames", animated);
const pdf = await check("pdf.create", [image, image]);
if (pdf.length) {
  for (const id of ["extract", "delete", "rotate", "number"])
    await check("pdf." + id, pdf, { pages: "1" });
  const form = await PDFDocument.create();
  form.addPage([400, 400]);
  form
    .getForm()
    .createTextField("name")
    .addToPage(form.getPage(0), { x: 20, y: 100, width: 200, height: 40 });
  const formPath = path.join(root, "form.pdf");
  await fs.writeFile(formPath, await form.save());
  await check("pdf.forms", [formPath], {
    values: JSON.stringify({ name: "Çağrı" }),
  });
}
const video = path.join(root, "video.mp4");
await run(engines.media, [
  "-hide_banner",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=blue:s=320x240:r=15",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=440:sample_rate=44100",
  "-t",
  "2",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  video,
]);
for (const id of ["resize", "mute", "normalize", "frame", "gif"])
  await check("media." + id, [video], id === "gif" ? { duration: 1 } : {});
await check("media.merge", [video, video]);
const sub = path.join(root, "test.srt");
await fs.writeFile(sub, "1\n00:00:00,000 --> 00:00:01,000\nMerhaba dünya\n");
const subbed = await check("media.subtitle-add", [video, sub]);
if (subbed.length)
  await check("media.subtitle-extract", subbed, { format: "srt" });
await check("subtitle.convert", [sub], { format: "vtt" });
const csv = path.join(root, "table.csv");
await fs.writeFile(csv, 'isim,değer\n"Ahmet, A",1\n');
await check("text.csv", [csv], { format: "tsv" });
await check("office.sheet", [csv], { format: "xlsx" });
await fs.writeFile(
  "tests/verification-report.json",
  JSON.stringify({ date: new Date().toISOString(), results }, null, 2),
);
if (results.some((r) => r.status === "failed")) process.exitCode = 1;
