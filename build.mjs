import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "style.css",
  "app.js",
  "logo.png",
  "background.jpeg",
  "desktop.js",
  "windows.js",
  "viewers.js",
  "editor.js",
  "image-engine.js",
  "file-utils.js",
  "native-ui.js",
  "conversion-ui.js",
  "i18n.js",
  "pdf-workspace.js",
])
  await copyFile(file, `dist/${file}`);
console.log("Static build ready: dist/");

await mkdir("dist/shared", { recursive: true });
for (const f of ["catalog.js", "pdf-layout.js"])
  await copyFile("shared/" + f, "dist/shared/" + f);
await mkdir("dist/vendor", { recursive: true });
for (const f of ["pdf.mjs", "pdf.worker.mjs"])
  await copyFile("node_modules/pdfjs-dist/build/" + f, "dist/vendor/" + f);
await copyFile(
  "node_modules/pdf-lib/dist/pdf-lib.esm.min.js",
  "dist/vendor/pdf-lib.mjs",
);
