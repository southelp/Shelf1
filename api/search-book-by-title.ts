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

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY; // Keep for reference
    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY; // Keep for reference
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

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

    // Function to perform Naver search
    const performNaverSearch = async (searchQuery: string) => {
        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return [];
        const naverUrl = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(searchQuery)}&display=5`;
        const naverRes = await fetch(naverUrl, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
        });
        if (naverRes.ok) {
            const naverJson = await naverRes.json();
            return naverJson.items || [];
        }
        return [];
    };

    // 1. Primary Naver Books API search
    let naverItems = await performNaverSearch(query);
    addUniqueResults(naverItems, false, true);

    // 2. If no results from primary Naver search, try refining query with Gemini and retry Naver
    if (searchResults.length === 0) {
        try {
            const refineResponse = await fetch('/api/refine-book-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query }),
            });
            if (refineResponse.ok) {
                const { refinedQuery } = await refineResponse.json();
                if (refinedQuery && refinedQuery !== query) {
                    naverItems = await performNaverSearch(refinedQuery);
                    addUniqueResults(naverItems, false, true);
                }
            }
        } catch (e) {
            console.error('Error refining query with Gemini:', e);
        }
    }

    // 3. Final candidates construction (only from Naver results)
    const candidates = searchResults.slice(0, 5).map(item => {
        const isGoogle = item.isGoogle; // Will be false now
        const isNaver = item.isNaver;
        const info = isGoogle ? item.volumeInfo : item; // info will be item for Naver/Kakao
        
        let isbn13 = null;
        let isbn10 = null;
        let cover_url = null;

        if (isNaver) {
            isbn13 = item.isbn || null; 
            isbn10 = null; // Naver usually provides only isbn13
            cover_url = item.image || null;
        } else { // This path should ideally not be taken if only Naver is used
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
    }).filter(c => c.title); // Exclude results without a title

    res.status(200).json({ candidates });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}

/*
// Kakao Books API search (kept for reference)
    if (KAKAO_REST_API_KEY) {
        const kakaoUrl = `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(query)}&size=5`;
        const kakaoRes = await fetch(kakaoUrl, { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } });
        if (kakaoRes.ok) {
            const kakaoJson = await kakaoRes.json();
            addUniqueResults(kakaoJson.documents || []);
        }
    }

// Google Books API search (kept for reference)
    if (GOOGLE_BOOKS_API_KEY) {
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&langRestrict=ko&maxResults=5`;
        const googleRes = await fetch(googleUrl + (GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}`:''));
        if(googleRes.ok) {
            const googleJson = await googleRes.json();
            addUniqueResults(googleJson.items || [], true);
        }
    }
*/