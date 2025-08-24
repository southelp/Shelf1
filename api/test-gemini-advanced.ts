import type { VercelRequest, VercelResponse } from '@vercel/node';

function handleCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(200).end();
}

function stripDataUrl(b64: string) {
  const i = b64.indexOf('base64,');
  return i >= 0 ? b64.slice(i + 'base64,'.length) : b64;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return handleCors(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const { imageBase64: b64 } = req.body;
    if (!b64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    const imageBase64 = stripDataUrl(b64);

    const prompt =
      `이 이미지는 책 표지입니다. 이미지에서 부제나 시리즈명을 제외한 메인 제목과 저자를 추출하여 JSON 형식으로 응답해주세요. 저자 정보가 명확하지 않으면 null로 처리해도 됩니다. 응답은 하나의 JSON 객체여야 합니다.
출력 예시: {"title":"메인 제목","author":"저자 이름"}`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                author: { type: 'STRING' },
              },
            },
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errorText = await geminiResp.text();
      console.error('Advanced Gemini API error:', errorText);
      return res.status(geminiResp.status).json({ error: 'Failed to call Gemini API', details: errorText });
    }

    const geminiJson = await geminiResp.json();
    const jsonText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let extracted: { titles?: string[] } = {};
    try {
      extracted = JSON.parse(jsonText);
    } catch {
      // ignore parsing failure
    }

    if (!extracted.titles || extracted.titles.length === 0) {
      return res.status(404).json({ error: 'Could not extract any titles from image.', debug: { jsonText } });
    }

    // Return the list of titles. The test script will use the first one.
    return res.status(200).json({ titles: extracted.titles });

  } catch (e: any) {
    console.error('Error in test-gemini-advanced handler:', e);
    return res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
