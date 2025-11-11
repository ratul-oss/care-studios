// =========================
// Care Studio - Merge PDF Tool
// =========================

// This function is called by ui.js
function loadMergePDFUI() {
  const container = document.getElementById('tool-container');
  container.innerHTML = `
    <h2>📚 Merge PDFs</h2>
    <p>Select two or more PDF files to combine them into one.</p>
    <div class="controls">
      <input type="file" id="pdfFiles" accept="application/pdf" multiple>
      <button id="mergeBtn" class="btn">Merge PDFs</button>
    </div>
  `;

  document.getElementById('mergeBtn').addEventListener('click', mergePDFs);
}

// The main merge logic
async function mergePDFs() {
  const input = document.getElementById('pdfFiles');
  if (input.files.length < 2) return alert('Please select two or more PDF files.');

  const mergedPdf = await PDFLib.PDFDocument.create();

  for (const file of input.files) {
    const pdfBytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(pdfBytes);
    
    // Get the indices of all pages
    const pageIndices = pdf.getPageIndices();
    
    // Copy the pages from the source pdf to the new one
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
    
    // Add the copied pages to the new pdf
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  // Save the merged PDF
  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'CareStudio_Merged.pdf';
  link.click();

  alert('✅ PDFs merged successfully!');
}