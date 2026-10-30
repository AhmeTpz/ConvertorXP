import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { Packages } from "../native/packages.mjs";
import { Workspace } from "../native/workspace.mjs";
import { Queue } from "../native/queue.mjs";
import { execute } from "../native/engine-worker.mjs";

app
  .whenReady()
  .then(async () => {
    const resources = path.resolve("resources"),
      fixtures = path.resolve(".cxp-stage1/fixtures");
    const root = await fs.mkdtemp(path.resolve(".cxp-stage1/run-"));
    const packs = new Packages({
      root: path.resolve(".cxp-test/packages"),
      resources,
    });
    await packs.init();
    assert.ok(await packs.executable("office"), "Office test package required");
    const store = new Workspace(root, resources, packs);
    await store.init();
    const queue = new Queue(store, packs, resources, () => {});
    await queue.init();
    const report = [];
    const pass = (name) => {
      report.push(name);
      console.log("PASS", name);
    };
    const wait = async (id) => {
      for (let i = 0; i < 2000; i++) {
        const j = queue.jobs.find((j) => j.id === id);
        if (["completed", "failed", "cancelled"].includes(j.status)) return j;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw Error("Timeout");
    };
    const entries = [];
    for (const filename of [
      "Türkçe belge.docx",
      "Türkçe sunum.pptx",
      "Türkçe tablo.xlsx",
      "bozuk.docx",
    ])
      entries.push(await store.add(path.join(fixtures, filename)));
    const hash = async (p) =>
      createHash("sha256")
        .update(await fs.readFile(p))
        .digest("hex");
    const before = await hash(path.join(fixtures, "Türkçe belge.docx"));
    const ids = await queue.submit({
      operation: "office.pdf",
      ids: entries.map((e) => e.id),
      options: { format: "pdf" },
    });
    for (let i = 0; i < 3; i++) {
      const j = await wait(ids[i]);
      assert.equal(j.status, "completed", j.message);
      const output = store.entries.get(j.outputs[0]);
      assert.equal(
        (await PDFDocument.load(await fs.readFile(output.path))).getPageCount(),
        2,
      );
      pass(entries[i].name + " → two-page PDF");
    }
    assert.equal((await wait(ids[3])).status, "failed");
    pass("Mixed batch keeps successes and rejects broken document");
    const size = store.entries.size;
    const [previewId] = await queue.preview(entries[0].id);
    const preview = await wait(previewId);
    assert.equal(preview.status, "completed", preview.message);
    assert.equal(store.entries.size, size);
    assert.equal(preview.outputs.length, 0);
    assert.match(preview.previewURL, /document-preview/);
    assert.equal((await queue.preview(entries[0].id))[0], previewId);
    assert.equal(before, await hash(path.join(fixtures, "Türkçe belge.docx")));
    pass("Preview cache / no desktop output / original unchanged");
    const image = await store.add(path.resolve("tests/fixtures/sample.png"));
    const rotated = await store.add(path.join(fixtures, "yönlü.jpg"));
    const [normalized] = await store.pdfSources([rotated.id]);
    assert.equal(normalized.pdfWidth, 240);
    assert.equal(normalized.pdfHeight, 320);
    const [pdfId] = await queue.submit({
      operation: "pdf.create",
      ids: [rotated.id, image.id],
      options: { paper: "image", margin: 0 },
    });
    const pdfJob = await wait(pdfId);
    assert.equal(pdfJob.status, "completed", pdfJob.message);
    const pdf = await PDFDocument.load(
      await fs.readFile(store.entries.get(pdfJob.outputs[0]).path),
    );
    assert.deepEqual(
      pdf.getPages().map((p) => p.getSize()),
      [
        { width: 180, height: 240 },
        { width: 240, height: 180 },
      ],
    );
    pass("EXIF orientation and ordered image-sized PDF pages");
    const engines = {
      office: await packs.executable("office", "soffice.bin"),
      qpdf: await packs.executable("qpdf"),
    };
    for (const [source, format] of [
      [entries[0], "doc"],
      [entries[1], "ppt"],
    ]) {
      const dir = await fs.mkdtemp(path.join(root, "legacy-"));
      const [file] = await execute({
        op: "office.document",
        options: { format },
        inputs: [store.entries.get(source.id).path],
        dir,
        engines,
        resources,
      });
      const legacy = await store.add(file);
      const [id] = await queue.submit({
        operation: "office.pdf",
        ids: [legacy.id],
        options: { format: "pdf" },
      });
      const result = await wait(id);
      assert.equal(result.status, "completed", result.message);
      assert.equal(
        (
          await PDFDocument.load(
            await fs.readFile(store.entries.get(result.outputs[0]).path),
          )
        ).getPageCount(),
        2,
      );
      pass(format.toUpperCase() + " legacy PDF conversion");
    }
    await fs.writeFile(
      path.join(root, "report.json"),
      JSON.stringify(
        { date: new Date().toISOString(), passed: report },
        null,
        2,
      ),
    );
    console.log("REPORT", root);
    app.quit();
  })
  .catch((e) => {
    console.error(e);
    app.exit(1);
  });
