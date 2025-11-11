// =========================
// Care Studio - PDF to JPG Tool
// =========================

// This function is called by ui.js when the button is clicked
function loadPDFtoJPGUI() {
  const container = document.getElementById('tool-container');
  container.innerHTML = `
    <h2>📄 PDF to JPG Converter</h2>
    <p>Upload a PDF file to convert all its pages into JPG images.</p>
    <div class="controls">
      <input type="file" id="pdfFile" accept="application/pdf">
      <button id="convertBtn" class="btn">Convert to JPG</button>
    </div>
    <div id="jpgResult" class="resultGrid"></div>
  `;

  document.getElementById('convertBtn').addEventListener('click', convertPDFtoJPG);
}

// Main conversion logic
async function convertPDFtoJPG() {
  // 1. Tell pdf.js where its "worker" file is
  // (We placed this in the libs/ folder in the previous step)
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';

  const input = document.getElementById('pdfFile');
  if (!input.files.length) return alert('Please select a PDF file.');

  const file = input.files[0];
  const resultDiv = document.getElementById('jpgResult');
  resultDiv.innerHTML = '<p class="loading">Converting... this may take a moment.</p>';

  try {
    const fileData = await file.arrayBuffer();
    
    // 2. Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
    const numPages = pdf.numPages;
    resultDiv.innerHTML = ''; // Clear "loading" message

    // 3. Loop through each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Set a desired scale (e.g., 1.5 for higher quality)
      const scale = 1.5;
      const viewport = page.getViewport({ scale: scale });

      // 4. Create a canvas for the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 5. Render the PDF page onto the canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // 6. Convert canvas to a JPG image
      const dataURL = canvas.toDataURL('image/jpeg', 0.9); // 0.9 = 90% quality

      // 7. Display the image on the page
      const img = new Image();
      img.src = dataURL;
      img.className = 'scannedPage'; // Use existing style
      
      // Make the image downloadable
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `${file.name.replace('.pdf', '')}_page_${i}.jpg`;
      link.appendChild(img);
      
      resultDiv.appendChild(link);
    }
    
    alert('✅ PDF conversion complete!');

  } catch (err) {
    console.error('Error processing PDF:', err);
    alert('Error: Could not process the PDF file.');
    resultDiv.innerHTML = '';
  }
}