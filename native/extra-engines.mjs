import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { createWorker } from "tesseract.js";
import { run, inside } from "./util.mjs";
import { rasterPDF } from "./core-engines.mjs";
export async function mediaJob(ctx) {
  const { op, options: o, inputs, dir, engines, signal } = ctx;
  const probe = async (file) =>
    JSON.parse(
      (
        await run(
          engines.ffprobe,
          ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
          { signal },
        )
      ).stdout,
    );
  const sources = await Promise.all(
    inputs
      .filter((f) => ![".srt", ".vtt"].includes(path.extname(f)))
      .map(probe),
  );
  if (!sources.length) throw Error("Medya dosyası bulunamadı.");
  let format = o.format || "mp4",
    args = [
      "-hide_banner",
      "-nostdin",
      "-y",
      "-protocol_whitelist",
      "file,pipe,crypto",
    ];
  if (op === "media.subtitle-add") {
    if (inputs.length !== 2) throw Error("Bir video ve bir altyazı seç.");
    const sub = inputs.find((f) => [".srt", ".vtt"].includes(path.extname(f)));
    const video = inputs.find((f) => f !== sub);
    if (!sub) throw Error("Altyazı seçilmedi.");
    format = "mkv";
    args.push(
      "-i",
      video,
      "-i",
      sub,
      "-map",
      "0:v?",
      "-map",
      "0:a?",
      "-map",
      "1:0",
      "-c",
      "copy",
      "-c:s",
      "srt",
    );
  } else if (op === "media.merge") {
    if (inputs.length < 2) throw Error("En az iki dosya seç.");
    const signatures = sources.map((s) =>
      JSON.stringify(
        s.streams.map((x) => [
          x.codec_type,
          x.codec_name,
          x.width,
          x.height,
          x.sample_rate,
          x.channels,
        ]),
      ),
    );
    if (signatures.some((s) => s !== signatures[0]))
      throw Error(
        "Birleştirme için aynı codec, boyut ve ses özellikleri gerekiyor. Önce dosyaları aynı ayarlarla dönüştür.",
      );
    const list = path.join(dir, "concat.txt");
    await fs.writeFile(
      list,
      inputs.map((f) => `file '${path.basename(f)}'`).join("\n"),
    );
    args.push("-f", "concat", "-safe", "1", "-i", list);
  } else {
    if (o.start) args.push("-ss", o.start);
    args.push("-i", inputs[0]);
    if (o.duration) args.push("-t", o.duration);
  }
  if (op === "media.frame") {
    format = "png";
    args.push("-frames:v", "1");
  } else if (op === "media.gif") {
    format = "gif";
    args.push("-vf", `fps=12,scale=${Math.round(o.width)}:-1:flags=lanczos`);
  } else if (op === "media.subtitle-extract") {
    args.push("-map", "0:s:0");
  } else if (op !== "media.subtitle-add") {
    if (op === "media.resize")
      args.push(
        "-vf",
        `scale=${Math.round(o.width / 2) * 2}:-2`,
        "-r",
        o.fps,
        "-b:v",
        `${Math.round(o.bitrate)}k`,
      );
    if (op === "media.mute") args.push("-an");
    if (op === "media.normalize")
      args.push("-af", "loudnorm=I=-16:TP=-1.5:LRA=11");
    if (["mp3", "wav", "flac", "m4a", "ogg"].includes(format)) args.push("-vn");
    const codecs = {
      mp4: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"],
      mkv: ["-c:v", "libx264", "-c:a", "aac"],
      webm: ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
      mp3: ["-c:a", "libmp3lame"],
      wav: ["-c:a", "pcm_s16le"],
      flac: ["-c:a", "flac"],
      m4a: ["-c:a", "aac"],
      ogg: ["-c:a", "libvorbis"],
    };
    args.push(...(codecs[format] || []));
  }
  const output = path.join(dir, "sonuc." + format);
  args.push("-progress", "pipe:1", output);
  await run(engines.media, args, {
    cwd: dir,
    signal,
    timeout: 6 * 3600000,
    onProgress: (text) => {
      const match = text.match(/out_time_us=(\d+)/);
      if (match) {
        const duration = o.duration || Number(sources[0].format.duration);
        if (duration)
          ctx.progress?.(
            Math.min(99, (Number(match[1]) / 1e6 / duration) * 100),
          );
      }
    },
  });
  if (["srt", "vtt"].includes(format)) {
    if (!(await fs.readFile(output, "utf8")).includes("-->"))
      throw Error("Altyazı doğrulanamadı.");
  } else {
    const result = await probe(output);
    if (!result.streams.length) throw Error("Çıktıda medya akışı yok.");
    if (!["gif", "png"].includes(format)) {
      const expected =
        o.duration ||
        sources.reduce((n, s) => n + Number(s.format.duration || 0), 0);
      const duration = Number(result.format.duration);
      if (
        expected &&
        Math.abs(duration - expected) > Math.max(0.25, expected * 0.02)
      )
        throw Error("Çıktı süresi beklenenden farklı.");
      if (
        op === "media.mute" &&
        result.streams.some((s) => s.codec_type === "audio")
      )
        throw Error("Ses kaldırılamadı.");
    }
  }
  return [output];
}
export async function officeJob(ctx) {
  const { inputs, options: o, dir, engines, signal } = ctx;
  const extension = path.extname(inputs[0]).slice(1).toLowerCase();
  const head = Buffer.alloc(8),
    handle = await fs.open(inputs[0], "r");
  try {
    await handle.read(head, 0, 8, 0);
  } finally {
    await handle.close();
  }
  const ole = head.toString("hex") === "d0cf11e0a1b11ae1";
  if (
    ["docx", "pptx", "xlsx", "odt", "odp", "ods"].includes(extension) &&
    head.subarray(0, 2).toString() !== "PK"
  )
    throw Error(
      ole
        ? "Belge parola korumalı. Önce belgeyi parolasını kullanarak korumasız bir kopya olarak kaydet."
        : "Belge bozuk veya uzantısıyla içeriği uyuşmuyor.",
    );
  if (["doc", "ppt", "xls"].includes(extension) && !ole)
    throw Error("Belge bozuk veya eski Office biçimiyle içeriği uyuşmuyor.");
  const profile = path.join(dir, "office-profile");
  await fs.mkdir(path.join(profile, "user"), { recursive: true });
  await fs.writeFile(
    path.join(profile, "user", "registrymodifications.xcu"),
    '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item></oor:items>',
  );
  const outdir = path.join(dir, "office-output");
  await fs.mkdir(outdir);
  const args = [
    `-env:UserInstallation=${pathToFileURL(profile).href}`,
    "--headless",
    "--nologo",
    "--nodefault",
    "--norestore",
    "--language=en-US",
    "--convert-to",
    o.format,
    "--outdir",
    outdir,
    inputs[0],
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await run(engines.office, args, {
        signal,
        timeout: 120000,
        cwd: path.dirname(engines.office),
      });
      break;
    } catch (error) {
      if (attempt === 2 || !error.message.includes("hata kodu: 81"))
        throw error;
    }
  }
  const outputs = (await fs.readdir(outdir))
    .filter((n) => n.toLowerCase().endsWith("." + o.format))
    .map((n) => path.join(outdir, n));
  if (outputs.length !== 1 || (await fs.stat(outputs[0])).size === 0)
    throw Error(
      "Office dönüşümü başarısız; dosya/parola/biçim desteklenmiyor olabilir.",
    );
  if (o.format === "pdf") await PDFDocument.load(await fs.readFile(outputs[0]));
  else if (["docx", "xlsx", "pptx", "odt", "ods", "odp"].includes(o.format)) {
    const header = await fs.readFile(outputs[0]);
    if (header[0] !== 80 || header[1] !== 75)
      throw Error("Office çıktı paketi doğrulanamadı.");
  }
  return outputs;
}
export function archiveEntries(list, root) {
  const parts = list.split(/\r?\n\r?\n/).filter((s) => /^Path = /m.test(s));
  let total = 0;
  const names = [];
  for (const part of parts) {
    const name = part.match(/^Path = (.+)$/m)?.[1];
    if (!name) continue;
    if (
      path.isAbsolute(name) ||
      name.includes(":") ||
      !inside(root, path.join(root, name)) ||
      /^(?:Symbolic Link|Hard Link) = .+/m.test(part) ||
      /^Attributes = .*\bl\b/m.test(part)
    )
      throw Error("Arşiv güvensiz yol veya bağlantı içeriyor.");
    const size = Number(part.match(/^Size = (\d+)$/m)?.[1] || 0);
    total += size;
    if (total > 4 * 1024 ** 3 || names.length >= 10000)
      throw Error("Arşiv açılım sınırı: 4 GB / 10000 dosya.");
    names.push(name);
  }
  return names;
}
export async function archiveJob(ctx) {
  const { inputs, dir, op, options: o, engines, signal } = ctx;
  const exe = engines.archive;
  const password = o.password ? ["-p" + o.password] : [];
  if (op === "archive.create") {
    if (o.format === "gz" && inputs.length !== 1)
      throw Error("GZ tek dosya içindir; birden çok dosya için TAR/ZIP seç.");
    if (password.length && !["zip", "7z"].includes(o.format))
      throw Error("Bu arşiv biçimi parola desteklemiyor.");
    const out = path.join(dir, "sonuc." + o.format);
    await run(exe, ["a", "-t" + o.format, out, ...inputs, ...password], {
      signal,
    });
    await run(exe, ["t", out, ...password], { signal });
    return [out];
  }
  const listing = (
    await run(exe, ["l", "-slt", "-ba", inputs[0], ...password], { signal })
  ).stdout;
  const outdir = path.join(dir, "acilan");
  const names = archiveEntries(listing, outdir);
  if (op === "archive.list") {
    const out = path.join(dir, "icerik.txt");
    await fs.writeFile(out, listing);
    return [out];
  }
  await fs.mkdir(outdir);
  await run(exe, ["t", inputs[0], ...password], { signal });
  await run(exe, ["x", inputs[0], "-o" + outdir, "-y", ...password], {
    signal,
    timeout: 300000,
  });
  const files = [];
  async function walk(root) {
    for (const entry of await fs.readdir(root, { withFileTypes: true })) {
      const full = path.join(root, entry.name);
      const st = await fs.lstat(full);
      if (st.isSymbolicLink()) throw Error("Arşiv bağlantı içeriyor.");
      if (st.isDirectory()) await walk(full);
      else files.push(full);
    }
  }
  await walk(outdir);
  if (files.length > names.length) throw Error("Arşiv içeriği doğrulanamadı.");
  return files;
}
export async function ocrJob(ctx) {
  const { inputs, dir, options: o, engines, signal } = ctx;
  const pages =
    path.extname(inputs[0]) === ".pdf"
      ? await rasterPDF(inputs[0], dir, o.pages, 150)
      : inputs;
  const worker = await createWorker(o.language, 1, {
    langPath: path.dirname(engines.ocr),
    cacheMethod: "none",
    gzip: true,
    logger: (m) => ctx.progress?.(Math.round((m.progress || 0) * 100)),
  });
  const cancel = () => worker.terminate();
  signal?.addEventListener("abort", cancel, { once: true });
  let text = "";
  const pdf = await PDFDocument.create();
  try {
    for (const file of pages) {
      if (signal?.aborted) throw Error("İptal edildi.");
      const result = await worker.recognize(
        file,
        { rotateAuto: o.rotate === "auto", pdfTextOnly: false },
        { text: true, pdf: o.format === "pdf" },
      );
      text += result.data.text + "\n";
      if (o.format === "pdf") {
        const source = await PDFDocument.load(result.data.pdf);
        for (const p of await pdf.copyPages(source, source.getPageIndices()))
          pdf.addPage(p);
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    await worker.terminate();
  }
  const out = path.join(dir, "ocr." + o.format);
  await fs.writeFile(out, o.format === "pdf" ? await pdf.save() : text);
  return [out];
}
