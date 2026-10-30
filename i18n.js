// ConvertorXP Internationalization (TR / EN)
// Default language is English ("en") unless Turkish ("tr") is saved in localStorage.

export const dict = {
  tr: {
    // Brand & General
    app_title: "ConvertorXP - kişisel dosya masaüstün",
    tagline: "Kişisel dosya masaüstün",
    privacy: "◈ Dosyaların bu cihazda kalır",
    start: "başlat",
    upload: "📁 Dosya yükle",
    selection_zero: "0 dosya seçili",
    selection_count: "{selected} / {total} dosya seçili",
    windows_open: "Açık pencereler",
    desktop_aria: "Dosya masaüstü",
    files_aria: "Dosyalar",
    start_menu_aria: "Başlat menüsü",
    version_label: "ConvertorXP v0.7.0",

    // Welcome Screen
    welcome_eyebrow: "ESKİ BİR HİS. YENİ BİR ARAÇ KUTUSU.",
    welcome_h1: "Dosyalarını getir.<br />Gerisini sağ tıkla.",
    welcome_p:
      "Dönüştür, boyutlandır, birleştir.<br />Hepsi senin küçük masaüstünde.",
    welcome_btn: "+ Dosya yükle",
    welcome_hint: "veya dosyalarını buraya sürükle",
    welcome_note_web:
      "JPG · PNG · WEBP · BMP · AVIF <span>GIF / ICO önizlenir. AVIF desteği tarayıcıya bağlıdır.</span>",
    welcome_note_native:
      "Görsel · PDF · Ses / video · Office · OCR · Arşiv · Metin",

    // Desktop Guide & Drop Overlay
    desktop_guide_title: "Küçük bir hatırlatma",
    desktop_guide_p:
      "Çift tıkla aç; sağ tıkla araçlarını keşfet.<br />Birlikte işlem yapmak için birkaçını seç.",
    desktop_guide_touch: "Telefonda dosyaya dokunman yeterli.",
    drop_overlay_h: "Dosyalarını masaüstüne bırak",
    drop_overlay_sub: "Birden fazla dosya seçebilirsin",

    // Start Menu
    start_upload: "Dosya yükle",
    start_upload_sub: "Masaüstüne dosya ekle",
    start_convert: "Görsel dönüştürücü",
    start_convert_sub: "PNG, JPG ve WebP",
    start_resize: "Boyutlandır",
    start_rotate: "Görselleri döndür",
    start_merge: "Görselleri birleştir",
    start_help_text: "İşlem yapmak için önce masaüstündeki dosyalarını seç.",
    start_desktop: "Dosyalarım",
    start_select_all: "Tüm dosyaları seç",
    start_info: "Dosya özellikleri",
    start_help: "Yardım ve destek",
    start_close: "Menüyü kapat",
    local_note_web:
      "Dosyaların bu cihazda işlenir.<br /><br />Sayfayı yenilemeden önce çıktılarını indir.",
    local_note_native:
      "Çalışma alanın bu cihazda saklanır. Çıktılar uygulama klasöründe korunur; Farklı kaydet ile dışarı aktar.",
    job_history: "İşlem geçmişi",
    components: "Bileşenler",

    // Tray & Balloon
    tray_jobs_tooltip: "{count} işlem sürüyor",
    tray_shield_title: "ConvertorXP — %100 Yerel (İşlemler cihazınızda kalır)",
    lang_bar_show: "Dil Çubuğunu Göster",
    balloon_done_title: "İşlem tamamlandı",
    balloon_failed_title: "İşlem tamamlanamadı",
    balloon_pasted_title: "Görsel yapıştırıldı",
    balloon_pasted_msg: "{name} masaüstüne eklendi.",
    pasted_prefix: "Ekran Görüntüsü",
    balloon_open: "Aç",
    balloon_reveal: "Klasörde göster",

    // Context Menu
    menu_selected: "{count} dosya seçildi",
    menu_add_folder: "📁  Klasör ekle",
    menu_add_files: "📁  Dosya yükle",
    menu_select_all: "☑  Tümünü seç",
    menu_sort_name: "↕  Ada göre sırala",
    menu_open: "▣  Aç",
    menu_pdf_convert_web: "▤  PDF’ye dönüştür · Windows uygulamasında",
    menu_pdf_convert: "▤  PDF’ye dönüştür",
    menu_pdf_create: "▤  PDF oluştur",
    menu_edit: "✎  Düzenle",
    menu_tools: "⚙  Diğer araçlar",
    menu_batch_rename: "✎  Toplu yeniden adlandır",
    menu_reveal: "↗  Klasörde göster",
    menu_rename: "✎  Yeniden adlandır   F2",
    menu_duplicate: "▣  Kopyasını oluştur",
    menu_convert_quality: "⇄  Dönüştür / kalite ayarla",
    menu_compress: "🗜  Hedef boyuta sıkıştır",
    menu_strip: "🛡  Metadata / EXIF temizle",
    menu_pdf_images: "🖼  Sayfaları görsele dönüştür",
    menu_pdf_workspace: "▤  PDF Çalışma Alanı",
    menu_create_gif: "🎞  GIF oluştur",
    menu_extract_audio: "🎵  Sesi çıkar",
    menu_resize: "⤢  Boyutlandır",
    menu_rotate: "↻  Sağa döndür",
    menu_merge: "▧  Görselleri birleştir",
    menu_download: "↓  Dosyayı indir",
    menu_clear_selection: "☐  Seçimi temizle",
    menu_properties: "ⓘ  Özellikler",
    menu_remove: "×  Masaüstünden kaldır",

    // Window & Dialog
    window_close: "Kapat",
    window_minimize: "Küçült",
    window_maximize: "Büyüt",
    window_restore: "Önceki boyuta dön",
    btn_apply: "Uygula",
    btn_cancel: "Vazgeç",
    btn_close: "Kapat",
    processing: "İşleniyor…",
    completed_title: "✓ İşlem tamamlandı",

    // Conversion Window
    pdf_office_desc:
      "Her belge ayrı PDF olur. Font ve yerleşim farkları olabilir. Excel mevcut yazdırma alanlarını kullanır.",
    pdf_image_desc:
      "Fotoğrafları sürükleyerek sırala. Her görsel bir sayfa olur; kaynaklar korunur.",
    paper_label: "Sayfa",
    orientation_label: "Yön",
    output_label: "Çıktı",
    margin_label: "Kenar boşluğu (mm)",
    paper_image: "Görsel boyutu (96 DPI)",
    orient_auto: "Otomatik",
    orient_portrait: "Dikey",
    orient_landscape: "Yatay",
    output_combined: "Tek PDF",
    output_separate: "Ayrı PDF’ler",
    btn_convert_pdf: "PDF’ye dönüştür",
    btn_create_pdf: "PDF oluştur",
    btn_download_continue: "İndir ve devam et",
    btn_remove_page: "Çıkar",
    btn_save_as: "Farklı kaydet",
    btn_reveal: "Klasörde göster",
    btn_preview: "Önizle",
    btn_retry: "Yeniden dene",
    btn_cancel_job: "İptal",

    // Job Statuses
    status_queued: "Önceki işlem tamamlanınca başlayacak.",
    status_running: "Belge hazırlanıyor…",
    status_validating: "Çıktı doğrulanıyor…",
    status_completed: "Tamamlandı",
    status_failed: "İşlem tamamlanamadı",
    status_cancelled: "İptal edildi",
    status_interrupted: "İşlem yarım kaldı",

    // Notifications & Errors
    limit_desktop_files:
      "Masaüstünde en fazla 60 dosya tutulabilir. Önce birkaç dosyayı kaldır.",
    limit_output_size:
      "Çıktı 30 MB sınırını aşıyor. Boyutu veya kaliteyi azalt.",
    limit_pixel_size:
      "Çıktı sınırı aşıldı: en fazla 24 MP ve kenar başına 16000 px.",
    occupied_cell: "Bu konum dolu. Dosyaları boş bir alana bırak.",
    select_at_least_one: "En az bir dosya seç.",
    select_images_or_docs_separately:
      "PDF için belge veya görselleri ayrı seç.",
    select_images_only: "Bu işlem için yalnızca desteklenen görselleri seç.",
    select_two_images_merge: "Birleştirmek için en az iki görsel seç.",
    wait_busy: "Devam eden işlem bittikten sonra dosya ekleyebilirsin.",
    save_conflict_source: "Kaynak dosyanın üzerine yazılamaz.",
    component_downloading: "Bileşen indiriliyor ve doğrulanıyor…",
    component_busy:
      "Bileşen başka bir pencerede hazırlanıyor. Tamamlanınca tekrar dönüştürebilirsin.",
    component_needed_desc:
      "{name} bileşeni gerekli. {size} MB indirme; kurulduktan sonra çevrimdışı çalışır.",
    help_alert:
      "Dosyalarını sürükle veya yükle. Boş alanda sürükleyerek birkaçını seç; çift tıkla aç veya sağ tıkla işlem menüsünü aç. Çıktıları sayfayı yenilemeden indir.",
    rename_title_hint: "Enter: kaydet · Esc: vazgeç · Uzantı korunur",

    // PDF Workspace
    pdf_ws_title: "PDF Çalışma Alanı",
    pdf_ws_save_as: "Farklı Kaydet",
    pdf_ws_rotate: "Döndür (90°)",
    pdf_ws_delete: "Sayfayı Sil",
    pdf_ws_insert: "Sayfa Ekle",
    pdf_ws_split: "Sayfalara Böl",
    pdf_ws_compress: "PDF Sıkıştır",
    pdf_ws_extract_text: "Metni Çıkar",
    pdf_ws_export_png: "Sayfaları PNG Yap",
    pdf_ws_add_text: "Metin Ekle",
    pdf_ws_add_stamp: "Kaşe / İmza",
    pdf_ws_zoom_in: "Yakınlaştır",
    pdf_ws_zoom_out: "Uzaklaştır",
    pdf_ws_fit_page: "Sığdır",
    pdf_ws_page_counter: "Sayfa {current} / {total}",
    pdf_ws_unsaved: "Kaydedilmemiş değişiklikler var",
    pdf_ws_saved: "Tüm değişiklikler kaydedildi",
    pdf_ws_confirm_delete: "Bu sayfayı silmek istediğinizden emin misiniz?",
    pdf_ws_text_prompt: "Sayfa üzerine eklenecek metni yazın:",
    pdf_ws_click_place: "Metni yerleştirmek istediğiniz konuma tıklayın.",
    pdf_ws_loading: "PDF açılıyor...",

    // Paint & Collage Workspace
    paint_ws_title: "Paint - {name}",
    paint_menu_file: "Dosya",
    paint_menu_edit: "Düzen",
    paint_menu_view: "Görünüm",
    paint_menu_image: "Resim",
    paint_menu_colors: "Renkler",
    paint_menu_help: "Yardım",
    paint_save_copy: "Kopya Kaydet",
    paint_undo: "Geri Al",
    paint_redo: "Yinele",
    paint_clear: "Resmi Temizle",
    paint_crop: "Kırp",
    paint_flip_h: "Yatay Çevir",
    paint_flip_v: "Dikey Çevir",
    paint_rotate_90: "90° Döndür",
    paint_saved_notify: "Yeni görsel kaydedildi: {name}",
    paint_prompt_text: "Eklenecek metni girin:",
    collage_title: "Kolaj Oluşturucu",
    collage_tpl_label: "Şablon:",
    collage_gap_label: "Boşluk:",
    collage_radius_label: "Yuvarlaklık:",
    collage_color_label: "Arka Plan:",
    menu_collage: "🖼 Kolaj Oluştur",
    start_paint: "Paint",
    start_paint_sub: "Resim düzenleyici & kolaj",

    // Stage 5: Background Removal & Media Tools
    menu_rembg: "🪄  Arka Planı Kaldır",
    menu_media_trim: "✂  Kes (Trim)",
    menu_media_compress: "🗜  Video Sıkıştır",
    menu_media_audio: "🎵  Sesi Ayıkla",
    rembg_title: "Arka Planı Kaldır",
    rembg_tolerance: "Tolerans:",
    rembg_feather: "Yumuşaklık:",
    rembg_apply: "✓ Tuvale Uygula",
    rembg_saved_notify: "✓ {name} arka planı kaldırılarak masaüstüne kaydedildi.",
    rembg_done: "✓ Arka plan kaldırıldı.",

    // Stage 6: OCR & PDF Redaction / Text Replacement
    menu_ocr: "🔍  Metni Tanı (OCR)",
    pdf_ws_redact: "Sansürle",
    pdf_ws_replace_text: "Metin Değiştir",
    pdf_ws_ocr: "Metni Tanı (OCR)",
    notepad_title: "Not Defteri",
    notepad_file: "Dosya",
    notepad_edit: "Düzen",
    notepad_format: "Biçim",
    notepad_view: "Görünüm",
    notepad_help: "Yardım",
    notepad_save: "Kaydet",
    notepad_save_as: "Farklı Kaydet...",
    notepad_copy: "Kopyala",
    notepad_select_all: "Tümünü Seç",
    notepad_status_pos: "Satır {line}, Sütun {col}",
    notepad_status_len: "{count} karakter",
    ocr_modal_title: "Metin Tanıma (OCR)",
    ocr_lang_label: "Tanıma Dili:",
    ocr_output_label: "Çıktı Biçimi:",
    ocr_out_notepad: "XP Not Defteri ile Aç (.txt)",
    ocr_out_pdf: "Aranabilir PDF Olarak Kaydet (.pdf)",
    ocr_out_txt: "Metin Dosyası Olarak Kaydet (.txt)",
    ocr_btn_start: "✓ Başlat",
    ocr_btn_cancel: "Vazgeç",
    ocr_progress_running: "Metin tanınıyor... %{percent}",
    ocr_done_notify: "✓ {name} başarıyla oluşturuldu.",
    redact_prompt_text: "Değiştirilecek yeni metni girin:",
  },

  en: {
    // Brand & General
    app_title: "ConvertorXP - your personal file desktop",
    tagline: "Your personal file desktop",
    privacy: "◈ Files stay on this device",
    start: "start",
    upload: "📁 Add files",
    selection_zero: "0 files selected",
    selection_count: "{selected} / {total} files selected",
    windows_open: "Open windows",
    desktop_aria: "File desktop",
    files_aria: "Files",
    start_menu_aria: "Start menu",
    version_label: "ConvertorXP v0.7.0",

    // Welcome Screen
    welcome_eyebrow: "CLASSIC FEEL. MODERN TOOLBOX.",
    welcome_h1: "Bring your files.<br />Right-click the rest.",
    welcome_p: "Convert, resize, merge.<br />All on your personal desktop.",
    welcome_btn: "+ Add files",
    welcome_hint: "or drag and drop your files here",
    welcome_note_web:
      "JPG · PNG · WEBP · BMP · AVIF <span>GIF / ICO preview only. AVIF depends on browser.</span>",
    welcome_note_native:
      "Image · PDF · Audio / video · Office · OCR · Archive · Text",

    // Desktop Guide & Drop Overlay
    desktop_guide_title: "Quick reminder",
    desktop_guide_p:
      "Double-click to open; right-click for tools.<br />Select multiple files to process together.",
    desktop_guide_touch: "Just tap a file on touch screens.",
    drop_overlay_h: "Drop files onto the desktop",
    drop_overlay_sub: "You can select and drop multiple files",

    // Start Menu
    start_upload: "Add files",
    start_upload_sub: "Add files to desktop",
    start_convert: "Image converter",
    start_convert_sub: "PNG, JPG and WebP",
    start_resize: "Resize",
    start_rotate: "Rotate images",
    start_merge: "Merge images",
    start_help_text: "Select files on desktop to perform actions.",
    start_desktop: "My Files",
    start_select_all: "Select all files",
    start_info: "File properties",
    start_help: "Help and support",
    start_close: "Close menu",
    local_note_web:
      "Files are processed on your device.<br /><br />Download outputs before refreshing.",
    local_note_native:
      "Workspace is stored on this device. Outputs stay in app directory; export with Save As.",
    job_history: "Job history",
    components: "Components",

    // Tray & Balloon
    tray_jobs_tooltip: "{count} operations running",
    tray_shield_title:
      "ConvertorXP — 100% On-device (Files never leave this device)",
    lang_bar_show: "Show the Language bar",
    balloon_done_title: "Operation completed",
    balloon_failed_title: "Operation failed",
    balloon_pasted_title: "Image pasted",
    balloon_pasted_msg: "{name} added to desktop.",
    pasted_prefix: "Screenshot",
    balloon_open: "Open",
    balloon_reveal: "Show in folder",

    // Context Menu
    menu_selected: "{count} files selected",
    menu_add_folder: "📁  Add folder",
    menu_add_files: "📁  Add files",
    menu_select_all: "☑  Select all",
    menu_sort_name: "↕  Sort by name",
    menu_open: "▣  Open",
    menu_pdf_convert_web: "▤  Convert to PDF · In desktop app",
    menu_pdf_convert: "▤  Convert to PDF",
    menu_pdf_create: "▤  Create PDF",
    menu_edit: "✎  Edit",
    menu_tools: "⚙  All tools",
    menu_batch_rename: "✎  Batch rename",
    menu_reveal: "↗  Show in folder",
    menu_rename: "✎  Rename   F2",
    menu_duplicate: "▣  Make a copy",
    menu_convert_quality: "⇄  Convert / quality",
    menu_compress: "🗜  Compress to target size",
    menu_strip: "🛡  Remove EXIF & metadata",
    menu_pdf_images: "🖼  Export pages as images",
    menu_pdf_workspace: "▤  PDF Workspace",
    menu_create_gif: "🎞  Create GIF",
    menu_extract_audio: "🎵  Extract audio",
    menu_resize: "⤢  Resize",
    menu_rotate: "↻  Rotate 90° right",
    menu_merge: "▧  Merge images",
    menu_download: "↓  Download file",
    menu_clear_selection: "☐  Clear selection",
    menu_properties: "ⓘ  Properties",
    menu_remove: "×  Remove from desktop",

    // Window & Dialog
    window_close: "Close",
    window_minimize: "Minimize",
    window_maximize: "Maximize",
    window_restore: "Restore",
    btn_apply: "Apply",
    btn_cancel: "Cancel",
    btn_close: "Close",
    processing: "Processing…",
    completed_title: "✓ Operation complete",

    // Conversion Window
    pdf_office_desc:
      "Each document becomes a separate PDF. Fonts and layouts may vary slightly. Excel uses print areas.",
    pdf_image_desc:
      "Drag photos to reorder. Each image becomes a page; sources are preserved.",
    paper_label: "Paper",
    orientation_label: "Orientation",
    output_label: "Output",
    margin_label: "Margin (mm)",
    paper_image: "Image size (96 DPI)",
    orient_auto: "Auto",
    orient_portrait: "Portrait",
    orient_landscape: "Landscape",
    output_combined: "Single PDF",
    output_separate: "Separate PDFs",
    btn_convert_pdf: "Convert to PDF",
    btn_create_pdf: "Create PDF",
    btn_download_continue: "Download and continue",
    btn_remove_page: "Remove",
    btn_save_as: "Save as",
    btn_reveal: "Show in folder",
    btn_preview: "Preview",
    btn_retry: "Retry",
    btn_cancel_job: "Cancel",

    // Job Statuses
    status_queued: "Will start when current job finishes.",
    status_running: "Preparing document…",
    status_validating: "Validating output…",
    status_completed: "Completed",
    status_failed: "Operation failed",
    status_cancelled: "Cancelled",
    status_interrupted: "Interrupted",

    // Notifications & Errors
    limit_desktop_files:
      "Desktop holds at most 60 files. Remove some files first.",
    limit_output_size: "Output exceeds 30 MB limit. Reduce size or quality.",
    limit_pixel_size: "Output limit exceeded: max 24 MP and 16000 px per edge.",
    occupied_cell: "This grid position is occupied. Drop onto an empty space.",
    select_at_least_one: "Select at least one file.",
    select_images_or_docs_separately:
      "Select documents or images separately for PDF.",
    select_images_only: "Select only supported images for this operation.",
    select_two_images_merge: "Select at least two images to merge.",
    wait_busy: "You can add files once current operation finishes.",
    save_conflict_source: "Cannot overwrite the source file.",
    component_downloading: "Downloading and verifying component…",
    component_busy:
      "Component is being prepared elsewhere. You can retry once finished.",
    component_needed_desc:
      "{name} component required. {size} MB download; works offline once installed.",
    help_alert:
      "Drag or add your files. Drag to select multiple on desktop; double-click to open or right-click for tools. Download outputs before closing.",
    rename_title_hint: "Enter: save · Esc: cancel · Extension preserved",

    // PDF Workspace
    pdf_ws_title: "PDF Workspace",
    pdf_ws_save_as: "Save As",
    pdf_ws_rotate: "Rotate (90°)",
    pdf_ws_delete: "Delete Page",
    pdf_ws_insert: "Insert Pages",
    pdf_ws_split: "Split Pages",
    pdf_ws_compress: "Compress PDF",
    pdf_ws_extract_text: "Extract Text",
    pdf_ws_export_png: "Export as PNG",
    pdf_ws_add_text: "Add Text",
    pdf_ws_add_stamp: "Stamp / Signature",
    pdf_ws_zoom_in: "Zoom In",
    pdf_ws_zoom_out: "Zoom Out",
    pdf_ws_fit_page: "Fit Page",
    pdf_ws_page_counter: "Page {current} of {total}",
    pdf_ws_unsaved: "Unsaved changes",
    pdf_ws_saved: "All changes saved",
    pdf_ws_confirm_delete: "Are you sure you want to delete this page?",
    pdf_ws_text_prompt: "Enter text to add onto the page:",
    pdf_ws_click_place: "Click on the page where you want to place the text.",
    pdf_ws_loading: "Opening PDF...",

    // Paint & Collage Workspace
    paint_ws_title: "Paint - {name}",
    paint_menu_file: "File",
    paint_menu_edit: "Edit",
    paint_menu_view: "View",
    paint_menu_image: "Image",
    paint_menu_colors: "Colors",
    paint_menu_help: "Help",
    paint_save_copy: "Save Copy",
    paint_undo: "Undo",
    paint_redo: "Redo",
    paint_clear: "Clear Image",
    paint_crop: "Crop",
    paint_flip_h: "Flip Horizontal",
    paint_flip_v: "Flip Vertical",
    paint_rotate_90: "Rotate 90°",
    paint_saved_notify: "New image saved: {name}",
    paint_prompt_text: "Enter text to add:",
    collage_title: "Collage Creator",
    collage_tpl_label: "Template:",
    collage_gap_label: "Spacing:",
    collage_radius_label: "Corner Radius:",
    collage_color_label: "Background:",
    menu_collage: "🖼 Create Collage",
    start_paint: "Paint",
    start_paint_sub: "Image editor & collage",

    // Stage 5: Background Removal & Media Tools
    menu_rembg: "🪄  Remove Background",
    menu_media_trim: "✂  Trim Media",
    menu_media_compress: "🗜  Compress Video",
    menu_media_audio: "🎵  Extract Audio",
    rembg_title: "Remove Background",
    rembg_tolerance: "Tolerance:",
    rembg_feather: "Feather:",
    rembg_apply: "✓ Apply to Canvas",
    rembg_saved_notify: "✓ {name} saved to desktop with transparent background.",
    rembg_done: "✓ Background removed.",

    // Stage 6: OCR & PDF Redaction / Text Replacement
    menu_ocr: "🔍  Recognize Text (OCR)",
    pdf_ws_redact: "Redact",
    pdf_ws_replace_text: "Replace Text",
    pdf_ws_ocr: "Recognize Text (OCR)",
    notepad_title: "Notepad",
    notepad_file: "File",
    notepad_edit: "Edit",
    notepad_format: "Format",
    notepad_view: "View",
    notepad_help: "Help",
    notepad_save: "Save",
    notepad_save_as: "Save As...",
    notepad_copy: "Copy",
    notepad_select_all: "Select All",
    notepad_status_pos: "Ln {line}, Col {col}",
    notepad_status_len: "{count} characters",
    ocr_modal_title: "Optical Character Recognition (OCR)",
    ocr_lang_label: "Recognition Language:",
    ocr_output_label: "Output Format:",
    ocr_out_notepad: "Open with XP Notepad (.txt)",
    ocr_out_pdf: "Save as Searchable PDF (.pdf)",
    ocr_out_txt: "Save as Text File (.txt)",
    ocr_btn_start: "✓ Start",
    ocr_btn_cancel: "Cancel",
    ocr_progress_running: "Recognizing text... {percent}%",
    ocr_done_notify: "✓ {name} created successfully.",
    redact_prompt_text: "Enter replacement text:",
  },
};

export let lang =
  (typeof localStorage !== "undefined" && localStorage.getItem("cxp-lang")) ||
  "en";

export function setLanguage(next) {
  if (!dict[next]) return;
  lang = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("cxp-lang", next);
  }
  if (typeof location !== "undefined") {
    location.reload();
  }
}

export function t(key, vars = {}) {
  const current = dict[lang] || dict.en;
  let text = current[key] ?? dict.en[key] ?? dict.tr[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  document.title = t("app_title");
  for (const el of root.querySelectorAll("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key) {
      if (el.dataset.i18nHtml) {
        el.innerHTML = t(key);
      } else {
        el.textContent = t(key);
      }
    }
  }
  for (const el of root.querySelectorAll("[data-i18n-title]")) {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(key);
  }
  for (const el of root.querySelectorAll("[data-i18n-aria]")) {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute("aria-label", t(key));
  }
}
