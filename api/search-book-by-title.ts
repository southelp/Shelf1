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
    const { title, author, publisher, isbn } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!title && !isbn) {
      return res.status(400).json({ error: 'A "title" or "isbn" string is required.' });
    }

    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    let combinedResults: { item: any; source: 'google' | 'naver' }[] = [];
    const seen = new Set<string>();

    const fetchNaver = async () => {
      if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return [];
      let naverUrl: string;
      if (isbn) {
        naverUrl = `https://openapi.naver.com/v1/search/book_adv.json?d_isbn=${encodeURIComponent(isbn)}&display=5`;
      } else {
        const params = new URLSearchParams({ d_titl: title, display: '5' });
        if (author) params.append('d_auth', author);
        if (publisher) params.append('d_publ', publisher);
        naverUrl = `https://openapi.naver.com/v1/search/book_adv.json?${params.toString()}`;
      }
      const naverRes = await fetch(naverUrl, { headers: { 'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET } });
      if (naverRes.ok) {
        const json = await naverRes.json();
        return json.items || [];
      }
      return [];
    };

    const fetchGoogle = async () => {
      if (!GOOGLE_BOOKS_API_KEY) return [];
      let googleUrl: string;
      if (isbn) {
        googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=5&key=${GOOGLE_BOOKS_API_KEY}`;
      } else {
        let googleQuery = `intitle:${encodeURIComponent(title)}`;
        if (author) googleQuery += `+inauthor:${encodeURIComponent(author)}`;
        if (publisher) googleQuery += `+inpublisher:${encodeURIComponent(publisher)}`;
        googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=5&key=${GOOGLE_BOOKS_API_KEY}`;
      }
      const googleRes = await fetch(googleUrl);
      if (googleRes.ok) {
        const json = await googleRes.json();
        return json.items || [];
      }
      return [];
    };

    const [naverResults, googleResults] = await Promise.all([
      fetchNaver(),
      fetchGoogle()
    ]);

    const addUniqueResults = (items: any[], source: 'google' | 'naver') => {
      for (const item of items) {
        const info = source === 'google' ? item.volumeInfo : item;
        const resultTitle = info.title || '';
        const resultAuthors = (source === 'naver' ? (item.author?.split('|').filter(Boolean) || []) : (info.authors || [])).join(',');
        const key = `${resultTitle}|${resultAuthors}`;
        
        if (!seen.has(key)) {
          combinedResults.push({ ...item, source });
          seen.add(key);
        }
      }
    };

    addUniqueResults(naverResults, 'naver');
    addUniqueResults(googleResults, 'google');

    const candidates = combinedResults.map(item => {
        const source = item.source;
        const info = source === 'google' ? item.volumeInfo : item;
        
        let isbn13 = null;
        let isbn10 = null;
        let cover_url = null;

        if (source === 'google') {
            const identifiers = info.industryIdentifiers || [];
            isbn13 = identifiers.find((i: any) => i.type === 'ISBN_13')?.identifier || null;
            isbn10 = identifiers.find((i: any) => i.type === 'ISBN_10')?.identifier || null;
            cover_url = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
        } else if (source === 'naver') {
            isbn13 = item.isbn?.split(' ')[1] || item.isbn || null;
            isbn10 = item.isbn?.split(' ')[0] || null;
            cover_url = item.image || null;
        }

        return {
            source,
            isbn13: isbn13,
            isbn10: isbn10,
            title: info.title,
            authors: source === 'naver' ? (item.author?.split('|').filter(Boolean) || []) : (info.authors || []),
            publisher: info.publisher,
            published_year: yearFrom(source === 'google' ? info.publishedDate : item.pubdate),
            cover_url: cover_url,
            google_books_id: source === 'google' ? item.id : undefined,
        };
    }).filter(c => c.title);

    res.status(200).json({ candidates });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error', message: e.message });
  }
}
