// =====================================
// Care Studio - Advanced Image to PDF
// =====================================

let uploadedImages = [];

// UI Loader
function loadImageToPDFUI() {
  const container = document.getElementById('tool-container');
  container.innerHTML = `
    <h2>🖼️ Image to PDF Converter</h2>
    <p>Upload JPG or PNG images. Drag, reorder, remove, scan & convert.</p>

    <div id="dropZone" class="dropZone">
      Drag & Drop Images Here or Click to Upload
      <input type="file" id="imageInput" accept="image/jpeg,image/png" multiple hidden>
    </div>

    <div class="controls">
      <label>
        <input type="checkbox" id="bwMode"> Scan Mode (Black & White)
      </label>

      <select id="pageSize">
        <option value="auto">Auto Page Size</option>
        <option value="A4">A4</option>
        <option value="LETTER">Letter</option>
      </select>

      <button class="btn" id="convertBtn">Convert to PDF</button>
    </div>

    <div id="previewGrid" class="previewGrid"></div>
  `;

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('imageInput');

  dropZone.onclick = () => fileInput.click();
  fileInput.onchange = e => handleFiles(e.target.files);

  dropZone.ondragover = e => {
    e.preventDefault();
    dropZone.classList.add('dragOver');
  };

  dropZone.ondragleave = () => dropZone.classList.remove('dragOver');

  dropZone.ondrop = e => {
    e.preventDefault();
    dropZone.classList.remove('dragOver');
    handleFiles(e.dataTransfer.files);
  };

  document.getElementById('convertBtn').onclick = convertToPDF;
}

// ==========================
// Handle Uploads
// ==========================
function handleFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    uploadedImages.push({
      file,
      url: URL.createObjectURL(file)
    });
  }
  renderPreview();
}

// ==========================
// Preview Grid
// ==========================
function renderPreview() {
  const grid = document.getElementById('previewGrid');
  grid.innerHTML = '';

  uploadedImages.forEach((img, index) => {
    const div = document.createElement('div');
    div.className = 'previewItem';

    div.innerHTML = `
      <img src="${img.url}">
      <div class="previewActions">
        <button onclick="moveImage(${index}, -1)">⬆️</button>
        <button onclick="moveImage(${index}, 1)">⬇️</button>
        <button onclick="removeImage(${index})">❌</button>
      </div>
    `;
    grid.appendChild(div);
  });
}

function moveImage(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= uploadedImages.length) return;
  [uploadedImages[index], uploadedImages[newIndex]] =
  [uploadedImages[newIndex], uploadedImages[index]];
  renderPreview();
}

function removeImage(index) {
  uploadedImages.splice(index, 1);
  renderPreview();
}

// ==========================
// Image Processing
// ==========================
async function processImage(file, bwMode) {
  if (!bwMode) return file.arrayBuffer();

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const avg = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
    const bw = avg > 180 ? 255 : 0;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = bw;
  }
  ctx.putImageData(data, 0, 0);

  return new Promise(resolve => canvas.toBlob(b => b.arrayBuffer().then(resolve), 'image/jpeg', 0.6));
}

// ==========================
// Convert to PDF
// ==========================
async function convertToPDF() {
  if (!uploadedImages.length) {
    alert('No images uploaded.');
    return;
  }

  const bwMode = document.getElementById('bwMode').checked;
  const pageSize = document.getElementById('pageSize').value;

  const pdfDoc = await PDFLib.PDFDocument.create();

  for (const img of uploadedImages) {
    const imgBytes = await processImage(img.file, bwMode);

    const embedded = img.file.type === 'image/png'
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);

    let pageW = embedded.width;
    let pageH = embedded.height;

    if (pageSize === 'A4') {
      pageW = 595.28;
      pageH = 841.89;
    } else if (pageSize === 'LETTER') {
      pageW = 612;
      pageH = 792;
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    const { width, height } = embedded.scaleToFit(pageW, pageH);

    page.drawImage(embedded, {
      x: (pageW - width) / 2,
      y: (pageH - height) / 2,
      width,
      height
    });
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');

  const baseName = uploadedImages[0].file.name.split('.')[0];
  link.download = `CareStudio_${baseName}.pdf`;
  link.href = URL.createObjectURL(blob);
  link.click();

  alert('✅ PDF created successfully!');
}
