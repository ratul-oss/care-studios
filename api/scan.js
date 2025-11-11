
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
    if (detection && detection.pages[0] && detection.pages[0].blocks[0] && detection.pages[0].blocks[0].boundingBox) {
      const vertices = detection.pages[0].blocks[0].boundingBox.vertices;
      res.status(200).json({ success: true, corners: vertices });
    } else {
      res.status(404).json({ success: false, error: 'No document found.' });
    }
  } catch (error) {
    console.error("Error in serverless function:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}