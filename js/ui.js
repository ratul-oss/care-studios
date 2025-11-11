document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.getAttribute('data-tool');
    loadTool(tool);
  });
});

function loadTool(toolName) {
  const container = document.getElementById('tool-container');
  container.innerHTML = `<p class="loading">Loading ${toolName}...</p>`;

  // Load tool UIs dynamically
  if (toolName === 'scan') loadScanUI();
  else if (toolName === 'jpg2pdf') loadJPGtoPDFUI();
  else if (toolName === 'pdf2jpg') loadPDFtoJPGUI();
  else if (toolName === 'mergepdf') loadMergePDFUI();
}
