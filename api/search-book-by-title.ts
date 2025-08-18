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

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
    if (!KAKAO_REST_API_KEY) throw new Error('Missing KAKAO_REST_API_KEY');

    // 1. Gemini API로 사용자 입력을 정제된 검색어로 변환
    const prompt = `From the user's book search query "${query}", extract the most likely official book title and author. Return the result as a JSON object. For example: {"title": "The Lord of the Rings", "author": "J.R.R. Tolkien"}`;
    
    const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (!geminiResp.ok) throw new Error('Gemini API request failed');
    
    const geminiJson = await geminiResp.json();
    const refinedSearch = JSON.parse(geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    const searchTerm = refinedSearch.title || query; // Gemini가 제목을 못찾으면 원래 쿼리 사용

    // 2. 정제된 검색어로 Kakao/Google Books API 검색
    let searchResults: any[] = [];
    const kakaoUrl = `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(searchTerm)}&size=5`;
    const kakaoRes = await fetch(kakaoUrl, { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } });
    
    if (kakaoRes.ok) {
      const kakaoJson = await kakaoRes.json();
      searchResults = kakaoJson.documents || [];
    }

    if (searchResults.length === 0) {
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(searchTerm)}&maxResults=5`;
        const googleRes = await fetch(googleUrl);
        if(googleRes.ok) {
            const googleJson = await googleRes.json();
            searchResults = (googleJson.items || []).map((item: any) => item.volumeInfo);
        }
    }

    // 3. 결과를 프론트엔드에 맞는 형식으로 변환하여 전송
    const candidates = searchResults.map(item => {
        const isGoogle = 'industryIdentifiers' in item;
        const isbn = isGoogle 
            ? (item.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier || item.industryIdentifiers?.find((i: any) => i.type === 'ISBN_10')?.identifier)
            : (item.isbn?.split(' ').find((i: string) => i.length === 13) || item.isbn?.split(' ')[0]);

        return {
            isbn: isbn || null,
            title: item.title,
            authors: item.authors || [],
            publisher: item.publisher,
            published_year: yearFrom(isGoogle ? item.publishedDate : item.datetime),
            cover_url: isGoogle ? item.imageLinks?.thumbnail : item.thumbnail,
        };
    }).filter(c => c.title); // 제목이 없는 결과는 제외

    res.status(200).json({ candidates });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
