const f = (key, label, type = "text", value = "", extra = {}) => ({
  key,
  label,
  type,
  value,
  ...extra,
});
const s = (key, label, values) =>
  f(key, label, "select", values[0], { values });
const n = (key, label, value, min = 0, max = 16000) =>
  f(key, label, "number", value, { min, max });
const images = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "bmp",
  "tif",
  "tiff",
  "gif",
  "ico",
  "avif",
  "heic",
  "heif",
  "svg",
];
const media = [
  "mp4",
  "mkv",
  "mov",
  "webm",
  "avi",
  "mp3",
  "wav",
  "flac",
  "aac",
  "m4a",
  "ogg",
];
const texts = [
  "txt",
  "md",
  "csv",
  "tsv",
  "json",
  "xml",
  "log",
  "srt",
  "vtt",
  "html",
  "css",
  "js",
];
const format = s("format", "Çıktı", [
  "png",
  "jpg",
  "webp",
  "tiff",
  "bmp",
  "gif",
  "ico",
  "avif",
]);
const quality = n("quality", "Kalite (%)", 90, 1, 100),
  pages = f("pages", "Sayfalar (1,3-5; boş: tümü)");
export const operations = [];
function add(
  id,
  label,
  group,
  extensions,
  engine,
  fields = [],
  multi = false,
  note = "",
) {
  operations.push({
    id,
    label,
    group,
    extensions,
    engine,
    fields,
    multi,
    note,
  });
}
const imageOps = [
  ["convert", "Dönüştür", [format, quality]],
  ["resize", "Boyutlandır", [n("width", "Genişlik", 1200, 1), format, quality]],
  [
    "crop",
    "Kırp",
    [
      n("x", "X", 0),
      n("y", "Y", 0),
      n("width", "Genişlik", 400, 1),
      n("height", "Yükseklik", 400, 1),
      format,
    ],
  ],
  ["rotate", "Döndür", [s("angle", "Açı", ["90", "180", "270"]), format]],
  ["flip", "Çevir", [s("axis", "Yön", ["horizontal", "vertical"]), format]],
  [
    "color",
    "Renk ayarları",
    [
      n("brightness", "Parlaklık (%)", 100, 0, 200),
      n("saturation", "Doygunluk (%)", 100, 0, 200),
      n("contrast", "Kontrast", 0, -100, 100),
      format,
    ],
  ],
  [
    "watermark",
    "Yazı / filigran",
    [
      f("text", "Yazı", "text", "ConvertorXP"),
      n("fontSize", "Yazı boyutu", 28, 1, 400),
      f("color", "Renk", "color", "#ffffff"),
      s("gravity", "Konum", ["SouthEast", "Center", "NorthWest"]),
      format,
    ],
  ],
  [
    "border",
    "Kenarlık",
    [
      n("border", "Kalınlık", 12, 0, 1000),
      f("color", "Renk", "color", "#ffffff"),
      format,
    ],
  ],
  [
    "merge",
    "Görselleri birleştir",
    [s("direction", "Yerleşim", ["vertical", "horizontal"]), format],
    true,
  ],
  ["strip", "Metadata temizle", [format]],
  ["metadata", "Metadata bilgileri", []],
  ["frames", "Kareleri çıkar", []],
  [
    "animate",
    "Animasyon oluştur",
    [
      s("format", "Çıktı", ["gif", "webp"]),
      n("delay", "Kare süresi (ms)", 100, 10, 60000),
      n("loop", "Tekrar (0: sonsuz)", 0, 0, 1000),
    ],
    true,
  ],
  [
    "compress",
    "Hedef boyuta sıkıştır",
    [
      s("format", "Çıktı", ["jpg", "webp"]),
      n("targetKB", "Hedef KB", 250, 1, 100000),
    ],
  ],
];
for (const [id, label, fields, multi] of imageOps)
  add(
    "image." + id,
    label,
    "Görsel",
    images,
    "image",
    fields,
    !!multi,
    "Orijinal korunur. JPG şeffaflığı kaldırır. Kare, renk ve metadata kaybı çıktı biçimine bağlıdır.",
  );
const pdfOps = [
  ["merge", "PDF birleştir", [], true],
  ["split", "Sayfalara böl", [pages]],
  ["extract", "Sayfa çıkar / sırala", [pages]],
  ["delete", "Sayfaları sil", [pages]],
  [
    "rotate",
    "Sayfaları döndür",
    [pages, s("angle", "Açı", ["90", "180", "270"])],
  ],
  [
    "watermark",
    "Metin / filigran",
    [
      pages,
      f("text", "Metin", "text", "ConvertorXP"),
      n("fontSize", "Yazı boyutu", 24, 6, 200),
    ],
  ],
  ["number", "Sayfa numarası", [pages]],
  [
    "forms",
    "Form alanlarını doldur",
    [f("values", "Alan değerleri (JSON)", "textarea", "{}")],
  ],
  ["text", "Metni çıkar", [pages]],
  [
    "images",
    "Sayfaları PNG yap",
    [pages, n("dpi", "Çözünürlük (DPI)", 120, 36, 300)],
  ],
];
for (const [id, label, fields, multi] of pdfOps)
  add(
    "pdf." + id,
    label,
    "PDF",
    ["pdf"],
    "pdf",
    fields,
    !!multi,
    "İmzalar geçersizleşebilir. Metin eklemek mevcut içeriği silmez; sansür değildir.",
  );
add(
  "pdf.create",
  "Görsellerden PDF",
  "PDF",
  images,
  "image",
  [
    s("paper", "Sayfa", ["A4", "A5", "Letter", "image"]),
    s("orientation", "Yön", ["auto", "portrait", "landscape"]),
    n("margin", "Kenar boşluğu (mm)", 10, 0, 50),
    s("output", "Dosyalar", ["combined", "separate"]),
  ],
  true,
);
add(
  "office.pdf",
  "PDF’ye dönüştür",
  "Belge",
  ["doc", "docx", "odt", "rtf", "ppt", "pptx", "odp", "xls", "xlsx", "ods"],
  "office",
  [s("format", "Çıktı", ["pdf"])],
);
for (const id of ["pdf.create", "office.pdf"]) {
  const op = operations.find((o) => o.id === id);
  Object.assign(op, {
    action: op.label,
    platforms: ["desktop"],
    component: op.engine,
    panel: "pdf-conversion",
  });
}
const mf = s("format", "Çıktı", [
  "mp4",
  "mkv",
  "webm",
  "mp3",
  "wav",
  "flac",
  "m4a",
  "ogg",
]);
const mediaOps = [
  ["convert", "Dönüştür", [mf]],
  [
    "trim",
    "Kes",
    [
      n("start", "Başlangıç (sn)", 0, 0, 864000),
      n("duration", "Süre (sn)", 10, 0.01, 864000),
      mf,
    ],
  ],
  ["merge", "Birleştir", [mf], true],
  [
    "resize",
    "Video boyut / FPS",
    [
      n("width", "Genişlik", 1280, 2, 7680),
      n("fps", "FPS", 30, 1, 120),
      n("bitrate", "Video kbps", 2500, 100, 100000),
      s("format", "Çıktı", ["mp4", "webm"]),
    ],
  ],
  [
    "audio",
    "Sesi çıkar",
    [s("format", "Çıktı", ["mp3", "wav", "flac", "m4a"])],
  ],
  ["mute", "Sesi kaldır", [s("format", "Çıktı", ["mp4", "mkv", "webm"])]],
  ["normalize", "Ses seviyesini dengele", [mf]],
  ["frame", "Kare / kapak çıkar", [n("start", "Zaman (sn)", 0, 0, 864000)]],
  [
    "gif",
    "GIF oluştur",
    [
      n("start", "Başlangıç (sn)", 0, 0, 864000),
      n("duration", "Süre (sn)", 5, 0.1, 60),
      n("width", "Genişlik", 480, 16, 1920),
    ],
  ],
  [
    "subtitle-extract",
    "İlk altyazıyı çıkar",
    [s("format", "Çıktı", ["srt", "vtt"])],
  ],
];
for (const [id, label, fields, multi] of mediaOps)
  add(
    "media." + id,
    label,
    "Ses / video",
    media,
    "media",
    fields,
    !!multi,
    "Kayıplı kodlama kaliteyi değiştirir. Birleştirme uyumlu akışlar gerektirir.",
  );
add(
  "media.subtitle-add",
  "Altyazı ekle",
  "Ses / video",
  [...media, "srt", "vtt"],
  "media",
  [],
  true,
  "Bir video ve bir SRT/VTT seç. MKV içinde seçilebilir altyazı olarak saklanır.",
);
add("subtitle.convert", "SRT / VTT dönüştür", "Metin", ["srt", "vtt"], "core", [
  s("format", "Çıktı", ["srt", "vtt"]),
]);
for (const [id, ext, out] of [
  [
    "document",
    ["doc", "docx", "odt", "rtf", "txt"],
    ["pdf", "docx", "odt", "rtf", "txt"],
  ],
  ["sheet", ["xls", "xlsx", "ods", "csv"], ["pdf", "xlsx", "ods", "csv"]],
  ["slides", ["ppt", "pptx", "odp"], ["pdf", "pptx", "odp"]],
])
  add(
    "office." + id,
    "Belge dönüştür",
    "Office",
    ext,
    "office",
    [s("format", "Çıktı", out)],
    false,
    "Fontlar ve yerleşim değişebilir. Makrolar çalıştırılmaz.",
  );
add(
  "ocr.read",
  "Metni tanı / aranabilir PDF",
  "OCR",
  [...images, "pdf"],
  "ocr",
  [
    s("language", "Dil", ["tur+eng", "tur", "eng"]),
    s("format", "Çıktı", ["txt", "pdf"]),
    pages,
    s("rotate", "Yön düzeltme", ["auto", "none"]),
  ],
  false,
  "OCR hatalı olabilir; çıktıyı kontrol et.",
);
for (const [id, label, fields] of [
  ["list", "İçeriği listele", []],
  ["extract", "Arşivi aç", [f("password", "Parola (gerekiyorsa)", "password")]],
])
  add(
    "archive." + id,
    label,
    "Arşiv",
    ["zip", "7z", "tar", "gz", "rar"],
    "archive",
    fields,
  );
add(
  "archive.create",
  "Arşiv oluştur",
  "Arşiv",
  ["*"],
  "archive",
  [
    s("format", "Çıktı", ["zip", "7z", "tar", "gz"]),
    f("password", "Parola (ZIP/7Z)", "password"),
  ],
  true,
);
add("text.edit", "Metni düzenle / kodlama", "Metin", texts, "core", [
  s("inputEncoding", "Kaynak kodlama", ["utf8", "utf16le", "windows1254"]),
  s("encoding", "Çıktı kodlama", ["utf8", "utf16le", "windows1254"]),
  s("newline", "Satır sonu", ["lf", "crlf"]),
  f("content", "İçerik (boşsa kaynak korunur)", "textarea"),
]);
add("text.json", "JSON doğrula / biçimle", "Metin", ["json", "txt"], "core", [
  n("indent", "Girinti", 2, 0, 8),
]);
add("text.csv", "CSV / TSV dönüştür", "Metin", ["csv", "tsv", "txt"], "core", [
  s("inputEncoding", "Kaynak kodlama", ["utf8", "utf16le", "windows1254"]),
  s("delimiter", "Kaynak ayraç", [",", ";", "tab"]),
  s("format", "Çıktı", ["csv", "tsv"]),
  s("encoding", "Çıktı kodlama", ["utf8", "utf16le", "windows1254"]),
]);
add("pdf.fields", "Form alanlarını listele", "PDF", ["pdf"], "pdf");
add(
  "pdf.unlock",
  "Parolalı PDF kilidini aç",
  "PDF",
  ["pdf"],
  "pdf",
  [f("password", "Belge parolası", "password")],
  false,
  "Yalnızca bildiğin belge parolasıyla açılır; orijinal korunur.",
);
export function eligible(op, files) {
  return (
    files.length > 0 &&
    files.every(
      (file) =>
        op.extensions.includes("*") ||
        op.extensions.includes(
          file.ext || file.name.split(".").pop().toLowerCase(),
        ),
    )
  );
}
export function validateOptions(op, input = {}) {
  const out = {};
  for (const field of op.fields) {
    let value = input[field.key] ?? field.value;
    if (field.type === "number") {
      value = Number(value);
      if (!Number.isFinite(value) || value < field.min || value > field.max)
        throw Error(field.label + ": sınır dışında.");
    } else {
      value = String(value);
      if (value.length > 2_000_000) throw Error("Metin çok uzun.");
      if (field.type === "select" && !field.values.includes(value))
        throw Error("Geçersiz seçenek.");
      if (field.type === "color" && !/^#[a-f0-9]{6}$/i.test(value))
        throw Error("Geçersiz renk.");
    }
    out[field.key] = value;
  }
  return out;
}
