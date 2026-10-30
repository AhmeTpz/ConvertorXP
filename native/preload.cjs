const { contextBridge, ipcRenderer, webUtils } = require("electron");
const invoke = (name, ...args) => ipcRenderer.invoke("cxp:" + name, ...args);
contextBridge.exposeInMainWorld("convertorDesktop", {
  state: () => invoke("state"),
  selectFiles: () => invoke("select", false),
  selectFolder: () => invoke("select", true),
  dropFiles: (files) =>
    invoke(
      "drop",
      Array.from(files)
        .map((file) => webUtils.getPathForFile(file))
        .filter(Boolean),
    ),
  startDrag: (ids) => ipcRenderer.send("cxp:startDrag", ids),
  saveWorkspace: (entries, ui) => invoke("workspace", entries, ui),
  remove: (ids) => invoke("remove", ids),
  duplicate: (ids) => invoke("duplicate", ids),
  saveBlob: (bytes, name) => invoke("blob", bytes, name),
  saveAs: (id) => invoke("saveAs", id),
  reveal: (id) => invoke("reveal", id),
  submit: (request) => invoke("submit", request),
  previewDocument: (id) => invoke("previewDocument", id),
  pdfSources: (ids) => invoke("pdfSources", ids),
  cancel: (id) => invoke("cancel", id),
  retry: (id) => invoke("retry", id),
  installPackage: (id) => invoke("install", id, false),
  importPackage: (id) => invoke("install", id, true),
  readText: (id, encoding) => invoke("readText", id, encoding),
  onChange: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("cxp:change", listener);
    return () => ipcRenderer.removeListener("cxp:change", listener);
  },
});
