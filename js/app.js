
// Fix A: Global Drag&Drop verhindern (sonst öffnet der Browser Bilder im Tab)
['dragenter','dragover','dragleave','drop'].forEach(evt => {
  window.addEventListener(evt, e => {
    e.preventDefault();
  });
});

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const formatSel = document.getElementById('format');
const qualityInput = document.getElementById('quality');
const maxWidthInput = document.getElementById('maxWidth');
const convertBtn = document.getElementById('convertBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const resultsEl = document.getElementById('results');

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

// Fix B: Click auf Dropzone -> Dateidialog
if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
}
if (fileInput) {
  fileInput.addEventListener('change', e => handleFiles([...e.target.files]));
}

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

async function convertImage(file, targetType, quality, maxW) {
  const imgBitmap = await createImageBitmap(file);
  let { width, height } = imgBitmap;
  if (maxW && maxW > 0 && width > maxW) {
    height = Math.round(height * (maxW / width));
    width = maxW;
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgBitmap, 0, 0, width, height);

  let type = targetType;
  if (type === 'image/avif' && !supports.avif) type = supports.webp ? 'image/webp' : 'image/jpeg';
  if (type === 'image/webp' && !supports.webp) type = 'image/jpeg';

  const blob = await canvas.convertToBlob({ type, quality: Number(quality) || 0.8 });
  return blob;
}

convertBtn.addEventListener('click', async () => {
  convertBtn.disabled = true;
  outputs = [];
  const targetType = formatSel.value;
  const quality = qualityInput.value;
  const maxW = Number(maxWidthInput.value || 0);

  for (const f of files) {
    try {
      const blob = await convertImage(f, targetType, quality, maxW);
      const outName = renameToExt(f.name, targetType);
      outputs.push({ name: outName, blob });
      appendResultCard(f, blob, outName);
    } catch (e) {
      appendErrorCard(f, e); console.error(e);
    }
  }

  downloadAllBtn.disabled = outputs.length === 0;
  convertBtn.disabled = false;
});

function renameToExt(name, mime) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
  const ext = map[mime] || 'bin';
  return name.replace(/\.[^.]+$/, '') + '.' + ext;
}

function appendResultCard(origFile, blob, outName) {
  const url = URL.createObjectURL(blob);
  const card = document.createElement('div');
  card.className = 'card';
  const a = document.createElement('a');
  a.href = url; a.download = outName; a.textContent = 'Download';
  a.style.display = 'inline-block'; a.style.marginTop = '8px';
  card.innerHTML = `
    <div><strong>${escapeHtml(outName)}</strong></div>
    <div class="muted">${Math.round(blob.size/1024)} KB</div>`;
  card.appendChild(a);
  resultsEl.appendChild(card);
}

function appendErrorCard(file, err) {
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div><strong>${escapeHtml(file.name)}</strong></div>
    <div class="muted" style="color:#b00020;">Fehler: ${escapeHtml(err.message || 'Konvertierung fehlgeschlagen')}</div>`;
  resultsEl.appendChild(card);
}

// Fix C: richtige Variable verwenden
if (downloadAllBtn) {
  downloadAllBtn.addEventListener('click', () => {
    alert('Für ZIP-Download füge ich dir auf Wunsch JSZip hinzu.');
  });
}
