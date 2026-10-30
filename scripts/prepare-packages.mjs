import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
await fs.mkdir("resources/downloads", { recursive: true });
const get = async (url) => {
  const r = await fetch(url, {
    headers: { "User-Agent": "ConvertorXP-build" },
  });
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return r;
};
const manifest = { schema: 1, platform: "win32", arch: "x64", packages: [] };
for (const spec of [
  {
    id: "image",
    label: "Görsel motoru",
    repo: "ImageMagick/ImageMagick",
    match: (n) => n.includes("portable-Q16-x64.7z"),
    license: "ImageMagick",
    entry: "magick.exe",
    bundled: true,
  },
  {
    id: "qpdf",
    label: "PDF doğrulama",
    repo: "qpdf/qpdf",
    match: (n) => n.endsWith("msvc64.zip"),
    license: "Apache-2.0",
    entry: "qpdf.exe",
    bundled: true,
  },
  {
    id: "media",
    label: "Ses / video",
    repo: "GyanD/codexffmpeg",
    match: (n) => n.includes("essentials_build.zip"),
    license: "GPL-3.0-or-later",
    entry: "ffmpeg.exe",
    bundled: false,
  },
]) {
  const release = await (
    await get(`https://api.github.com/repos/${spec.repo}/releases/latest`)
  ).json();
  const asset = release.assets.find((a) => spec.match(a.name));
  if (!asset) {
    console.log(
      spec.id,
      "no matching asset",
      release.assets.map((a) => a.name),
    );
    continue;
  }
  const file = path.join("resources/downloads", asset.name);
  console.log("Downloading", asset.name, asset.size);
  const buf = Buffer.from(
    await (await get(asset.browser_download_url)).arrayBuffer(),
  );
  const sha256 = createHash("sha256").update(buf).digest("hex");
  if (asset.digest && asset.digest !== `sha256:${sha256}`)
    throw Error("Digest mismatch");
  await fs.writeFile(file, buf);
  manifest.packages.push({
    id: spec.id,
    label: spec.label,
    version: release.tag_name,
    url: asset.browser_download_url,
    sha256,
    size: buf.length,
    archive: asset.name.endsWith(".zip") ? "zip" : "7z",
    entry: spec.entry,
    license: spec.license,
    source: release.html_url,
    bundled: spec.bundled,
  });
}
await fs.writeFile(
  "resources/packages.json",
  JSON.stringify(manifest, null, 2),
);
