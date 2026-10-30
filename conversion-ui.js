import { pdfLayout, isOffice } from "./shared/pdf-layout.js";
import { t } from "./i18n.js";

export function createConversions({
  native,
  manager,
  notify,
  mountPDF,
  getSelection,
}) {
  const element = (tag, parent, text) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    parent?.append(e);
    return e;
  };
  const button = (parent, label, fn) => {
    const b = element("button", parent, label);
    b.type = "button";
    b.className = "xp-button";
    b.onclick = () =>
      Promise.resolve()
        .then(fn)
        .catch((e) => notify(e.message));
    return b;
  };
  function disposeWith(record, fn) {
    const old = record.dispose;
    record.dispose = () => {
      old?.();
      fn();
    };
  }
  async function component(engine, host, resume) {
    const state = await native.state();
    const p = state.packages.find((p) => p.id === engine);
    if (!p || p.installed) return true;
    host.replaceChildren();
    element(
      "p",
      host,
      `${engine === "office" ? "Belge dönüşümü" : "Görsel işleme"} bileşeni gerekli. ${(p.size / 1024 ** 2).toFixed(0)} MB indirme; kurulduktan sonra çevrimdışı çalışır.`,
    );
    const status = element("p", host);
    const install = button(host, "İndir ve devam et", async () => {
      install.disabled = true;
      status.textContent = "Bileşen indiriliyor ve doğrulanıyor…";
      try {
        await native.installPackage(engine);
        host.replaceChildren();
        await resume();
      } catch (e) {
        status.textContent = e.message;
        install.disabled = false;
      }
    });
    install.disabled = !!p.busy;
    if (p.busy)
      status.textContent =
        "Bileşen başka bir pencerede hazırlanıyor. Tamamlanınca tekrar dönüştürebilirsin.";
    return false;
  }
  function watch(record, host, ids, onDone = () => {}) {
    const rows = new Map();
    let disposed = false,
      fetching = false,
      again = false,
      done = false;
    async function update() {
      if (disposed) return;
      if (fetching) {
        again = true;
        return;
      }
      fetching = true;
      try {
        const state = await native.state();
        if (disposed) return;
        const jobs = state.jobs.filter((j) => ids.includes(j.id));
        for (const j of jobs) {
          const signature = JSON.stringify([
            j.status,
            j.message,
            j.outputs,
            j.previewURL,
          ]);
          if (rows.get(j.id)?.signature === signature) continue;
          let row = rows.get(j.id);
          if (!row) {
            row = { el: element("section", host) };
            row.el.className = "conversion-result";
            rows.set(j.id, row);
          }
          row.signature = signature;
          row.el.dataset.status = j.status;
          row.el.replaceChildren();
          const names = j.inputIds
            .map(
              (id) => state.entries.find((e) => e.id === id)?.name || "Dosya",
            )
            .join(", ");
          element("strong", row.el, names);
          const labels = {
            queued: t("status_queued"),
            running: t("status_running"),
            validating: t("status_validating"),
            completed: t("status_completed"),
            failed: t("status_failed"),
            cancelled: t("status_cancelled"),
            interrupted: t("status_interrupted"),
          };
          element("p", row.el, labels[j.status] || j.status);
          if (j.message) element("p", row.el, j.message);
          if (["queued", "running", "validating"].includes(j.status))
            button(row.el, t("btn_cancel_job"), () => native.cancel(j.id));
          if (["failed", "cancelled", "interrupted"].includes(j.status))
            button(row.el, t("btn_retry"), async () => {
              const next = j.preview
                ? await native.previewDocument(j.inputIds[0])
                : await native.retry(j.id);
              ids.push(...next);
              done = false;
              await update();
            });
          for (const id of j.outputs) {
            const output = state.entries.find((e) => e.id === id);
            if (!output) continue;
            element("p", row.el, output.name);
            if (output.ext === "pdf")
              button(row.el, t("btn_preview"), () => showPDF(record, output));
            button(row.el, t("btn_save_as"), () =>
              native.saveAs(id),
            ).dataset.action = "save-as";
            button(row.el, t("btn_reveal"), () => native.reveal(id));
          }
          if (j.previewURL && !row.opened) {
            row.opened = true;
            await showPDF(record, { url: j.previewURL }, true);
          }
        }
        if (
          jobs.length === ids.length &&
          jobs.every(
            (j) => !["queued", "running", "validating"].includes(j.status),
          ) &&
          !done
        ) {
          done = true;
          onDone();
        }
      } catch (e) {
        if (!disposed) notify(e.message);
      } finally {
        fetching = false;
        if (again) {
          again = false;
          void update();
        }
      }
    }
    const unsub = native.onChange(update);
    disposeWith(record, () => {
      disposed = true;
      unsub();
    });
    void update();
  }
  async function showPDF(record, entry, automatic = false) {
    if (record.closed) return;
    if (record.pdfDispose) record.pdfDispose();
    const epoch = (record.pdfEpoch || 0) + 1;
    record.pdfEpoch = epoch;
    if (!record.pdfHost) {
      record.pdfHost = element("div", record.content);
      record.pdfHost.className = "conversion-pdf";
      disposeWith(record, () => {
        record.pdfEpoch++;
        record.pdfDispose?.();
      });
    }
    record.pdfHost.replaceChildren();
    const pane = element("div", record.pdfHost);
    const cleanup = await mountPDF(pane, entry, notify);
    if (record.closed || record.pdfEpoch !== epoch) cleanup();
    else record.pdfDispose = cleanup;
    if (!automatic) record.pdfHost.scrollIntoView({ block: "nearest" });
  }
  async function documentPreview(record, entry) {
    const bar = element("div", record.content);
    bar.className = "editor-toolbar";
    button(bar, "PDF’ye dönüştür", () => open([entry]));
    element(
      "p",
      record.content,
      "Önizleme · Font ve sayfa düzeni farklılıkları olabilir. Excel mevcut yazdırma alanlarını kullanır.",
    );
    const gate = element("div", record.content),
      status = element("div", record.content);
    const start = async () => {
      if (record.closed) return;
      if (!(await component("office", gate, start))) return;
      try {
        watch(record, status, await native.previewDocument(entry.id));
      } catch (e) {
        status.textContent = e.message;
        button(status, "Yeniden dene", start);
      }
    };
    await start();
  }
  async function open(selected = getSelection()) {
    let files = [...selected];
    if (!files.length) return notify("Önce dosya seç.");
    const office = files.every(isOffice),
      images = files.every((e) => e.isImage || e.image || e.previewImage);
    if (!office && !images)
      return notify("PDF için belge veya görselleri ayrı seç.");
    if (images) {
      try {
        files = await native.pdfSources(files.map((e) => e.id));
      } catch (e) {
        return notify(e.message);
      }
    }
    const { record } = manager.open(
      {
        id: "system-convert-" + crypto.randomUUID(),
        name: office ? t("btn_convert_pdf") : t("btn_create_pdf"),
      },
      { width: 800, height: 660 },
    );
    record.content.classList.add("conversion-panel");
    const form = element("form", record.content),
      fields = element("fieldset", form);
    fields.className = "conversion-fields";
    element("p", fields, office ? t("pdf_office_desc") : t("pdf_image_desc"));
    const options = {
      paper: "A4",
      orientation: "auto",
      margin: 10,
      output: "combined",
    };
    let renderPages = () => {};
    if (images) {
      const settings = element("div", fields);
      settings.className = "conversion-settings";
      for (const [key, label, values] of [
        [
          "paper",
          t("paper_label"),
          [
            ["A4", "A4"],
            ["A5", "A5"],
            ["Letter", "Letter"],
            ["image", t("paper_image")],
          ],
        ],
        [
          "orientation",
          t("orientation_label"),
          [
            ["auto", t("orient_auto")],
            ["portrait", t("orient_portrait")],
            ["landscape", t("orient_landscape")],
          ],
        ],
        [
          "output",
          t("output_label"),
          [
            ["combined", t("output_combined")],
            ["separate", t("output_separate")],
          ],
        ],
      ]) {
        const l = element("label", settings, label),
          s = element("select", l);
        s.name = key;
        for (const [value, label] of values) {
          const o = element("option", s, label);
          o.value = value;
        }
        s.onchange = () => {
          options[key] = s.value;
          renderPages();
        };
      }
      const l = element("label", settings, t("margin_label")),
        input = element("input", l);
      input.type = "number";
      input.min = 0;
      input.max = 50;
      input.value = 10;
      input.name = "margin";
      input.oninput = () => {
        options.margin = Number(input.value);
        renderPages();
      };
    }
    const pages = element("div", fields);
    pages.className = "conversion-pages";
    let dragging;
    const clearMarks = () =>
      pages
        .querySelectorAll(".drop-before,.drop-after,.dragging-card")
        .forEach((el) =>
          el.classList.remove("drop-before", "drop-after", "dragging-card"),
        );
    // Insert before or after the hovered card depending on the pointer half.
    const after = (card, ev) => {
      const r = card.getBoundingClientRect();
      return ev.clientX > r.left + r.width / 2;
    };
    renderPages = () => {
      pages.replaceChildren();
      for (const [index, file] of files.entries()) {
        const card = element("section", pages);
        card.className = "conversion-page";
        card.dataset.id = file.id;
        card.draggable = images;
        card.ondragstart = (ev) => {
          if (fields.disabled) {
            ev.preventDefault();
            return;
          }
          ev.stopPropagation();
          dragging = file.id;
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("application/x-cxp-page", file.id);
          card.classList.add("dragging-card");
        };
        card.ondragend = () => {
          dragging = null;
          clearMarks();
        };
        card.ondragover = (ev) => {
          if (!images || !dragging) return;
          ev.preventDefault();
          ev.dataTransfer.dropEffect = "move";
          const isAfter = after(card, ev);
          card.classList.toggle("drop-after", isAfter);
          card.classList.toggle("drop-before", !isAfter);
        };
        card.ondragleave = () =>
          card.classList.remove("drop-before", "drop-after");
        card.ondrop = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const isAfter = after(card, ev);
          clearMarks();
          if (fields.disabled || !dragging) return;
          const from = files.findIndex((e) => e.id === dragging);
          dragging = null;
          if (from < 0 || from === index) return;
          const [moved] = files.splice(from, 1);
          let to = files.findIndex((e) => e.id === file.id);
          if (isAfter) to++;
          files.splice(to, 0, moved);
          renderPages();
        };
        element("strong", card, `${index + 1}. ${file.name}`);
        if (images) {
          try {
            const layout = pdfLayout(
                file.pdfWidth || file.width,
                file.pdfHeight || file.height,
                options,
              ),
              sheet = element("div", card);
            sheet.className = "conversion-sheet";
            sheet.style.aspectRatio = `${layout.pageWidth}/${layout.pageHeight}`;
            const img = element("img", sheet);
            img.src = (file.previewURL || file.url) + "?pdf=1";
            img.alt = file.name;
            img.draggable = false;
            Object.assign(img.style, {
              left: (100 * layout.x) / layout.pageWidth + "%",
              top: (100 * layout.y) / layout.pageHeight + "%",
              width: (100 * layout.width) / layout.pageWidth + "%",
              height: (100 * layout.height) / layout.pageHeight + "%",
            });
          } catch (e) {
            element("p", card, e.message);
          }
          const actions = element("div", card);
          button(actions, "←", () => {
            if (index > 0) {
              [files[index - 1], files[index]] = [
                files[index],
                files[index - 1],
              ];
              renderPages();
            }
          }).setAttribute("aria-label", "Öne taşı: " + file.name);
          button(actions, "→", () => {
            if (index < files.length - 1) {
              [files[index + 1], files[index]] = [
                files[index],
                files[index + 1],
              ];
              renderPages();
            }
          }).setAttribute("aria-label", "Arkaya taşı: " + file.name);
          button(actions, t("btn_remove_page"), () => {
            files.splice(index, 1);
            renderPages();
          });
        }
      }
    };
    renderPages();
    const submit = element(
      "button",
      fields,
      office ? t("btn_convert_pdf") : t("btn_create_pdf"),
    );
    submit.className = "xp-button primary";
    submit.type = "submit";
    const gate = element("div", form),
      results = element("div", record.content);
    const start = async () => {
      if (record.closed) return;
      if (!files.length) throw Error("En az bir dosya seç.");
      if (images)
        for (const file of files)
          pdfLayout(
            file.pdfWidth || file.width,
            file.pdfHeight || file.height,
            options,
          );
      if (!(await component(office ? "office" : "image", gate, start))) return;
      fields.disabled = true;
      try {
        const ids = await native.submit({
          operation: office ? "office.pdf" : "pdf.create",
          ids: files.map((e) => e.id),
          options: office ? { format: "pdf" } : options,
        });
        watch(record, results, ids, () => {
          fields.disabled = false;
        });
      } catch (e) {
        fields.disabled = false;
        throw e;
      }
    };
    form.onsubmit = (ev) => {
      ev.preventDefault();
      start().catch((e) => notify(e.message));
    };
  }
  return { open, documentPreview, watch };
}
