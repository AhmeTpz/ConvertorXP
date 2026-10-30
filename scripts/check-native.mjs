import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
for (const dir of ["native", "shared"])
  for (const file of await readdir(dir)) {
    if (!/\.(c?js|mjs)$/.test(file)) continue;
    const p = spawnSync(process.execPath, ["--check", dir + "/" + file], {
      encoding: "utf8",
    });
    if (p.status) {
      console.error(p.stderr);
      process.exit(1);
    }
  }
console.log("Native syntax OK");
