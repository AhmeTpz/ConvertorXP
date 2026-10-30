import { headerAnimation } from "./util.mjs";
import { pdfLayout } from "../shared/pdf-layout.js";
import fs from "node:fs/promises";
import path from "node:path";
import { run, pageList } from "./util.mjs";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
const imageTypes = {
  jpg: "JPEG",
  png: "PNG",
  webp: "WEBP",
  tiff: "TIFF",
  bmp: "BMP",
  gif: "GIF",
  ico: "ICO",
  avif: "AVIF",
};
export async function imageJob(ctx) {
  const { op, options: o, inputs, dir, engines, signal } = ctx;
  const exe = engines.image;
  if (!exe) throw Error("Görsel motoru kurulu değil.");
  const env = {
    MAGICK_CONFIGURE_PATH: path.join(ctx.resources, "policy"),
    MAGICK_TEMPORARY_PATH: dir,
  };
  const command = (args) => run(exe, args, { cwd: dir, signal, env });
  const inspect = async (file) => {
    const data = (
      await command(["identify", "-format", "%m|%w|%h|%n|%[channels]\\n", file])
    ).stdout
      .trim()
      .split(/\r?\n/);
    if (!data.length) throw Error("Görsel okunamadı.");
    return data.map((line) => {
      const [format, w, h, frames, channels] = line.split("|");
      if (!Number(w) || !Number(h) || Number(w) * Number(h) > 100000000)
        throw Error("Görsel 100 MP sınırını aşıyor.");
      return {
        format,
        w: Number(w),
        h: Number(h),
        frames: Number(frames),
        channels,
      };
    });
  };
  for (const file of inputs) {
    const info = await inspect(file);
    const handle = await fs.open(file, "r");
    const header = Buffer.alloc(65536);
    try {
      await handle.read(header, 0, header.length, 0);
    } finally {
      await handle.close();
    }
    if (headerAnimation(header) && info.length < 2)
      throw Error(
        "Bu animasyon motor tarafından tam çözümlenemedi. Kare kaybını önlemek için işlem durduruldu.",
      );
  }
  if (op === "image.metadata") {
    const target = path.join(dir, "metadata.txt");
    await fs.writeFile(
      target,
      (await command(["identify", "-verbose", inputs[0]])).stdout,
    );
    return [target];
  }
  if (op === "image.frames") {
    await command([inputs[0], "-coalesce", path.join(dir, "kare-%05d.png")]);
    return (await fs.readdir(dir))
      .filter((n) => /^kare-\d+\.png$/.test(n))
      .map((n) => path.join(dir, n));
  }
  let format = o.format || "png";
  const output = path.join(dir, "sonuc." + format);
  let args = [...inputs];
  if (ctx.pdfSource) args.push("-auto-orient");
  const before = await inspect(inputs[0]);
  const isAnimation = before.length > 1;
  if (isAnimation && !["gif", "webp", "tiff"].includes(format))
    throw Error(
      "Bu dosya birden çok kare/sayfa içeriyor. Önce kareleri çıkar veya GIF/WebP/TIFF seç.",
    );
  if (isAnimation) args.push("-coalesce");
  switch (op) {
    case "image.resize":
      args.push("-resize", `${Math.round(o.width)}x`);
      break;
    case "image.crop":
      if (o.x + o.width > before[0].w || o.y + o.height > before[0].h)
        throw Error("Kırpma alanı görsel dışında.");
      args.push(
        "-crop",
        `${Math.round(o.width)}x${Math.round(o.height)}+${Math.round(o.x)}+${Math.round(o.y)}`,
        "+repage",
      );
      break;
    case "image.rotate":
      args.push("-rotate", o.angle);
      break;
    case "image.flip":
      args.push(o.axis === "horizontal" ? "-flop" : "-flip");
      break;
    case "image.color":
      args.push(
        "-modulate",
        `${o.brightness},${o.saturation},100`,
        "-brightness-contrast",
        `0x${o.contrast}`,
      );
      break;
    case "image.watermark":
      args.push(
        "-font",
        ctx.font,
        "-pointsize",
        o.fontSize,
        "-fill",
        o.color,
        "-gravity",
        o.gravity,
        "-annotate",
        "+16+16",
        o.text.replace(/%/g, "%%"),
      );
      break;
    case "image.border":
      args.push("-bordercolor", o.color, "-border", o.border);
      break;
    case "image.merge":
      args.push(o.direction === "horizontal" ? "+append" : "-append");
      break;
    case "image.strip":
      args.push("-strip");
      break;
    case "image.animate":
      args = [
        "-delay",
        Math.max(1, Math.round(o.delay / 10)),
        ...inputs,
        "-loop",
        o.loop,
      ];
      break;
  }
  if (format === "jpg")
    args.push("-background", "white", "-alpha", "remove", "-alpha", "off");
  if (op === "image.compress") {
    let met = false;
    for (let q = 90; q >= 10; q -= 5) {
      await command([...args, "-quality", q, output]);
      if ((await fs.stat(output)).size <= o.targetKB * 1024) {
        met = true;
        break;
      }
    }
    if (!met)
      throw Error(
        "Hedef boyuta kalite sınırı içinde ulaşılamadı. Daha büyük hedef seç veya görseli küçült.",
      );
  } else await command([...args, "-quality", o.quality || 90, output]);
  const after = await inspect(output);
  if (after[0].format !== imageTypes[format])
    throw Error("Çıktı formatı doğrulanamadı.");
  if (
    isAnimation &&
    !["image.merge", "image.animate"].includes(op) &&
    after.length !== before.length
  )
    throw Error("Kare sayısı değişti; çıktı kabul edilmedi.");
  if (
    op === "image.rotate" &&
    ["90", "270"].includes(o.angle) &&
    (after[0].w !== before[0].h || after[0].h !== before[0].w)
  )
    throw Error("Döndürme boyutları doğrulanamadı.");
  return [output];
}
let pdfjs;
async function pdfModule() {
  if (!pdfjs) {
    const canvas = await import("@napi-rs/canvas");
    globalThis.DOMMatrix ??= canvas.DOMMatrix;
    globalThis.ImageData ??= canvas.ImageData;
    globalThis.Path2D ??= canvas.Path2D;
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjs;
}
export async function readPDF(file) {
  const task = (await pdfModule()).getDocument({
    data: new Uint8Array(await fs.readFile(file)),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await task.promise;
  doc.destroy = () => task.destroy();
  return doc;
}
export async function rasterPDF(file, dir, range = "", dpi = 120) {
  const doc = await readPDF(file);
  const { createCanvas } = await import("@napi-rs/canvas");
  const results = [];
  try {
    for (const index of pageList(range, doc.numPages)) {
      const page = await doc.getPage(index + 1),
        viewport = page.getViewport({ scale: dpi / 72 });
      if (viewport.width * viewport.height > 24000000)
        throw Error("PDF sayfası önizleme sınırını aşıyor.");
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      await page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
      const out = path.join(dir, `sayfa-${index + 1}.png`);
      await fs.writeFile(out, canvas.toBuffer("image/png"));
      results.push(out);
    }
  } finally {
    await doc.destroy();
  }
  return results;
}
export async function pdfJob(ctx) {
  const { op, inputs, dir, options: o } = ctx;
  const output = path.join(dir, "sonuc.pdf");
  if (op === "pdf.unlock") {
    if (!o.password) throw Error("Belge parolasını yaz.");
    await run(
      ctx.engines.qpdf,
      ["--password=" + o.password, "--decrypt", inputs[0], output],
      { signal: ctx.signal },
    );
    await PDFDocument.load(await fs.readFile(output));
    return [output];
  }
  if (op === "pdf.fields") {
    const doc = await PDFDocument.load(await fs.readFile(inputs[0]));
    const out = path.join(dir, "form-alanlari.json");
    await fs.writeFile(
      out,
      JSON.stringify(
        doc
          .getForm()
          .getFields()
          .map((field) => ({
            name: field.getName(),
            type: field.constructor.name,
          })),
        null,
        2,
      ),
    );
    return [out];
  }
  if (op === "pdf.images") return rasterPDF(inputs[0], dir, o.pages, o.dpi);
  if (op === "pdf.text") {
    const doc = await readPDF(inputs[0]);
    let text = "";
    try {
      for (const index of pageList(o.pages, doc.numPages)) {
        const page = await doc.getPage(index + 1);
        const content = await page.getTextContent();
        text +=
          content.items.map((i) => i.str + (i.hasEOL ? "\n" : " ")).join("") +
          "\n\n";
      }
    } finally {
      await doc.destroy();
    }
    const out = path.join(dir, "metin.txt");
    await fs.writeFile(out, text);
    return [out];
  }
  let doc = await PDFDocument.create();
  let expected;
  if (op === "pdf.create") {
    const separate = [];
    for (let i = 0; i < inputs.length; i++) {
      if (o.output === "separate") doc = await PDFDocument.create();
      const png = (
        await imageJob({
          ...ctx,
          op: "image.convert",
          inputs: [inputs[i]],
          options: { format: "png", quality: 100 },
          pdfSource: true,
        })
      )[0];
      const img = await doc.embedPng(await fs.readFile(png));
      const layout = pdfLayout(img.width, img.height, o);
      const page = doc.addPage([layout.pageWidth, layout.pageHeight]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: layout.pageWidth,
        height: layout.pageHeight,
        color: rgb(1, 1, 1),
      });
      page.drawImage(img, {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
      });
      if (o.output === "separate") {
        const dest = path.join(dir, `sayfa-${i + 1}.pdf`);
        await fs.writeFile(dest, await doc.save());
        if (
          (await PDFDocument.load(await fs.readFile(dest))).getPageCount() !== 1
        )
          throw Error("PDF sayfa doğrulaması başarısız.");
        separate.push(dest);
      }
    }
    if (o.output === "separate") return separate;
    expected = inputs.length;
  } else if (op === "pdf.merge") {
    expected = 0;
    for (const file of inputs) {
      const source = await PDFDocument.load(await fs.readFile(file));
      for (const p of await doc.copyPages(source, source.getPageIndices()))
        doc.addPage(p);
      expected += source.getPageCount();
    }
  } else {
    const source = await PDFDocument.load(await fs.readFile(inputs[0]));
    const selected = pageList(o.pages, source.getPageCount());
    if (op === "pdf.split") {
      const results = [];
      for (const index of selected) {
        const part = await PDFDocument.create();
        part.addPage((await part.copyPages(source, [index]))[0]);
        const out = path.join(dir, `sayfa-${index + 1}.pdf`);
        await fs.writeFile(out, await part.save());
        results.push(out);
      }
      return results;
    }
    if (op === "pdf.extract" || op === "pdf.delete") {
      const indices =
        op === "pdf.delete"
          ? source.getPageIndices().filter((i) => !selected.includes(i))
          : selected;
      if (!indices.length) throw Error("En az bir sayfa kalmalı.");
      for (const p of await doc.copyPages(source, indices)) doc.addPage(p);
      expected = indices.length;
    } else {
      doc = source;
      expected = source.getPageCount();
      if (op === "pdf.rotate")
        for (const i of selected) {
          const p = doc.getPage(i);
          p.setRotation(
            degrees((p.getRotation().angle + Number(o.angle)) % 360),
          );
        }
      if (["pdf.watermark", "pdf.number", "pdf.forms"].includes(op)) {
        doc.registerFontkit(fontkit);
        const font = await doc.embedFont(await fs.readFile(ctx.font), {
          subset: op !== "pdf.forms",
        });
        if (op === "pdf.forms") {
          const values = JSON.parse(o.values);
          if (!values || Array.isArray(values) || typeof values !== "object")
            throw Error("Alan değerleri JSON nesnesi olmalı.");
          const form = doc.getForm();
          for (const [name, value] of Object.entries(values)) {
            const field = form.getField(name);
            if (typeof field.setText === "function")
              field.setText(String(value));
            else if (typeof field.check === "function")
              value ? field.check() : field.uncheck();
            else if (typeof field.select === "function")
              field.select(String(value));
            else throw Error("Bu form alanı desteklenmiyor: " + name);
          }
          form.updateFieldAppearances(font);
        } else
          for (const i of selected) {
            const p = doc.getPage(i);
            p.drawText(op === "pdf.number" ? String(i + 1) : o.text, {
              x: 24,
              y: 24,
              font,
              size: o.fontSize || 12,
              color: rgb(0.25, 0.25, 0.25),
              opacity: op === "pdf.number" ? 1 : 0.5,
            });
          }
      }
    }
  }
  await fs.writeFile(output, await doc.save());
  const check = await PDFDocument.load(await fs.readFile(output));
  if (check.getPageCount() !== expected)
    throw Error("PDF sayfa sayısı doğrulanamadı.");
  return [output];
}
export async function textJob(ctx) {
  const { op, options: o, inputs, dir } = ctx;
  const bytes = await fs.readFile(inputs[0]);
  if (bytes.length > 20 * 1024 * 1024)
    throw Error("Metin işlemi 20 MB sınırını aşıyor.");
  let text = iconv.decode(bytes, o.inputEncoding || "utf8"),
    ext = path.extname(inputs[0]).slice(1) || "txt";
  if (op === "text.edit") {
    text = o.content || text;
    text = text.replace(/\r\n|\r/g, "\n");
    if (o.newline === "crlf") text = text.replace(/\n/g, "\r\n");
  }
  if (op === "text.json") {
    text =
      JSON.stringify(JSON.parse(text.replace(/^\uFEFF/, "")), null, o.indent) +
      "\n";
    ext = "json";
  }
  if (op === "text.csv") {
    const rows = parse(text, {
      delimiter: o.delimiter === "tab" ? "\t" : o.delimiter,
      bom: true,
    });
    text = stringify(rows, {
      delimiter: o.format === "tsv" ? "\t" : ",",
      record_delimiter: "\n",
    });
    ext = o.format;
  }
  if (op === "subtitle.convert") {
    ext = o.format;
    if (ext === "vtt")
      text =
        "WEBVTT\n\n" +
        text
          .replace(/^WEBVTT[^\n]*\n\s*/, "")
          .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    else {
      text = text
        .replace(/^WEBVTT[^\n]*\n\s*/, "")
        .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2");
      text = text
        .split(/\n\s*\n/)
        .filter((s) => s.includes("-->"))
        .map((s, i) => `${i + 1}\n${s.replace(/^\d+\n/, "")}`)
        .join("\n\n");
    }
    if (!text.includes("-->")) throw Error("Altyazı zaman kodu bulunamadı.");
  }
  const buffer = iconv.encode(text, o.encoding || "utf8");
  if (iconv.decode(buffer, o.encoding || "utf8") !== text)
    throw Error("Seçilen kodlama bazı karakterleri kaybediyor. UTF-8 seç.");
  const out = path.join(dir, "sonuc." + ext);
  await fs.writeFile(out, buffer);
  return [out];
}
