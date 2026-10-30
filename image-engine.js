export const MAX_PIXELS = 24000000;
export function checkSize(width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 16000 ||
    height > 16000 ||
    width * height > MAX_PIXELS
  )
    throw new Error("Çıktı en fazla 24 MP ve kenar başına 16000 px olabilir.");
  return { width, height };
}
export function dimensions(width, height, op) {
  if (op.kind === "crop") {
    const { x, y, w, h } = op;
    if (
      ![x, y, w, h].every(Number.isInteger) ||
      x < 0 ||
      y < 0 ||
      w < 1 ||
      h < 1 ||
      x + w > width ||
      y + h > height
    )
      throw new Error("Kırpma alanı görselin içinde olmalı.");
    return checkSize(w, h);
  }
  if (op.kind === "resize") return checkSize(op.w, op.h);
  if (op.kind === "rotate") return checkSize(height, width);
  return checkSize(width, height);
}
export function createCanvas(w, h) {
  checkSize(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export function applyOperation(source, op) {
  const { width, height } = dimensions(source.width, source.height, op);
  const c = createCanvas(width, height),
    ctx = c.getContext("2d");
  if (!ctx) throw new Error("Görsel işleme alanı oluşturulamadı.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  switch (op.kind) {
    case "crop":
      ctx.drawImage(source, op.x, op.y, op.w, op.h, 0, 0, width, height);
      break;
    case "resize":
      ctx.drawImage(source, 0, 0, width, height);
      break;
    case "rotate":
      if (op.direction === "left") {
        ctx.translate(0, height);
        ctx.rotate(-Math.PI / 2);
      } else {
        ctx.translate(width, 0);
        ctx.rotate(Math.PI / 2);
      }
      ctx.drawImage(source, 0, 0);
      break;
    case "flip":
      ctx.translate(
        op.axis === "horizontal" ? width : 0,
        op.axis === "vertical" ? height : 0,
      );
      ctx.scale(
        op.axis === "horizontal" ? -1 : 1,
        op.axis === "vertical" ? -1 : 1,
      );
      ctx.drawImage(source, 0, 0);
      break;
    case "color":
      ctx.filter = `brightness(${op.brightness}%) contrast(${op.contrast}%) saturate(${op.saturation}%) grayscale(${op.gray ? 100 : 0}%)`;
      ctx.drawImage(source, 0, 0);
      break;
    case "text":
      ctx.drawImage(source, 0, 0);
      ctx.globalAlpha = op.opacity;
      ctx.fillStyle = op.color;
      ctx.font = `${op.size}px Arial, sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(op.text, op.x, op.y);
      break;
    default:
      ctx.drawImage(source, 0, 0);
  }
  return c;
}
export async function renderHistory(bitmap, history) {
  let c = createCanvas(bitmap.width, bitmap.height);
  c.getContext("2d").drawImage(bitmap, 0, 0);
  try {
    for (const op of history) {
      const next =
        op.kind === "reset"
          ? createCanvas(bitmap.width, bitmap.height)
          : applyOperation(c, op);
      if (op.kind === "reset") next.getContext("2d").drawImage(bitmap, 0, 0);
      c.width = c.height = 1;
      c = next;
    }
    return c;
  } catch (err) {
    c.width = c.height = 1;
    throw err;
  }
}
export async function exportCanvas(source, format, quality, background) {
  const type = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" }[
    format
  ];
  if (!type) throw new Error("Desteklenmeyen çıktı formatı.");
  let c = source;
  if (format === "jpg") {
    c = createCanvas(source.width, source.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(source, 0, 0);
  }
  try {
    const blob = await new Promise((resolve) =>
      c.toBlob(resolve, type, quality),
    );
    if (!blob || blob.type !== type)
      throw new Error("Tarayıcı bu çıktı formatını kodlayamıyor. PNG deneyin.");
    const check = await createImageBitmap(blob);
    try {
      if (check.width !== source.width || check.height !== source.height)
        throw new Error("Çıktı boyut doğrulaması başarısız.");
    } finally {
      check.close();
    }
    return blob;
  } finally {
    if (c !== source) c.width = c.height = 1;
  }
}
