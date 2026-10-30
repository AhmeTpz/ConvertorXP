export const GRID_W = 90,
  GRID_H = 96;
export function createDesktop({
  root,
  desktop,
  entries,
  selected,
  onOpen,
  onRename,
  onMenu,
  onChange,
  onHideMenus,
  notify,
}) {
  let gesture = null,
    lastTap = null;
  const cols = () => Math.max(1, Math.floor(root.clientWidth / GRID_W));
  function layout() {
    const used = new Set();
    const count = cols();
    for (const e of entries) {
      if (e.cell && e.cell.x < count && !used.has(`${e.cell.x},${e.cell.y}`))
        used.add(`${e.cell.x},${e.cell.y}`);
      else e.cell = null;
    }
    for (const e of entries) {
      if (!e.cell) {
        let i = 0;
        while (used.has(`${i % count},${Math.floor(i / count)}`)) i++;
        e.cell = { x: i % count, y: Math.floor(i / count) };
        used.add(`${e.cell.x},${e.cell.y}`);
      }
      const el = root.querySelector(`[data-id="${e.id}"]`);
      if (el) {
        el.style.left = e.cell.x * GRID_W + "px";
        el.style.top = e.cell.y * GRID_H + "px";
      }
    }
    root.style.minHeight =
      Math.max(420, ...entries.map((e) => (e.cell.y + 1) * GRID_H)) + "px";
  }
  function sync() {
    for (const el of root.children) {
      const active = selected.has(el.dataset.id);
      el.classList.toggle("selected", active);
      el.setAttribute("aria-selected", String(active));
    }
    onChange();
  }
  function draw() {
    const ids = new Set(entries.map((e) => e.id));
    for (const el of [...root.children])
      if (!ids.has(el.dataset.id)) el.remove();
    for (const e of entries) {
      const existing = root.querySelector(`[data-id="${e.id}"]`);
      if (existing) {
        existing.title = e.name;
        existing.setAttribute("aria-label", e.name);
        existing.querySelector(".file-name").textContent = e.name;
        continue;
      }
      const el = document.createElement("div");
      el.className = "file";
      el.dataset.id = e.id;
      el.tabIndex = 0;
      el.setAttribute("role", "option");
      el.setAttribute("aria-label", e.name);
      el.title = e.name;
      const icon = document.createElement("span");
      if (e.image || e.previewImage) {
        icon.className = "picture-frame";
        const img = new Image();
        img.src = e.previewURL || e.url;
        img.alt = "";
        img.className = "thumb";
        img.draggable = false;
        icon.append(img);
      } else {
        icon.className = "generic";
        icon.textContent = (e.name.split(".").pop() || "FILE")
          .slice(0, 5)
          .toUpperCase();
      }
      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = e.name;
      el.append(icon, name);
      if (e.output) {
        const badge = document.createElement("span");
        badge.className = "output-badge";
        badge.textContent = "Yeni";
        el.append(badge);
      }
      root.append(el);
    }
    layout();
    sync();
  }
  root.setAttribute("role", "listbox");
  root.setAttribute("aria-multiselectable", "true");
  desktop.addEventListener("pointerdown", (ev) => {
    if (
      ev.button !== 0 ||
      ev.target.closest(
        "button,input,dialog,.desktop-guide,.welcome,.desktop-header",
      )
    )
      return;
    const file = ev.target.closest(".file");
    if (!file && ev.pointerType === "touch") return;
    onHideMenus();
    if (file) {
      const id = file.dataset.id,
        wasSelected = selected.has(id);
      if (ev.ctrlKey || ev.metaKey) {
        wasSelected ? selected.delete(id) : selected.add(id);
      } else if (!wasSelected) {
        selected.clear();
        selected.add(id);
      }
      sync();
      file.focus({ preventScroll: true });
      gesture = {
        kind: "move",
        id,
        wasSelected,
        onLabel: !!ev.target.closest(".file-name"),
        startX: ev.clientX,
        startY: ev.clientY,
        ids: new Set(selected),
        positions: entries
          .filter((e) => selected.has(e.id))
          .map((e) => ({ id: e.id, ...e.cell })),
        moved: false,
        modifier: ev.ctrlKey || ev.metaKey,
      };
    } else {
      gesture = {
        kind: "select",
        startX: ev.clientX,
        startY: ev.clientY,
        base: ev.ctrlKey || ev.metaKey ? new Set(selected) : new Set(),
        moved: false,
      };
      selected.clear();
      gesture.base.forEach((id) => selected.add(id));
      sync();
    }
    desktop.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  desktop.addEventListener("pointermove", (ev) => {
    if (!gesture) return;
    const g = gesture,
      dx = ev.clientX - g.startX,
      dy = ev.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    g.moved = true;
    lastTap = null;
    if (g.kind === "move") {
      for (const p of g.positions) {
        const el = root.querySelector(`[data-id="${p.id}"]`);
        el.style.transform = `translate(${dx}px,${dy}px)`;
        el.classList.add("moving");
      }
    } else {
      const left = Math.min(ev.clientX, g.startX),
        top = Math.min(ev.clientY, g.startY),
        right = Math.max(ev.clientX, g.startX),
        bottom = Math.max(ev.clientY, g.startY);
      selected.clear();
      g.base.forEach((id) => selected.add(id));
      for (const el of root.children) {
        const r = el.getBoundingClientRect();
        if (
          r.right > left &&
          r.left < right &&
          r.bottom > top &&
          r.top < bottom
        )
          selected.add(el.dataset.id);
      }
      sync();
      let box = desktop.querySelector(".selection-box");
      if (!box) {
        box = document.createElement("div");
        box.className = "selection-box";
        desktop.append(box);
      }
      const r = desktop.getBoundingClientRect();
      Object.assign(box.style, {
        left: left - r.left + "px",
        top: top - r.top + "px",
        width: right - left + "px",
        height: bottom - top + "px",
      });
    }
  });
  function finish(ev, cancel = false) {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    desktop.querySelector(".selection-box")?.remove();
    if (g.kind === "move" && g.moved && !cancel && g.positions.length) {
      let dx = Math.round((ev.clientX - g.startX) / GRID_W),
        dy = Math.round((ev.clientY - g.startY) / GRID_H);
      dx = Math.max(
        -Math.min(...g.positions.map((p) => p.x)),
        Math.min(dx, cols() - 1 - Math.max(...g.positions.map((p) => p.x))),
      );
      dy = Math.max(
        -Math.min(...g.positions.map((p) => p.y)),
        Math.min(dy, 100),
      );
      const occupied = new Set(
        entries
          .filter((e) => !g.ids.has(e.id))
          .map((e) => `${e.cell.x},${e.cell.y}`),
      );
      if (g.positions.some((p) => occupied.has(`${p.x + dx},${p.y + dy}`)))
        notify("Bu konum dolu. Dosyaları boş bir alana bırak.");
      else
        for (const p of g.positions)
          entries.find((e) => e.id === p.id).cell = {
            x: p.x + dx,
            y: p.y + dy,
          };
    }
    for (const el of root.children) {
      el.style.transform = "";
      el.classList.remove("moving");
    }
    layout();
    sync();
    if (!cancel && g.kind === "move" && !g.moved && !g.modifier) {
      if (ev.pointerType === "touch") {
        onMenu(ev.clientX, ev.clientY);
        return;
      }
      const now = performance.now();
      if (lastTap?.id === g.id && now - lastTap.time < 450) {
        lastTap = null;
        onOpen([g.id]);
      } else if (
        lastTap?.id === g.id &&
        g.wasSelected &&
        g.onLabel &&
        now - lastTap.time >= 500 &&
        now - lastTap.time <= 2000
      ) {
        lastTap = null;
        onRename(g.id);
      } else {
        lastTap = { id: g.id, time: now };
      }
    }
  }
  desktop.addEventListener("pointerup", (ev) => finish(ev));
  desktop.addEventListener("pointercancel", (ev) => finish(ev, true));
  desktop.addEventListener("lostpointercapture", (ev) => {
    if (gesture) finish(ev, true);
  });
  desktop.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    const file = ev.target.closest(".file");
    if (file) {
      if (!selected.has(file.dataset.id)) {
        selected.clear();
        selected.add(file.dataset.id);
      }
    } else selected.clear();
    sync();
    onMenu(ev.clientX, ev.clientY);
  });
  root.addEventListener("keydown", (ev) => {
    const file = ev.target.closest(".file");
    if (!file) return;
    if (ev.key === "F2") {
      ev.preventDefault();
      if (selected.size <= 1) onRename(file.dataset.id);
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      onOpen(selected.has(file.dataset.id) ? [...selected] : [file.dataset.id]);
    } else if (ev.key === " ") {
      ev.preventDefault();
      selected.has(file.dataset.id)
        ? selected.delete(file.dataset.id)
        : selected.add(file.dataset.id);
      sync();
    } else if (ev.key === "ContextMenu" || (ev.shiftKey && ev.key === "F10")) {
      ev.preventDefault();
      selected.add(file.dataset.id);
      sync();
      const r = file.getBoundingClientRect();
      onMenu(r.left, r.bottom);
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a") {
      ev.preventDefault();
      entries.forEach((e) => selected.add(e.id));
      sync();
    }
  });
  window.addEventListener("resize", layout);
  return { render: draw, sync, layout };
}
