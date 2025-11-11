// This is the entire file: /api/scan.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');

export default async function handler(req, res) {
  if (req.method !== 'POST' || !req.body || !req.body.image) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  try {
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    const client = new ImageAnnotatorClient({ credentials });
    
    const [result] = await client.documentTextDetection(
      Buffer.from(req.body.image, 'base64')
    );

    const detection = result.fullTextAnnotation;

    // ==========================================================
    // !!! THIS IS THE UPDATED, SAFER LOGIC !!!
    // We now check if detection.pages exists AND has items in it
    // ==========================================================
    if (detection && detection.pages && detection.pages.length > 0 && detection.pages[0].boundingBox && detection.pages[0].boundingBox.vertices) {
      
      const vertices = detection.pages[0].boundingBox.vertices;
      res.status(200).json({ success: true, corners: vertices });
    
    } else {
      // AI couldn't find a document page
      console.warn("Google AI did not find any document pages in the image.");
      res.status(404).json({ success: false, error: 'No document page found by AI.' });
    }
  } catch (error) {
    // Handle any other errors
    console.error("Error in serverless function:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}