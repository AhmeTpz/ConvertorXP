import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  await fs.readFile("resources/packages.json", "utf8"),
);
await fs.mkdir("resources/downloads", { recursive: true });
for (const p of manifest.packages.filter(
  (p) => p.bundled || process.argv.includes("--all"),
)) {
  for (const item of p.files || [p]) {
    const name =
      item.name ||
      decodeURIComponent(new URL(item.url).pathname.split("/").pop());
    const dest = path.join("resources/downloads", name);
    try {
      const bytes = await fs.readFile(dest);
      if (createHash("sha256").update(bytes).digest("hex") === item.sha256) {
        console.log("Cached", name);
        continue;
      }
    } catch {}
    const response = await fetch(item.url);
    if (!response.ok) throw Error(`Download failed: ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (
      data.length !== item.size ||
      createHash("sha256").update(data).digest("hex") !== item.sha256
    )
      throw Error("Checksum mismatch: " + name);
    await fs.writeFile(dest, data);
    console.log("Verified", name);
  }
}
