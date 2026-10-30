import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  dialog,
  shell,
  session,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { Workspace } from "./workspace.mjs";
import { Packages } from "./packages.mjs";
import { Queue } from "./queue.mjs";
import { inside, uniqueCopy, run } from "./util.mjs";
import { operations } from "../shared/catalog.js";
import iconv from "iconv-lite";
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resources = app.isPackaged
  ? path.join(process.resourcesPath, "resources")
  : path.join(base, "resources");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "cxp",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);
app.setName("ConvertorXP");
app.commandLine.appendSwitch("force-renderer-accessibility");
if (process.env.CXP_TEST_HOME)
  app.setPath("userData", process.env.CXP_TEST_HOME);
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
let win, store, packs, queue;
const notify = () => win?.webContents.send("cxp:change");
const csp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' cxp://asset cxp://preview blob: data:; media-src 'self' cxp://asset blob:; connect-src 'self' cxp://asset cxp://preview blob:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'";
async function serve(request) {
  try {
    const url = new URL(request.url);
    let file;
    if (url.host === "app" && url.pathname.startsWith("/document-preview/")) {
      const cached = queue.previews.get(url.pathname.split("/")[2]);
      const source = cached && store.entries.get(cached.sourceId);
      if (!source) return new Response("", { status: 404 });
      const st = await fs.stat(source.path);
      if (st.size !== source.size || st.mtimeMs !== source.mtime)
        return new Response("Kaynak değişmiş", { status: 409 });
      file = cached.path;
    } else if (
      url.host === "app" &&
      !/^\/(asset|preview)\//.test(url.pathname)
    ) {
      const name =
        decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
      const root = path.join(base, "dist");
      file = path.join(root, name);
      if (!inside(root, file)) return new Response("", { status: 403 });
    } else if (
      url.host === "app" &&
      /^\/(asset|preview)\//.test(url.pathname)
    ) {
      const entry = store.entries.get(url.pathname.split("/")[2]);
      if (!entry || entry.missing)
        return new Response("Dosya yok", { status: 404 });
      file = url.pathname.startsWith("/preview/") ? entry.preview : entry.path;
      if (!file) return new Response("", { status: 404 });
    } else return new Response("", { status: 403 });
    const stat = await fs.stat(file);
    const ext = path.extname(file);
    const mime = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".avif": "image/avif",
      ".bmp": "image/bmp",
      ".ico": "image/x-icon",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".wasm": "application/wasm",
    };
    const headers = {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    let start = 0,
      end = stat.size - 1,
      status = 200;
    const range = request.headers.get("range");
    if (range) {
      const m = range.match(/^bytes=(\d+)-(\d*)$/);
      if (!m) return new Response("", { status: 416 });
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), end) : end;
      if (start > end) return new Response("", { status: 416 });
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers["Content-Length"] = String(Math.max(0, end - start + 1));
    if (stat.size === 0) return new Response("", { headers });
    return new Response(
      Readable.toWeb(createReadStream(file, { start, end })),
      { status, headers },
    );
  } catch {
    return new Response("Dosya okunamadı", { status: 404 });
  }
}
function trusted(event) {
  return (
    event.sender === win.webContents &&
    event.senderFrame === win.webContents.mainFrame &&
    event.senderFrame.url === "cxp://app/index.html"
  );
}
function handler(name, fn) {
  ipcMain.handle("cxp:" + name, async (event, ...args) => {
    if (!trusted(event)) throw Error("Yetkisiz çağrı.");
    return fn(...args);
  });
}
app
  .whenReady()
  .then(async () => {
    if (single) {
      packs = new Packages({
        root: path.join(app.getPath("userData"), "packages"),
        resources,
      });
      await packs.init();
      store = new Workspace(app.getPath("userData"), resources, packs);
      await store.init();
      queue = new Queue(store, packs, resources, notify);
      await queue.init();
      protocol.handle("cxp", serve);
      session.defaultSession.setPermissionRequestHandler(
        (_web, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      handler("state", async () => ({
        entries: [...store.entries.values()].map((e) => store.public(e)),
        ui: store.ui,
        jobs: queue.jobs.map((j) => ({ ...j, options: undefined })),
        packages: await packs.list(),
        capabilities: await packs.capabilities(),
        warning: store.warning,
      }));
      handler("select", async (folder) => {
        const result = await dialog.showOpenDialog(win, {
          properties: folder
            ? ["openDirectory"]
            : ["openFile", "multiSelections"],
        });
        if (result.canceled) return [];
        return store.importPaths(result.filePaths);
      });
      handler("drop", async (paths) => {
        if (
          !Array.isArray(paths) ||
          paths.length > 2000 ||
          paths.some((p) => typeof p !== "string" || !path.isAbsolute(p))
        )
          throw Error("Geçersiz dosya listesi.");
        return store.importPaths(paths);
      });
      handler("workspace", async (entries, ui) => {
        if (
          !Array.isArray(entries) ||
          JSON.stringify({ entries, ui }).length > 5 * 1024 ** 2
        )
          throw Error("Çalışma alanı çok büyük.");
        await store.update(entries, ui);
      });
      handler("remove", async (ids) => {
        for (const id of ids) {
          const e = store.entries.get(id);
          if (!e) continue;
          store.entries.delete(id);
          if (e.preview) await fs.rm(e.preview, { force: true });
        }
        await store.persist();
      });
      handler("duplicate", async (ids) => {
        const result = [];
        for (const id of ids) {
          const e = store.entries.get(id);
          if (!e) continue;
          const p = await uniqueCopy(
            e.path,
            path.join(store.root, "outputs"),
            path.parse(e.name).name + " - Kopya" + path.extname(e.name),
          );
          result.push(await store.add(p, { output: true }));
        }
        return result;
      });
      handler("blob", async (bytes, name) => store.importBlob(bytes, name));
      handler("saveAs", async (id) => {
        const e = store.entries.get(id);
        if (!e) throw Error("Dosya yok.");
        const result = await dialog.showSaveDialog(win, {
          defaultPath: e.name,
        });
        if (!result.canceled) {
          const dest = result.filePath;
          if (
            path.resolve(dest).toLowerCase() ===
            path.resolve(e.path).toLowerCase()
          )
            throw Error("Kaynak dosyanın üzerine yazılamaz.");
          return uniqueCopy(e.path, path.dirname(dest), path.basename(dest));
        }
      });
      handler("reveal", (id) => {
        const e = store.entries.get(id);
        if (e) shell.showItemInFolder(e.path);
      });
      handler("submit", (request) => queue.submit(request));
      handler("previewDocument", (id) => queue.preview(id));
      handler("pdfSources", (ids) => store.pdfSources(ids));
      handler("cancel", (id) => queue.cancel(id));
      handler("retry", (id) => queue.retry(id));
      handler("install", async (id, local) => {
        let file;
        if (local) {
          const result = await dialog.showOpenDialog(win, {
            title: "Doğrulanacak motor paketini seç",
            properties: ["openFile"],
          });
          if (result.canceled) return;
          file = result.filePaths[0];
        }
        const pending = packs.install(id, file, () => notify());
        notify();
        try {
          await pending;
        } finally {
          notify();
        }
      });
      handler("readText", async (id, encoding = "utf8") => {
        const e = store.entries.get(id);
        if (!e || e.size > 20 * 1024 ** 2)
          throw Error("Metin önizlemesi en fazla 20 MB olabilir.");
        if (!["utf8", "utf16le", "windows1254"].includes(encoding))
          throw Error("Kodlama geçersiz.");
        return iconv.decode(await fs.readFile(e.path), encoding);
      });
      ipcMain.on("cxp:startDrag", async (event, ids) => {
        if (
          !trusted(event) ||
          !Array.isArray(ids) ||
          !ids.length ||
          ids.length > 200
        )
          return;
        const targetEntries = ids
          .map((id) => store.entries.get(id))
          .filter((e) => e && !e.missing);
        if (!targetEntries.length) return;
        const dragDir = path.join(app.getPath("userData"), "drag-staging");
        await fs.mkdir(dragDir, { recursive: true });
        const dragFiles = [];
        for (const e of targetEntries) {
          const staged = path.join(dragDir, e.name);
          await fs.rm(staged, { force: true });
          try {
            await fs.link(e.path, staged);
          } catch {
            await fs.copyFile(e.path, staged);
          }
          dragFiles.push(staged);
        }
        let icon;
        try {
          icon = await app.getFileIcon(dragFiles[0]);
        } catch {
          icon = path.join(resources, "icon.ico");
        }
        event.sender.startDrag({
          file: dragFiles[0],
          files: dragFiles,
          icon,
        });
      });
      win = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 700,
        minHeight: 500,
        title: "ConvertorXP",
        backgroundColor: "#245edb",
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(base, "native/preload.cjs"),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });
      win.webContents.on("console-message", (event) =>
        console.log("renderer", event.message),
      );
      win.webContents.on("render-process-gone", (_event, details) =>
        console.error("renderer gone", details),
      );
      win.webContents.on("did-fail-load", (_e, code, description) =>
        console.error("load failed", code, description),
      );
      win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      win.webContents.on("will-navigate", (event, url) => {
        if (url !== "cxp://app/index.html") event.preventDefault();
      });
      win.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      win.on("close", (event) => {
        if (queue.current) {
          event.preventDefault();
          dialog
            .showMessageBox(win, {
              type: "question",
              message: "Devam eden işlem var. İptal edip kapatılsın mı?",
              buttons: ["Çalışmaya devam et", "İptal et ve kapat"],
              defaultId: 0,
              cancelId: 0,
            })
            .then(async (result) => {
              if (result.response === 1) {
                await queue.cancel(queue.current.id);
                const interval = setInterval(() => {
                  if (!queue.current) {
                    clearInterval(interval);
                    win.destroy();
                    app.quit();
                  }
                }, 100);
              }
            });
        }
      });
      await win.loadURL("cxp://app/index.html");
      app.on("second-instance", () => {
        win.restore();
        win.focus();
      });
    }
  })
  .catch((error) => {
    console.error(error);
    dialog.showErrorBox("ConvertorXP", error.message);
    app.quit();
  });
app.on("window-all-closed", () => app.quit());
