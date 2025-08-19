// api/gemini-cover-to-book.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

// 프론트엔드가 기대하는 후보 타입
type Candidate = {
  score: number
  isbn13?: string | null
  isbn10?: string | null
  title?: string
  authors?: string[]
  publisher?: string
  published_year?: number | null
  cover_url?: string | null
  google_books_id?: string
}

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

// 날짜 문자열에서 연도만 추출하는 함수
const yearFrom = (s?: string) => {
  if (!s) return null
  const m = s.match(/\d{4}/)
  return m ? Number(m[0]) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    let { imageBase64, maxCandidates = 5 } = body || {}
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 required' })
    }
    imageBase64 = stripDataUrl(imageBase64)

    // 1. Gemini API 호출: 책 표지 이미지에서 정보 추론
    const prompt =
      `이 이미지는 책 표지입니다. 이미지에서 책 제목, 저자, 그리고 이 책의 언어를 "Korean" 또는 "Foreign"으로 추론하여 JSON 형식으로 추출해주세요.
출력 예시: [{"title":"...","author":"...","language":"Korean"}]`

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  author: { type: 'STRING' },
                  language: { type: 'STRING' },
                },
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
    const jsonText =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    let extracted: Array<{ title: string; author?: string; language?: string }> = []
    try { extracted = JSON.parse(jsonText) } catch { extracted = [] }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return res.status(200).json({ candidates: [], debug: { extracted } })
    }

    // 2. 언어에 따라 Kakao/Google Books API에서 메타데이터 보강
    const out: Candidate[] = []
    const seen = new Set<string>()

    for (const b of extracted.slice(0, 8)) {
      const tt = (b.title || '').trim()
      if (!tt) continue

      let byKakao = false
      let item: any = null
      try {
        if ((b.language || '').toLowerCase() === 'korean' && KAKAO_REST_API_KEY) {
          const kakao = await fetch(
            `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(tt)}`,
            { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } }
          )
          const kj = await kakao.json().catch(() => ({} as any))
          item = kj?.documents?.[0] || null
          byKakao = Boolean(item)
        }

        if (!item) {
          const gb = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:"${tt}"`)}${GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : ''}&maxResults=5`
          )
          const gj = await gb.json().catch(() => ({} as any))
          item = gj?.items?.[0] || null
        }
      } catch (e) {
        // 개별 API 호출 실패는 무시하고 다음 후보로 진행
        item = null
      }

      // 3. 최종 후보(Candidate) 데이터 구성
      let cand: Candidate | null = null
      if (byKakao && item) {
        cand = {
          score: 1,
          isbn13: (item.isbn || '').split(' ').find((x: string) => x.length === 13) || null,
          isbn10: (item.isbn || '').split(' ').find((x: string) => x.length === 10) || null,
          title: item.title || tt,
          authors: Array.isArray(item.authors) ? item.authors : (item.authors ? [item.authors] : []),
          publisher: item.publisher || undefined,
          published_year: yearFrom(item.datetime),
          cover_url: item.thumbnail || null,
          google_books_id: undefined,
        }
      } else if (item?.volumeInfo) {
        const vi = item.volumeInfo
        const ids = vi.industryIdentifiers || []
        cand = {
          score: 1,
          isbn13: ids.find((x: any) => x.type === 'ISBN_13')?.identifier || null,
          isbn10: ids.find((x: any) => x.type === 'ISBN_10')?.identifier || null,
          title: vi.title || tt,
          authors: vi.authors || [],
          publisher: vi.publisher || undefined,
          published_year: yearFrom(vi.publishedDate),
          cover_url: vi.imageLinks?.thumbnail || null,
          google_books_id: item.id,
        }
      } else {
        // API 매칭 실패 시, Gemini 결과만이라도 반영
        cand = {
          score: 0.5,
          isbn13: null,
          isbn10: null,
          title: tt,
          authors: b.author ? [b.author] : [],
          publisher: undefined,
          published_year: null,
          cover_url: null,
        }
      }

      // 스코어 보정 및 중복 제거
      if (cand) {
        if (cand.isbn13 || cand.isbn10) cand.score += 1
        if (cand.cover_url) cand.score += 0.5
        const key = `${(cand.title || '').toLowerCase()}|${(cand.authors || []).join(',').toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          out.push(cand)
        }
      }
      if (out.length >= Math.max(3, Math.min(maxCandidates, 8))) break
    }

    out.sort((a, b) => b.score - a.score)
    return res.status(200).json({ candidates: out, debug: { extracted } })
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message || String(e) })
  }
}