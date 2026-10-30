import { isOffice } from "./shared/pdf-layout.js";
import { mountPdfWorkspace } from "./pdf-workspace.js";
import { mountPaintWorkspace } from "./paint-workspace.js";
import { mountEditor } from "./editor.js";
export function viewerType(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (
    [
      "txt",
      "md",
      "csv",
      "tsv",
      "json",
      "xml",
      "log",
      "yaml",
      "yml",
      "html",
      "css",
      "js",
    ].includes(ext)
  )
    return "text";
  if (
    ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext) ||
    file.type.startsWith("audio/")
  )
    return "audio";
  if (
    ["mp4", "webm", "mov", "m4v", "ogv"].includes(ext) ||
    file.type.startsWith("video/")
  )
    return "video";
  return "unsupported";
}
export async function mountViewer(record, entry, services) {
  const host = record.content;
  if (entry.missing || entry.changed) {
    const p = document.createElement("p");
    p.className = "notice";
    p.textContent = entry.reason;
    host.append(p);
    return;
  }
  if (entry.native && isOffice(entry)) {
    await services.documentPreview(record, entry);
    return;
  }
  if (entry.native && entry.ext === "pdf") {
    const dispose = await mountPdfWorkspace(host, entry, services);
    if (record.closed) dispose?.();
    else record.dispose = dispose;
    return;
  }
  if (entry.image) {
    if (entry.native && !(entry.file instanceof File)) {
      const blob = await (await fetch(entry.url)).blob();
      if (record.closed) return;
      entry.file = new File([blob], entry.name, { type: entry.type });
    }
    const dispose = await mountPaintWorkspace(host, entry, services);
    const cleanup = () => {
      dispose?.();
      if (entry.native)
        entry.file = {
          name: entry.name,
          size: entry.size,
          type: entry.type,
          text: () => window.convertorDesktop.readText(entry.id, "utf8"),
        };
    };
    if (record.closed) cleanup();
    else record.dispose = cleanup;
    return;
  }
  const kind = entry.viewer || viewerType(entry.file);
  const pane = document.createElement("div");
  pane.className = "file-viewer";
  host.append(pane);
  const heading = document.createElement("h3");
  heading.textContent = entry.name;
  pane.append(heading);
  const info = document.createElement("p");
  info.textContent = `${(entry.file.size / 1024).toFixed(1)} KB · ${entry.file.type || "Tür belirtilmemiş"}`;
  pane.append(info);
  if (kind === "image-preview") {
    const img = new Image();
    img.src = entry.previewURL || entry.url;
    img.alt = entry.name;
    img.className = "readonly-image";
    const p = document.createElement("p");
    p.textContent = entry.reason;
    pane.append(img, p);
  } else if (kind === "text") {
    if (entry.file.size > 2 * 1024 * 1024) {
      const p = document.createElement("p");
      p.textContent =
        "Metin önizlemesi en fazla 2 MB olabilir. Dosyanın tamamını indirebilirsin.";
      pane.append(p);
    } else {
      const pre = document.createElement("pre");
      pre.textContent = await entry.file.text();
      if (record.closed) return;
      pane.append(pre);
      const note = document.createElement("p");
      note.textContent = "Salt okunur · UTF-8 metin önizlemesi";
      pane.append(note);
    }
  } else if (kind === "audio" || kind === "video") {
    const media = document.createElement(kind);
    media.controls = true;
    media.preload = "metadata";
    media.src = entry.url;
    const feedback = document.createElement("p");
    feedback.textContent =
      "Oynatma desteği dosyanın codec biçimine ve tarayıcına bağlıdır.";
    media.onerror = () =>
      (feedback.textContent =
        "Bu dosya tarayıcıda oynatılamıyor. Codec desteklenmiyor veya dosya bozuk olabilir. Orijinali indirebilirsin.");
    pane.append(media, feedback);
    record.dispose = () => {
      media.pause();
      media.removeAttribute("src");
      media.load();
    };
  } else {
    const p = document.createElement("p");
    p.className = "notice";
    p.textContent =
      entry.reason ||
      (isOffice(entry)
        ? "Belge önizleme ve PDF dönüşümü Windows uygulamasında kullanılabilir."
        : "Bu dosya türü için önizleme ve düzenleme henüz desteklenmiyor. Orijinal dosyayı indirebilirsin.");
    pane.append(p);
  }
  const a = document.createElement("a");
  a.href = entry.url;
  a.download = entry.name;
  a.textContent = "↓ Orijinal dosyayı indir";
  a.className = "xp-button download-original";
  if (entry.native) {
    a.removeAttribute("href");
    a.onclick = () => window.convertorDesktop.saveAs(entry.id);
    a.textContent = "↓ Farklı kaydet";
  }
  pane.append(a);
}
