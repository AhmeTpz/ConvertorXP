export function createWindowManager(taskHost) {
  const records = new Map();
  let z = 100,
    active = null;
  const mobile = () => innerWidth <= 600;
  function constrain(r) {
    r.width = Math.min(Math.max(340, r.width), innerWidth - 12);
    r.height = Math.min(Math.max(240, r.height), innerHeight - 46);
    r.x = Math.max(0, Math.min(r.x, innerWidth - r.width));
    r.y = Math.max(0, Math.min(r.y, innerHeight - 34 - r.height));
  }
  function place(r) {
    if (!mobile()) constrain(r);
    const full = r.maximized || mobile();
    Object.assign(r.el.style, {
      left: (full ? 0 : r.x) + "px",
      top: (full ? 0 : r.y) + "px",
      width: (full ? innerWidth : r.width) + "px",
      height: (full ? innerHeight - 34 : r.height) + "px",
    });
    r.el.classList.toggle("maximized", full);
    r.maxButton.textContent = r.maximized ? "❐" : "□";
    r.maxButton.setAttribute(
      "aria-label",
      r.maximized ? "Önceki boyuta dön" : "Büyüt",
    );
  }
  function focus(r) {
    active = r.id;
    r.minimized = false;
    r.el.hidden = false;
    r.el.style.zIndex = ++z;
    for (const other of records.values()) {
      other.el.classList.toggle("active", other === r);
      other.task.classList.toggle("active", other === r);
      other.task.setAttribute("aria-pressed", String(other === r));
    }
    r.task.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function close(id) {
    const r = records.get(id);
    if (!r) return;
    r.closed = true;
    r.dispose?.();
    r.el.remove();
    r.task.remove();
    records.delete(id);
    if (active === id) {
      active = null;
      const remaining = [...records.values()].filter((r) => !r.minimized);
      if (remaining.length) focus(remaining.at(-1));
    }
  }
  function open(entry, initial = {}) {
    if (records.has(entry.id)) {
      const r = records.get(entry.id);
      focus(r);
      return { record: r, created: false };
    }
    const offset = (records.size % 7) * 25;
    const r = {
      id: entry.id,
      entry,
      x: 55 + offset,
      y: 65 + offset,
      width: initial.width || 670,
      height: initial.height || 490,
      maximized: false,
      minimized: false,
      dispose: null,
    };
    const el = document.createElement("section");
    r.el = el;
    el.className = "xp-window";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", entry.name);
    el.tabIndex = -1;
    const bar = document.createElement("div");
    bar.className = "xp-window-title";
    const title = document.createElement("span");
    title.textContent = entry.name;
    bar.append(title);
    const controls = document.createElement("div");
    controls.className = "xp-window-controls";
    const button = (text, label, action) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.setAttribute("aria-label", label);
      b.onclick = action;
      controls.append(b);
      return b;
    };
    button("—", "Küçült", () => {
      r.minimized = true;
      el.hidden = true;
      r.task.classList.remove("active");
      r.task.setAttribute("aria-pressed", "false");
      if (active === r.id) active = null;
    });
    r.maxButton = button("□", "Büyüt", () => {
      r.maximized = !r.maximized;
      place(r);
    });
    button("×", "Kapat", () => close(r.id)).className = "window-close";
    bar.append(controls);
    const content = document.createElement("div");
    content.className = "xp-window-content";
    el.append(bar, content);
    r.content = content;
    const task = document.createElement("button");
    task.className = "window-task";
    task.textContent = entry.name;
    task.title = entry.name;
    task.onclick = () => focus(r);
    r.task = task;
    taskHost.append(task);
    document.body.append(el);
    records.set(r.id, r);
    el.addEventListener("pointerdown", () => focus(r));
    el.addEventListener("contextmenu", (ev) => ev.stopPropagation());
    let drag = null;
    bar.addEventListener("pointerdown", (ev) => {
      if (
        ev.button !== 0 ||
        ev.target.closest("button") ||
        r.maximized ||
        mobile()
      )
        return;
      drag = { x: ev.clientX, y: ev.clientY, left: r.x, top: r.y };
      bar.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    bar.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      r.x = drag.left + ev.clientX - drag.x;
      r.y = drag.top + ev.clientY - drag.y;
      place(r);
    });
    const stop = () => (drag = null);
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
    bar.ondblclick = (ev) => {
      if (!ev.target.closest("button")) {
        r.maximized = !r.maximized;
        place(r);
      }
    };
    for (const edge of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      const handle = document.createElement("div");
      handle.className = "resize-handle " + edge;
      el.append(handle);
      let resize = null;
      handle.onpointerdown = (ev) => {
        if (ev.button !== 0 || mobile() || r.maximized) return;
        resize = {
          x: ev.clientX,
          y: ev.clientY,
          left: r.x,
          top: r.y,
          width: r.width,
          height: r.height,
        };
        handle.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      };
      handle.onpointermove = (ev) => {
        if (!resize) return;
        const dx = ev.clientX - resize.x,
          dy = ev.clientY - resize.y;
        if (edge.includes("e")) r.width = Math.max(340, resize.width + dx);
        if (edge.includes("s")) r.height = Math.max(240, resize.height + dy);
        if (edge.includes("w")) {
          r.width = Math.max(340, resize.width - dx);
          r.x = resize.left + resize.width - r.width;
        }
        if (edge.includes("n")) {
          r.height = Math.max(240, resize.height - dy);
          r.y = resize.top + resize.height - r.height;
        }
        place(r);
      };
      handle.onpointerup = handle.onpointercancel = () => (resize = null);
    }
    place(r);
    focus(r);
    return { record: r, created: true };
  }
  window.addEventListener("resize", () => records.forEach(place));
  function rename(id, name) {
    const r = records.get(id);
    if (!r) return;
    r.el.setAttribute("aria-label", name);
    r.el.querySelector(".xp-window-title>span").textContent = name;
    r.task.textContent = name;
    r.task.title = name;
    const heading = r.content.querySelector("h3");
    if (heading) heading.textContent = name;
    for (const a of r.content.querySelectorAll("a[download]"))
      a.download = name;
  }
  return { open, close, rename, records, layout: place };
}
