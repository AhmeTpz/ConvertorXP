import fs from "node:fs/promises";
import path from "node:path";
import { imageJob, pdfJob, textJob } from "./core-engines.mjs";
import { mediaJob, officeJob, archiveJob, ocrJob } from "./extra-engines.mjs";
import { run } from "./util.mjs";
import { Resvg } from "@resvg/resvg-js";
export async function execute(ctx) {
  if (ctx.inputs.some((p) => path.extname(p) === ".svg")) {
    for (let i = 0; i < ctx.inputs.length; i++) {
      if (path.extname(ctx.inputs[i]) !== ".svg") continue;
      const source = await fs.readFile(ctx.inputs[i], "utf8");
      if (
        /<!DOCTYPE|<!ENTITY|<script|<foreignObject|(?:href\s*=\s*["'](?!#))|url\(\s*(?!#)/i.test(
          source,
        )
      )
        throw Error("SVG dış kaynak veya aktif içerik içeriyor.");
      const svg = new Resvg(source);
      if (svg.width * svg.height > 24000000)
        throw Error("SVG boyutu sınırı aşıyor.");
      const png = path.join(ctx.dir, `svg-${i}.png`);
      await fs.writeFile(png, svg.render().asPng());
      ctx.inputs[i] = png;
    }
  }
  const family = ctx.op.split(".")[0];
  const engine = {
    image: imageJob,
    pdf: pdfJob,
    text: textJob,
    subtitle: textJob,
    media: mediaJob,
    office: officeJob,
    archive: archiveJob,
    ocr: ocrJob,
  }[family];
  if (!engine) throw Error("İşlem bulunamadı.");
  const results = await engine(ctx);
  if (!results.length) throw Error("Çıktı üretilmedi.");
  for (const file of results) {
    const stat = await fs.stat(file);
    if (
      stat.size === 0 &&
      ![".txt", ".csv", ".tsv"].includes(path.extname(file))
    )
      throw Error("Boş çıktı.");
    if (path.extname(file) === ".pdf" && ctx.engines.qpdf)
      await run(ctx.engines.qpdf, ["--check", file], { signal: ctx.signal });
  }
  return results;
}
if (process.parentPort) {
  const controller = new AbortController();
  process.parentPort.on("message", async ({ data }) => {
    if (data.cancel) {
      controller.abort();
      return;
    }
    try {
      const results = await execute({
        ...data,
        signal: controller.signal,
        progress: (p) => process.parentPort.postMessage({ progress: p }),
      });
      process.parentPort.postMessage({ results });
    } catch (error) {
      process.parentPort.postMessage({ error: error.message });
    }
  });
}
