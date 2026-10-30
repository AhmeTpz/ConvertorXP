import fs from "node:fs/promises";
import path from "node:path";
const root = JSON.parse(await fs.readFile("package.json", "utf8"));
const seen = new Set(),
  records = [];
const output = "resources/licenses";
await fs.mkdir(output, { recursive: true });
async function locate(name, from) {
  let dir = from;
  while (true) {
    const p = path.join(dir, "node_modules", name);
    try {
      await fs.access(path.join(p, "package.json"));
      return p;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
async function visit(name, from) {
  const dir = await locate(name, from);
  if (!dir || seen.has(dir)) return;
  seen.add(dir);
  const p = JSON.parse(
    await fs.readFile(path.join(dir, "package.json"), "utf8"),
  );
  const record = {
    name: p.name,
    version: p.version,
    license: p.license || p.licenses || "See upstream",
    repository: p.repository,
  };
  records.push(record);
  const dest = path.join(output, p.name.replaceAll("/", "_") + "-" + p.version);
  await fs.mkdir(dest, { recursive: true });
  for (const file of await fs.readdir(dir)) {
    if (/^(licen[sc]e|copying|notice|authors)(\.|$)/i.test(file)) {
      const st = await fs.stat(path.join(dir, file));
      if (st.isFile())
        await fs.copyFile(path.join(dir, file), path.join(dest, file));
    }
  }
  for (const dep of Object.keys({
    ...p.dependencies,
    ...p.optionalDependencies,
  }))
    await visit(dep, dir);
}
for (const name of Object.keys(root.dependencies))
  await visit(name, process.cwd());
await fs.writeFile(
  path.join(output, "dependencies.json"),
  JSON.stringify(records, null, 2),
);
await fs.copyFile("LICENSE", path.join(output, "ConvertorXP-GPL-3.0.txt"));
console.log("License notices:", records.length);
