import type { VercelRequest, VercelResponse } from '@vercel/node'

type BookCandidate = {
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

function yearFrom(p?: string): number | null {
  if (!p) return null
  const y = parseInt(p.slice(0, 4), 10)
  return Number.isFinite(y) ? y : null
}
function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}
function takeTitleLinesFromOCR(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3)
    .filter((l) => !/^(isbn|barcode|www\.|http)/i.test(l))
    .filter((l) => !/(volume|series|edition|novel|만화|증보|개정)/i.test(l))
  const uniq = Array.from(new Set(lines))
  return uniq.sort((a, b) => b.length - a.length).slice(0, 5)
}
function buildQueries(
  bestGuessLabels: string[],
  webEntities: Array<{ description?: string; score?: number }>,
  ocrTitleLines: string[]
): string[] {
  const picks: string[] = []
  for (const l of bestGuessLabels) {
    const t = l.trim()
    if (t && t.length > 2) picks.push(`intitle:"${t}"`)
  }
  const topEntities = webEntities
    .filter((e) => e.description && (e.score ?? 0) > 0.2)
    .slice(0, 8)
    .map((e) => e.description!.trim())
  for (const e of topEntities) {
    if (/book|novel|series|comic/i.test(e)) continue
    if (e.length > 2) picks.push(`intitle:"${e}"`)
  }
  for (const l of ocrTitleLines) {
    const t = l.replace(/[^\p{L}\p{N}\s:'"-]/gu, '').trim()
    if (t.length > 2) picks.push(`intitle:"${t}"`)
  }
  return Array.from(new Set(picks)).slice(0, 10)
}
function scoreCandidate(item: any, signals: { labelBag: string[]; entityBag: string[]; ocrBag: string[] }) {
  const title = normalize(item?.volumeInfo?.title ?? '')
  const authors: string[] = item?.volumeInfo?.authors ?? []
  const joinedAuthors = normalize(authors.join(' '))
  const lang = item?.volumeInfo?.language ?? ''
  const cover = item?.volumeInfo?.imageLinks?.thumbnail ?? ''

  let score = 0
  for (const t of [...signals.labelBag, ...signals.entityBag, ...signals.ocrBag]) {
    const n = normalize(t)
    if (n && title.includes(n)) score += 2
    if (n && joinedAuthors.includes(n)) score += 1.5
  }
  if (lang === 'ko') score += 1
  if (cover) score += 0.5
  return score
}

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })

  // 환경변수 디버깅
  console.log("[DEBUG] GCLOUD_VISION_API_KEY:", process.env.GCLOUD_VISION_API_KEY)
  console.log("[DEBUG] GOOGLE_BOOKS_API_KEY:", process.env.GOOGLE_BOOKS_API_KEY)

  try {
    const VISION_KEY = process.env.GCLOUD_VISION_API_KEY
    const BOOKS_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''
    // 상태값만 남겨도 됨
    if (!VISION_KEY) {
      console.error("[ERROR] Missing GCLOUD_VISION_API_KEY. 환경변수 값:", VISION_KEY)
      return res.status(500).json({ error: 'Missing GCLOUD_VISION_API_KEY', env: process.env })
    }

    const { imageBase64, maxCandidates = 5 } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 required' })
    }

    // Google Vision API 요청
    const vResp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION' }
          ]
        }]
      })
    })
    const vJson = await vResp.json()
    if (!vJson || !vJson.responses) {
      console.error("[ERROR] Vision API response error:", vJson)
      return res.status(500).json({ error: 'Vision API response error', data: vJson })
    }
    const v = vJson.responses[0] || {}
    const bestGuessLabels: string[] = v?.webDetection?.bestGuessLabels?.map((x: any) => x.label) ?? []
    const webEntities: Array<{ description?: string; score?: number }> = v?.webDetection?.webEntities ?? []
    const text = v?.fullTextAnnotation?.text || v?.textAnnotations?.[0]?.description || ''
    const ocrTitleLines = takeTitleLinesFromOCR(text)

    const labelBag = bestGuessLabels.slice(0, 3)
    const entityBag = webEntities.filter(e => e.description && (e.score ?? 0) >= 0.3).slice(0, 5).map(e => e.description as string)
    const ocrBag = ocrTitleLines.slice(0, 3)

    // Google Books API 후보 수집
    const queries = buildQueries(bestGuessLabels, webEntities, ocrTitleLines)
    const seenIds = new Set<string>()
    const candidates: BookCandidate[] = []
    for (const q of queries) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}${BOOKS_KEY ? `&key=${BOOKS_KEY}` : ''}&maxResults=5`
      const bResp = await fetch(url)
      const bJson = await bResp.json().catch(()=> ({}))
      const items: any[] = bJson?.items ?? []
      for (const item of items) {
        const id = item.id as string
        if (seenIds.has(id)) continue
        seenIds.add(id)
        const ids = item?.volumeInfo?.industryIdentifiers ?? []
        const isbn13 = ids.find((x: any) => x.type === 'ISBN_13')?.identifier || null
        const isbn10 = ids.find((x: any) => x.type === 'ISBN_10')?.identifier || null
        const c: BookCandidate = {
          score: 0,
          isbn13,
          isbn10,
          title: item?.volumeInfo?.title,
          authors: item?.volumeInfo?.authors ?? [],
          publisher: item?.volumeInfo?.publisher ?? undefined,
          published_year: yearFrom(item?.volumeInfo?.publishedDate),
          cover_url: item?.volumeInfo?.imageLinks?.thumbnail ?? null,
          google_books_id: id,
        }
        c.score = scoreCandidate(item, { labelBag, entityBag, ocrBag })
        candidates.push(c)
      }
      if (candidates.length >= maxCandidates * 2) break
    }

    const top = candidates.sort((a, b) => b.score - a.score).slice(0, Math.max(3, Math.min(maxCandidates, 8)))
    return res.status(200).json({ candidates: top, debug: { bestGuessLabels, ocrTitleLines } })
  } catch (e: any) {
    // catch문에서 에러 및 환경 상태 만 로그
    console.error("[CATCH ERROR]", e)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message, env: process.env })
  }
}
