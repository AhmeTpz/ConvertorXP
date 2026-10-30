import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
export function inside(root, p) {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  return (
    rel === "" ||
    (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel))
  );
}
export function safeName(name) {
  return (
    path
      .basename(String(name))
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/[. ]+$/, "")
      .slice(0, 180) || "dosya"
  );
}
export async function atomicJSON(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + "." + randomUUID() + ".tmp";
  await fs.writeFile(temp, JSON.stringify(data, null, 2));
  await fs.rename(temp, file);
}
export async function uniqueCopy(source, folder, name) {
  await fs.mkdir(folder, { recursive: true });
  const base = path.parse(safeName(name));
  for (let i = 0; i < 100000; i++) {
    const dest = path.join(folder, base.name + (i ? ` (${i})` : "") + base.ext);
    try {
      await fs.copyFile(source, dest, 1);
      return dest;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
  }
  throw Error("Çıktı adı oluşturulamadı.");
}
export function run(
  exe,
  args,
  {
    cwd,
    signal,
    env,
    onProgress,
    timeout = 15 * 60 * 1000,
    maxOutput = 8 * 1024 * 1024,
  } = {},
) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Error("İptal edildi."));
    const child = spawn(exe, args.map(String), {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let out = "",
      err = "",
      finished = false,
      aborted = false;
    const kill = () => {
      aborted = true;
      if (child.pid && process.platform === "win32")
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else child.kill("SIGKILL");
    };
    const timer = setTimeout(kill, timeout);
    signal?.addEventListener("abort", kill, { once: true });
    const collect = (chunk, kind) => {
      const text = chunk.toString();
      if (kind === "out") out += text;
      else err += text;
      if (out.length + err.length > maxOutput) {
        kill();
        return;
      }
      onProgress?.(text);
    };
    child.stdout.on("data", (c) => collect(c, "out"));
    child.stderr.on("data", (c) => collect(c, "err"));
    const done = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", kill);
      error ? reject(error) : resolve({ stdout: out, stderr: err });
    };
    child.on("error", done);
    child.on("close", (code) =>
      done(
        aborted
          ? Error("İşlem iptal edildi veya süre/kaynak sınırına ulaştı.")
          : code !== 0
            ? Error((err || out || `Motor hata kodu: ${code}`).slice(-3000))
            : null,
      ),
    );
  });
}
export async function findFile(root, name) {
  for (const e of await fs.readdir(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return p;
    if (e.isDirectory()) {
      const found = await findFile(p, name);
      if (found) return found;
    }
  }
  return null;
}
export function pageList(value, count) {
  if (!value?.trim()) return Array.from({ length: count }, (_, i) => i);
  const list = [];
  for (const part of value.split(",")) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw Error("Sayfa aralığı geçersiz.");
    let a = Number(m[1]),
      b = Number(m[2] || a);
    if (a < 1 || b < 1 || a > count || b > count)
      throw Error("Sayfa numarası belge dışında.");
    for (let i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1)
      list.push(i - 1);
    if (list.length > 10000) throw Error("Çok fazla sayfa.");
  }
  return list;
}

export function headerAnimation(bytes) {
  if (bytes.length >= 8 && bytes.subarray(1, 4).toString() === "PNG") {
    for (let p = 8; p + 8 <= bytes.length;) {
      const len = bytes.readUInt32BE(p);
      const type = bytes.subarray(p + 4, p + 8).toString();
      if (type === "acTL") return true;
      if (type === "IDAT") break;
      p += 12 + len;
    }
  }
  if (bytes.subarray(8, 12).toString() === "WEBP") {
    for (let p = 12; p + 8 <= bytes.length;) {
      const len = bytes.readUInt32LE(p + 4);
      if (bytes.subarray(p, p + 4).toString() === "ANIM") return true;
      p += 8 + len + (len % 2);
    }
  }
  if (
    bytes.subarray(4, 8).toString() === "ftyp" &&
    bytes.subarray(8, 64).includes(Buffer.from("avis"))
  )
    return true;
  return false;
}
