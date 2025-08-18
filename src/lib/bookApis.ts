export type BookMeta = { title?: string; authors?: string[]; publisher?: string; year?: number; cover?: string };

const pickYear = (s?: string) => {
  if (!s) return undefined; const m = s.match(/\d{4}/); return m ? Number(m[0]) : undefined;
}

export async function fetchGoogleBooks(isbn: string): Promise<BookMeta|undefined> {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
  if (!res.ok) return undefined; const json = await res.json();
  const item = json.items?.[0]?.volumeInfo; if (!item) return undefined;
  return {
    title: item.title, authors: item.authors, publisher: item.publisher,
    year: pickYear(item.publishedDate), cover: item.imageLinks?.thumbnail?.replace('http://','https://')
  }
}

export async function fetchKakaoBooks(isbn: string): Promise<BookMeta|undefined> {
  const key = import.meta.env.VITE_KAKAO_REST_API_KEY; if (!key) return undefined;
  const res = await fetch(`https://dapi.kakao.com/v3/search/book?target=isbn&query=${isbn}`, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) return undefined; const json = await res.json(); const d = json.documents?.[0]; if (!d) return undefined;
  return {
    title: d.title, authors: d.authors, publisher: d.publisher, year: d.datetime ? Number(d.datetime.slice(0,4)) : undefined, cover: d.thumbnail
  }
}

export async function fetchNaverBooks(isbn: string): Promise<BookMeta|undefined> {
  const id = import.meta.env.VITE_NAVER_CLIENT_ID; const secret = import.meta.env.VITE_NAVER_CLIENT_SECRET; if (!id || !secret) return undefined;
  const res = await fetch(`https://openapi.naver.com/v1/search/book.json?d_isbn=${isbn}`, { headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret } })
  if (!res.ok) return undefined; const json = await res.json(); const d = json.items?.[0]; if (!d) return undefined;
  return { title: d.title?.replace(/<[^>]+>/g,''), authors: d.author? d.author.split('|') : undefined, publisher: d.publisher, year: d.pubdate ? Number(d.pubdate.slice(0,4)) : undefined, cover: d.image }
}

export async function fetchBookMeta(isbn: string, prefer: 'domestic'|'foreign'|'auto'='auto'): Promise<BookMeta|undefined> {
  if (prefer === 'domestic') {
    // 국내 = Kakao → Google Books
    return (await fetchKakaoBooks(isbn)) || (await fetchGoogleBooks(isbn));
  } else if (prefer === 'foreign') {
    // 해외 = Google Books → Kakao
    return (await fetchGoogleBooks(isbn)) || (await fetchKakaoBooks(isbn));
  } else {
    // auto: 국내 우선 → 해외 폴백 (Kakao → Google Books)
    return (await fetchKakaoBooks(isbn)) || (await fetchGoogleBooks(isbn));
  }
}
