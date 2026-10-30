import fs from "node:fs/promises";
import path from "node:path";
import { Packages } from "../native/packages.mjs";
const packs = new Packages({
  root: path.resolve(".cxp-test/packages"),
  resources: path.resolve("resources"),
});
await packs.init();
for (const p of packs.manifest.packages.filter((p) => !p.bundled)) {
  if (await packs.executable(p.id)) continue;
  const file = path.resolve(
    "resources/downloads",
    p.files
      ? p.files[0].name
      : decodeURIComponent(new URL(p.url).pathname.split("/").pop()),
  );
  console.log("Installing", p.id);
  await packs.install(p.id, file);
  console.log("Installed", p.id, await packs.executable(p.id));
}
