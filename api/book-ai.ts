// api/book-ai.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// --- Security Enhancements ---

// 1. Supabase Server-side Client for Authentication
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key is missing.')
}
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

// 2. In-memory Rate Limiting
const rateLimitStore: Record<string, { count: number; timestamp: number }> = {}
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10 // Max requests per window

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const userData = rateLimitStore[userId]

  if (userData && now - userData.timestamp < RATE_LIMIT_WINDOW) {
    if (userData.count >= RATE_LIMIT_MAX_REQUESTS) {
      return true // Rate limited
    }
    rateLimitStore[userId].count++
  } else {
    // Reset or create new entry
    rateLimitStore[userId] = { count: 1, timestamp: now }
  }
  return false
}

// --- CORS and Helper Functions ---

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function stripDataUrl(b64: string) {
  const i = b64.indexOf('base64,')
  return i >= 0 ? b64.slice(i + 'base64,'.length) : b64
}

// --- Gemini API Logic ---

async function handleCoverToBook(req: VercelRequest, res: VercelResponse) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  let { imageBase64 } = body.payload || {}
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
}

async function handleRefineQuery(req: VercelRequest, res: VercelResponse) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { query } = body.payload || {}
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
}

// --- Main Handler ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })

  try {
    // 1. Authentication
    if (!supabase) {
      return res.status(500).json({ error: 'Authentication service is not available.' })
    }
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is missing.' })
    }
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized', details: userError?.message })
    }

    // 2. Rate Limiting
    if (isRateLimited(user.id)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    // 3. Action Handling
    const { action } = req.body || {}
    
    switch (action) {
      case 'cover-to-book':
        return await handleCoverToBook(req, res)
      case 'refine-query':
        return await handleRefineQuery(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message || String(e) })
  }
}