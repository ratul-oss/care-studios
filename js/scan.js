// =======================
// Care Studio - Scan Tool
// =======================

let cvReady = false;
let processedImages = [];

// Wait for OpenCV to load
cv['onRuntimeInitialized'] = () => {
  cvReady = true;
  console.log("✅ OpenCV.js loaded and ready!");
};

// Main UI loader (Unchanged)
function loadScanUI() {
  const container = document.getElementById('tool-container');
  container.innerHTML = `
    <h2>📷 Document Scanner</h2>
    <p>Upload your files below. The tool will automatically detect, crop, and enhance like CamScanner.</p>
    
    <!-- Pro Tip Box -->
    <div style="padding: 10px 15px; background: #fff8e1; border-left: 5px solid #ffc107; margin-bottom: 15px; border-radius: 5px;">
      <strong>Pro Tip:</strong> For a perfect scan, place your document on a <strong>dark-colored background</strong> before you take a photo.
    </div>

    <div class="controls">
      <input type="file" id="scanFiles" accept="image/*" multiple>
      <button id="scanProcess" class="btn">Detect & Enhance</button>
      <button id="scanDownload" class="btn">Download as PDF</button>
    </div>
    <div id="scanPreview" class="previewGrid"></div>
    <div id="scanResult" class="resultGrid"></div>
  `;

  document.getElementById('scanProcess').addEventListener('click', processAllFiles);
  document.getElementById('scanDownload').addEventListener('click', downloadPDF);
}

// Helper: sort document corners (Unchanged)
function sortCorners(pts) {
  let cx = 0, cy = 0;
  pts.forEach(p => { cx += p.x; cy += p.y; });
  cx /= pts.length; cy /= pts.length;
  pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let minIdx = 0, minSum = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const s = pts[i].x + pts[i].y;
    if (s < minSum) { minSum = s; minIdx = i; }
  }
  const out = [];
  for (let i = 0; i < 4; i++) out.push(pts[(minIdx + i) % 4]);
  return out;
}

// Auto rotate portrait (Unchanged)
function autoRotate(mat) {
  if (mat.cols <= mat.rows) return mat;
  let tmp = new cv.Mat();
  cv.transpose(mat, tmp);
  cv.flip(tmp, tmp, 1);
  mat.delete();
  return tmp;
}

// Process all uploaded files (Unchanged)
async function processAllFiles() {
  if (!cvReady) return alert('⚠️ OpenCV.js not ready yet!');
  const input = document.getElementById('scanFiles');
  if (!input.files.length) return alert('Please select one or more images.');

  processedImages = [];
  const resultDiv = document.getElementById('scanResult');
  resultDiv.innerHTML = '<p class="loading">Scanning... this may take a moment.</p>'; // Loading message

  for (const file of input.files) {
    try {
      const enhanced = await processSingleFile(file);
      processedImages.push(enhanced);
      
      if(resultDiv.innerHTML.includes('<p class="loading">')) {
         resultDiv.innerHTML = ''; // Clear loading message on first success
      }
      
      const img = new Image();
      img.src = enhanced;
      img.className = 'scannedPage';
      resultDiv.appendChild(img);
    } catch (err) {
      console.error('Error processing file:', file.name, err);
      alert(`Failed to process ${file.name}`);
    }
  }
  
  if(resultDiv.innerHTML.includes('<p class="loading">')) {
     resultDiv.innerHTML = ''; // Clear loading if all failed
  }
  
  if(processedImages.length > 0) {
    alert('✅ Enhancement complete! Scroll down to preview.');
  }
}

// =================================================================
// v v v THIS SECTION HAS BEEN REPLACED v v v
// =================================================================

// NEW VERSION of processSingleFile
// It now calls your Vercel URL to get the AI-powered corners
async function processSingleFile(file) {
  
  // 1. Convert the image file to a base64 string
  const base64Image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // Get just the data
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });

  // 2. Send the image to your new Vercel "lockbox"
  // !!! THIS IS THE CORRECTED URL !!!
  const VERCEL_URL = 'https://care-studios.vercel.app/api/scan'; 

  let data;
  try {
    const response = await fetch(VERCEL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });
    
    if (!response.ok) {
       // AI failed or network error
       console.error("AI scan failed. Falling back to simple resize.");
       return await applyCropAndEnhance(file, null);
    }
    
    data = await response.json();

  } catch (err) {
    console.error("Error calling Vercel function:", err);
    return await applyCropAndEnhance(file, null); // Fallback on network error
  }

  // 3. Get the corner data back from the AI
  if (data.success && data.corners) {
    // AI found the corners! Now we use OpenCV just to CROP and ENHANCE.
    return await applyCropAndEnhance(file, data.corners);
  } else {
    // AI failed. Fall back to just resizing.
    console.warn("AI did not find corners. Falling back to simple resize.");
    return await applyCropAndEnhance(file, null);
  }
}

// NEW FUNCTION
// This holds the CROP/ENHANCE logic from your original file
async function applyCropAndEnhance(file, corners) {
  return new Promise(resolve => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let src = cv.imread(canvas);
      let dst = new cv.Mat();
      const A4_RATIO = 1.4142;
      const WIDTH = 900;
      const HEIGHT = Math.round(WIDTH * A4_RATIO);

      if (corners) {
        // AI SUCCESS: We use the corners from Google AI
        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          corners[0].x, corners[0].y,
          corners[1].x, corners[1].y,
          corners[2].x, corners[2].y,
          corners[3].x, corners[3].y
        ]);
        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, WIDTH, 0, WIDTH, HEIGHT, 0, HEIGHT]);
        const M = cv.getPerspectiveTransform(srcTri, dstTri);
        cv.warpPerspective(src, dst, M, new cv.Size(WIDTH, HEIGHT));
        srcTri.delete(); dstTri.delete(); M.delete();
      } else {
        // AI FAILED: Just resize the image (our old fallback)
        console.warn("No corners found. Using simple resize.");
        cv.resize(src, dst, new cv.Size(WIDTH, HEIGHT));
      }

      dst = autoRotate(dst);

      // B/W enhancement (This code is unchanged from your file)
      let bw = new cv.Mat();
      cv.cvtColor(dst, bw, cv.COLOR_RGBA2GRAY, 0);
      cv.adaptiveThreshold(bw, bw, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 25, 11);

      // Sharpen (This code is unchanged from your file)
      let kernelSharp = cv.matFromArray(3, 3, cv.CV_32F, [-1,-1,-1,-1,9,-1,-1,-1,-1]);
      let sharp = new cv.Mat();
      cv.filter2D(bw, sharp, cv.CV_8U, kernelSharp);

      // Render result (This code is unchanged from your file)
      const outCanvas = document.createElement('canvas');
      cv.imshow(outCanvas, sharp);
      const dataURL = outCanvas.toDataURL('image/jpeg', 1.0);

      // Cleanup
      src.delete(); bw.delete(); dst.delete(); sharp.delete(); kernelSharp.delete();
      resolve(dataURL);
    };
  });
}
// =================================================================
// ^ ^ ^ THIS SECTION HAS BEEN REPLACED ^ ^ ^
// =================================================================


// Merge enhanced pages into one A4 PDF (Unchanged)
async function downloadPDF() {
  if (!processedImages.length) return alert('No processed images found.');
  const pdfDoc = await PDFLib.PDFDocument.create();
  const A4_W = 595.28, A4_H = 841.89;

  for (const imgUrl of processedImages) {
    const bytes = await fetch(imgUrl).then(r => r.arrayBuffer());
    const jpg = await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([A4_W, A4_H]);
    const aspect = jpg.width / jpg.height;
    let drawW = A4_W, drawH = A4_W / aspect;
    if (drawH > A4_H) {
      drawH = A4_H;
      drawW = A4_H * aspect;
    }
    page.drawImage(jpg, { x: (A4_W - drawW)/2, y: (A4_H - drawH)/2, width: drawW, height: drawH });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'CareStudio_Scanned.pdf';
  link.click();
}
