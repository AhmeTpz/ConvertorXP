import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import seven from "7zip-bin";
import { run, findFile, inside } from "./util.mjs";
export class Packages {
  constructor({ root, resources }) {
    this.root = root;
    this.resources = resources;
    this.busy = new Set();
    this.executables = new Map();
  }
  async init() {
    this.manifest = JSON.parse(
      await fs.readFile(path.join(this.resources, "packages.json"), "utf8"),
    );
    await fs.mkdir(this.root, { recursive: true });
  }
  async executable(id, name) {
    const cacheKey = id + ":" + (name || "");
    const cached = this.executables.get(cacheKey);
    if (cached) {
      try {
        await fs.access(cached);
        return cached;
      } catch {
        this.executables.delete(cacheKey);
      }
    }
    const spec = this.manifest.packages.find((p) => p.id === id);
    if (!spec) return null;
    for (const dir of [
      path.join(this.resources, "engines", id),
      path.join(this.root, id, spec.version),
    ]) {
      try {
        const f = await findFile(dir, name || spec.entry);
        if (f) {
          this.executables.set(cacheKey, f);
          return f;
        }
      } catch {}
    }
    return null;
  }
  async capabilities() {
    if (this.cachedCapabilities) return this.cachedCapabilities;
    const exe = await this.executable("image");
    const imageRead = [],
      imageWrite = [];
    if (exe) {
      const data = (
        await run(exe, ["identify", "-list", "format"], { timeout: 30000 })
      ).stdout;
      for (const line of data.split(/\r?\n/)) {
        const m = line.match(/^\s*(\w+)\*?\s+(?:\S+\s+)?([rw-]{2}[+ -])/);
        if (m) {
          if (m[2][0] === "r") imageRead.push(m[1]);
          if (m[2][1] === "w") imageWrite.push(m[1]);
        }
      }
    }
    return (this.cachedCapabilities = { imageRead, imageWrite });
  }
  async list() {
    return Promise.all(
      this.manifest.packages.map(async (p) => ({
        ...p,
        installed: !!(await this.executable(p.id)),
        busy: this.busy.has(p.id),
      })),
    );
  }
  async install(id, archiveFile, onProgress = () => {}) {
    const spec = this.manifest.packages.find((p) => p.id === id);
    if (!spec) throw Error("Bilinmeyen paket.");
    if (this.busy.has(id)) throw Error("Paket kuruluyor.");
    this.busy.add(id);
    const stage = path.join(this.root, ".stage-" + randomUUID());
    try {
      await fs.mkdir(stage, { recursive: true });
      if (spec.archive === "files") {
        const output = path.join(stage, "unpacked");
        await fs.mkdir(output);
        for (const file of spec.files) {
          const data = archiveFile
            ? await fs.readFile(path.join(path.dirname(archiveFile), file.name))
            : Buffer.from(await (await fetch(file.url)).arrayBuffer());
          if (
            data.length !== file.size ||
            createHash("sha256").update(data).digest("hex") !== file.sha256
          )
            throw Error("Dil paketi doğrulanamadı.");
          await fs.writeFile(path.join(output, file.name), data);
        }
        const target = path.join(this.root, id, spec.version);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.rename(output, target);
        return true;
      }
      const archive = path.join(stage, "package." + spec.archive);
      const hash = createHash("sha256");
      let received = 0;
      const handle = await fs.open(archive, "wx");
      try {
        if (archiveFile) {
          const { createReadStream } = await import("node:fs");
          for await (const chunk of createReadStream(archiveFile)) {
            received += chunk.length;
            if (received > spec.size) throw Error("Paket boyutu yanlış.");
            hash.update(chunk);
            await handle.write(chunk);
          }
        } else {
          const response = await fetch(spec.url);
          if (!response.ok) throw Error("Paket indirilemedi.");
          for await (const chunk of response.body) {
            received += chunk.length;
            if (received > spec.size) throw Error("Paket boyutu yanlış.");
            hash.update(chunk);
            await handle.write(chunk);
            onProgress(Math.round((received / spec.size) * 100));
          }
        }
      } finally {
        await handle.close();
      }
      if (received !== spec.size || hash.digest("hex") !== spec.sha256)
        throw Error("Paket SHA-256 doğrulaması başarısız.");
      const output = path.join(stage, "unpacked");
      await fs.mkdir(output);
      if (spec.archive === "msi") {
        await run(
          "msiexec.exe",
          ["/a", archive, "/qn", `TARGETDIR=${output}`],
          { timeout: 600000 },
        );
      } else {
        const listing = (await run(seven.path7za, ["l", "-slt", archive]))
          .stdout;
        for (const line of listing
          .split(/\r?\n/)
          .filter((l) => l.startsWith("Path = "))
          .slice(1)) {
          const name = line.slice(7);
          if (
            path.isAbsolute(name) ||
            !inside(output, path.join(output, name)) ||
            name.includes(":")
          )
            throw Error("Güvensiz paket yolu.");
        }
        await run(seven.path7za, ["x", archive, `-o${output}`, "-y"], {
          timeout: 600000,
        });
      }
      if (!(await findFile(output, spec.entry)))
        throw Error("Paket motoru eksik.");
      const target = path.join(this.root, id, spec.version);
      await fs.mkdir(path.dirname(target), { recursive: true });
      try {
        await fs.access(target);
        throw Error("Paket zaten kurulu.");
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      await fs.rename(output, target);
      return true;
    } finally {
      this.busy.delete(id);
      if (inside(this.root, stage))
        await fs.rm(stage, { recursive: true, force: true });
    }
  }
}
