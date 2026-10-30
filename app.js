import { isOffice } from "./shared/pdf-layout.js";
import { native, hydrate, createNativeUI } from "./native-ui.js";
import {
  inspectImage,
  splitName,
  renamedName,
  copyName,
} from "./file-utils.js";
import { createDesktop, cellsFrom } from "./desktop.js";
import { createWindowManager } from "./windows.js";
import { mountViewer, viewerType } from "./viewers.js";
import { mountPaintWorkspace } from "./paint-workspace.js";
import { t, lang, setLanguage, applyStatic } from "./i18n.js";
const $ = (s) => document.querySelector(s);
applyStatic();
let nativeReady = false,
  saveTimer,
  refreshing = false,
  refreshPending = false,
  refreshMetadata = false;
const entries = [];
const selected = new Set();
let operation = "",
  targets = [],
  busy = false;
const windowManager = createWindowManager(
  document.querySelector("#windowTasks"),
);
const desktopController = createDesktop({
  root: document.querySelector("#files"),
  desktop: document.querySelector("#desktop"),
  entries,
  selected,
  onOpen: openFiles,
  onRename: renameFile,
  onMenu: menu,
  onChange: () => {
    $("#selection").textContent = selected.size
      ? t("selection_count", { selected: selected.size, total: entries.length })
      : t("selection_zero");
  },
  onHideMenus: () => {
    $("#contextMenu").hidden = true;
    closeStart();
  },
  onDragOut: (ids) => {
    if (native?.startDrag) native.startDrag(ids);
  },
  notify,
});
function openFiles(ids = [...selected]) {
  for (const id of ids) {
    const e = entries.find((e) => e.id === id);
    if (!e) continue;
    const initial = e.image
      ? {
          width: Math.min(900, Math.max(500, e.width + 64)),
          height: Math.min(650, Math.max(420, e.height + 170)),
        }
      : e.ext === "pdf"
        ? { width: 920, height: 640 }
        : e.viewer === "audio"
          ? { width: 440, height: 290 }
          : {};
    const { record, created } = windowManager.open(e, initial);
    if (created)
      mountViewer(record, e, {
        save: saveEdited,
        notify,
        showBalloon,
        documentPreview: nativeUI?.documentPreview,
      }).catch((err) => {
        notify(err.message);
        record.content.replaceChildren();
        const p = document.createElement("p");
        p.className = "notice";
        p.textContent =
          err.message + " · Dosyayı Yerel araçlar ile inceleyebilirsin.";
        record.content.append(p);
      });
  }
}
async function saveEdited(blob, name, width, height) {
  if (native) {
    const item = await native.saveBlob(await blob.arrayBuffer(), name);
    entries.push(await hydrate(item));
    selected.clear();
    selected.add(item.id);
    render();
    return;
  }
  if (entries.length >= 60)
    throw new Error(
      "Masaüstünde 60 dosya sınırına ulaşıldı. Önce birkaç dosyayı kaldır.",
    );
  if (blob.size > 30 * 1024 * 1024)
    throw new Error("Çıktı 30 MB sınırını aşıyor. Boyutu veya kaliteyi azalt.");
  const file = new File([blob], name, { type: blob.type }),
    e = {
      id: crypto.randomUUID(),
      file,
      name,
      url: URL.createObjectURL(blob),
      image: true,
      viewer: "image",
      width,
      height,
      type: blob.type,
      output: true,
    };
  entries.push(e);
  selected.clear();
  selected.add(e.id);
  render();
}
function createPaintWindow() {
  const paintEntry = {
    id: "paint-" + Date.now(),
    name: "Paint - " + (lang === "tr" ? "Adsız" : "Untitled"),
    ext: "png",
    image: true,
    file: new File([], "paint.png", { type: "image/png" }),
  };
  const { record, created } = windowManager.open(paintEntry, {
    width: 860,
    height: 640,
  });
  if (created) {
    mountPaintWorkspace(record.content, paintEntry, {
      save: saveEdited,
      notify,
      showBalloon,
    }).catch((err) => notify(err.message));
  }
}

function createCollageWindow(items) {
  const collageEntry = {
    id: "collage-" + Date.now(),
    name: (t("collage_title") || "Kolaj") + " (" + items.length + ")",
    ext: "png",
    image: true,
    file: new File([], "kolaj.png", { type: "image/png" }),
  };
  const { record, created } = windowManager.open(collageEntry, {
    width: 900,
    height: 680,
  });
  if (created) {
    mountPaintWorkspace(
      record.content,
      collageEntry,
      {
        save: saveEdited,
        notify,
        showBalloon,
      },
      { collageImages: items },
    ).catch((err) => notify(err.message));
  }
}
const nativeUI = native
  ? createNativeUI({
      manager: windowManager,
      getSelection: () => entries.filter((e) => selected.has(e.id)),
      notify,
      refresh: refreshNative,
    })
  : null;
const formats = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
const labels = {
  convert: "Görselleri dönüştür",
  resize: "Boyutlandır",
  rotate: "90° sağa döndür",
  merge: "Görselleri birleştir",
  info: "Dosya özellikleri",
};
const size = (n) =>
  n < 1048576
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / 1048576).toFixed(1)} MB`;
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").hidden = true), 5500);
}
function render() {
  desktopController.render();
  if (nativeReady) scheduleNativeSave();
  $("#welcome").hidden = entries.length > 0;
}
function toggle(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id);
  render();
}
const inspect = inspectImage;
async function addFiles(files, targetCell = null) {
  if (native) {
    try {
      const added = await native.dropFiles(files);
      const occupied = new Set(
        entries.filter((e) => e.cell).map((e) => `${e.cell.x},${e.cell.y}`),
      );
      const start = targetCell || { x: 0, y: 0 };
      const cells = targetCell
        ? cellsFrom(start, added.length, occupied, desktopController.cols())
        : [];
      for (const [i, e] of added.entries()) {
        const item = await hydrate(e);
        if (cells[i]) item.cell = cells[i];
        entries.push(item);
      }
      render();
    } catch (err) {
      notify(err.message);
    }
    return;
  }
  if (busy)
    return notify("Devam eden işlem bittikten sonra dosya ekleyebilirsin.");
  busy = true;
  let skipped = 0;
  try {
    const occupied = new Set(
      entries.filter((e) => e.cell).map((e) => `${e.cell.x},${e.cell.y}`),
    );
    const start = targetCell || { x: 0, y: 0 };
    const cells = targetCell
      ? cellsFrom(start, files.length, occupied, desktopController.cols())
      : [];
    for (const [i, file] of files.entries()) {
      if (entries.length >= 60 || file.size > 30 * 1024 * 1024) {
        skipped++;
        continue;
      }
      const info = await inspect(file);
      const item = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        viewer: info.image ? "image" : viewerType(file),
        ...info,
      };
      if (cells[i]) item.cell = cells[i];
      entries.push(item);
    }
    render();
    if (skipped)
      notify(
        `${skipped} dosya eklenmedi. Sınır: dosya başına 30 MB, masaüstünde 60 dosya.`,
      );
  } finally {
    busy = false;
  }
}
function menu(x, y) {
  const m = $("#contextMenu");
  closeStart();
  m.replaceChildren();
  const list = entries.filter((e) => selected.has(e.id));
  const allImages = list.length > 0 && list.every((e) => e.image);
  const add = (text, fn, disabled = false, action = "") => {
    const b = document.createElement("button");
    if (action) b.dataset.action = action;
    const split = text.indexOf("  ");
    const glyph = document.createElement("span");
    glyph.className = "menu-icon";
    glyph.textContent = split < 0 ? "" : text.slice(0, split);
    const label = document.createElement("span");
    label.textContent = split < 0 ? text : text.slice(split + 2);
    b.append(glyph, label);
    b.disabled = disabled;
    b.onclick = () => {
      m.hidden = true;
      fn();
    };
    m.append(b);
  };
  const caption = document.createElement("div");
  caption.className = "menu-caption";
  caption.textContent = list.length
    ? t("menu_selected", { count: list.length })
    : "ConvertorXP";
  m.append(caption);
  if (!list.length) {
    if (native) {
      add(t("menu_add_folder"), () => pickNative(true));
    }
    add(t("menu_add_files"), () =>
      native ? pickNative() : $("#fileInput").click(),
    );
    add(
      t("menu_select_all"),
      () => {
        entries.forEach((e) => selected.add(e.id));
        render();
      },
      !entries.length,
    );
    add(
      t("menu_sort_name"),
      () => {
        const locale = lang === "tr" ? "tr" : "en";
        entries.sort((a, b) =>
          a.name.localeCompare(b.name, locale, { numeric: true }),
        );
        entries.forEach((e) => (e.cell = null));
        $("#files").replaceChildren();
        render();
      },
      !entries.length,
    );
    positionMenu(m, x, y);
    return;
  }
  add(t("menu_open"), () => openFiles(list.map((e) => e.id)));
  if (!native && list.every(isOffice))
    add(t("menu_pdf_convert_web"), () =>
      notify("Office conversions are available in the desktop application."),
    );
  if (native) {
    if (list.every(isOffice))
      add(
        t("menu_pdf_convert"),
        () => nativeUI.convertPDF(),
        false,
        "pdf-convert",
      );
    if (list.every((e) => e.isImage || e.image || e.previewImage))
      add(
        t("menu_pdf_create"),
        () => nativeUI.convertPDF(),
        false,
        "pdf-create",
      );
    if (list.length >= 2 && list.every((e) => e.image || e.isImage))
      add(
        t("menu_collage") || "🖼 Kolaj Oluştur",
        () => createCollageWindow(list),
        false,
        "collage-create",
      );
    if (list.every((e) => e.image))
      add(t("menu_edit"), () => openFiles(list.map((e) => e.id)));
    add(t("menu_tools"), () => nativeUI.tools());
    if (list.length > 1)
      add(t("menu_batch_rename"), () => nativeUI.batchRename());
    add(t("menu_reveal"), () => native.reveal(list[0].id), list.length !== 1);
  }
  add(t("menu_rename"), () => renameFile(list[0].id), list.length !== 1);
  add(t("menu_duplicate"), () => duplicateFiles(list));
  m.append(document.createElement("hr"));
  if (allImages) {
    add(
      t("menu_convert_quality"),
      () => openOperation("convert"),
      false,
      "image-convert",
    );
    if (native) {
      add(
        t("menu_compress"),
        () => nativeUI.tools("image.compress"),
        false,
        "image-compress",
      );
      add(
        t("menu_strip"),
        () => nativeUI.tools("image.strip"),
        false,
        "image-strip",
      );
    }
    add(t("menu_resize"), () => openOperation("resize"), false, "image-resize");
    add(t("menu_rotate"), () => openOperation("rotate"), false, "image-rotate");
    add(
      t("menu_merge"),
      () => openOperation("merge"),
      list.length < 2,
      "image-merge",
    );
  }
  const allPDFs =
    list.length > 0 &&
    list.every((e) => e.name.toLowerCase().endsWith(".pdf") || e.ext === "pdf");
  if (allPDFs && native) {
    add(
      t("menu_pdf_workspace"),
      () => openFiles(list.map((e) => e.id)),
      false,
      "pdf-workspace",
    );
    add(
      t("menu_pdf_images"),
      () => nativeUI.tools("pdf.images"),
      false,
      "pdf-images",
    );
  }
  const allMedia =
    list.length > 0 &&
    list.every((e) =>
      [
        "mp4",
        "mkv",
        "mov",
        "webm",
        "avi",
        "mp3",
        "wav",
        "flac",
        "m4a",
        "ogg",
      ].includes(e.ext || e.name.split(".").pop().toLowerCase()),
    );
  if (allMedia && native) {
    add(
      t("menu_create_gif"),
      () => nativeUI.tools("media.gif"),
      false,
      "media-gif",
    );
    add(
      t("menu_extract_audio"),
      () => nativeUI.tools("media.audio"),
      false,
      "media-audio",
    );
  }
  m.append(document.createElement("hr"));
  add(t("menu_download"), () => download(list[0]), list.length !== 1);
  add(
    t("menu_select_all"),
    () => {
      entries.forEach((e) => selected.add(e.id));
      render();
    },
    !entries.length,
  );
  add(
    t("menu_clear_selection"),
    () => {
      selected.clear();
      render();
    },
    !list.length,
  );
  add(t("menu_properties"), () => openOperation("info"), !list.length);
  add(
    t("menu_remove"),
    () => {
      if (native)
        native
          .remove(list.map((e) => e.id))
          .catch((err) => notify(err.message));
      for (const e of list) {
        windowManager.close(e.id);
        URL.revokeObjectURL(e.url);
        entries.splice(entries.indexOf(e), 1);
      }
      selected.clear();
      render();
    },
    !list.length,
  );
  positionMenu(m, x, y);
}
function positionMenu(m, x, y) {
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 5)) + "px";
  m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 48)) + "px";
}
function download(e) {
  if (native) return native.saveAs(e.id).catch((err) => notify(err.message));
  const a = document.createElement("a");
  a.href = e.url;
  a.download = e.name;
  a.click();
}
function openOperation(op) {
  if (native && op !== "info")
    return nativeUI.tools("image." + op).catch((err) => notify(err.message));
  if (busy) return notify("Dosyalar işleniyor, lütfen bekle.");
  operation = op;
  targets = entries.filter((e) => selected.has(e.id));
  $("#windowTitle").textContent = labels[op];
  $("#execute").hidden = op === "info";
  $("#execute").disabled = false;
  $("#execute").textContent = "Uygula";
  const body = $("#windowBody");
  body.replaceChildren();
  const p = document.createElement("p");
  p.textContent = `${targets.length} dosya seçili. Orijinal dosyalar korunur; çıktılar masaüstüne eklenir.`;
  body.append(p);
  if (op === "info") {
    for (const e of targets) {
      const p = document.createElement("p");
      p.textContent = `${e.name} — ${size(e.file.size)}${e.image ? ` · ${e.width} × ${e.height} px` : ` · ${e.reason}`}`;
      body.append(p);
    }
  } else {
    if (op === "merge") {
      body.insertAdjacentHTML(
        "beforeend",
        '<label for="direction">Yerleşim</label><select id="direction"><option value="vertical">Alt alta</option><option value="horizontal">Yan yana</option></select><p>Görseller ölçeklenmez. Boş alanlar arka plan rengiyle doldurulur.</p><div id="order"></div>',
      );
      renderOrder();
    }
    if (op === "resize") {
      body.insertAdjacentHTML(
        "beforeend",
        '<label for="width">Hedef genişlik (px)</label><input id="width" type="number" min="1" max="16000" value="1200" required><p>En-boy oranı korunur. Yükseklik her dosya için hesaplanır.</p>',
      );
    }
    body.insertAdjacentHTML(
      "beforeend",
      '<label for="format">Çıktı formatı</label><select id="format"><option value="png">PNG — kayıpsız kodlama</option><option value="jpg">JPG — daha küçük dosya</option><option value="webp">WebP — verimli sıkıştırma</option></select><div id="qualityRow" hidden><label for="quality">Kalite: <span id="qualityValue">92</span>%</label><input id="quality" type="range" min="10" max="100" value="92"></div><label for="background">Arka plan rengi (JPG ve birleştirmedeki boşluklar)</label><input id="background" type="color" value="#ffffff"><p class="notice">JPG şeffaflığı kaldırır. JPG / WebP kayıplı kodlanır; dosya boyutunun küçülmesi garanti edilmez. EXIF ve diğer metadata korunmaz; renk profilleri değişebilir. Animasyonlu dosyalar dönüştürülmez.</p>',
    );
    $("#format").onchange = () =>
      ($("#qualityRow").hidden = $("#format").value === "png");
    $("#quality").oninput = () =>
      ($("#qualityValue").textContent = $("#quality").value);
  }
  $("#window").showModal();
}
function renderOrder() {
  const root = $("#order");
  root.replaceChildren();
  targets.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "order-row";
    const text = document.createElement("span");
    text.textContent = `${i + 1}. ${e.name}`;
    row.append(text);
    for (const [delta, symbol] of [
      [-1, "↑"],
      [1, "↓"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = symbol;
      b.setAttribute(
        "aria-label",
        e.name + (delta < 0 ? " yukarı taşı" : " aşağı taşı"),
      );
      b.disabled = i + delta < 0 || i + delta >= targets.length;
      b.onclick = () => {
        [targets[i], targets[i + delta]] = [targets[i + delta], targets[i]];
        renderOrder();
      };
      row.append(b);
    }
    root.append(row);
  });
}
function canvas(w, h) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w * h > 24000000 ||
    w > 16000 ||
    h > 16000
  )
    throw new Error(
      "Çıktı sınırı aşıldı: en fazla 24 MP ve kenar başına 16000 px. Daha küçük boyut veya daha az görsel seç.",
    );
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
async function encode(c, format, quality) {
  const blob = await new Promise((resolve) =>
    c.toBlob(resolve, formats[format], quality),
  );
  if (!blob || blob.type !== formats[format])
    throw new Error(
      "Tarayıcın bu çıktı formatını desteklemiyor. PNG seçerek tekrar dene.",
    );
  const check = await createImageBitmap(blob);
  try {
    if (check.width !== c.width || check.height !== c.height)
      throw new Error("Çıktı boyut doğrulaması başarısız.");
  } finally {
    check.close();
  }
  return blob;
}
$("#operationForm").onsubmit = async (ev) => {
  ev.preventDefault();
  if (busy) return;
  busy = true;
  $("#execute").disabled = true;
  $("#execute").textContent = "İşleniyor…";
  $("#cancel").disabled = true;
  $("#closeWindow").disabled = true;
  const generated = [];
  try {
    const format = $("#format").value,
      quality = Number($("#quality").value) / 100,
      bg = $("#background").value;
    const width = operation === "resize" ? Number($("#width").value) : 0;
    const groups = operation === "merge" ? [targets] : targets.map((e) => [e]);
    if (entries.length + groups.length > 60)
      throw new Error(
        "Masaüstünde en fazla 60 dosya tutulabilir. Önce birkaç dosyayı kaldır.",
      );
    for (const group of groups) {
      const vertical =
        operation === "merge" && $("#direction").value === "vertical";
      let w, h;
      if (operation === "merge") {
        w = vertical
          ? Math.max(...group.map((e) => e.width))
          : group.reduce((s, e) => s + e.width, 0);
        h = vertical
          ? group.reduce((s, e) => s + e.height, 0)
          : Math.max(...group.map((e) => e.height));
      } else {
        w =
          operation === "resize"
            ? width
            : operation === "rotate"
              ? group[0].height
              : group[0].width;
        h =
          operation === "resize"
            ? Math.max(
                1,
                Math.round((group[0].height * width) / group[0].width),
              )
            : operation === "rotate"
              ? group[0].width
              : group[0].height;
      }
      const c = canvas(w, h),
        ctx = c.getContext("2d");
      if (!ctx) throw new Error("Tarayıcı görsel işleme alanı oluşturamadı.");
      if (format === "jpg" || operation === "merge") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }
      let x = 0,
        y = 0;
      for (const e of group) {
        const bitmap = await createImageBitmap(e.file);
        try {
          if (operation === "rotate") {
            ctx.translate(w, 0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(bitmap, 0, 0);
          } else if (operation === "merge") {
            ctx.drawImage(bitmap, x, y);
            if (vertical) y += e.height;
            else x += e.width;
          } else ctx.drawImage(bitmap, 0, 0, w, h);
        } finally {
          bitmap.close();
        }
      }
      const blob = await encode(c, format, quality);
      const base =
        operation === "merge"
          ? "birlestirilmis"
          : group[0].name.replace(/\.[^.]+$/, "");
      const name = `${base}-${operation}.${format}`;
      if (blob.size > 30 * 1024 * 1024)
        throw new Error(
          "Çıktı 30 MB sınırını aşıyor. Daha küçük boyut veya kalite seç.",
        );
      const file = new File([blob], name, { type: blob.type });
      generated.push({
        id: crypto.randomUUID(),
        file,
        name,
        image: true,
        width: w,
        height: h,
        type: blob.type,
        output: true,
      });
      c.width = 1;
      c.height = 1;
      await new Promise((r) => setTimeout(r, 0));
    }
    for (const e of generated) e.url = URL.createObjectURL(e.file);
    entries.push(...generated);
    selected.clear();
    generated.forEach((e) => selected.add(e.id));
    render();
    $("#windowTitle").textContent = "✓ İşlem tamamlandı";
    const body = $("#windowBody");
    body.replaceChildren();
    const p = document.createElement("p");
    p.textContent = `${generated.length} çıktı oluşturuldu. Dosyalar yeniden açılarak boyutları doğrulandı. İndirmeden önce görünümünü kontrol edebilirsin.`;
    body.append(p);
    const results = document.createElement("div");
    results.className = "results";
    for (const e of generated) {
      const a = document.createElement("a");
      a.href = e.url;
      a.download = e.name;
      a.textContent = `↓ ${e.name} (${size(e.file.size)})`;
      results.append(a);
    }
    body.append(results);
    $("#execute").hidden = true;
    $("#cancel").textContent = "Kapat";
  } catch (err) {
    notify(err.message || "İşlem başarısız. Orijinal dosyaların korundu.");
  } finally {
    busy = false;
    $("#execute").disabled = false;
    $("#execute").textContent = "Uygula";
    $("#cancel").disabled = false;
    $("#closeWindow").disabled = false;
  }
};
function closeWindow() {
  if (!busy) {
    $("#window").close();
    $("#cancel").textContent = "Vazgeç";
  }
}
$("#cancel").onclick = closeWindow;
$("#closeWindow").onclick = closeWindow;
$("#window").addEventListener("cancel", (e) => {
  if (busy) e.preventDefault();
});
for (const id of ["upload", "uploadHero"])
  $("#" + id).onclick = () => (native ? pickNative() : $("#fileInput").click());
$("#fileInput").onchange = async (ev) => {
  await addFiles([...ev.target.files]);
  ev.target.value = "";
};
$("#selection").onclick = (ev) => menu(ev.clientX, innerHeight - 400);
$("#start").onclick = () => {
  const hidden = !$("#startMenu").hidden;
  $("#contextMenu").hidden = true;
  $("#startMenu").hidden = hidden;
  $("#start").setAttribute("aria-expanded", String(!hidden));
};
document.addEventListener("pointerdown", (ev) => {
  if (!ev.target.closest("#contextMenu")) $("#contextMenu").hidden = true;
  if (!ev.target.closest("#startMenu") && !ev.target.closest("#start"))
    closeStart();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    $("#contextMenu").hidden = true;
    closeStart();
  }
});
// Only external file drags (e.g. from Explorer/Finder) show the drop overlay.
// In-app drags such as reordering PDF page cards must not be intercepted.
const hasFiles = (ev) => [...(ev.dataTransfer?.types || [])].includes("Files");
let dragDepth = 0;
document.addEventListener("dragenter", (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth++;
  document.body.classList.add("dragging");
});
document.addEventListener("dragover", (ev) => {
  if (hasFiles(ev)) ev.preventDefault();
});
document.addEventListener("dragleave", (ev) => {
  if (!hasFiles(ev)) return;
  if (--dragDepth <= 0) {
    dragDepth = 0;
    document.body.classList.remove("dragging");
  }
});
document.addEventListener("drop", (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dragging");
  const cell = desktopController?.cellAt
    ? desktopController.cellAt(ev.clientX, ev.clientY)
    : null;
  addFiles([...ev.dataTransfer.files], cell);
});
window.addEventListener("paste", async (ev) => {
  const active = document.activeElement;
  if (
    active &&
    (active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.isContentEditable ||
      active.closest(".renaming"))
  ) {
    return;
  }
  const filesToAdd = [];
  const items = ev.clipboardData?.items || [];
  for (const item of items) {
    if (item.type && item.type.startsWith("image/")) {
      const blob = item.getAsFile();
      if (blob) {
        const ext = blob.type.split("/")[1] || "png";
        const now = new Date();
        const stamp = now
          .toISOString()
          .slice(0, 19)
          .replace(/T/, " ")
          .replace(/:/g, ".");
        const prefix = t("pasted_prefix");
        const name = `${prefix} ${stamp}.${ext === "jpeg" ? "jpg" : ext}`;
        const file = new File([blob], name, { type: blob.type });
        filesToAdd.push(file);
      }
    } else if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) filesToAdd.push(file);
    }
  }
  if (!filesToAdd.length && native?.readClipboard) {
    try {
      const clip = await native.readClipboard();
      if (clip && clip.type === "image" && clip.buffer) {
        const now = new Date();
        const stamp = now
          .toISOString()
          .slice(0, 19)
          .replace(/T/, " ")
          .replace(/:/g, ".");
        const name = `${t("pasted_prefix")} ${stamp}.${clip.ext || "png"}`;
        const item = await native.saveBlob(clip.buffer, name);
        const hydrated = await hydrate(item);
        const centerCell = desktopController?.cellAt
          ? desktopController.cellAt(
              window.innerWidth / 2,
              window.innerHeight / 2,
            )
          : null;
        if (centerCell) hydrated.cell = centerCell;
        entries.push(hydrated);
        selected.clear();
        selected.add(hydrated.id);
        render();
        showBalloon({
          title: t("balloon_pasted_title"),
          message: t("balloon_pasted_msg", { name }),
          actions: [],
        });
        return;
      }
    } catch {}
  }
  if (filesToAdd.length) {
    ev.preventDefault();
    const centerCell = desktopController?.cellAt
      ? desktopController.cellAt(window.innerWidth / 2, window.innerHeight / 2)
      : null;
    await addFiles(filesToAdd, centerCell);
    selected.clear();
    const last = entries[entries.length - 1];
    if (last) selected.add(last.id);
    render();
    showBalloon({
      title: t("balloon_pasted_title"),
      message: t("balloon_pasted_msg", { name: filesToAdd[0].name }),
      actions: [],
    });
  }
});
function tick() {
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  $("#clock").textContent = new Date().toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
tick();
setInterval(tick, 30000);
render();

function closeStart() {
  $("#startMenu").hidden = true;
  $("#start").setAttribute("aria-expanded", "false");
}
for (const button of document.querySelectorAll("[data-start]"))
  button.onclick = () => {
    const action = button.dataset.start;
    closeStart();
    if (action === "upload")
      return native ? pickNative() : $("#fileInput").click();
    if (action === "paint") {
      createPaintWindow();
      return;
    }
    if (action === "close") return $("#start").focus();
    if (action === "desktop") {
      document.querySelector(".file")?.focus();
      return;
    }
    if (action === "select") {
      entries.forEach((e) => selected.add(e.id));
      render();
      return;
    }
    if (action === "help")
      return notify(
        "Dosyalarını sürükle veya yükle. Boş alanda sürükleyerek birkaçını seç; çift tıkla aç veya sağ tıkla işlem menüsünü aç. Çıktıları sayfayı yenilemeden indir.",
      );
    const chosen = entries.filter((e) => selected.has(e.id));
    if (!chosen.length) return notify("Önce masaüstünden bir dosya seç.");
    if (action !== "info" && !chosen.every((e) => e.image))
      return notify("Bu işlem için yalnızca desteklenen görselleri seç.");
    if (action === "merge" && chosen.length < 2)
      return notify("Birleştirmek için en az iki görsel seç.");
    openOperation(action);
  };

function renameFile(id) {
  if (busy) return notify("İşlem bitince yeniden adlandırabilirsin.");
  const e = entries.find((e) => e.id === id),
    el = $("#files").querySelector(`[data-id="${id}"]`);
  if (!e || !el) return;
  if (el.querySelector("input")) return el.querySelector("input").focus();
  selected.clear();
  selected.add(id);
  desktopController.sync();
  const input = document.createElement("input");
  input.className = "rename-input";
  input.setAttribute("aria-label", "Yeni dosya adı");
  input.value = splitName(e.name).stem;
  input.maxLength = 200;
  input.title = "Enter: kaydet · Esc: vazgeç · Uzantı korunur";
  el.classList.add("renaming");
  el.append(input);
  const r = el.getBoundingClientRect();
  input.style.left = Math.min(0, innerWidth - r.left - 160) + "px";
  let done = false;
  const cancel = () => {
    if (done) return;
    done = true;
    input.remove();
    el.classList.remove("renaming");
    el.focus({ preventScroll: true });
  };
  const commit = () => {
    if (done) return;
    try {
      const name = renamedName(
        e.name,
        input.value,
        entries.filter((other) => other.id !== id).map((other) => other.name),
      );
      e.name = name;
      if (e.file instanceof File)
        e.file = new File([e.file], name, {
          type: e.file.type,
          lastModified: e.file.lastModified,
        });
      else e.file.name = name;
      windowManager.rename(id, name);
      cancel();
      render();
    } catch (err) {
      notify(err.message);
      input.setAttribute("aria-invalid", "true");
      input.focus();
    }
  };
  input.onkeydown = (ev) => {
    ev.stopPropagation();
    if (ev.key === "Enter") {
      ev.preventDefault();
      commit();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      cancel();
    }
  };
  input.onblur = commit;
  input.focus();
  input.select();
}
function duplicateFiles(list) {
  if (native) {
    native
      .duplicate(list.map((e) => e.id))
      .then(async (added) => {
        for (const e of added) entries.push(await hydrate(e));
        render();
      })
      .catch((err) => notify(err.message));
    return;
  }
  if (busy) return notify("İşlem bitince kopyalayabilirsin.");
  if (entries.length + list.length > 60)
    return notify("Masaüstünde en fazla 60 dosya tutulabilir.");
  selected.clear();
  for (const source of list) {
    const name = copyName(
      source.name,
      entries.map((e) => e.name),
    );
    const file = new File([source.file], name, { type: source.file.type });
    const e = {
      ...source,
      id: crypto.randomUUID(),
      name,
      file,
      url: URL.createObjectURL(file),
      cell: null,
      output: true,
    };
    entries.push(e);
    selected.add(e.id);
  }
  render();
}

async function pickNative(folder = false) {
  try {
    const added = await native[folder ? "selectFolder" : "selectFiles"]();
    for (const e of added) entries.push(await hydrate(e));
    render();
  } catch (err) {
    notify(err.message);
  }
}
async function refreshNative({ metadata = false } = {}) {
  if (refreshing) {
    refreshPending = true;
    refreshMetadata ||= metadata;
    return;
  }
  refreshing = true;
  try {
    const state = await native.state();
    for (const e of state.entries) {
      const existing = entries.find((x) => x.id === e.id);
      if (existing) {
        if (metadata) {
          existing.name = e.name;
          windowManager.rename(e.id, e.name);
        }
      } else entries.push(await hydrate(e));
    }
    desktopController.render();
    $("#welcome").hidden = entries.length > 0;
  } finally {
    refreshing = false;
    if (refreshPending) {
      refreshPending = false;
      const metadata = refreshMetadata;
      refreshMetadata = false;
      void refreshNative({ metadata }).catch((err) => notify(err.message));
    }
  }
}
function scheduleNativeSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ui = {
      windows: [...windowManager.records.values()]
        .filter((r) => !r.id.startsWith("system-"))
        .map((r) => ({
          id: r.id,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          minimized: r.minimized,
          maximized: r.maximized,
        })),
      edits: Object.fromEntries(
        entries.filter((e) => e.editHistory).map((e) => [e.id, e.editHistory]),
      ),
    };
    native
      .saveWorkspace(
        entries.map((e) => ({ id: e.id, name: e.name, cell: e.cell })),
        ui,
      )
      .catch((err) => notify(err.message));
  }, 350);
}
// Tray Language indicator & dropdown
const trayLang = $("#trayLang");
const trayLangCode = $("#trayLangCode");
const langMenu = $("#langMenu");
const checkEn = $("#checkEn");
const checkTr = $("#checkTr");
if (trayLang && langMenu) {
  trayLangCode.textContent = lang.toUpperCase();
  if (checkEn) checkEn.textContent = lang === "en" ? "\u2713" : "";
  if (checkTr) checkTr.textContent = lang === "tr" ? "\u2713" : "";
  trayLang.onclick = (ev) => {
    ev.stopPropagation();
    const hidden = !langMenu.hidden;
    langMenu.hidden = hidden;
    trayLang.setAttribute("aria-expanded", String(!hidden));
    if (!hidden) {
      const rect = trayLang.getBoundingClientRect();
      langMenu.style.bottom = `${window.innerHeight - rect.top + 2}px`;
      langMenu.style.right = `${Math.max(4, window.innerWidth - rect.right - 2)}px`;
      langMenu.style.left = "auto";
    }
  };
  langMenu.querySelectorAll("[data-lang]").forEach((b) => {
    b.onclick = () => setLanguage(b.dataset.lang);
  });
  document.addEventListener("pointerdown", (ev) => {
    if (!ev.target.closest("#langMenu") && !ev.target.closest("#trayLang")) {
      langMenu.hidden = true;
      trayLang.setAttribute("aria-expanded", "false");
    }
  });
}

// XP Balloon Tooltip
const trayBalloon = $("#trayBalloon");
const balloonClose = $("#balloonClose");
const balloonTitle = $("#balloonTitle");
const balloonMessage = $("#balloonMessage");
const balloonActions = $("#balloonActions");
let balloonTimer = null;
function showBalloon({ title, message, actions = [] }) {
  if (!trayBalloon) return;
  clearTimeout(balloonTimer);
  balloonTitle.textContent = title;
  balloonMessage.textContent = message;
  balloonActions.replaceChildren();
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = a.label;
    btn.onclick = () => {
      trayBalloon.hidden = true;
      a.action();
    };
    balloonActions.append(btn);
  }
  trayBalloon.hidden = false;
  balloonTimer = setTimeout(() => {
    trayBalloon.hidden = true;
  }, 7000);
}
if (balloonClose) {
  balloonClose.onclick = () => {
    trayBalloon.hidden = true;
    clearTimeout(balloonTimer);
  };
}

if (native) {
  const state = await native.state();
  for (const e of state.entries) {
    const entry = await hydrate(e);
    entry.editHistory = state.ui.edits?.[e.id];
    entries.push(entry);
  }
  nativeReady = true;
  render();
  for (const saved of state.ui.windows || []) {
    const e = entries.find((e) => e.id === saved.id);
    if (e && !e.missing) {
      openFiles([e.id]);
      const r = windowManager.records.get(e.id);
      Object.assign(r, saved);
      windowManager.layout?.(r);
      if (saved.minimized) {
        r.el.hidden = true;
        r.task.classList.remove("active");
      }
    }
  }
  for (const [label, fn] of [
    [t("job_history"), () => nativeUI.jobs()],
    [t("components"), () => nativeUI.packages()],
  ]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => {
      closeStart();
      fn().catch((err) => notify(err.message));
    };
    $("#startMenu .start-places").append(b);
  }
  const trayJobs = $("#trayJobs");
  const trayJobsCount = $("#trayJobsCount");
  if (trayJobs) {
    trayJobs.onclick = () => nativeUI.jobs();
  }
  const knownJobs = new Map();
  const updateStatus = async () => {
    const state = await native.state();
    const active = state.jobs.filter((j) =>
      ["running", "queued", "validating"].includes(j.status),
    );
    if (trayJobs) {
      trayJobs.hidden = !active.length;
      trayJobsCount.textContent = String(active.length);
      trayJobs.title = t("tray_jobs_tooltip", { count: active.length });
      trayJobs.setAttribute(
        "aria-label",
        t("tray_jobs_tooltip", { count: active.length }),
      );
    }
    for (const j of state.jobs) {
      const prev = knownJobs.get(j.id);
      if (prev && ["running", "queued", "validating"].includes(prev.status)) {
        if (j.status === "completed" && j.outputs?.length) {
          const out = state.entries.find((e) => e.id === j.outputs[0]);
          const outName = out ? out.name : "output.pdf";
          showBalloon({
            title: t("balloon_done_title"),
            message: `✓ ${outName}`,
            actions: [
              {
                label: t("balloon_open"),
                action: () => openFiles([j.outputs[0]]),
              },
              {
                label: t("balloon_reveal"),
                action: () => native.reveal(j.outputs[0]),
              },
            ],
          });
        } else if (["failed", "interrupted"].includes(j.status)) {
          showBalloon({
            title: t("balloon_failed_title"),
            message: j.message || t("status_failed"),
            actions: [],
          });
        }
      }
      knownJobs.set(j.id, { status: j.status });
    }
  };
  native.onChange(() => updateStatus().catch(() => {}));
  updateStatus();
  $(".local-note").textContent = t("local_note_native");
  $(".welcome-note").textContent = t("welcome_note_native");
  window.addEventListener("pointerup", scheduleNativeSave);
  window.addEventListener("cxp-edit", scheduleNativeSave);
  if (state.warning) notify(state.warning);
  if (state.entries.some((e) => e.missing || e.changed))
    notify(
      "Bazı kaynaklar taşınmış veya değişmiş. İlgili dosyaları yeniden ekle.",
    );
}
