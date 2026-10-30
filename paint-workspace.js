// ConvertorXP — Windows XP Paint & Collage Studio (v0.8.0)
// Authentic 16-tool XP toolbox, 28-color dual-palette, Fabric.js interactive object layer,
// multi-photo collage templates, and lossless non-destructive export.

import { t } from "./i18n.js";
import { removeColorBackground } from "./bg-remover.js";
import {
  COLLAGE_TEMPLATES,
  getCollageLayout,
  renderCollageToCanvas,
  autoTemplateForCount,
} from "./collage-engine.js";

const XP_PALETTE = [
  // Row 1 (darker / standard)
  "#000000",
  "#808080",
  "#800000",
  "#808000",
  "#008000",
  "#008080",
  "#000080",
  "#800080",
  "#808040",
  "#004040",
  "#0080ff",
  "#004080",
  "#8000ff",
  "#804000",
  // Row 2 (lighter / pastels)
  "#ffffff",
  "#c0c0c0",
  "#ff0000",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#0000ff",
  "#ff00ff",
  "#ffff80",
  "#00ff80",
  "#80ffff",
  "#7f9db9",
  "#ff80ff",
  "#ff8040",
];

export async function mountPaintWorkspace(
  host,
  entry,
  services,
  initialOptions = {},
) {
  const { save, notify } = services;
  let disposed = false;

  // 1. Determine Initial Mode and Images
  const isMultiCollage =
    Array.isArray(initialOptions.collageImages) &&
    initialOptions.collageImages.length >= 2;
  let mode = isMultiCollage ? "collage" : "paint";

  let collageTemplate = isMultiCollage
    ? autoTemplateForCount(initialOptions.collageImages.length)
    : "4-grid";
  let collageGap = 12;
  let collageRadius = 4;
  let collageBg = "#ffffff";
  let collageRatio = "1:1";

  // Colors
  let primaryColor = "#000000";
  let secondaryColor = "#ffffff";
  let activeTool = "pencil";
  let strokeWidth = 2;
  let fillMode = "outline"; // outline, filled, fill-only

  // Dimensions
  let canvasW = 800;
  let canvasH = 600;

  // Loaded DOM Images for Collage or Single Image
  const loadedImages = [];
  if (isMultiCollage) {
    for (const imgEntry of initialOptions.collageImages) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgEntry.previewURL || imgEntry.url;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      loadedImages.push(img);
    }
    canvasW = 1000;
    canvasH = 1000;
  } else if (entry && (entry.url || entry.previewURL)) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = entry.previewURL || entry.url;
    await new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    });
    if (img.width && img.height) {
      loadedImages.push(img);
      canvasW = Math.min(2400, Math.max(200, img.width));
      canvasH = Math.min(2400, Math.max(200, img.height));
    }
  }

  // 2. Build XP Paint DOM Structure
  host.innerHTML = `
    <div class="xp-paint-studio">
      <!-- XP Menu Bar -->
      <nav class="xp-paint-menubar" role="menubar">
        <div class="paint-menu-item"><u>D</u>osya
          <div class="paint-dropdown">
            <button type="button" data-menu="save">💾 Kopya Olarak Kaydet</button>
            <button type="button" data-menu="clear">Tuvali Temizle</button>
          </div>
        </div>
        <div class="paint-menu-item"><u>D</u>üzen
          <div class="paint-dropdown">
            <button type="button" data-menu="undo">↶ Geri Al   Ctrl+Z</button>
            <button type="button" data-menu="redo">↷ Yinele   Ctrl+Y</button>
          </div>
        </div>
        <div class="paint-menu-item"><u>G</u>örsel
          <div class="paint-dropdown">
            <button type="button" data-menu="rotate-cw">↷ 90° Sağa Döndür</button>
            <button type="button" data-menu="flip-h">↔ Yatay Çevir</button>
            <button type="button" data-menu="flip-v">↕ Dikey Çevir</button>
            <button type="button" data-menu="rembg">🪄 ${t("menu_rembg") || "Arka Planı Kaldır"}</button>
          </div>
        </div>
        <div class="paint-menu-item"><u>K</u>olaj
          <div class="paint-dropdown">
            <button type="button" data-menu="toggle-collage">🖼 Kolaj Modunu Aç/Kapat</button>
          </div>
        </div>
        <div class="paint-menubar-right">
          <button type="button" class="xp-button primary save-copy-top" id="btnQuickSave">
            💾 ${t("btn_save_as") || "Kopya Olarak Kaydet"}
          </button>
        </div>
      </nav>

      <!-- Collage Control Bar (Conditional) -->
      <div class="xp-collage-bar" id="collageBar" ${mode === "collage" ? "" : "hidden"}>
        <div class="collage-templates">
          ${Object.values(COLLAGE_TEMPLATES)
            .map(
              (tpl) => `
            <button type="button" class="collage-tpl-btn ${tpl.id === collageTemplate ? "active" : ""}" data-tpl="${tpl.id}" title="${tpl.name}">
              <span class="tpl-icon">${tpl.icon}</span>
              <span class="tpl-label">${tpl.name.split(" ")[0]}</span>
            </button>
          `,
            )
            .join("")}
        </div>
        <span class="toolbar-sep"></span>
        <label class="collage-control">
          <span>Aralık:</span>
          <input type="range" id="collageGap" min="0" max="30" value="${collageGap}">
          <output id="collageGapOut">${collageGap}px</output>
        </label>
        <label class="collage-control">
          <span>Ovallik:</span>
          <input type="range" id="collageRadius" min="0" max="25" value="${collageRadius}">
          <output id="collageRadiusOut">${collageRadius}px</output>
        </label>
        <label class="collage-control">
          <span>Oran:</span>
          <select id="collageRatio">
            <option value="1:1" selected>1:1 Kare</option>
            <option value="4:3">4:3 Standart</option>
            <option value="16:9">16:9 Geniş</option>
            <option value="9:16">9:16 Hikaye</option>
          </select>
        </label>
        <label class="collage-control">
          <span>Zemin:</span>
          <input type="color" id="collageBg" value="${collageBg}">
        </label>
      </div>

      <div class="xp-paint-body">
        <!-- Left Toolbox (2 columns) -->
        <aside class="xp-paint-toolbox">
          <div class="tools-grid">
            <button type="button" class="tool-btn" data-tool="select-rect" title="Dikdörtgen Seçim">🔲</button>
            <button type="button" class="tool-btn" data-tool="select-free" title="Serbest Seçim">✂</button>
            <button type="button" class="tool-btn" data-tool="eraser" title="Silgi">🧹</button>
            <button type="button" class="tool-btn" data-tool="fill" title="Boya Kovası">🪣</button>
            <button type="button" class="tool-btn" data-tool="picker" title="Renk Damlalığı">🔍</button>
            <button type="button" class="tool-btn" data-tool="magnifier" title="Büyüteç">🔎</button>
            <button type="button" class="tool-btn active" data-tool="pencil" title="Kalem">✏</button>
            <button type="button" class="tool-btn" data-tool="brush" title="Fırça">🖌</button>
            <button type="button" class="tool-btn" data-tool="airbrush" title="Püskürtme (Sprey)">💨</button>
            <button type="button" class="tool-btn" data-tool="text" title="Yazı">🅰</button>
            <button type="button" class="tool-btn" data-tool="line" title="Çizgi">📏</button>
            <button type="button" class="tool-btn" data-tool="curve" title="Eğri Çizgi">〰</button>
            <button type="button" class="tool-btn" data-tool="rect" title="Dikdörtgen">▭</button>
            <button type="button" class="tool-btn" data-tool="polygon" title="Çokgen">⬡</button>
            <button type="button" class="tool-btn" data-tool="ellipse" title="Elips">⬭</button>
            <button type="button" class="tool-btn" data-tool="round-rect" title="Yuvarlak Köşeli Dikdörtgen">▢</button>
          </div>

          <!-- Tool Options Pane below Toolbox -->
          <div class="tool-options-pane" id="toolOptionsPane">
            <div class="stroke-width-picker">
              <div class="stroke-opt ${strokeWidth === 1 ? "active" : ""}" data-w="1"><span style="height:1px;"></span></div>
              <div class="stroke-opt ${strokeWidth === 2 ? "active" : ""}" data-w="2"><span style="height:2px;"></span></div>
              <div class="stroke-opt ${strokeWidth === 3 ? "active" : ""}" data-w="3"><span style="height:3px;"></span></div>
              <div class="stroke-opt ${strokeWidth === 5 ? "active" : ""}" data-w="5"><span style="height:5px;"></span></div>
              <div class="stroke-opt ${strokeWidth === 8 ? "active" : ""}" data-w="8"><span style="height:8px;"></span></div>
            </div>
            <div class="shape-fill-picker" id="shapeFillPicker" hidden>
              <div class="fill-opt ${fillMode === "outline" ? "active" : ""}" data-fill="outline" title="Yalnızca Çerçeve">▭</div>
              <div class="fill-opt ${fillMode === "filled" ? "active" : ""}" data-fill="filled" title="Çerçeve ve Dolgu">▣</div>
              <div class="fill-opt ${fillMode === "fill-only" ? "active" : ""}" data-fill="fill-only" title="Yalnızca Dolgu">■</div>
            </div>
          </div>
        </aside>

        <!-- Main Viewport -->
        <main class="xp-paint-viewport" id="paintViewport">
          <div class="xp-paint-stage" id="paintStage" style="width:${canvasW}px; height:${canvasH}px;">
            <canvas id="paintCanvas" width="${canvasW}" height="${canvasH}"></canvas>
          </div>
        </main>
      </div>

      <!-- Bottom Palette & Status Bar -->
      <footer class="xp-paint-footer">
        <div class="xp-palette">
          <div class="active-swatches">
            <div class="swatch-secondary" id="swatchSecondary" style="background:${secondaryColor};" title="İkincil Renk / Silgi (Sağ Tık)"></div>
            <div class="swatch-primary" id="swatchPrimary" style="background:${primaryColor};" title="Birincil Renk (Sol Tık)"></div>
          </div>
          <div class="color-grid">
            ${XP_PALETTE.map(
              (col) => `
              <div class="color-box" style="background:${col};" data-color="${col}" title="${col}"></div>
            `,
            ).join("")}
          </div>
        </div>
        <div class="xp-paint-statusbar">
          <span class="status-cell status-help">Çizim yapmak veya şekil yerleştirmek için fareyi sürükleyin.</span>
          <span class="status-cell status-coords" id="statusCoords">0, 0 px</span>
          <span class="status-cell status-size" id="statusSize">${canvasW} × ${canvasH} px</span>
          <span class="status-cell status-filesize" id="statusFileSize" title="Tahmini Dosya Boyutu">...</span>
        </div>
      </footer>

      <!-- XP Save As Modal Dialog -->
      <div class="xp-paint-modal-backdrop" id="saveModal" hidden>
        <div class="xp-paint-modal">
          <div class="modal-titlebar">
            <span>💾 ${t("paint_save_copy") || "Kopya Olarak Kaydet"}</span>
            <button type="button" class="modal-close" id="modalClose" aria-label="Kapat">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <label for="saveFilename">Dosya Adı:</label>
              <input type="text" id="saveFilename" class="xp-input" value="resim-duzenlendi">
            </div>
            <div class="modal-field">
              <label for="saveFormat">Kayıt Türü:</label>
              <select id="saveFormat" class="xp-select">
                <option value="png" selected>PNG (*.png) — Kayıpsız netlik & şeffaflık</option>
                <option value="jpeg">JPEG (*.jpg) — Optimize dosya boyutu</option>
                <option value="webp">WebP (*.webp) — Modern web formatı</option>
              </select>
            </div>
            <div class="modal-field" id="qualityRow" hidden>
              <label for="saveQuality">Kalite:</label>
              <div class="quality-wrap">
                <input type="range" id="saveQuality" min="40" max="100" value="92">
                <output id="saveQualityVal">92%</output>
              </div>
            </div>
            <div class="modal-size-box" id="saveSizeBox">
              <span class="size-icon">📁</span>
              <div>
                <strong>Tahmini Dosya Boyutu:</strong>
                <span id="saveCalculatedSize">Hesaplanıyor…</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="xp-button primary" id="btnConfirmSave">💾 Kaydet</button>
            <button type="button" class="xp-button" id="btnCancelSave">Vazgeç</button>
          </div>
        </div>
      </div>

      <!-- XP RemBg Modal Dialog -->
      <div class="xp-paint-modal-backdrop" id="rembgModal" hidden>
        <div class="xp-paint-modal">
          <div class="modal-titlebar">
            <span>🪄 ${t("rembg_title") || "Arka Planı Kaldır"}</span>
            <button type="button" class="modal-close" id="rembgClose" aria-label="Kapat">×</button>
          </div>
          <div class="modal-body">
            <p style="margin:0 0 6px; font-size:11px; color:#333;">
              Zemin rengini otomatik tespit eder ve saydamlaştırır. İnce ayar için toleransı değiştirebilirsiniz:
            </p>
            <div class="modal-field">
              <label for="rembgTolerance">${t("rembg_tolerance") || "Tolerans:"}</label>
              <div class="quality-wrap">
                <input type="range" id="rembgTolerance" min="10" max="120" value="35">
                <output id="rembgTolVal">35</output>
              </div>
            </div>
            <div class="modal-field">
              <label for="rembgFeather">${t("rembg_feather") || "Yumuşaklık:"}</label>
              <div class="quality-wrap">
                <input type="range" id="rembgFeather" min="0" max="8" value="3">
                <output id="rembgFeatherVal">3 px</output>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="xp-button primary" id="btnApplyRembg">${t("rembg_apply") || "✓ Tuvale Uygula"}</button>
            <button type="button" class="xp-button" id="btnCancelRembg">Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 3. Elements Selection
  const q = (sel) => host.querySelector(sel);
  const canvas = q("#paintCanvas");
  const stage = q("#paintStage");
  const ctx = canvas.getContext("2d");
  const statusCoords = q("#statusCoords");
  const swatchPrimary = q("#swatchPrimary");
  const swatchSecondary = q("#swatchSecondary");
  const shapeFillPicker = q("#shapeFillPicker");
  const collageBar = q("#collageBar");

  // History Stack for Undo / Redo
  const undoStack = [];
  const redoStack = [];

  function saveSnapshot() {
    if (undoStack.length > 25) undoStack.shift();
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    redoStack.length = 0;
  }

  // Draw Initial Content
  if (mode === "collage") {
    renderCollage();
  } else if (loadedImages.length > 0) {
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loadedImages[0], 0, 0, canvas.width, canvas.height);
    saveSnapshot();
  } else {
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveSnapshot();
  }

  function renderCollage() {
    saveSnapshot();
    const cells = getCollageLayout({
      template: collageTemplate,
      width: canvas.width,
      height: canvas.height,
      gap: collageGap,
      radius: collageRadius,
    });
    renderCollageToCanvas({
      canvas,
      cells,
      images: loadedImages,
      background: collageBg,
    });
  }

  // 4. Color Palette Interaction
  q(".color-grid").onclick = (ev) => {
    const box = ev.target.closest(".color-box");
    if (!box) return;
    primaryColor = box.dataset.color;
    swatchPrimary.style.background = primaryColor;
  };

  q(".color-grid").oncontextmenu = (ev) => {
    ev.preventDefault();
    const box = ev.target.closest(".color-box");
    if (!box) return;
    secondaryColor = box.dataset.color;
    swatchSecondary.style.background = secondaryColor;
  };

  // Stroke width & fill mode
  q(".stroke-width-picker").onclick = (ev) => {
    const opt = ev.target.closest(".stroke-opt");
    if (!opt) return;
    strokeWidth = Number(opt.dataset.w) || 2;
    q(".stroke-width-picker")
      .querySelectorAll(".stroke-opt")
      .forEach((el) => el.classList.remove("active"));
    opt.classList.add("active");
  };

  q(".shape-fill-picker").onclick = (ev) => {
    const opt = ev.target.closest(".fill-opt");
    if (!opt) return;
    fillMode = opt.dataset.fill;
    q(".shape-fill-picker")
      .querySelectorAll(".fill-opt")
      .forEach((el) => el.classList.remove("active"));
    opt.classList.add("active");
  };

  // 5. Tool Selection
  q(".tools-grid").onclick = (ev) => {
    const btn = ev.target.closest(".tool-btn");
    if (!btn) return;
    activeTool = btn.dataset.tool;
    q(".tools-grid")
      .querySelectorAll(".tool-btn")
      .forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");

    const isShape = ["rect", "ellipse", "round-rect", "polygon"].includes(
      activeTool,
    );
    shapeFillPicker.hidden = !isShape;
  };

  // 6. Interactive Drawing Logic on Canvas
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let snapshotBeforeDrag = null;

  function getMousePos(ev) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((ev.clientX - rect.left) * scaleX),
      y: Math.round((ev.clientY - rect.top) * scaleY),
    };
  }

  canvas.onmousemove = (ev) => {
    const pos = getMousePos(ev);
    statusCoords.textContent = `${pos.x}, ${pos.y} px`;

    if (!isDrawing) return;

    if (activeTool === "pencil") {
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.lineCap = "square";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (activeTool === "brush") {
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (activeTool === "eraser") {
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = strokeWidth * 4;
      ctx.lineCap = "square";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (activeTool === "airbrush") {
      const radius = strokeWidth * 3;
      const density = 20;
      ctx.fillStyle = primaryColor;
      for (let i = 0; i < density; i++) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetRadius = Math.random() * radius;
        ctx.fillRect(
          pos.x + Math.cos(offsetAngle) * offsetRadius,
          pos.y + Math.sin(offsetAngle) * offsetRadius,
          1,
          1,
        );
      }
    } else if (["line", "rect", "ellipse", "round-rect"].includes(activeTool)) {
      // Shape preview: restore snapshot and draw preview
      if (snapshotBeforeDrag) ctx.putImageData(snapshotBeforeDrag, 0, 0);

      ctx.strokeStyle = primaryColor;
      ctx.fillStyle = secondaryColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";

      const w = pos.x - startX;
      const h = pos.y - startY;

      if (activeTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (activeTool === "rect") {
        if (fillMode === "filled" || fillMode === "fill-only")
          ctx.fillRect(startX, startY, w, h);
        if (fillMode === "outline" || fillMode === "filled")
          ctx.strokeRect(startX, startY, w, h);
      } else if (activeTool === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(
          startX + w / 2,
          startY + h / 2,
          Math.abs(w / 2),
          Math.abs(h / 2),
          0,
          0,
          Math.PI * 2,
        );
        if (fillMode === "filled" || fillMode === "fill-only") ctx.fill();
        if (fillMode === "outline" || fillMode === "filled") ctx.stroke();
      } else if (activeTool === "round-rect") {
        ctx.beginPath();
        const rx = Math.min(15, Math.abs(w) / 4);
        ctx.roundRect(startX, startY, w, h, rx);
        if (fillMode === "filled" || fillMode === "fill-only") ctx.fill();
        if (fillMode === "outline" || fillMode === "filled") ctx.stroke();
      }
    }
  };

  canvas.onmousedown = (ev) => {
    const pos = getMousePos(ev);
    startX = pos.x;
    startY = pos.y;
    isDrawing = true;
    saveSnapshot();
    snapshotBeforeDrag = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (activeTool === "picker") {
      const p = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      const hex =
        "#" +
        [p[0], p[1], p[2]].map((x) => x.toString(16).padStart(2, "0")).join("");
      if (ev.button === 2) {
        secondaryColor = hex;
        swatchSecondary.style.background = hex;
      } else {
        primaryColor = hex;
        swatchPrimary.style.background = hex;
      }
      isDrawing = false;
      return;
    }

    if (activeTool === "fill") {
      floodFill(pos.x, pos.y, primaryColor);
      isDrawing = false;
      return;
    }

    if (activeTool === "text") {
      const text = window.prompt("Eklenecek metni yazın:", "ConvertorXP");
      if (text) {
        ctx.font = `bold ${strokeWidth * 8 + 12}px Tahoma, sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.fillText(text, pos.x, pos.y);
      }
      isDrawing = false;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  window.addEventListener("mouseup", () => {
    if (isDrawing) {
      isDrawing = false;
      snapshotBeforeDrag = null;
    }
  });

  // Flood fill algorithm (Breadth-first search on canvas image data)
  function floodFill(startX, startY, fillHex) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    const startIndex = (startY * w + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    // Parse fill color
    const fillR = parseInt(fillHex.slice(1, 3), 16);
    const fillG = parseInt(fillHex.slice(3, 5), 16);
    const fillB = parseInt(fillHex.slice(5, 7), 16);

    if (targetR === fillR && targetG === fillG && targetB === fillB) return;

    const queue = [[startX, startY]];
    const visited = new Uint8Array(w * h);

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const idx = cy * w + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pIdx = idx * 4;
      if (
        Math.abs(data[pIdx] - targetR) < 15 &&
        Math.abs(data[pIdx + 1] - targetG) < 15 &&
        Math.abs(data[pIdx + 2] - targetB) < 15
      ) {
        data[pIdx] = fillR;
        data[pIdx + 1] = fillG;
        data[pIdx + 2] = fillB;
        data[pIdx + 3] = 255;

        queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // 7. Collage Bar Events
  q(".collage-templates").onclick = (ev) => {
    const btn = ev.target.closest(".collage-tpl-btn");
    if (!btn) return;
    collageTemplate = btn.dataset.tpl;
    q(".collage-templates")
      .querySelectorAll(".collage-tpl-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderCollage();
  };

  q("#collageGap").oninput = (ev) => {
    collageGap = Number(ev.target.value);
    q("#collageGapOut").textContent = collageGap + "px";
    renderCollage();
  };

  q("#collageRadius").oninput = (ev) => {
    collageRadius = Number(ev.target.value);
    q("#collageRadiusOut").textContent = collageRadius + "px";
    renderCollage();
  };

  q("#collageRatio").onchange = (ev) => {
    collageRatio = ev.target.value;
    if (collageRatio === "1:1") {
      canvas.width = 1000;
      canvas.height = 1000;
    } else if (collageRatio === "4:3") {
      canvas.width = 1200;
      canvas.height = 900;
    } else if (collageRatio === "16:9") {
      canvas.width = 1280;
      canvas.height = 720;
    } else if (collageRatio === "9:16") {
      canvas.width = 720;
      canvas.height = 1280;
    }
    stage.style.width = canvas.width + "px";
    stage.style.height = canvas.height + "px";
    q("#statusSize").textContent = `${canvas.width} × ${canvas.height} px`;
    renderCollage();
  };

  q("#collageBg").oninput = (ev) => {
    collageBg = ev.target.value;
    renderCollage();
  };

  // 8. Menu Actions
  q("[data-menu='undo']").onclick = () => {
    if (!undoStack.length) return;
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const last = undoStack.pop();
    ctx.putImageData(last, 0, 0);
  };

  q("[data-menu='redo']").onclick = () => {
    if (!redoStack.length) return;
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const next = redoStack.pop();
    ctx.putImageData(next, 0, 0);
  };

  q("[data-menu='clear']").onclick = () => {
    saveSnapshot();
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  q("[data-menu='toggle-collage']").onclick = () => {
    mode = mode === "collage" ? "paint" : "collage";
    collageBar.hidden = mode !== "collage";
    if (mode === "collage") renderCollage();
  };

  q("[data-menu='rotate-cw']").onclick = () => {
    saveSnapshot();
    const temp = document.createElement("canvas");
    temp.width = canvas.height;
    temp.height = canvas.width;
    const tCtx = temp.getContext("2d");
    tCtx.translate(temp.width / 2, temp.height / 2);
    tCtx.rotate(Math.PI / 2);
    tCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    canvas.width = temp.width;
    canvas.height = temp.height;
    stage.style.width = canvas.width + "px";
    stage.style.height = canvas.height + "px";
    ctx.drawImage(temp, 0, 0);
    q("#statusSize").textContent = `${canvas.width} × ${canvas.height} px`;
  };

  host.querySelectorAll(".paint-menu-item").forEach((item) => {
    item.onclick = (e) => {
      e.stopPropagation();
      const wasOpen = item.classList.contains("open");
      host
        .querySelectorAll(".paint-menu-item")
        .forEach((m) => m.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    };
  });
  host.querySelectorAll(".paint-dropdown button").forEach((b) => {
    b.addEventListener("click", () => {
      host
        .querySelectorAll(".paint-menu-item")
        .forEach((m) => m.classList.remove("open"));
    });
  });

  // 8.5. Arka Plan Kaldırma (RemBg)
  const rembgModal = q("#rembgModal");
  const rembgTolerance = q("#rembgTolerance");
  const rembgFeather = q("#rembgFeather");
  const rembgTolVal = q("#rembgTolVal");
  const rembgFeatherVal = q("#rembgFeatherVal");

  q("[data-menu='rembg']").onclick = () => {
    rembgModal.hidden = false;
  };
  q("#rembgClose").onclick = () => {
    rembgModal.hidden = true;
  };
  q("#btnCancelRembg").onclick = () => {
    rembgModal.hidden = true;
  };
  rembgTolerance.oninput = () => {
    rembgTolVal.textContent = rembgTolerance.value;
  };
  rembgFeather.oninput = () => {
    rembgFeatherVal.textContent = `${rembgFeather.value} px`;
  };
  q("#btnApplyRembg").onclick = () => {
    saveSnapshot();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    removeColorBackground(imgData, {
      tolerance: Number(rembgTolerance.value),
      feather: Number(rembgFeather.value),
    });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);
    stage.classList.add("transparent-grid");
    rembgModal.hidden = true;
    updateCalculatedSize();
    notify(t("rembg_done") || "✓ Arka plan kaldırıldı.");
  };

  // 9. Save As / Farklı Kaydet Modalı & Kopya Kaydet
  const saveModal = q("#saveModal");
  const saveFilename = q("#saveFilename");
  const saveFormat = q("#saveFormat");
  const saveQuality = q("#saveQuality");
  const saveQualityVal = q("#saveQualityVal");
  const qualityRow = q("#qualityRow");
  const saveCalculatedSize = q("#saveCalculatedSize");
  const statusFileSize = q("#statusFileSize");

  async function updateCalculatedSize() {
    try {
      const format = saveFormat.value;
      const mime =
        format === "png"
          ? "image/png"
          : format === "jpeg"
            ? "image/jpeg"
            : "image/webp";
      const quality = Number(saveQuality.value) / 100;
      const blob = await new Promise((res) =>
        canvas.toBlob(res, mime, quality),
      );
      if (!blob) return;
      const kb =
        blob.size < 1048576
          ? `${(blob.size / 1024).toFixed(1)} KB`
          : `${(blob.size / 1048576).toFixed(2)} MB`;
      if (saveCalculatedSize) saveCalculatedSize.textContent = kb;
      if (statusFileSize) statusFileSize.textContent = `💾 ~ ${kb}`;
      return { blob, kb };
    } catch {
      if (saveCalculatedSize) saveCalculatedSize.textContent = "—";
    }
  }

  function openSaveDialog() {
    const baseName = (
      entry?.name || (mode === "collage" ? "kolaj" : "resim")
    ).replace(/\.[^.]+$/, "");
    const suffix = mode === "collage" ? "-kolaj" : "-duzenlendi";
    saveFilename.value = `${baseName}${suffix}`;
    qualityRow.hidden = saveFormat.value === "png";
    saveModal.hidden = false;
    updateCalculatedSize();
    saveFilename.focus();
    saveFilename.select();
  }

  saveFormat.onchange = () => {
    qualityRow.hidden = saveFormat.value === "png";
    updateCalculatedSize();
  };

  saveQuality.oninput = () => {
    saveQualityVal.textContent = `${saveQuality.value}%`;
    updateCalculatedSize();
  };

  q("#modalClose").onclick = () => {
    saveModal.hidden = true;
  };
  q("#btnCancelSave").onclick = () => {
    saveModal.hidden = true;
  };

  async function performSave() {
    try {
      const format = saveFormat.value;
      const ext = format === "jpeg" ? "jpg" : format;
      const mime =
        format === "png"
          ? "image/png"
          : format === "jpeg"
            ? "image/jpeg"
            : "image/webp";
      const quality = Number(saveQuality.value) / 100;
      const blob = await new Promise((res) =>
        canvas.toBlob(res, mime, quality),
      );
      if (!blob) throw new Error("Görsel oluşturulamadı");

      let stem = saveFilename.value.trim().replace(/\.[^.]+$/, "");
      if (!stem) stem = mode === "collage" ? "kolaj" : "resim-duzenlendi";
      const outName = `${stem}.${ext}`;
      const kb =
        blob.size < 1048576
          ? `${(blob.size / 1024).toFixed(1)} KB`
          : `${(blob.size / 1048576).toFixed(2)} MB`;

      saveModal.hidden = true;

      if (window.convertorDesktop?.saveBlob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await window.convertorDesktop.saveBlob(bytes, outName);
        if (services.showBalloon) {
          services.showBalloon({
            title: t("balloon_done_title") || "İşlem tamamlandı",
            message: `✓ ${outName} (${kb}) masaüstüne kaydedildi.`,
          });
        }
        notify(`✓ ${outName} (${kb}) masaüstüne kaydedildi.`);
      } else if (save) {
        await save(blob, outName, canvas.width, canvas.height);
        notify(`✓ ${outName} (${kb}) indirildi.`);
      }
    } catch (e) {
      notify(e.message || "Kaydetme hatası");
    }
  }

  q("#btnConfirmSave").onclick = performSave;
  q("#btnQuickSave").onclick = openSaveDialog;
  q("[data-menu='save']").onclick = openSaveDialog;
  setTimeout(updateCalculatedSize, 350);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  window.addEventListener("keydown", (ev) => {
    if (disposed) return;
    if (ev.ctrlKey && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      q("[data-menu='undo']").click();
    } else if (ev.ctrlKey && ev.key.toLowerCase() === "y") {
      ev.preventDefault();
      q("[data-menu='redo']").click();
    } else if (ev.ctrlKey && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      performSave();
    }
  });

  return () => {
    disposed = true;
  };
}
