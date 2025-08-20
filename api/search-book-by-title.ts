// api/search-book-by-title.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

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
    const { title, author, publisher } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'A "title" string is required.' });
    }

    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    let searchResults: any[] = [];
    const seen = new Set<string>();

    const addUniqueResults = (items: any[], isGoogle: boolean = false, isNaver: boolean = false) => {
        for (const item of items) {
            if (searchResults.length >= 10) break; // Stop if we already have 10 results
            const info = isGoogle ? item.volumeInfo : item;
            const resultTitle = info.title || '';
            const resultAuthors = (isNaver ? (item.author?.split('|').filter(Boolean) || []) : (info.authors || [])).join(',');
            const key = `${resultTitle}|${resultAuthors}`;
            
            if (!seen.has(key)) {
                searchResults.push({ ...item, isGoogle, isNaver, key });
                seen.add(key);
            }
        }
    };

    // 1. Primary Naver Books API search (using advanced search)
    if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
        const params = new URLSearchParams({ d_titl: title });
        if (author) params.append('d_auth', author);
        if (publisher) params.append('d_publ', publisher);
        
        const naverUrl = `https://openapi.naver.com/v1/search/book_adv.json?${params.toString()}&display=10`;
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

    // 2. If results are less than 10, supplement with Google Books API
    const resultsCount = searchResults.length;
    if (resultsCount < 10 && GOOGLE_BOOKS_API_KEY) {
        const needed = 10 - resultsCount;
        let googleQuery = `intitle:${encodeURIComponent(title)}`;
        if (author) googleQuery += `+inauthor:${encodeURIComponent(author)}`;
        if (publisher) googleQuery += `+inpublisher:${encodeURIComponent(publisher)}`;
        
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=${needed}&key=${GOOGLE_BOOKS_API_KEY}`;
        const googleRes = await fetch(googleUrl);
        if(googleRes.ok) {
            const googleJson = await googleRes.json();
            addUniqueResults(googleJson.items || [], true, false);
        }
    }

    const candidates = searchResults.slice(0, 10).map(item => {
        const isGoogle = item.isGoogle;
        const isNaver = item.isNaver;
        const info = isGoogle ? item.volumeInfo : item;
        
        let isbn13 = null;
        let isbn10 = null;
        let cover_url = null;

        if (isGoogle) {
            const identifiers = info.industryIdentifiers || [];
            isbn13 = identifiers.find((i: any) => i.type === 'ISBN_13')?.identifier || null;
            isbn10 = identifiers.find((i: any) => i.type === 'ISBN_10')?.identifier || null;
            cover_url = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
        } else if (isNaver) {
            isbn13 = item.isbn?.split(' ')[1] || item.isbn || null;
            isbn10 = item.isbn?.split(' ')[0] || null;
            cover_url = item.image || null;
        }

        return {
            isbn13: isbn13,
            isbn10: isbn10,
            title: info.title,
            authors: isNaver ? (item.author?.split('|').filter(Boolean) || []) : (info.authors || []),
            publisher: info.publisher,
            published_year: yearFrom(isGoogle ? info.publishedDate : item.pubdate),
            cover_url: cover_url,
            google_books_id: isGoogle ? item.id : undefined,
        };
    }).filter(c => c.title);

    res.status(200).json({ candidates });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
