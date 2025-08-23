// api/gemini-cover-to-book.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// Data URL에서 Base64 데이터만 추출하는 함수
function stripDataUrl(b64: string) {
  const i = b64.indexOf('base64,')
  return i >= 0 ? b64.slice(i + 'base64,'.length) : b64
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    let { imageBase64 } = body || {}
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 required' })
    }
    imageBase64 = stripDataUrl(imageBase64)

    const prompt =
      `이 이미지는 책 표지입니다. 이미지에서 부제나 시리즈명을 제외한 메인 제목과 저자를 추출하여 JSON 형식으로 응답해주세요. 저자 정보가 명확하지 않으면 null로 처리해도 됩니다. 응답은 하나의 JSON 객체여야 합니다.
출력 예시: {"title":"메인 제목","author":"저자 이름"}`

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
    )

    if (!geminiResp.ok) {
      const t = await geminiResp.text().catch(() => '')
      throw new Error(`Gemini error: ${geminiResp.status} ${geminiResp.statusText} ${t}`)
    }

    const geminiJson = await geminiResp.json()
    const jsonText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    let extracted: { title?: string; author?: string } = {}
    try {
      extracted = JSON.parse(jsonText)
    } catch {
      // 파싱 실패 시 빈 객체로 처리
    }

    if (!extracted.title) {
        return res.status(404).json({ error: 'Could not extract title from image.', debug: { jsonText } })
    }

    return res.status(200).json({ title: extracted.title, author: extracted.author || null })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message || String(e) })
  }
}
