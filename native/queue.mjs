import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { utilityProcess } from "electron";
import { operations, validateOptions, eligible } from "../shared/catalog.js";
import { atomicJSON, safeName, uniqueCopy, inside } from "./util.mjs";
import { isOffice } from "../shared/pdf-layout.js";
export class Queue {
  constructor(store, packs, resources, notify) {
    this.store = store;
    this.packs = packs;
    this.resources = resources;
    this.notify = notify;
    this.jobs = [];
    this.current = null;
    this.previews = new Map();
  }
  async init() {
    try {
      this.jobs = JSON.parse(
        await fs.readFile(path.join(this.store.root, "jobs.json"), "utf8"),
      ).map((j) =>
        ["running", "queued", "validating"].includes(j.status)
          ? {
              ...j,
              status: "interrupted",
              message: "Uygulama kapandı. Yeniden denemeyi seç.",
            }
          : j,
      );
    } catch {}
    await fs.mkdir(path.join(this.store.root, "jobs"), { recursive: true });
    this.jobs = this.jobs.filter((j) => !j.preview);
    this.previewRoot = path.join(this.store.root, "document-previews");
    if (!inside(this.store.root, this.previewRoot))
      throw Error("Geçersiz önizleme klasörü.");
    await fs.rm(this.previewRoot, { recursive: true, force: true });
    await fs.mkdir(this.previewRoot, { recursive: true });
  }
  async emit() {
    await atomicJSON(
      path.join(this.store.root, "jobs.json"),
      this.jobs
        .filter((j) => !j.preview)
        .map((j) => ({
          ...j,
          options: Object.fromEntries(
            Object.entries(j.options || {}).filter(([k]) => k !== "password"),
          ),
        })),
    );
    this.notify();
  }
  async preview(id) {
    const e = this.store.entries.get(id);
    if (!e || !isOffice(e)) throw Error("Bu dosya için belge önizlemesi yok.");
    const st = await fs.stat(e.path);
    if (st.size !== e.size || st.mtimeMs !== e.mtime)
      throw Error("Kaynak değişmiş. Yeniden ekle.");
    const existing = this.jobs.find(
      (j) =>
        j.preview &&
        j.inputIds[0] === id &&
        ["queued", "running", "validating", "completed"].includes(j.status),
    );
    if (existing) return [existing.id];
    return this.submit(
      { operation: "office.pdf", ids: [id], options: { format: "pdf" } },
      { preview: true },
    );
  }
  async submit(request, { preview = false } = {}) {
    const op = operations.find((o) => o.id === request.operation);
    const files = request.ids.map((id) => this.store.entries.get(id));
    if (!op || !files.length || files.some((f) => !f) || !eligible(op, files))
      throw Error("Dosya/işlem eşleşmesi geçersiz.");
    if (
      !["core", "pdf"].includes(op.engine) &&
      !(await this.packs.executable(op.engine))
    )
      throw Error("Önce " + op.engine + " paketini kur.");
    const options = validateOptions(op, request.options);
    const groups = op.multi ? [request.ids] : request.ids.map((id) => [id]);
    const ids = [];
    for (const inputIds of groups) {
      const job = {
        id: randomUUID(),
        operation: op.id,
        label: op.label,
        inputIds,
        options,
        status: "queued",
        progress: 0,
        created: Date.now(),
        outputs: [],
        preview,
      };
      this.jobs.push(job);
      ids.push(job.id);
    }
    await this.emit();
    void this.pump();
    return ids;
  }
  async cancel(id) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return;
    if (job.status === "queued") {
      job.status = "cancelled";
      await this.emit();
    }
    if (this.current?.id === id) {
      this.current.cancelled = true;
      this.current.worker?.postMessage({ cancel: true });
    }
  }
  async retry(id) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || !["failed", "cancelled", "interrupted"].includes(job.status))
      throw Error("Bu işlem yeniden denenemez.");
    if (
      operations
        .find((o) => o.id === job.operation)
        ?.fields.some((f) => f.key === "password")
    )
      throw Error("Parolalı işlemi araç panelinden tekrar başlat.");
    return this.submit({
      operation: job.operation,
      ids: job.inputIds,
      options: job.options,
    });
  }
  async pump() {
    if (this.current) return;
    const job = this.jobs.find((j) => j.status === "queued");
    if (!job) return;
    const current = { id: job.id, cancelled: false };
    this.current = current;
    const dir = path.join(this.store.root, "jobs", job.id);
    try {
      job.status = "running";
      await this.emit();
      await fs.mkdir(dir, { recursive: true });
      const inputs = [];
      for (let i = 0; i < job.inputIds.length; i++) {
        const e = this.store.entries.get(job.inputIds[i]);
        if (!e || e.missing) throw Error("Kaynak dosya bulunamıyor.");
        const st = await fs.stat(e.path);
        if (st.size !== e.size || st.mtimeMs !== e.mtime)
          throw Error("Kaynak dosya değişmiş. Yeniden ekle.");
        const target = path.join(dir, `${i}-${safeName(e.name)}`);
        await fs.copyFile(e.path, target);
        inputs.push(target);
      }
      const engines = {};
      for (const id of ["image", "qpdf", "media", "office", "archive", "ocr"])
        engines[id] = await this.packs.executable(id);
      engines.office = await this.packs.executable("office", "soffice.bin");
      engines.ffprobe = await this.packs.executable("media", "ffprobe.exe");
      if (current.cancelled) throw Error("İptal edildi.");
      const outputs = await new Promise((resolve, reject) => {
        const worker = utilityProcess.fork(
          fileURLToPath(new URL("./engine-worker.mjs", import.meta.url)),
          [],
          { stdio: "pipe" },
        );
        current.worker = worker;
        let settled = false;
        worker.on("message", (msg) => {
          if (msg.progress !== undefined) {
            job.progress = msg.progress;
            this.notify();
          }
          if (msg.results || msg.error) {
            settled = true;
            worker.kill();
            msg.error ? reject(Error(msg.error)) : resolve(msg.results);
          }
        });
        worker.on("exit", (code) => {
          if (!settled) reject(Error("İşlem motoru kapandı (" + code + ")."));
        });
        worker.stderr?.on("data", () => {});
        worker.postMessage({
          op: job.operation,
          options: job.options,
          inputs,
          dir,
          engines,
          resources: this.resources,
          font: path.join(this.resources, "fonts", "NotoSans-Regular.ttf"),
        });
      });
      if (current.cancelled) throw Error("İptal edildi.");
      job.status = "validating";
      await this.emit();
      for (const output of outputs) {
        if (current.cancelled) throw Error("İptal edildi.");
        if (!inside(dir, output)) throw Error("Geçersiz çıktı yolu.");
        const source = this.store.entries.get(job.inputIds[0]);
        const base = path.parse(source?.name || "sonuc").name;
        const name =
          outputs.length === 1
            ? base +
              "-" +
              job.operation.split(".").at(-1) +
              path.extname(output)
            : path.basename(output);
        let folder = path.join(this.store.root, "outputs");
        if (job.operation === "archive.extract") {
          const relative = path.relative(path.join(dir, "acilan"), output);
          if (!inside(path.join(dir, "acilan"), output))
            throw Error("Geçersiz arşiv çıktısı.");
          folder = path.join(
            folder,
            base + "-acilan-" + job.id.slice(0, 8),
            path.dirname(relative),
          );
        }
        if (job.preview) {
          const dest = await uniqueCopy(
            output,
            this.previewRoot,
            job.id + ".pdf",
          );
          this.previews.set(job.id, { path: dest, sourceId: job.inputIds[0] });
          job.previewURL = "cxp://app/document-preview/" + job.id;
        } else {
          const dest = await uniqueCopy(output, folder, name);
          job.outputs.push((await this.store.add(dest, { output: true })).id);
        }
      }
      job.status = "completed";
      job.progress = 100;
      job.message = job.preview
        ? "Önizleme hazır."
        : job.outputs.length + " çıktı doğrulandı.";
    } catch (error) {
      job.status = current.cancelled ? "cancelled" : "failed";
      job.message = error.message;
    } finally {
      this.current = null;
      await fs.rm(dir, { recursive: true, force: true });
      await this.emit();
      void this.pump();
    }
  }
}
