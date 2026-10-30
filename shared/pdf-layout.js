export const officeExtensions = [
  "doc",
  "docx",
  "odt",
  "rtf",
  "ppt",
  "pptx",
  "odp",
  "xls",
  "xlsx",
  "ods",
];
export function isOffice(file) {
  return officeExtensions.includes(
    file.ext || file.name.split(".").pop().toLowerCase(),
  );
}
export function pdfLayout(
  width,
  height,
  { paper = "A4", orientation = "auto", margin = 10 } = {},
) {
  if (![width, height].every((v) => Number.isFinite(v) && v > 0))
    throw Error("Görsel boyutu geçersiz.");
  if (
    !["A4", "A5", "Letter", "image"].includes(paper) ||
    !["auto", "portrait", "landscape"].includes(orientation)
  )
    throw Error("Sayfa ayarı geçersiz.");
  if (!Number.isFinite(Number(margin)) || margin < 0 || margin > 50)
    throw Error("Kenar boşluğu 0–50 mm olmalı.");
  const mm = 72 / 25.4;
  let [pageWidth, pageHeight] = {
    A4: [210 * mm, 297 * mm],
    A5: [148 * mm, 210 * mm],
    Letter: [612, 792],
    image: [width * 0.75, height * 0.75],
  }[paper];
  const landscape =
    orientation === "landscape" || (orientation === "auto" && width > height);
  if (pageWidth > pageHeight !== landscape)
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  const inset = Number(margin) * mm;
  if (pageWidth <= 2 * inset || pageHeight <= 2 * inset)
    throw Error("Bu sayfa için kenar boşluğu çok büyük.");
  const scale = Math.min(
    (pageWidth - 2 * inset) / width,
    (pageHeight - 2 * inset) / height,
  );
  const drawWidth = width * scale,
    drawHeight = height * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}
