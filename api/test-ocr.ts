import type { VercelRequest, VercelResponse } from '@vercel/node';

// A helper function to handle CORS preflight requests
function handleCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(200).end();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return handleCors(res);
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const apiKey = process.env.CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key for Cloud Vision is not configured' });
    }

    const projectId = 'taejaeopenshelf';
    // Using the regional US endpoint as a last attempt to resolve the 404.
    const visionApiUrl = `https://us-vision.googleapis.com/v1/projects/${projectId}/locations/us/images:annotate?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: {
            source: {
              imageUri: imageUrl,
            },
          },
          features: [
            {
              type: 'TEXT_DETECTION',
            },
          ],
        },
      ],
    };

    const visionResponse = await fetch(visionApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!visionResponse.ok) {
      const errorBody = await visionResponse.text();
      console.error('Google Cloud Vision API error:', errorBody);
      return res.status(visionResponse.status).json({ error: 'Failed to call Vision API', details: errorBody });
    }

    const visionData = await visionResponse.json();

    // Return the full response for now to allow the test script to analyze it.
    // In a real implementation, we would parse this to extract the most relevant text.
    res.status(200).json(visionData);

  } catch (e: any) {
    console.error('Error in test-ocr handler:', e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
