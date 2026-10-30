import fs from "node:fs/promises";
import path from "node:path";
import { Packages } from "../native/packages.mjs";
const resources = path.resolve("resources");
const packs = new Packages({
  root: path.join(resources, "build-packs"),
  resources,
});
await packs.init();
for (const p of packs.manifest.packages.filter((p) => p.bundled)) {
  const archive = path.join(
    resources,
    "downloads",
    decodeURIComponent(new URL(p.url).pathname.split("/").pop()),
  );
  if (!(await packs.executable(p.id))) await packs.install(p.id, archive);
  const exe = await packs.executable(p.id);
  const source = path.join(packs.root, p.id, p.version);
  await fs.cp(source, path.join(resources, "engines", p.id), {
    recursive: true,
  });
  console.log("Bundled", p.id, exe);
}
