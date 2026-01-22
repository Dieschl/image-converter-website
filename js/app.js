
// --- Global: Standard-Drag&Drop des Browsers verhindern (sonst öffnet er Bilder) ---
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  window.addEventListener(evt, e => e.preventDefault());
});

const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('fileInput');
const formatSel      = document.getElementById('format');
const qualityInput   = document.getElementById('quality');
const maxWidthInput  = document.getElementById('maxWidth');
const convertBtn     = document.getElementById('convertBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const resultsEl      = document.getElementById('results');

let files = [];
let outputs = [];

function supportsType(mime){
  const c = document.createElement('canvas');
  try { return c.toDataURL(mime).startsWith(`data:${mime}`); } catch { return false; }
}
const supports = {
  jpeg: supportsType('image/jpeg'),
  png:  supportsType('image/png'),
  webp: supportsType('image/webp'),
  avif: supportsType('image/avif'),
};

// Click auf Dropzone öffnet Datei-Dialog
if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
}
if (fileInput) {
  fileInput.addEventListener('change', e => handleFiles([...e.target.files]));
}

// Dropzone-UX
['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover');
}));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover');
}));
dropzone.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));

function handleFiles(list) {
  const imgs = list.filter(f => f.type.startsWith('image/'));
  if (!imgs.length) return;
  files = imgs; outputs = []; resultsEl.innerHTML = '';
  convertBtn.disabled = false; downloadAllBtn.disabled = true;
  renderList(files);
}

function renderList(list) {
  resultsEl.innerHTML = '';
  for (const f of list) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div><strong>${escapeHtml(f.name)}</strong></div>
      <div class="muted">${Math.round(f.size/1024)} KB</div>
      <div class="muted" style="margin-top:6px;">Status: bereit</div>`;
    resultsEl.appendChild(div);
  }
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

// --- Canvas-Helfer mit Fallback (OffscreenCanvas oder klassischer Canvas) ---
async function drawToCanvasBitmap(imgBitmap, width, height, type, quality) {
  let canvas, ctx;
  if ('OffscreenCanvas' in window) {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    ctx = canvas.getContext('2d');
  }
  ctx.drawImage(imgBitmap, 0, 0, width, height);

  // zu Blob konvertieren (mit Fallback für ältere Browser)
  if (canvas.convertToBlob) {
    return await canvas.convertToBlob({ type, quality });
  } else {
    return await new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }
}

// --- Bild -> Bild ---
async function convertImage(file, targetType, quality, maxW) {
  const imgBitmap = await createImageBitmap(file);
  let { width, height } = imgBitmap;

  if (maxW && maxW > 0 && width > maxW) {
    height = Math.round(height * (maxW / width));
    width = maxW;
  }

  // Ziel-MIME an Browser-Support anpassen (Fallbacks)
  let type = targetType;
  if (type === 'image/avif' && !supports.avif) type = supports.webp ? 'image/webp' : 'image/jpeg';
  if (type === 'image/webp' && !supports.webp) type = 'image/jpeg';

  const blob = await drawToCanvasBitmap(imgBitmap, width, height, type, Number(quality) || 0.8);
  return blob;
}

// --- Bild(er) -> PDF (ein Dokument, eine Seite pro Bild) ---
async function convertToPdf(allFiles, quality, maxW) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();

  // A4 in Punkten: 595 x 842 (Portrait). Für Landscape drehen wir die Maße.
  const A4_PORTRAIT  = { w: 595, h: 842 };
  const A4_LANDSCAPE = { w: 842, h: 595 };

  for (const file of allFiles) {
    // 1) Bild ggf. skalieren/rekodieren (JPEG/PNG) bevor es ins PDF kommt
    //    Wir nutzen JPEG für Fotos (kleinere Dateien), PNG könnte Transparenz behalten – hier bleiben wir pragmatisch: JPEG.
    const targetForPdf = 'image/jpeg';
    const blob = await convertImage(file, targetForPdf, Number(quality) || 0.8, Number(maxW) || 0);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // 2) Bild in PDF einbetten
    const img = await pdfDoc.embedJpg(bytes);
    const imgW = img.width, imgH = img.height;

    // 3) Page-Format wählen (A4 Portrait/Landscape) passend zur Bildausrichtung
    const isLandscape = imgW >= imgH;
    const pageSize = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;

    // 4) Bild auf A4 einpassen (Seitenränder optional; hier 24 pt Rand)
    const margin = 24;
    const maxWpt = pageSize.w - 2*margin;
    const maxHpt = pageSize.h - 2*margin;
    const scale  = Math.min(maxWpt / imgW, maxHpt / imgH, 1);

    const page = pdfDoc.addPage([pageSize.w, pageSize.h]);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const x = (pageSize.w - drawW) / 2;
    const y = (pageSize.h - drawH) / 2;

    page.drawImage(img, { x, y, width: drawW, height: drawH });
  }

  const pdfBytes = await pdfDoc.save();
