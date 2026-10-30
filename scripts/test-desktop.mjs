import { app } from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Packages } from "../native/packages.mjs";
import { Workspace } from "../native/workspace.mjs";
import { Queue } from "../native/queue.mjs";
import { uniqueCopy } from "../native/util.mjs";
app
  .whenReady()
  .then(async () => {
    const root = path.resolve(".cxp-integration", String(Date.now()));
    const resources = path.resolve("resources");
    const packs = new Packages({
      root: path.resolve(".cxp-test/packages"),
      resources,
    });
    await packs.init();
    const store = new Workspace(root, resources, packs);
    await store.init();
    const queue = new Queue(store, packs, resources, () => {});
    await queue.init();
    const original = path.resolve("tests/fixtures/sample.png");
    const hash = (b) => createHash("sha256").update(b).digest("hex");
    const before = hash(await fs.readFile(original));
    const e = await store.add(original);
    await store.update(
      [{ id: e.id, name: "Türkçe kopya.png", cell: { x: 2, y: 3 } }],
      { edits: { [e.id]: [{ kind: "rotate", direction: "right" }] } },
    );
    const restored = new Workspace(root, resources, packs);
    await restored.init();
    assert.equal(restored.entries.get(e.id).name, "Türkçe kopya.png");
    assert.deepEqual(restored.entries.get(e.id).cell, { x: 2, y: 3 });
    assert.equal(restored.ui.edits[e.id][0].kind, "rotate");
    console.log("PASS workspace persistence");
    async function wait(id) {
      for (let i = 0; i < 300; i++) {
        const job = queue.jobs.find((j) => j.id === id);
        if (["completed", "failed", "cancelled"].includes(job.status))
          return job;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw Error("Queue timeout");
    }
    const [id] = await queue.submit({
      operation: "image.convert",
      ids: [e.id],
      options: { format: "tiff" },
    });
    const done = await wait(id);
    assert.equal(done.status, "completed", done.message);
    assert.equal(done.outputs.length, 1);
    console.log("PASS Electron utility-process conversion");
    const [cancelId] = await queue.submit({
      operation: "image.convert",
      ids: [e.id],
      options: { format: "png" },
    });
    await queue.cancel(cancelId);
    assert.equal((await wait(cancelId)).status, "cancelled");
    console.log("PASS queue cancellation");
    const folder = path.join(root, "copies");
    const first = await uniqueCopy(original, folder, "same.png");
    const second = await uniqueCopy(original, folder, "same.png");
    assert.notEqual(first, second);
    assert.equal(hash(await fs.readFile(first)), before);
    assert.equal(hash(await fs.readFile(original)), before);
    console.log("PASS no overwrite / source integrity");
    const bad = path.join(root, "bad.zip");
    await fs.writeFile(bad, "not a trusted archive");
    await assert.rejects(packs.install("image", bad), /SHA-256/);
    console.log("PASS package integrity rejection");
    const caps = await packs.capabilities();
    assert.ok(caps.imageWrite.includes("PNG"));
    assert.ok(caps.imageRead.includes("HEIC"));
    console.log("PASS runtime format discovery");
    await fs.writeFile(
      path.join(root, "jobs.json"),
      JSON.stringify([{ id: "interrupted", status: "running" }]),
    );
    const recovered = new Queue(store, packs, resources, () => {});
    await recovered.init();
    assert.equal(recovered.jobs[0].status, "interrupted");
    console.log("PASS interrupted job recovery");
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
