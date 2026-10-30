import http from "node:http";
import { readFile } from "node:fs/promises";
const files = {
  "/": "index.html",
  "/index.html": "index.html",
  "/app.js": "app.js",
  "/style.css": "style.css",
  "/logo.png": "logo.png",
  "/background.jpeg": "background.jpeg",
  "/desktop.js": "desktop.js",
  "/windows.js": "windows.js",
  "/viewers.js": "viewers.js",
  "/editor.js": "editor.js",
  "/image-engine.js": "image-engine.js",
  "/file-utils.js": "file-utils.js",
  "/native-ui.js": "native-ui.js",
  "/shared/catalog.js": "shared/catalog.js",
  "/shared/pdf-layout.js": "shared/pdf-layout.js",
  "/conversion-ui.js": "conversion-ui.js",
};
http
  .createServer(async (req, res) => {
    const path = files[new URL(req.url, "http://localhost").pathname];
    if (!path) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const data = await readFile(new URL(path, import.meta.url));
      res.setHeader(
        "Content-Type",
        path.endsWith(".jpeg")
          ? "image/jpeg"
          : path.endsWith(".png")
            ? "image/png"
            : path.endsWith(".js")
              ? "text/javascript; charset=utf-8"
              : path.endsWith(".css")
                ? "text/css; charset=utf-8"
                : "text/html; charset=utf-8",
      );
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end();
    }
  })
  .listen(4173, "0.0.0.0", () => console.log("Local: http://localhost:4173"));
