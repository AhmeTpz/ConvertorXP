// ConvertorXP — Interactive PDF Workspace Window (v0.7.0)
// High-performance client-side PDF document manipulation:
// thumbnails sidebar, drag reorder, rotate, delete, insert, text/stamp annotation, text/image extraction, Save As.

import { t } from "./i18n.js";

export async function mountPdfWorkspace(host, entry, services) {
  const { notify } = services;
  let disposed = false;

  // 1. Load Vendor Libraries
  const [pdfLib, pdfjs] = await Promise.all([
    import("./vendor/pdf-lib.mjs"),
    import("./vendor/pdf.mjs"),
  ]);
  const { PDFDocument, degrees, rgb } = pdfLib;
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "./vendor/pdf.worker.mjs",
    import.meta.url,
  ).href;

  // 2. Fetch Document Bytes
  const response = await fetch(entry.url || entry.previewURL);
  if (!response.ok) throw new Error("PDF dosyası okunamadı.");
  const initialBytes = await response.arrayBuffer();
  if (disposed) return;

  const mainPdfDoc = await PDFDocument.load(initialBytes.slice(0), {
    ignoreEncryption: true,
  });
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(initialBytes),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const mainPdfjsDoc = await loadingTask.promise;
  if (disposed) return;

  // 3. Document Pages State
  const pages = [];
  for (let i = 0; i < mainPdfjsDoc.numPages; i++) {
    const p = await mainPdfjsDoc.getPage(i + 1);
    const vp = p.getViewport({ scale: 1 });
    pages.push({
      id: "p-" + i + "-" + Math.random().toString(36).slice(2, 6),
      originalPageNumber: i + 1,
      sourceType: "main",
      sourcePdfDoc: mainPdfDoc,
      sourcePdfjsDoc: mainPdfjsDoc,
      rotation: 0,
      width: vp.width,
      height: vp.height,
      annotations: [],
    });
  }

  let activePageIndex = 0;
  let zoomMode = "fit"; // "fit" or number (1.0, 1.25, 0.8...)
  let zoomScale = 1.0;
  let isDirty = false;
  let placingAnnotation = null; // { type: "text"|"stamp", ... }

  // 4. Construct Workspace HTML Structure
  host.innerHTML = `
    <div class="xp-pdf-workspace">
      <div class="xp-pdf-toolbar" role="toolbar" aria-label="PDF Tools">
        <button type="button" class="xp-pdf-btn" data-act="save" title="${t("pdf_ws_save_as")}">
          <span class="icon">💾</span> <span data-i18n="pdf_ws_save_as">${t("pdf_ws_save_as")}</span>
        </button>
        <span class="toolbar-sep" aria-hidden="true"></span>
        <button type="button" class="xp-pdf-btn" data-act="rotate" title="${t("pdf_ws_rotate")}">
          <span class="icon">🔄</span> <span data-i18n="pdf_ws_rotate">${t("pdf_ws_rotate")}</span>
        </button>
        <button type="button" class="xp-pdf-btn" data-act="delete" title="${t("pdf_ws_delete")}">
          <span class="icon">🗑</span> <span data-i18n="pdf_ws_delete">${t("pdf_ws_delete")}</span>
        </button>
        <button type="button" class="xp-pdf-btn" data-act="insert" title="${t("pdf_ws_insert")}">
          <span class="icon">➕</span> <span data-i18n="pdf_ws_insert">${t("pdf_ws_insert")}</span>
        </button>
        <span class="toolbar-sep" aria-hidden="true"></span>
        <button type="button" class="xp-pdf-btn" data-act="split" title="${t("pdf_ws_split")}">
          <span class="icon">✂</span> <span data-i18n="pdf_ws_split">${t("pdf_ws_split")}</span>
        </button>
        <button type="button" class="xp-pdf-btn" data-act="compress" title="${t("pdf_ws_compress")}">
          <span class="icon">🗜</span> <span data-i18n="pdf_ws_compress">${t("pdf_ws_compress")}</span>
        </button>
        <button type="button" class="xp-pdf-btn" data-act="extract-text" title="${t("pdf_ws_extract_text")}">
          <span class="icon">📄</span> <span data-i18n="pdf_ws_extract_text">${t("pdf_ws_extract_text")}</span>
        </button>
        <button type="button" class="xp-pdf-btn" data-act="export-png" title="${t("pdf_ws_export_png")}">
          <span class="icon">🖼</span> <span data-i18n="pdf_ws_export_png">${t("pdf_ws_export_png")}</span>
        </button>
        <span class="toolbar-sep" aria-hidden="true"></span>
        <button type="button" class="xp-pdf-btn" data-act="add-text" title="${t("pdf_ws_add_text")}">
          <span class="icon">🔤</span> <span data-i18n="pdf_ws_add_text">${t("pdf_ws_add_text")}</span>
        </button>
        <button type="button" class="xp-pdf-btn" data-act="add-stamp" title="${t("pdf_ws_add_stamp")}">
          <span class="icon">🔏</span> <span data-i18n="pdf_ws_add_stamp">${t("pdf_ws_add_stamp")}</span>
        </button>
        <span class="toolbar-sep" aria-hidden="true"></span>
        <div class="pdf-zoom-controls">
          <button type="button" class="xp-pdf-btn zoom-btn" data-act="zoom-out" title="${t("pdf_ws_zoom_out")}">−</button>
          <button type="button" class="xp-pdf-btn zoom-btn" data-act="zoom-fit" title="${t("pdf_ws_fit_page")}">Sığdır</button>
          <button type="button" class="xp-pdf-btn zoom-btn" data-act="zoom-100" title="100%">100%</button>
          <button type="button" class="xp-pdf-btn zoom-btn" data-act="zoom-in" title="${t("pdf_ws_zoom_in")}">+</button>
          <span class="zoom-level" id="pdfZoomLevel">100%</span>
        </div>
      </div>
      <div class="xp-pdf-body">
        <aside class="pdf-sidebar">
          <div class="pdf-sidebar-header">
            <span class="sidebar-title" data-i18n="pdf_ws_title">Sayfalar</span>
            <span class="page-count-badge" id="pdfPageBadge">${pages.length}</span>
          </div>
          <div class="pdf-thumbnails" id="pdfThumbnails"></div>
        </aside>
        <main class="pdf-main-area" id="pdfMainArea">
          <div class="pdf-viewport" id="pdfViewport">
            <div class="pdf-stage" id="pdfStage">
              <canvas class="pdf-main-canvas" id="pdfMainCanvas"></canvas>
              <div class="pdf-annotation-layer" id="pdfAnnotationLayer"></div>
            </div>
          </div>
        </main>
      </div>
      <footer class="pdf-statusbar">
        <div class="status-sec status-page" id="pdfStatusPage">Sayfa 1 / ${pages.length}</div>
        <div class="status-sec status-dim" id="pdfStatusDim">595 × 842 pt</div>
        <div class="status-sec status-dirty" id="pdfStatusDirty">${t("pdf_ws_saved")}</div>
      </footer>
      <input type="file" id="pdfInsertInput" accept=".pdf,image/*" hidden multiple />
      <input type="file" id="pdfStampInput" accept="image/png,image/jpeg" hidden />
    </div>
  `;

  const q = (sel) => host.querySelector(sel);
  const thumbnailsContainer = q("#pdfThumbnails");
  const mainCanvas = q("#pdfMainCanvas");
  const annotationLayer = q("#pdfAnnotationLayer");
  const stage = q("#pdfStage");
  const viewport = q("#pdfViewport");
  const zoomLevelEl = q("#pdfZoomLevel");
  const statusPage = q("#pdfStatusPage");
  const statusDim = q("#pdfStatusDim");
  const statusDirty = q("#pdfStatusDirty");
  const pageBadge = q("#pdfPageBadge");
  const insertInput = q("#pdfInsertInput");
  const stampInput = q("#pdfStampInput");

  function markDirty() {
    isDirty = true;
    statusDirty.textContent = t("pdf_ws_unsaved");
    statusDirty.classList.add("dirty");
  }

  function updateStatus() {
    if (!pages.length) {
      statusPage.textContent = "0 / 0";
      statusDim.textContent = "—";
      return;
    }
    const cur = pages[activePageIndex];
    statusPage.textContent = t("pdf_ws_page_counter", {
      current: activePageIndex + 1,
      total: pages.length,
    });
    const w = Math.round(cur.rotation % 180 === 0 ? cur.width : cur.height);
    const h = Math.round(cur.rotation % 180 === 0 ? cur.height : cur.width);
    const paperName =
      Math.abs(w - 595) < 5 && Math.abs(h - 842) < 5 ? " (A4)" : "";
    statusDim.textContent = `${w} × ${h} pt${paperName}`;
    pageBadge.textContent = String(pages.length);
  }

  // 5. Render Thumbnails Sidebar
  async function renderThumbnails() {
    if (disposed) return;
    thumbnailsContainer.innerHTML = "";

    pages.forEach((pageItem, index) => {
      const card = document.createElement("div");
      card.className = "pdf-page-card";
      if (index === activePageIndex) card.classList.add("active");
      card.draggable = true;
      card.dataset.index = String(index);

      // Card Header
      const header = document.createElement("div");
      header.className = "card-header";
      header.innerHTML = `
        <span class="card-num">${index + 1}</span>
        <div class="card-actions">
          <button type="button" class="card-btn btn-rot" title="${t("pdf_ws_rotate")}">🔄</button>
          <button type="button" class="card-btn btn-del" title="${t("pdf_ws_delete")}">🗑</button>
        </div>
      `;

      // Thumbnail Canvas
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.className = "card-thumb";
      card.append(header, thumbCanvas);
      thumbnailsContainer.append(card);

      // Render thumbnail asynchronously
      (async () => {
        try {
          const p = await pageItem.sourcePdfjsDoc.getPage(
            pageItem.originalPageNumber,
          );
          const totalRotation = (p.rotate + pageItem.rotation) % 360;
          const vp = p.getViewport({ scale: 0.18, rotation: totalRotation });
          thumbCanvas.width = Math.ceil(vp.width);
          thumbCanvas.height = Math.ceil(vp.height);
          await p.render({
            canvasContext: thumbCanvas.getContext("2d"),
            viewport: vp,
          }).promise;
        } catch {}
      })();

      // Click to select
      card.onclick = (ev) => {
        if (ev.target.closest(".card-btn")) return;
        activePageIndex = index;
        updateActiveCard();
        renderActivePage();
      };

      // Rotate per-card button
      header.querySelector(".btn-rot").onclick = (ev) => {
        ev.stopPropagation();
        pageItem.rotation = (pageItem.rotation + 90) % 360;
        markDirty();
        renderThumbnails();
        if (activePageIndex === index) renderActivePage();
      };

      // Delete per-card button
      header.querySelector(".btn-del").onclick = (ev) => {
        ev.stopPropagation();
        deletePageAt(index);
      };

      // HTML5 Drag and Drop Reordering
      card.ondragstart = (ev) => {
        card.classList.add("dragging");
        ev.dataTransfer.setData("text/plain", String(index));
        ev.dataTransfer.effectAllowed = "move";
      };

      card.ondragend = () => {
        card.classList.remove("dragging");
        clearDropLines();
      };

      card.ondragover = (ev) => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        clearDropLines();
        if (ev.clientY < midY) {
          card.classList.add("drop-before");
        } else {
          card.classList.add("drop-after");
        }
      };

      card.ondrop = (ev) => {
        ev.preventDefault();
        const fromIndex = Number(ev.dataTransfer.getData("text/plain"));
        const rect = card.getBoundingClientRect();
        const before = ev.clientY < rect.top + rect.height / 2;
        let toIndex = before ? index : index + 1;
        if (fromIndex < toIndex) toIndex--;
        clearDropLines();

        if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
          const [moved] = pages.splice(fromIndex, 1);
          pages.splice(toIndex, 0, moved);
          activePageIndex = toIndex;
          markDirty();
          renderThumbnails();
          renderActivePage();
        }
      };
    });

    updateStatus();
  }

  function clearDropLines() {
    thumbnailsContainer
      .querySelectorAll(".drop-before, .drop-after")
      .forEach((el) => {
        el.classList.remove("drop-before", "drop-after");
      });
  }

  function updateActiveCard() {
    thumbnailsContainer
      .querySelectorAll(".pdf-page-card")
      .forEach((card, idx) => {
        card.classList.toggle("active", idx === activePageIndex);
      });
    updateStatus();
  }

  function deletePageAt(index) {
    if (pages.length <= 1) {
      notify(t("pdf_ws_confirm_delete") || "En az bir sayfa kalmalıdır.");
      return;
    }
    pages.splice(index, 1);
    if (activePageIndex >= pages.length)
      activePageIndex = Math.max(0, pages.length - 1);
    markDirty();
    renderThumbnails();
    renderActivePage();
  }

  // 6. Render Active Page in Center Viewport
  let renderingMain = false;
  async function renderActivePage() {
    if (disposed || !pages.length) return;
    if (renderingMain) return;
    renderingMain = true;

    try {
      const cur = pages[activePageIndex];
      const p = await cur.sourcePdfjsDoc.getPage(cur.originalPageNumber);
      const totalRotation = (p.rotate + cur.rotation) % 360;

      // Calculate scale
      const naturalVp = p.getViewport({ scale: 1, rotation: totalRotation });
      if (zoomMode === "fit") {
        const availableW = Math.max(200, viewport.clientWidth - 40);
        const availableH = Math.max(200, viewport.clientHeight - 40);
        zoomScale = Math.min(
          availableW / naturalVp.width,
          availableH / naturalVp.height,
        );
      } else {
        zoomScale = Number(zoomMode) || 1.0;
      }
      zoomLevelEl.textContent = Math.round(zoomScale * 100) + "%";

      const vp = p.getViewport({
        scale: zoomScale * 1.5,
        rotation: totalRotation,
      }); // 1.5x crisp rendering
      mainCanvas.width = Math.ceil(vp.width);
      mainCanvas.height = Math.ceil(vp.height);
      mainCanvas.style.width = Math.ceil(naturalVp.width * zoomScale) + "px";
      mainCanvas.style.height = Math.ceil(naturalVp.height * zoomScale) + "px";

      stage.style.width = mainCanvas.style.width;
      stage.style.height = mainCanvas.style.height;

      const ctx = mainCanvas.getContext("2d");
      await p.render({ canvasContext: ctx, viewport: vp }).promise;

      // Draw session annotations onto canvas
      if (cur.annotations && cur.annotations.length > 0) {
        ctx.save();
        for (const ann of cur.annotations) {
          if (ann.type === "text") {
            ctx.font = `bold ${Math.round(ann.size * zoomScale * 1.5)}px Tahoma, sans-serif`;
            ctx.fillStyle = "rgba(220, 20, 20, 0.9)";
            ctx.fillText(
              ann.text,
              ann.x * zoomScale * 1.5,
              ann.y * zoomScale * 1.5,
            );
          } else if (ann.type === "stamp" && ann.imgElement) {
            ctx.drawImage(
              ann.imgElement,
              ann.x * zoomScale * 1.5,
              ann.y * zoomScale * 1.5,
              ann.width * zoomScale * 1.5,
              ann.height * zoomScale * 1.5,
            );
          }
        }
        ctx.restore();
      }

      updateStatus();
    } catch (err) {
      notify(err.message);
    } finally {
      renderingMain = false;
    }
  }

  // 7. Click to Place Annotation / Stamp
  annotationLayer.onclick = (ev) => {
    if (!placingAnnotation || !pages.length) return;
    const rect = annotationLayer.getBoundingClientRect();
    const clickX = (ev.clientX - rect.left) / zoomScale;
    const clickY = (ev.clientY - rect.top) / zoomScale;
    const cur = pages[activePageIndex];

    if (placingAnnotation.type === "text") {
      cur.annotations.push({
        type: "text",
        text: placingAnnotation.text,
        x: clickX,
        y: clickY,
        size: 20,
      });
    } else if (placingAnnotation.type === "stamp") {
      cur.annotations.push({
        type: "stamp",
        imgElement: placingAnnotation.imgElement,
        imageBytes: placingAnnotation.imageBytes,
        isPng: placingAnnotation.isPng,
        x: clickX - 50,
        y: clickY - 25,
        width: 100,
        height: 50,
      });
    }

    placingAnnotation = null;
    annotationLayer.classList.remove("placing");
    markDirty();
    renderActivePage();
  };

  // 8. Toolbar Actions
  q("[data-act='rotate']").onclick = () => {
    if (!pages.length) return;
    const cur = pages[activePageIndex];
    cur.rotation = (cur.rotation + 90) % 360;
    markDirty();
    renderThumbnails();
    renderActivePage();
  };

  q("[data-act='delete']").onclick = () => {
    deletePageAt(activePageIndex);
  };

  q("[data-act='zoom-in']").onclick = () => {
    zoomMode = Math.min(3.0, (Number(zoomScale) || 1.0) * 1.25);
    renderActivePage();
  };

  q("[data-act='zoom-out']").onclick = () => {
    zoomMode = Math.max(0.25, (Number(zoomScale) || 1.0) * 0.8);
    renderActivePage();
  };

  q("[data-act='zoom-100']").onclick = () => {
    zoomMode = 1.0;
    renderActivePage();
  };

  q("[data-act='zoom-fit']").onclick = () => {
    zoomMode = "fit";
    renderActivePage();
  };

  // Insert Pages from other PDF / image
  q("[data-act='insert']").onclick = () => insertInput.click();
  insertInput.onchange = async () => {
    const files = Array.from(insertInput.files || []);
    insertInput.value = "";
    if (!files.length) return;

    for (const file of files) {
      try {
        const fileBytes = await file.arrayBuffer();
        if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          const otherPdfDoc = await PDFDocument.load(fileBytes.slice(0), {
            ignoreEncryption: true,
          });
          const otherPdfjsDoc = await pdfjs.getDocument({
            data: new Uint8Array(fileBytes),
            isEvalSupported: false,
            useSystemFonts: true,
          }).promise;
          for (let i = 0; i < otherPdfjsDoc.numPages; i++) {
            const p = await otherPdfjsDoc.getPage(i + 1);
            const vp = p.getViewport({ scale: 1 });
            pages.splice(activePageIndex + 1 + i, 0, {
              id: "p-ext-" + Math.random().toString(36).slice(2, 6),
              originalPageNumber: i + 1,
              sourceType: "external",
              sourcePdfDoc: otherPdfDoc,
              sourcePdfjsDoc: otherPdfjsDoc,
              rotation: 0,
              width: vp.width,
              height: vp.height,
              annotations: [],
            });
          }
        }
      } catch (e) {
        notify(e.message || "Sayfa eklenemedi.");
      }
    }
    markDirty();
    renderThumbnails();
    renderActivePage();
  };

  // Add Text Annotation
  q("[data-act='add-text']").onclick = () => {
    const text = window.prompt(
      t("pdf_ws_text_prompt") || "Sayfaya eklenecek metin:",
      "ONAYLANDI",
    );
    if (!text) return;
    placingAnnotation = { type: "text", text };
    annotationLayer.classList.add("placing");
    notify(
      t("pdf_ws_click_place") ||
        "Metni yerleştirmek istediğiniz konuma tıklayın.",
    );
  };

  // Add Stamp / Signature
  q("[data-act='add-stamp']").onclick = () => stampInput.click();
  stampInput.onchange = async () => {
    const file = stampInput.files?.[0];
    stampInput.value = "";
    if (!file) return;

    const buf = await file.arrayBuffer();
    const blob = new Blob([buf], { type: file.type });
    const imgUrl = URL.createObjectURL(blob);
    const imgElement = new Image();
    imgElement.src = imgUrl;
    await new Promise((r) => (imgElement.onload = r));

    placingAnnotation = {
      type: "stamp",
      imgElement,
      imageBytes: buf,
      isPng: file.type.includes("png"),
    };
    annotationLayer.classList.add("placing");
    notify(
      t("pdf_ws_click_place") || "Kaşeyi yerleştirmek için sayfaya tıklayın.",
    );
  };

  // Extract Text to .txt
  q("[data-act='extract-text']").onclick = async () => {
    try {
      let fullText = "";
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const pdfPage = await p.sourcePdfjsDoc.getPage(p.originalPageNumber);
        const textContent = await pdfPage.getTextContent();
        const pageText = textContent.items.map((it) => it.str).join(" ");
        fullText += `--- Sayfa ${i + 1} ---\n${pageText}\n\n`;
      }
      const txtName = entry.name.replace(/\.pdf$/i, "") + "-metin.txt";
      if (window.convertorDesktop?.saveBlob) {
        await window.convertorDesktop.saveBlob(
          new TextEncoder().encode(fullText),
          txtName,
        );
        notify(`✓ ${txtName} masaüstüne eklendi.`);
      }
    } catch (e) {
      notify(e.message);
    }
  };

  // Export Pages as Standalone PNGs
  q("[data-act='export-png']").onclick = async () => {
    try {
      const cur = pages[activePageIndex];
      const p = await cur.sourcePdfjsDoc.getPage(cur.originalPageNumber);
      const vp = p.getViewport({ scale: 2.0, rotation: cur.rotation });
      const c = document.createElement("canvas");
      c.width = vp.width;
      c.height = vp.height;
      await p.render({ canvasContext: c.getContext("2d"), viewport: vp })
        .promise;
      const pngBlob = await new Promise((res) => c.toBlob(res, "image/png"));
      const pngName =
        entry.name.replace(/\.pdf$/i, "") + `-sayfa-${activePageIndex + 1}.png`;
      if (window.convertorDesktop?.saveBlob) {
        await window.convertorDesktop.saveBlob(
          new Uint8Array(await pngBlob.arrayBuffer()),
          pngName,
        );
        notify(`✓ ${pngName} masaüstüne eklendi.`);
      }
    } catch (e) {
      notify(e.message);
    }
  };

  // Save As (Farklı Kaydet)
  q("[data-act='save']").onclick = async () => {
    try {
      const newPdf = await PDFDocument.create();
      for (const p of pages) {
        const [copied] = await newPdf.copyPages(p.sourcePdfDoc, [
          p.originalPageNumber - 1,
        ]);
        if (p.rotation !== 0) {
          copied.setRotation(
            degrees((copied.getRotation().angle + p.rotation) % 360),
          );
        }
        // Apply text & stamp annotations
        if (p.annotations && p.annotations.length > 0) {
          for (const ann of p.annotations) {
            if (ann.type === "text") {
              copied.drawText(ann.text, {
                x: Math.max(10, ann.x),
                y: Math.max(10, copied.getHeight() - ann.y),
                size: ann.size || 16,
                color: rgb(0.85, 0.1, 0.1),
              });
            } else if (ann.type === "stamp" && ann.imageBytes) {
              const embedded = ann.isPng
                ? await newPdf.embedPng(ann.imageBytes)
                : await newPdf.embedJpg(ann.imageBytes);
              copied.drawImage(embedded, {
                x: Math.max(0, ann.x),
                y: Math.max(0, copied.getHeight() - ann.y - ann.height),
                width: ann.width || 100,
                height: ann.height || 50,
              });
            }
          }
        }
        newPdf.addPage(copied);
      }

      const outputBytes = await newPdf.save();
      const newName = entry.name.replace(/\.pdf$/i, "") + "-duzenlendi.pdf";

      if (window.convertorDesktop?.saveBlob) {
        await window.convertorDesktop.saveBlob(outputBytes, newName);
        isDirty = false;
        statusDirty.textContent = t("pdf_ws_saved");
        statusDirty.classList.remove("dirty");
        if (services.showBalloon) {
          services.showBalloon({
            title: t("balloon_done_title") || "İşlem tamamlandı",
            message: `✓ ${newName} masaüstüne kaydedildi.`,
          });
        }
        notify(`✓ ${newName} masaüstüne kaydedildi.`);
      }
    } catch (err) {
      notify(err.message || "Kaydetme başarısız.");
    }
  };

  // Split Active Page
  q("[data-act='split']").onclick = async () => {
    try {
      const cur = pages[activePageIndex];
      const singlePdf = await PDFDocument.create();
      const [copied] = await singlePdf.copyPages(cur.sourcePdfDoc, [
        cur.originalPageNumber - 1,
      ]);
      if (cur.rotation !== 0) {
        copied.setRotation(
          degrees((copied.getRotation().angle + cur.rotation) % 360),
        );
      }
      singlePdf.addPage(copied);
      const splitBytes = await singlePdf.save();
      const splitName =
        entry.name.replace(/\.pdf$/i, "") + `-bolum-${activePageIndex + 1}.pdf`;
      if (window.convertorDesktop?.saveBlob) {
        await window.convertorDesktop.saveBlob(splitBytes, splitName);
        notify(`✓ ${splitName} masaüstüne eklendi.`);
      }
    } catch (e) {
      notify(e.message);
    }
  };

  // Lossless Fast Compression
  q("[data-act='compress']").onclick = async () => {
    try {
      // Linearize / compact serialization
      const compPdf = await PDFDocument.create();
      for (const p of pages) {
        const [copied] = await compPdf.copyPages(p.sourcePdfDoc, [
          p.originalPageNumber - 1,
        ]);
        if (p.rotation !== 0) {
          copied.setRotation(
            degrees((copied.getRotation().angle + p.rotation) % 360),
          );
        }
        compPdf.addPage(copied);
      }
      const compBytes = await compPdf.save({ useObjectStreams: true });
      const compName = entry.name.replace(/\.pdf$/i, "") + "-sikistirilmis.pdf";
      if (window.convertorDesktop?.saveBlob) {
        await window.convertorDesktop.saveBlob(compBytes, compName);
        notify(`✓ ${compName} (${Math.round(compBytes.length / 1024)} KB)`);
      }
    } catch (e) {
      notify(e.message);
    }
  };

  // 9. Initial Render
  await renderThumbnails();
  await renderActivePage();

  window.addEventListener("resize", () => {
    if (!disposed && zoomMode === "fit") renderActivePage();
  });

  return () => {
    disposed = true;
    loadingTask.destroy();
  };
}
