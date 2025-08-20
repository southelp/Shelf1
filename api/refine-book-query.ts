// api/refine-book-query.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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
    const { query } = body || {}
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query string required' })
    }

    const prompt =
      `사용자의 책 검색어 "${query}"를 분석하여 가장 정확하다고 생각하는 책 제목과 저자를 JSON 형식으로 추출해주세요. 저자 정보가 명확하지 않으면 null로 처리해도 됩니다. 응답은 하나의 JSON 객체여야 합니다. 이 검색어는 책 표지에서 추출된 것일 수 있으므로, 오타나 불분명한 부분이 있을 수 있습니다. 최대한 정확한 책 제목을 추측해주세요.
출력 예시: {"title":"책 제목","author":"저자 이름"}`

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
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
        return res.status(404).json({ error: 'Could not refine query.', debug: { jsonText } })
    }

    return res.status(200).json({ refinedQuery: extracted.title, refinedAuthor: extracted.author || null })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message || String(e) })
  }
}
