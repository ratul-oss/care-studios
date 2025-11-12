// This is the entire file: /api/scan.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');

export default async function handler(req, res) {
  // Check if it's the correct request method and has a body
  if (req.method !== 'POST' || !req.body || !req.body.image) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  
  try {
    // Load credentials from Vercel's secure storage
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    
    const client = new ImageAnnotatorClient({ credentials });
    
    // Send image to Google AI
    const [result] = await client.documentTextDetection(
      Buffer.from(req.body.image, 'base64')
    );

    const detection = result.fullTextAnnotation;

    // ==========================================================
    // !!! THIS IS THE CORRECT, SAFE LOGIC !!!
    // We check for all parts before trying to access them
    // ==========================================================
    if (detection && detection.pages && detection.pages.length > 0 && detection.pages[0].boundingBox && detection.pages[0].boundingBox.vertices) {
      
      // AI found the page corners
      const vertices = detection.pages[0].boundingBox.vertices;
      res.status(200).json({ success: true, corners: vertices });
    
    } else {
      // AI ran but did not find a page in the image
      console.warn("Google AI did not find any document pages in the image.");
      res.status(444).json({ success: false, error: 'No document page found by AI.' }); // Using 444 as a custom "no document" code
    }
    
  } catch (error) {
    // A different, unexpected error happened
    console.error("Error in serverless function:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
