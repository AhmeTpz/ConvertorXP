import { operations, eligible } from "./shared/catalog.js";
import { createConversions } from "./conversion-ui.js";
export const native = globalThis.window?.convertorDesktop || null;
export async function hydrate(record) {
  const e = {
    ...record,
    native: true,
    nativeId: record.id,
    previewImage: record.isImage,
    viewer: record.isImage ? "image-preview" : undefined,
  };
  e.file = {
    name: e.name,
    size: e.size,
    type: e.type,
    text: () => native.readText(e.id, "utf8"),
  };
  if (
    record.isImage &&
    !record.nativeOnly &&
    !record.missing &&
    !record.changed &&
    record.size <= 30 * 1024 ** 2
  ) {
    e.image = true;
    e.viewer = "image";
  }
  if (record.nativeOnly)
    e.reason =
      "Önizleme · Tam çözünürlükte işlemler için Yerel araçlar menüsünü kullan.";
  if (record.missing)
    e.reason = "Kaynak taşınmış veya silinmiş. Dosyayı yeniden ekle.";
  if (record.changed)
    e.reason = "Kaynak değişmiş. Güvenli işlem için dosyayı yeniden ekle.";
  return e;
}
export function createNativeUI({ manager, getSelection, notify, refresh }) {
  const conversions = createConversions({
    native,
    manager,
    getSelection,
    notify,
    mountPDF: mountNativePDF,
  });
  function windowFor(id, title) {
    const { record, created } = manager.open(
      { id: "system-" + id, name: title },
      { width: 760, height: 590 },
    );
    if (created) record.content.classList.add("native-panel");
    return record;
  }
  function button(label, fn, parent) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "xp-button";
    b.textContent = label;
    b.onclick = () => Promise.resolve(fn()).catch((e) => notify(e.message));
    parent.append(b);
    return b;
  }
  function text(parent, tag, value) {
    const e = document.createElement(tag);
    e.textContent = value;
    parent.append(e);
    return e;
  }
  async function packages() {
    const r = windowFor("packages", "Araç paketleri");
    r.content.replaceChildren();
    text(r.content, "h2", "İhtiyacın olan araçları kur");
    text(
      r.content,
      "p",
      "Kurulan motorlar çevrimdışı çalışır. Dosyalar sunucuya gönderilmez.",
    );
    const state = await native.state();
    for (const p of state.packages) {
      const row = document.createElement("section");
      row.className = "package-card";
      text(row, "h3", p.label);
      text(
        row,
        "p",
        `${p.version} · ${(p.size / 1024 ** 2).toFixed(1)} MB indirme · ${p.installedSize ? (p.installedSize / 1024 ** 2).toFixed(0) + " MB kurulum" : "Kurulum boyutu hesaplanıyor"} · ${p.license}`,
      );
      text(
        row,
        "small",
        p.installed
          ? "Kurulu"
          : p.busy
            ? "İndiriliyor / doğrulanıyor…"
            : "Kurulu değil",
      );
      if (!p.installed) {
        button(
          "İndir ve kur",
          async () => {
            await native.installPackage(p.id);
            await packages();
          },
          row,
        ).disabled = p.busy;
        button(
          "Yerel paketten kur",
          async () => {
            await native.importPackage(p.id);
            await packages();
          },
          row,
        ).disabled = p.busy;
      }
      r.content.append(row);
    }
  }
  async function jobs(reveal = true) {
    const r =
      (!reveal && manager.records.get("system-jobs")) ||
      windowFor("jobs", "İşlem merkezi");
    const state = await native.state();
    r.content.replaceChildren();
    text(r.content, "h2", "İşlem kuyruğu");
    if (!state.jobs.length)
      text(
        r.content,
        "p",
        "Henüz işlem yok. Dosyaları seçip Yerel araçlar menüsünü aç.",
      );
    for (const job of [...state.jobs].reverse()) {
      const row = document.createElement("section");
      row.className = "package-card";
      text(row, "h3", job.label);
      const statuses = {
        queued: "Sırada",
        running: "Çalışıyor",
        validating: "Doğrulanıyor",
        completed: "Tamamlandı",
        failed: "Başarısız",
        cancelled: "İptal edildi",
        interrupted: "Yarım kaldı",
      };
      text(row, "p", `${statuses[job.status]} · ${Math.round(job.progress)}%`);
      if (job.message) text(row, "p", job.message);
      if (["running", "queued"].includes(job.status))
        button("İptal", () => native.cancel(job.id), row);
      if (["failed", "cancelled", "interrupted"].includes(job.status))
        button("Yeniden dene", () => native.retry(job.id), row);
      for (const id of job.outputs) {
        const e = state.entries.find((e) => e.id === id);
        if (e) {
          button("Kaydet: " + e.name, () => native.saveAs(id), row);
          button("Klasörde göster", () => native.reveal(id), row);
        }
      }
      r.content.append(row);
    }
  }
  async function tools(initialOperation) {
    if (["pdf.create", "office.pdf"].includes(initialOperation))
      return conversions.open();
    const files = getSelection();
    if (!files.length) return notify("Önce dosya seç.");
    const r = windowFor("tools", "Yerel dosya araçları");
    r.content.replaceChildren();
    text(r.content, "h2", `${files.length} dosya için araçlar`);
    const state = await native.state();
    const available = operations.filter((op) => eligible(op, files));
    const choose = document.createElement("select");
    choose.setAttribute("aria-label", "İşlem");
    for (const group of [...new Set(available.map((op) => op.group))]) {
      const g = document.createElement("optgroup");
      g.label = group;
      for (const op of available.filter((o) => o.group === group)) {
        const option = document.createElement("option");
        option.value = op.id;
        option.textContent = op.label;
        g.append(option);
      }
      choose.append(g);
    }
    r.content.append(choose);
    if (initialOperation && available.some((o) => o.id === initialOperation))
      choose.value = initialOperation;
    choose.onchange = render;
    const form = document.createElement("form");
    r.content.append(form);
    async function render() {
      const op = available.find((o) => o.id === choose.value);
      form.replaceChildren();
      if (!op) return;
      text(
        form,
        "p",
        op.note ||
          "Orijinal dosyalar korunur; sonuçlar yeni dosyalar olarak eklenir.",
      );
      text(
        form,
        "small",
        "Dosya sırası: " + files.map((e) => e.name).join(" → "),
      );
      if (op.multi && files.length > 1) {
        const order = document.createElement("div");
        order.className = "native-order";
        for (let index = 0; index < files.length; index++) {
          const row = document.createElement("div");
          text(row, "span", `${index + 1}. ${files[index].name}`);
          for (const [offset, label] of [
            [-1, "↑"],
            [1, "↓"],
          ]) {
            const b = button(
              label,
              async () => {
                const values = Object.fromEntries(new FormData(form));
                [files[index], files[index + offset]] = [
                  files[index + offset],
                  files[index],
                ];
                await render();
                for (const [key, value] of Object.entries(values))
                  if (form.elements[key]) form.elements[key].value = value;
              },
              row,
            );
            b.disabled = index + offset < 0 || index + offset >= files.length;
            b.setAttribute(
              "aria-label",
              files[index].name + (offset < 0 ? " yukarı taşı" : " aşağı taşı"),
            );
          }
          order.append(row);
        }
        form.append(order);
      }
      const installed =
        ["core", "pdf"].includes(op.engine) ||
        state.packages.find((p) => p.id === op.engine)?.installed;
      if (!installed) {
        button("Gerekli paketi kur", packages, form);
        return;
      }
      for (const field of op.fields) {
        const label = document.createElement("label");
        label.textContent = field.label;
        const input = document.createElement(
          field.type === "select"
            ? "select"
            : field.type === "textarea"
              ? "textarea"
              : "input",
        );
        input.name = field.key;
        if (field.type === "select") {
          for (const value of field.values.filter(
            (value) =>
              op.group !== "Görsel" ||
              field.key !== "format" ||
              !state.capabilities?.imageWrite ||
              state.capabilities.imageWrite.includes(
                { jpg: "JPEG", tiff: "TIFF" }[value] || value.toUpperCase(),
              ),
          )) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            input.append(option);
          }
        } else if (field.type !== "textarea") {
          input.type = field.type;
          if (field.type === "number") {
            input.min = field.min;
            input.max = field.max;
            input.step = "any";
          }
        }
        input.value = field.value;
        label.append(input);
        if (op.id === "image.compress" && field.key === "targetKB") {
          const presets = document.createElement("div");
          presets.className = "compress-presets";
          for (const [presetKB, plabel] of [
            [200, "200 KB (e-Devlet)"],
            [500, "500 KB"],
            [1000, "1 MB"],
            [2000, "2 MB"],
          ]) {
            const pb = document.createElement("button");
            pb.type = "button";
            pb.className = "xp-button preset-btn";
            pb.textContent = plabel;
            pb.onclick = () => {
              input.value = presetKB;
            };
            presets.append(pb);
          }
          label.append(presets);
        }
        form.append(label);
      }
      if (op.id === "text.edit") {
        try {
          form.elements.content.value = await native.readText(
            files[0].id,
            form.elements.inputEncoding.value,
          );
          form.elements.inputEncoding.onchange = async () => {
            try {
              form.elements.content.value = await native.readText(
                files[0].id,
                form.elements.inputEncoding.value,
              );
            } catch (e) {
              notify(e.message);
            }
          };
        } catch (e) {
          notify(e.message);
        }
      }
      const presets = JSON.parse(localStorage.getItem("cxp-presets") || "{}");
      button(
        "Ayarları önayar olarak sakla",
        () => {
          presets[op.id] = Object.fromEntries(
            [...new FormData(form)].filter(([k]) => k !== "password"),
          );
          localStorage.setItem("cxp-presets", JSON.stringify(presets));
          notify("Önayar kaydedildi.");
        },
        form,
      ).type = "button";
      if (presets[op.id])
        button(
          "Önayarı yükle",
          () => {
            for (const [key, value] of Object.entries(presets[op.id]))
              if (form.elements[key]) form.elements[key].value = value;
          },
          form,
        ).type = "button";
      const submit = document.createElement("button");
      submit.className = "xp-button primary";
      submit.textContent = "Uygula";
      form.append(submit);
      form.onsubmit = async (event) => {
        event.preventDefault();
        try {
          submit.disabled = true;
          const ids = await native.submit({
            operation: op.id,
            ids: files.map((e) => e.id),
            options: Object.fromEntries(new FormData(form)),
          });
          const results = document.createElement("div");
          r.content.append(results);
          conversions.watch(r, results, ids);
        } catch (e) {
          notify(e.message);
        } finally {
          submit.disabled = false;
        }
      };
    }
    if (available.some((o) => o.id === initialOperation))
      choose.value = initialOperation;
    choose.onchange = render;
    await render();
  }
  async function batchRename() {
    const files = getSelection();
    if (!files.length) return notify("Önce dosya seç.");
    const r = windowFor("rename", "Toplu yeniden adlandır");
    r.content.replaceChildren();
    text(
      r.content,
      "p",
      "Kaynak dosyalar değişmez; çalışma alanındaki adlar değişir. Uzantılar korunur.",
    );
    const label = text(r.content, "label", "Yeni ad öneki");
    const input = document.createElement("input");
    input.value = "Dosya";
    label.append(input);
    button(
      "Önizle",
      () => {
        r.content.querySelector(".rename-preview")?.remove();
        const list = text(
          r.content,
          "pre",
          files
            .map(
              (e, i) =>
                `${e.name} → ${input.value}-${i + 1}.${e.name.split(".").pop()}`,
            )
            .join("\n"),
        );
        list.className = "rename-preview";
      },
      r.content,
    );
    button(
      "Adları uygula",
      async () => {
        const { renamedName } = await import("./file-utils.js");
        const state = await native.state();
        const changes = files.map((e, i) => ({
          id: e.id,
          name: renamedName(
            e.name,
            input.value + "-" + (i + 1),
            state.entries
              .filter((x) => !files.some((f) => f.id === x.id))
              .map((x) => x.name),
          ),
          cell: e.cell,
        }));
        await native.saveWorkspace(changes, state.ui);
        await refresh({ metadata: true });
        notify("Çalışma alanındaki adlar güncellendi.");
      },
      r.content,
    );
  }
  let eventTimer;
  const unsubscribe = native.onChange(() => {
    if (eventTimer) return;
    eventTimer = setTimeout(() => {
      eventTimer = null;
      refresh().catch((e) => notify(e.message));
      if (manager.records.has("system-jobs"))
        jobs(false).catch((e) => notify(e.message));
    }, 150);
  });
  return {
    tools,
    packages,
    jobs,
    batchRename,
    unsubscribe,
    convertPDF: conversions.open,
    documentPreview: conversions.documentPreview,
  };
}
export async function mountNativePDF(host, entry, notify) {
  const pdfjs = await import("./vendor/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "./vendor/pdf.worker.mjs",
    import.meta.url,
  ).href;
  const task = pdfjs.getDocument({
    url: entry.url,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (error) {
    await task.destroy();
    throw error;
  }
  let page = 1,
    disposed = false,
    rendering = false;
  const bar = document.createElement("div");
  bar.className = "editor-toolbar";
  const prev = document.createElement("button"),
    next = document.createElement("button"),
    label = document.createElement("span");
  prev.textContent = "← Önceki";
  next.textContent = "Sonraki →";
  bar.append(prev, label, next);
  const area = document.createElement("div");
  area.className = "pdf-preview";
  host.append(bar, area);
  async function draw() {
    if (disposed || rendering) return;
    rendering = true;
    try {
      const p = await doc.getPage(page);
      const viewport = p.getViewport({ scale: 1.2 });
      if (viewport.width * viewport.height > 24000000)
        throw Error("Sayfa çok büyük.");
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await p.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
      if (!disposed) {
        area.replaceChildren(canvas);
        label.textContent = `${page} / ${doc.numPages}`;
        prev.disabled = page === 1;
        next.disabled = page === doc.numPages;
      }
    } catch (e) {
      notify(e.message);
    } finally {
      rendering = false;
    }
  }
  prev.onclick = () => {
    if (!rendering) {
      page--;
      draw();
    }
  };
  next.onclick = () => {
    if (!rendering) {
      page++;
      draw();
    }
  };
  await draw();
  return () => {
    disposed = true;
    task.destroy();
  };
}
