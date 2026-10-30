import { headerAnimation } from "./util.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { atomicJSON, run, safeName, uniqueCopy } from "./util.mjs";
import { Resvg } from "@resvg/resvg-js";
export class Workspace {
  constructor(root, resources, packs) {
    this.root = root;
    this.resources = resources;
    this.packs = packs;
    this.entries = new Map();
    this.ui = {};
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true });
    await fs.mkdir(path.join(this.root, "previews"), { recursive: true });
    try {
      const data = JSON.parse(
        await fs.readFile(path.join(this.root, "workspace.json"), "utf8"),
      );
      this.ui = data.ui || {};
      for (const e of data.entries || []) this.entries.set(e.id, e);
    } catch (e) {
      if (e.code !== "ENOENT") this.warning = "Çalışma alanı kaydı okunamadı.";
    }
    for (const e of this.entries.values()) {
      try {
        const st = await fs.stat(e.path);
        e.missing = false;
        e.changed = st.size !== e.size || st.mtimeMs !== e.mtime;
      } catch {
        e.missing = true;
      }
    }
  }
  async persist() {
    this.persistTail = (this.persistTail || Promise.resolve())
      .catch(() => {})
      .then(() =>
        atomicJSON(path.join(this.root, "workspace.json"), {
          version: 1,
          ui: this.ui,
          entries: [...this.entries.values()],
        }),
      );
    await this.persistTail;
  }
  public(e) {
    const { path: p, preview, mtime, ...rest } = e;
    return {
      ...rest,
      url: `cxp://app/asset/${e.id}`,
      previewURL: preview ? `cxp://app/preview/${e.id}` : null,
    };
  }
  async pdfSources(ids) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 2000)
      throw Error("Görsel seçimi geçersiz.");
    const exe = await this.packs.executable("image");
    if (!exe) throw Error("Görsel bileşeni gerekli.");
    const results = [];
    for (const id of ids) {
      const e = this.entries.get(id);
      if (!e?.isImage) throw Error("Bu dosya görsel olarak açılamıyor.");
      const st = await fs.stat(e.path);
      if (st.size !== e.size || st.mtimeMs !== e.mtime)
        throw Error("Kaynak değişmiş. Yeniden ekle.");
      // SVG has already been rendered with external resource access disabled.
      if (e.ext === "svg") {
        const source = await fs.readFile(e.path, "utf8");
        if (
          /<!DOCTYPE|<!ENTITY|<script|<foreignObject|(?:href\s*=\s*["'](?!#))|url\(\s*(?!#)/i.test(
            source,
          )
        )
          throw Error("SVG dış kaynak veya aktif içerik içeriyor.");
        const svg = new Resvg(source);
        e.pdfWidth = svg.width;
        e.pdfHeight = svg.height;
        results.push(this.public(e));
        continue;
      }
      const env = {
        MAGICK_CONFIGURE_PATH: path.join(this.resources, "policy"),
        MAGICK_TEMPORARY_PATH: path.join(this.root, "previews"),
      };
      const raw = (
        await run(
          exe,
          ["identify", "-ping", "-format", "%w|%h|%n|%[orientation]\n", e.path],
          { env, timeout: 30000 },
        )
      ).stdout
        .trim()
        .split(/\r?\n/);
      const [w, h, count, orientation] = raw[0].split("|");
      if (Number(count) > 1 || raw.length > 1)
        throw Error(
          e.name +
            ": animasyon veya çok sayfalı görsel. Önce kareleri/sayfaları ayrı dosyalar olarak çıkar.",
        );
      const handle = await fs.open(e.path, "r");
      const header = Buffer.alloc(65536);
      try {
        await handle.read(header, 0, header.length, 0);
      } finally {
        await handle.close();
      }
      if (headerAnimation(header))
        throw Error(
          e.name + ": animasyonlu görsel bu PDF akışında desteklenmiyor.",
        );
      const swap = [
        "LeftTop",
        "RightTop",
        "RightBottom",
        "LeftBottom",
      ].includes(orientation);
      e.pdfWidth = Number(swap ? h : w);
      e.pdfHeight = Number(swap ? w : h);
      if (e.preview)
        await run(
          exe,
          [
            e.path + "[0]",
            "-auto-orient",
            "-thumbnail",
            "512x512>",
            "-strip",
            e.preview,
          ],
          { env, timeout: 30000 },
        );
      results.push(this.public(e));
    }
    await this.persist();
    return results;
  }
  async add(p, { name, output = false } = {}) {
    const st = await fs.stat(p);
    if (!st.isFile()) throw Error("Dosya seçilmeli.");
    if (this.entries.size >= 2000)
      throw Error("Çalışma alanı sınırı 2000 dosya.");
    const e = {
      id: randomUUID(),
      path: path.resolve(p),
      name: safeName(name || path.basename(p)),
      size: st.size,
      mtime: st.mtimeMs,
      output,
    };
    let ext = path.extname(p).slice(1).toLowerCase();
    const handle = await fs.open(p, "r");
    const header = Buffer.alloc(Math.min(st.size, 65536));
    try {
      await handle.read(header, 0, header.length, 0);
    } finally {
      await handle.close();
    }
    if (header.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71])))
      ext = "png";
    else if (header[0] === 255 && header[1] === 216) ext = "jpg";
    else if (header.subarray(0, 5).toString() === "%PDF-") ext = "pdf";
    else if (header.subarray(0, 3).toString() === "GIF") ext = "gif";
    else if (header.subarray(0, 2).toString() === "BM") ext = "bmp";
    else if (header.subarray(8, 12).toString() === "WEBP") ext = "webp";
    else if (
      ["II*\x00", "MM\x00*"].includes(header.subarray(0, 4).toString("latin1"))
    )
      ext = "tiff";
    e.ext = ext;
    const mime = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      bmp: "image/bmp",
      avif: "image/avif",
      ico: "image/x-icon",
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      mp4: "video/mp4",
      webm: "video/webm",
    };
    e.type = mime[ext] || "application/octet-stream";
    if (
      [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "bmp",
        "tif",
        "tiff",
        "gif",
        "ico",
        "avif",
        "heic",
        "heif",
        "svg",
      ].includes(ext)
    ) {
      try {
        const exe = await this.packs.executable("image");
        const preview = path.join(this.root, "previews", e.id + ".png");
        if (ext === "svg") {
          if (st.size > 10 * 1024 * 1024)
            throw Error("SVG 10 MB sınırını aşıyor.");
          const source = await fs.readFile(p, "utf8");
          if (
            /<!DOCTYPE|<!ENTITY|<script|<foreignObject|(?:href\s*=\s*["'](?!#))|url\(\s*(?!#)/i.test(
              source,
            )
          )
            throw Error("SVG dış kaynak veya aktif içerik içeriyor.");
          const rendered = new Resvg(source, {
            fitTo: { mode: "width", value: 512 },
          }).render();
          await fs.writeFile(preview, rendered.asPng());
          e.width = rendered.width;
          e.height = rendered.height;
          e.nativeOnly = true;
        } else {
          const env = {
            MAGICK_CONFIGURE_PATH: path.join(this.resources, "policy"),
            MAGICK_TEMPORARY_PATH: path.join(this.root, "previews"),
          };
          const literal = p.replace(/\\/g, "/");
          const info = (
            await run(
              exe,
              ["identify", "-ping", "-format", "%w|%h|%n\n", literal],
              { env, timeout: 30000 },
            )
          ).stdout;
          const [w, h, frames] = info.split(/\r?\n/)[0].split("|").map(Number);
          e.width = w;
          e.height = h;
          e.frames = frames;
          e.nativeOnly =
            headerAnimation(header) ||
            !["png", "jpg", "jpeg", "webp", "bmp", "avif"].includes(ext) ||
            frames > 1 ||
            w * h > 24000000 ||
            st.size > 30 * 1024 ** 2;
          await run(
            exe,
            [literal + "[0]", "-thumbnail", "512x512>", "-strip", preview],
            { env, timeout: 30000 },
          );
        }
        e.preview = preview;
        e.isImage = true;
      } catch (error) {
        e.reason = error.message;
      }
    }
    this.entries.set(e.id, e);
    await this.persist();
    return this.public(e);
  }
  async importPaths(paths) {
    const result = [];
    const visit = async (p, depth = 0) => {
      if (depth > 20) throw Error("Klasör derinliği sınırı.");
      const st = await fs.lstat(p);
      if (st.isSymbolicLink()) return;
      if (st.isDirectory()) {
        for (const e of await fs.readdir(p))
          await visit(path.join(p, e), depth + 1);
      } else result.push(await this.add(p));
    };
    for (const p of paths) await visit(p);
    return result;
  }
  async update(items, ui) {
    const keep = new Set();
    for (const item of items) {
      const e = this.entries.get(item.id);
      if (!e) continue;
      keep.add(e.id);
      e.name = safeName(item.name);
      if (
        item.cell &&
        Number.isInteger(item.cell.x) &&
        Number.isInteger(item.cell.y)
      )
        e.cell = {
          x: Math.max(0, Math.min(100, item.cell.x)),
          y: Math.max(0, Math.min(10000, item.cell.y)),
        };
    }
    this.ui = ui || {};
    await this.persist();
  }
  async importBlob(bytes, name) {
    if (bytes.byteLength > 100 * 1024 ** 2)
      throw Error("Çıktı 100 MB sınırını aşıyor.");
    const temp = path.join(this.root, randomUUID() + ".tmp");
    await fs.writeFile(temp, new Uint8Array(bytes));
    try {
      const p = await uniqueCopy(
        temp,
        path.join(this.root, "outputs"),
        safeName(name),
      );
      return await this.add(p, { output: true });
    } finally {
      await fs.rm(temp, { force: true });
    }
  }
}
