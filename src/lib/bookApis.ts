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

// 데이터 소스 선택 옵션을 제거하고, 항상 카카오 -> 구글 순으로 조회하도록 로직을 고정합니다.
export async function fetchBookMeta(isbn: string): Promise<BookMeta|undefined> {
  // 카카오 API를 먼저 시도하고, 결과가 없으면 구글 Books API로 넘어갑니다.
  return (await fetchKakaoBooks(isbn)) || (await fetchGoogleBooks(isbn));
}
