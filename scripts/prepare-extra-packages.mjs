import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  await fs.readFile("resources/packages.json", "utf8"),
);
async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw Error(url + ": " + res.status);
  const data = Buffer.from(await res.arrayBuffer());
  await fs.writeFile("resources/downloads/" + file, data);
  return {
    url,
    size: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}
const officeUrl =
  "https://download.documentfoundation.org/libreoffice/stable/26.8.1/win/x86_64/LibreOffice_26.8.1_Win_x86-64.msi";
console.log("Office indiriliyor");
manifest.packages.push({
  id: "office",
  label: "Office dönüşümleri",
  version: "26.8.1",
  ...(await download(officeUrl, "LibreOffice_26.8.1_Win_x86-64.msi")),
  archive: "msi",
  entry: "soffice.exe",
  license: "MPL-2.0 / LGPL-3.0-or-later",
  source: "https://www.libreoffice.org/about-us/licenses",
  bundled: false,
});
const release = await (
  await fetch("https://api.github.com/repos/ip7z/7zip/releases/latest")
).json();
const asset = release.assets.find((a) => /x64\.exe$/.test(a.name));
manifest.packages.push({
  id: "archive",
  label: "Arşiv araçları",
  version: release.tag_name,
  ...(await download(asset.browser_download_url, asset.name)),
  archive: "exe",
  entry: "7z.exe",
  license: "LGPL-2.1-or-later + unRAR restriction",
  source: release.html_url,
  bundled: false,
});
const files = [];
for (const lang of ["eng", "tur"]) {
  const name = lang + ".traineddata.gz";
  files.push({
    name,
    ...(await download(
      `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${name}`,
      name,
    )),
  });
}
manifest.packages.push({
  id: "ocr",
  label: "Türkçe / İngilizce OCR",
  version: "4.0.0_best_int",
  files,
  size: files.reduce((n, f) => n + f.size, 0),
  archive: "files",
  entry: "eng.traineddata.gz",
  license: "Apache-2.0",
  source: "https://github.com/naptha/tessdata",
  bundled: false,
});
await fs.writeFile(
  "resources/packages.json",
  JSON.stringify(manifest, null, 2),
);
console.log("Ek paketler sabitlendi");
