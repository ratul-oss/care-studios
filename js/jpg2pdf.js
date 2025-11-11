// =========================
// Care Studio - JPG to PDF Tool
// =========================

// This function is called by ui.js when the button is clicked
function loadJPGtoPDFUI() {
  const container = document.getElementById('tool-container');
  container.innerHTML = `
    <h2>🖼️ JPG to PDF Converter</h2>
    <p>Upload one or more JPG images to combine into a single PDF.</p>
    <div class="controls">
      <input type="file" id="jpgFiles" accept="image/jpeg" multiple>
      <button id="jpgConvertBtn" class="btn">Convert to PDF</button>
    </div>
    <div id="jpgPreview" class="previewGrid"></div>
  `;

  document.getElementById('jpgFiles').addEventListener('change', handleJPGPreview);
  document.getElementById('jpgConvertBtn').addEventListener('click', convertToPDF);
}

// Show a preview of the selected images
function handleJPGPreview(event) {
  const preview = document.getElementById('jpgPreview');
  preview.innerHTML = '';
  for (const file of event.target.files) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.className = 'scannedPage'; // Use existing style
    preview.appendChild(img);
  }
}

// The main conversion logic
async function convertToPDF() {
  const input = document.getElementById('jpgFiles');
  if (!input.files.length) return alert('Please select one or more JPG images.');

  const pdfDoc = await PDFLib.PDFDocument.create();
  const A4_W = 595.28, A4_H = 841.89; // A4 page size in points

  for (const file of input.files) {
    // Read the file into memory
    const jpgBytes = await file.arrayBuffer();
    // Embed the JPG image
    const jpgImage = await pdfDoc.embedJpg(jpgBytes);
    
    const page = pdfDoc.addPage([A4_W, A4_H]);
    
    // Scale the image to fit the A4 page
    const { width: imgW, height: imgH } = jpgImage.scaleToFit(A4_W, A4_H);

    // Draw the image centered on the page
    page.drawImage(jpgImage, {
      x: (A4_W - imgW) / 2,
      y: (A4_H - imgH) / 2,
      width: imgW,
      height: imgH,
    });
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'CareStudio_Converted.pdf';
  link.click();

  alert('✅ PDF created successfully!');
}