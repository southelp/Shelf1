// api/search-book-by-title.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS 설정 함수
function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 연도 추출 헬퍼 함수
const yearFrom = (s?: string) => {
  if (!s) return null;
  const m = s.match(/\d{4}/);
  return m ? Number(m[0]) : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { query } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'A "query" string is required.' });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

    let searchResults: any[] = [];
    const seen = new Set<string>();

    // 1. Kakao Books API 검색
    if (KAKAO_REST_API_KEY) {
        const kakaoUrl = `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(query)}&size=5`;
        const kakaoRes = await fetch(kakaoUrl, { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } });
        if (kakaoRes.ok) {
            const kakaoJson = await kakaoRes.json();
            const docs = (kakaoJson.documents || []).map((item: any) => {
                const isbn13 = (item.isbn || '').split(' ').find((x: string) => x.length === 13) || null;
                const key = `${item.title}|${(item.authors || []).join(',')}`;
                return { ...item, isbn13, key };
            });
            for (const doc of docs) {
                if (!seen.has(doc.key)) {
                    searchResults.push(doc);
                    seen.add(doc.key);
                }
            }
        }
    }

    // 2. Google Books API 검색 (Kakao 결과가 부족할 경우)
    if (searchResults.length < 5) {
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&langRestrict=ko&maxResults=5`;
        const googleRes = await fetch(googleUrl + (GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}`:''));
        if(googleRes.ok) {
            const googleJson = await googleRes.json();
            const items = (googleJson.items || []).map((item: any) => {
                const vi = item.volumeInfo;
                const isbn13 = vi.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier || null;
                const key = `${vi.title}|${(vi.authors || []).join(',')}`;
                return { ...item, isbn13, key };
            });
            for (const item of items) {
                if (!seen.has(item.key) && searchResults.length < 5) {
                    searchResults.push(item);
                    seen.add(item.key);
                }
            }
        }
    }

    // 3. 결과를 프론트엔드에 맞는 형식으로 변환
    const candidates = searchResults.map(item => {
        const isGoogle = 'volumeInfo' in item;
        const info = isGoogle ? item.volumeInfo : item;
        
        return {
            isbn13: item.isbn13,
            isbn10: isGoogle 
                ? info.industryIdentifiers?.find((i: any) => i.type === 'ISBN_10')?.identifier
                : (info.isbn || '').split(' ').find((x: string) => x.length === 10) || null,
            title: info.title,
            authors: info.authors || [],
            publisher: info.publisher,
            published_year: yearFrom(isGoogle ? info.publishedDate : info.datetime),
            cover_url: isGoogle ? info.imageLinks?.thumbnail : info.thumbnail,
            google_books_id: isGoogle ? item.id : undefined,
        };
    }).filter(c => c.title); // 제목이 없는 결과는 제외

    res.status(200).json({ candidates });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}