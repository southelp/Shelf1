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
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

    let searchResults: any[] = [];
    const seen = new Set<string>();

    // Helper to add unique results
    const addUniqueResults = (items: any[], isGoogle: boolean = false, isNaver: boolean = false) => {
        for (const item of items) {
            const info = isGoogle ? item.volumeInfo : item;
            const title = info.title || '';
            const authors = (isNaver ? item.author.split('|').filter(Boolean) : (info.authors || [])).join(',');
            const key = `${title}|${authors}`;
            
            if (!seen.has(key)) {
                searchResults.push({ ...item, isGoogle, isNaver, key });
                seen.add(key);
            }
        }
    };

    // 1. Naver Books API 검색
    if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
        const naverUrl = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=5`;
        const naverRes = await fetch(naverUrl, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
        });
        if (naverRes.ok) {
            const naverJson = await naverRes.json();
            addUniqueResults(naverJson.items || [], false, true);
        }
    }

    // 2. Kakao Books API 검색 (Naver 결과가 부족할 경우)
    if (searchResults.length < 5 && KAKAO_REST_API_KEY) {
        const kakaoUrl = `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(query)}&size=5`;
        const kakaoRes = await fetch(kakaoUrl, { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } });
        if (kakaoRes.ok) {
            const kakaoJson = await kakaoRes.json();
            addUniqueResults(kakaoJson.documents || []);
        }
    }

    // 3. Google Books API 검색 (Naver/Kakao 결과가 부족할 경우)
    if (searchResults.length < 5) {
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&langRestrict=ko&maxResults=5`;
        const googleRes = await fetch(googleUrl + (GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}`:''));
        if(googleRes.ok) {
            const googleJson = await googleRes.json();
            addUniqueResults(googleJson.items || [], true);
        }
    }

    // 4. 최종 후보 데이터 구성
    const candidates = searchResults.slice(0, 5).map(item => {
        const isGoogle = item.isGoogle;
        const isNaver = item.isNaver;
        const info = isGoogle ? item.volumeInfo : item;
        
        let isbn13 = null;
        let isbn10 = null;
        let cover_url = null;

        if (isGoogle) {
            isbn13 = info.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier || null;
            isbn10 = info.industryIdentifiers?.find((i: any) => i.type === 'ISBN_10')?.identifier || null;
            cover_url = info.imageLinks?.thumbnail || null;
        } else if (isNaver) {
            isbn13 = item.isbn || null; // Naver provides isbn directly
            isbn10 = null; // Naver usually provides only isbn13
            cover_url = item.image || null;
        } else { // Kakao
            isbn13 = (item.isbn || '').split(' ').find((x: string) => x.length === 13) || null;
            isbn10 = (item.isbn || '').split(' ').find((x: string) => x.length === 10) || null;
            cover_url = item.thumbnail || null;
        }

        return {
            isbn13: isbn13,
            isbn10: isbn10,
            title: info.title || item.title,
            authors: isNaver ? item.author.split('|').filter(Boolean) : (info.authors || []),
            publisher: info.publisher || item.publisher,
            published_year: yearFrom(isGoogle ? info.publishedDate : (isNaver ? item.pubdate : item.datetime)),
            cover_url: cover_url,
            google_books_id: isGoogle ? item.id : undefined,
        };
    }).filter(c => c.title); // 제목이 없는 결과는 제외

    res.status(200).json({ candidates });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
