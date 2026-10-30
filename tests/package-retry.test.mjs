import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import seven from "7zip-bin";
import { Packages } from "../native/packages.mjs";
import { run } from "../native/util.mjs";

test("interrupted component download is discarded and a clean retry installs atomically", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cxp-package-retry-"));
  const source = path.join(root, "engine.exe"),
    archive = path.join(root, "engine.zip");
  await fs.writeFile(source, "test fixture, never executed");
  await run(seven.path7za, ["a", archive, source], { cwd: root });
  const bytes = await fs.readFile(archive);
  const packs = new Packages({
    root: path.join(root, "packages"),
    resources: path.resolve("resources"),
  });
  await packs.init();
  packs.manifest = {
    packages: [
      {
        id: "fixture",
        entry: "engine.exe",
        version: "1",
        archive: "zip",
        size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        url: "https://fixture.invalid/component.zip",
      },
    ],
  };
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      body: (async function* () {
        yield bytes.subarray(0, 10);
        throw Error("Simulated network interruption");
      })(),
    });
    await assert.rejects(packs.install("fixture"), /network interruption/);
    assert.equal(packs.busy.size, 0);
    assert.equal(
      (await fs.readdir(packs.root)).some((n) => n.startsWith(".stage-")),
      false,
    );
    assert.equal(await packs.executable("fixture"), null);
    globalThis.fetch = async () => new Response(bytes);
    await packs.install("fixture");
    const installed = await packs.executable("fixture");
    assert.ok(installed);
    assert.equal(
      await fs.readFile(installed, "utf8"),
      "test fixture, never executed",
    );
  } finally {
    globalThis.fetch = saved;
  }
});
