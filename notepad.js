// ConvertorXP - Windows XP Notepad Component (v0.10.0)
// Authentic Windows XP Notepad interface for text viewing, editing, OCR inspection, and saving.

import { t } from "./i18n.js";

/**
 * Mounts an authentic Windows XP Notepad editor inside a window container.
 *
 * @param {HTMLElement} host - Window content container
 * @param {Object} entry - File or pseudo-file descriptor
 * @param {Object} services - System services { save, notify, showBalloon }
 * @param {string} [initialText=""] - Text content to populate
 */
export async function mountNotepad(host, entry, services = {}, initialText = "") {
  let contentText = initialText;
  if (!contentText && entry.file?.text) {
    try {
      contentText = await entry.file.text();
    } catch {}
  }

  const fileName = entry.name || "Adsız.txt";

  host.innerHTML = `
    <div class="xp-notepad">
      <div class="notepad-menubar" role="menubar">
        <div class="notepad-menu-item">
          <button type="button" class="notepad-menu-btn">${t("notepad_file") || "Dosya"}</button>
          <div class="notepad-dropdown">
            <button type="button" data-act="save">${t("notepad_save") || "Kaydet"}</button>
            <button type="button" data-act="save-as">${t("notepad_save_as") || "Farklı Kaydet..."}</button>
            <hr>
            <button type="button" data-act="close">${t("btn_cancel_job") || "Kapat"}</button>
          </div>
        </div>
        <div class="notepad-menu-item">
          <button type="button" class="notepad-menu-btn">${t("notepad_edit") || "Düzen"}</button>
          <div class="notepad-dropdown">
            <button type="button" data-act="copy">${t("notepad_copy") || "Kopyala"}</button>
            <button type="button" data-act="select-all">${t("notepad_select_all") || "Tümünü Seç"}</button>
          </div>
        </div>
        <div class="notepad-menu-item">
          <button type="button" class="notepad-menu-btn">${t("notepad_format") || "Biçim"}</button>
          <div class="notepad-dropdown">
            <button type="button" data-act="toggle-wrap">✓ Sözcük Kaydır</button>
            <button type="button" data-act="toggle-font">Yazı Tipi (Monospace / Tahoma)</button>
          </div>
        </div>
      </div>
      <div class="notepad-editor-wrap">
        <textarea class="notepad-textarea" spellcheck="false"></textarea>
      </div>
      <footer class="notepad-statusbar">
        <div class="notepad-status-col status-pos" id="npPos">Satır 1, Sütun 1</div>
        <div class="notepad-status-col status-len" id="npLen">0 karakter</div>
        <div class="notepad-status-col status-enc">UTF-8</div>
        <div class="notepad-status-col status-os">Windows (CRLF)</div>
      </footer>
    </div>
  `;

  const q = (sel) => host.querySelector(sel);
  const textarea = q(".notepad-textarea");
  const npPos = q("#npPos");
  const npLen = q("#npLen");

  textarea.value = contentText || "";

  // Menu toggles
  host.querySelectorAll(".notepad-menu-item").forEach((item) => {
    item.onclick = (e) => {
      e.stopPropagation();
      const wasOpen = item.classList.contains("open");
      host.querySelectorAll(".notepad-menu-item").forEach((m) => m.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    };
  });
  document.addEventListener("click", () => {
    host.querySelectorAll(".notepad-menu-item").forEach((m) => m.classList.remove("open"));
  });

  // Calculate cursor line & col
  function updateCursor() {
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const textBefore = val.slice(0, pos);
    const lines = textBefore.split("\n");
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;
    npPos.textContent = t("notepad_status_pos", { line: lineNum, col: colNum }) || `Satır ${lineNum}, Sütun ${colNum}`;
    npLen.textContent = t("notepad_status_len", { count: val.length }) || `${val.length} karakter`;
  }

  textarea.oninput = updateCursor;
  textarea.onkeyup = updateCursor;
  textarea.onclick = updateCursor;
  updateCursor();

  // Save action
  async function doSave(asCopy = false) {
    const saveName = asCopy || !fileName.endsWith(".txt")
      ? fileName.replace(/\.[^.]+$/, "") + "-duzenlendi.txt"
      : fileName;
    const textBlob = new Blob([textarea.value], { type: "text/plain;charset=utf-8" });

    if (services.save) {
      await services.save(textBlob, saveName);
    } else if (window.convertorDesktop?.saveBlob) {
      const bytes = new TextEncoder().encode(textarea.value);
      await window.convertorDesktop.saveBlob(bytes, saveName);
    }

    if (services.showBalloon) {
      services.showBalloon({
        title: t("balloon_done_title") || "İşlem tamamlandı",
        message: `✓ ${saveName} masaüstüne kaydedildi.`,
      });
    }
    services.notify?.(`✓ ${saveName} kaydedildi.`);
  }

  q("[data-act='save']").onclick = () => doSave(false);
  q("[data-act='save-as']").onclick = () => doSave(true);
  q("[data-act='close']").onclick = () => {
    const win = host.closest(".xp-window");
    if (win) win.querySelector(".window-close")?.click();
  };

  q("[data-act='copy']").onclick = () => {
    const sel = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) || textarea.value;
    navigator.clipboard?.writeText(sel);
    services.notify?.("Metin panoya kopyalandı.");
  };

  q("[data-act='select-all']").onclick = () => {
    textarea.focus();
    textarea.select();
  };

  let wordWrap = true;
  q("[data-act='toggle-wrap']").onclick = (e) => {
    wordWrap = !wordWrap;
    textarea.style.whiteSpace = wordWrap ? "pre-wrap" : "pre";
    e.target.textContent = (wordWrap ? "✓ " : "") + "Sözcük Kaydır";
  };

  let monoFont = true;
  q("[data-act='toggle-font']").onclick = () => {
    monoFont = !monoFont;
    textarea.style.fontFamily = monoFont
      ? 'Lucida Console, "Courier New", monospace'
      : "Tahoma, sans-serif";
  };
}
