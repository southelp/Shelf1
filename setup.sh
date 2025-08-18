#!/bin/bash

# --- 스크립트 시작 ---
echo "🚀 프로젝트 구조와 파일을 생성합니다..."

# 1. 기본 폴더 구조 생성
mkdir -p src/lib
mkdir -p src/components
mkdir -p src/pages
mkdir -p supabase/sql
mkdir -p supabase/functions/_shared
mkdir -p supabase/functions/request-loan
mkdir -p supabase/functions/approve-loan
mkdir -p supabase/functions/return-loan
mkdir -p supabase/functions/due-reminder-cron

echo "✅ 폴더 구조 생성 완료."

# 2. 루트 파일 생성
# package.json
cat <<'EOF' > package.json
{
  "name": "taejae-residence-library",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.74",
    "@types/react-dom": "^18.2.24",
    "typescript": "^5.5.4",
    "vite": "^5.3.4"
  }
}
EOF

# vite.config.ts
cat <<'EOF' > vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
EOF

# index.html
cat <<'EOF' > index.html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Taejae Residence Library</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# .env.example
cat <<'EOF' > .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALLOWED_EMAIL_DOMAIN=taejae.ac.kr
VITE_APP_BASE_URL=http://localhost:5173

# 외부 API
VITE_KAKAO_REST_API_KEY=
VITE_NAVER_CLIENT_ID=
VITE_NAVER_CLIENT_SECRET=

# (Edge Functions용) 배포 환경 변수 — Supabase 프로젝트 환경변수로 설정
RESEND_API_KEY=
MAIL_FROM="Taejae Residence Library <noreply@taejae.ac.kr>"
DEFAULT_LOAN_DAYS=14
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_BASE_URL=
ALLOWED_EMAIL_DOMAIN=taejae.ac.kr
EOF

echo "✅ 루트 파일 생성 완료."

# 3. src 폴더 내부 파일 생성
# src/styles.css
cat <<'EOF' > src/styles.css
:root { --purple: #6b4efc; --purple-600:#5a3ef0; --bg:#f7f7fb; --text:#1b1b1f; --muted:#6b7280; }
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
a{color:var(--purple);text-decoration:none}
.header{display:flex;gap:16px;align-items:center;padding:16px 20px;background:white;border-bottom:1px solid #eee;position:sticky;top:0;z-index:10}
.brand{font-weight:700;font-size:18px;color:#3a2cb7}
.nav a{margin-right:12px;color:#3a2cb7}
.container{max-width:980px;margin:20px auto;padding:0 16px}
.btn{border:none;padding:10px 14px;border-radius:10px;background:var(--purple);color:white;cursor:pointer;font-weight:600}
.btn:disabled{background:#c7c7d3;cursor:not-allowed}
.card{background:white;border:1px solid #eee;border-radius:16px;padding:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;background:#f2f3f8;color:#333}
.badge.gray{background:#e5e7eb;color:#4b5563}
.input{width:100%;padding:10px;border:1px solid #ddd;border-radius:10px}
.row{display:flex;gap:8px;align-items:center}
.label{font-size:12px;color:var(--muted)}
.section{margin:20px 0}
EOF

# src/types.ts
cat <<'EOF' > src/types.ts
export type Profile = { id: string; email: string; full_name: string | null; role: 'user'|'admin' };
export type Book = {
  id: string; owner_id: string; isbn: string | null; title: string; authors: string[] | null;
  publisher: string | null; published_year: number | null; cover_url: string | null;
  available: boolean; created_at: string;
};
export type LoanStatus = 'reserved' | 'loaned' | 'returned' | 'cancelled';
export type Loan = {
  id: string; book_id: string; owner_id: string; borrower_id: string; status: LoanStatus;
  requested_at: string; approved_at: string | null; due_at: string | null; returned_at: string | null; cancel_reason: string | null;
};
EOF

# src/main.tsx
cat <<'EOF' > src/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
EOF

# src/App.tsx
cat <<'EOF' > src/App.tsx
import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import MyLibrary from './pages/MyLibrary'
import NewBook from './pages/NewBook'
import Scan from './pages/Scan'
import GoogleSignInButton from './components/GoogleSignInButton'
import { supabase } from './lib/supabaseClient'

export default function App(){
  const [email,setEmail] = useState<string|undefined>()
  const nav = useNavigate()

  useEffect(()=>{ supabase.auth.getUser().then(({data})=> setEmail(data.user?.email||undefined)) },[])
  supabase.auth.onAuthStateChange((_e,{ user })=>{ setEmail(user?.email||undefined) })

  async function signOut(){ await supabase.auth.signOut(); nav('/') }

  return (
    <>
      <header className="header">
        <div className="brand">Taejae Residence Library</div>
        <nav className="nav">
          <Link to="/">도서</Link>
          <Link to="/my">나의 서재</Link>
          <Link to="/books/new">도서 등록</Link>
          <Link to="/scan">ISBN 스캔</Link>
        </nav>
        <div style={{marginLeft:'auto'}}>
          {email ? (
            <div className="row" style={{gap:10}}>
              <span className="label">{email}</span>
              <button className="btn" onClick={signOut}>로그아웃</button>
            </div>
          ) : (
            <GoogleSignInButton />
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/my" element={<MyLibrary/>} />
        <Route path="/books/new" element={<NewBook/>} />
        <Route path="/scan" element={<Scan/>} />
      </Routes>
    </>
  )
}
EOF

# src/lib/supabaseClient.ts
cat <<'EOF' > src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

export const allowedDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'taejae.ac.kr').toLowerCase();
EOF

# src/lib/bookApis.ts
cat <<'EOF' > src/lib/bookApis.ts
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
    return (await fetchKakaoBooks(isbn)) || (await fetchNaverBooks(isbn)) || (await fetchGoogleBooks(isbn));
  } else if (prefer === 'foreign') {
    return (await fetchGoogleBooks(isbn)) || (await fetchKakaoBooks(isbn)) || (await fetchNaverBooks(isbn));
  } else {
    // auto: 국내 우선 → 해외 폴백
    return (await fetchKakaoBooks(isbn)) || (await fetchNaverBooks(isbn)) || (await fetchGoogleBooks(isbn));
  }
}
EOF

# src/lib/isbn.ts
cat <<'EOF' > src/lib/isbn.ts
export function isIsbn13(s: string) {
  const t = s.replace(/[^0-9]/g,''); if (t.length !== 13) return false;
  let sum = 0; for (let i=0;i<12;i++){ const n = Number(t[i]); sum += (i%2===0)? n : n*3; }
  const c = (10 - (sum % 10)) % 10; return c === Number(t[12]);
}
EOF

# src/components/GoogleSignInButton.tsx
cat <<'EOF' > src/components/GoogleSignInButton.tsx
import { supabase, allowedDomain } from '../lib/supabaseClient'

export default function GoogleSignInButton(){
  const onClick = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) alert(error.message)
  }

  const checkDomain = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();
    if (email && !email.endsWith(`@${allowedDomain}`)) {
      await supabase.auth.signOut();
      alert(`학교 이메일(@${allowedDomain})로만 로그인할 수 있습니다.`)
    }
  }

  // 로그인 상태 바뀌면 도메인 확인
  supabase.auth.onAuthStateChange((_e,_s)=>{ checkDomain() })

  return <button className="btn" onClick={onClick}>구글 학교계정으로 로그인</button>
}
EOF

# src/components/FilterBar.tsx
cat <<'EOF' > src/components/FilterBar.tsx
import { useState } from 'react'

export default function FilterBar({ onSearch, onlyAvailable, onToggleAvailable }:{ onSearch:(q:string)=>void; onlyAvailable:boolean; onToggleAvailable:(v:boolean)=>void }){
  const [q,setQ] = useState('')
  return (
    <div className="card row" style={{justifyContent:'space-between'}}>
      <input className="input" placeholder="검색 (제목/저자/ISBN)" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=> e.key==='Enter' && onSearch(q)} />
      <label className="row" style={{gap:6}}>
        <input type="checkbox" checked={onlyAvailable} onChange={e=>onToggleAvailable(e.target.checked)} />
        <span className="label">대여 가능만</span>
      </label>
    </div>
  )
}
EOF

# src/components/BookCard.tsx
cat <<'EOF' > src/components/BookCard.tsx
import { Book, Loan } from '../types'
import { supabase } from '../lib/supabaseClient'

async function requestLoan(bookId: string){
  const res = await fetch(`/functions/v1/request-loan`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ book_id: bookId }) })
  if (!res.ok){ const j = await res.json().catch(()=>({message:'error'})); alert(j.message || '요청 실패'); return }
  alert('대출을 예약했습니다. 소유자의 승인 메일 후 대여가 확정됩니다.')
}

export default function BookCard({ book, activeLoan }:{ book:Book; activeLoan: Loan | null }){
  const status = activeLoan?.status || (book.available ? 'available' : 'unavailable')
  const badge = status==='reserved' ? '예약 중' : status==='loaned' ? '대여 중' : book.available ? '대여 가능' : '대여 불가'
  const disabled = status==='reserved' || status==='loaned' || !book.available

  return (
    <div className="card">
      {book.cover_url && <img src={book.cover_url} alt={book.title} style={{width:'100%',height:180,objectFit:'cover',borderRadius:12,marginBottom:8}} />}
      <div className="badge gray" style={{marginBottom:8}}>{badge}</div>
      <div style={{fontWeight:700,marginBottom:6}}>{book.title}</div>
      {book.authors && <div className="label" style={{marginBottom:8}}>{book.authors.join(', ')}</div>}
      <div className="row" style={{justifyContent:'space-between'}}>
        <button className="btn" disabled={disabled} onClick={()=>requestLoan(book.id)}>대출 요청</button>
        <div className="label">ISBN {book.isbn || '-'}</div>
      </div>
    </div>
  )
}
EOF

# src/components/IsbnScanner.tsx
cat <<'EOF' > src/components/IsbnScanner.tsx
import { useEffect, useRef, useState } from 'react'
import { isIsbn13 } from '../lib/isbn'

declare global { interface Window { BarcodeDetector?: any; Quagga?: any } }

export default function IsbnScanner({ onDetect }:{ onDetect:(isbn:string)=>void }){
  const videoRef = useRef<HTMLVideoElement>(null)
  const [useFallback,setUseFallback] = useState(false)
  const [err,setErr] = useState<string|undefined>()

  useEffect(()=>{ (async()=>{
    try{
      if ('BarcodeDetector' in window) {
        await startNative();
      } else {
        setUseFallback(true); await loadQuagga();
      }
    }catch(e:any){ setErr(e?.message || '카메라를 시작할 수 없습니다.') }
  })() },[])

  async function startNative(){
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
    if (!videoRef.current) return; videoRef.current.srcObject = stream; await videoRef.current.play()
    const detector = new window.BarcodeDetector({ formats:['ean_13'] })
    const tick = async () => {
      if (!videoRef.current) return; const detections = await detector.detect(videoRef.current).catch(()=>[])
      const code = detections?.[0]?.rawValue; if (code && isIsbn13(code)) { onDetect(code) }
      requestAnimationFrame(tick)
    }; tick()
  }

  async function loadQuagga(){
    if (!window.Quagga){ await new Promise((resolve,reject)=>{ const s = document.createElement('script'); s.src='https://unpkg.com/quagga@0.12.1/dist/quagga.min.js'; s.onload=resolve; s.onerror=()=>reject('Quagga 로드 실패'); document.body.appendChild(s) }) }
    window.Quagga.init({ inputStream:{ name:'Live', type:'LiveStream', target: videoRef.current, constraints:{ facingMode:'environment' } }, decoder:{ readers:['ean_reader'] } }, (err:any)=>{
      if (err){ setErr(err.message || '스캐너 오류'); return }
      window.Quagga.start();
      window.Quagga.onDetected((res:any)=>{ const code = res?.codeResult?.code; if (code && isIsbn13(code)) onDetect(code) })
    })
  }

  return (
    <div className="card">
      <div className="label" style={{marginBottom:8}}>카메라로 ISBN(EAN-13) 스캔</div>
      <video ref={videoRef} style={{width:'100%',borderRadius:12,background:'#000',aspectRatio:'3/4'}} muted playsInline />
      {err && <div className="label" style={{color:'crimson',marginTop:8}}>{err}</div>}
    </div>
  )
}
EOF

# src/pages/Home.tsx
cat <<'EOF' > src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FilterBar from '../components/FilterBar'
import BookCard from '../components/BookCard'
import { Book, Loan } from '../types'

export default function Home(){
  const [books,setBooks] = useState<Book[]>([])
  const [loans,setLoans] = useState<Record<string,Loan|null>>({})
  const [onlyAvailable,setOnlyAvailable] = useState(true)
  const [q,setQ] = useState('')

  async function load(){
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase.from('books').select('*').order('created_at',{ascending:false})
    if (onlyAvailable) query = query.eq('available', true)
    if (q) query = query.or(\`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%\`)
    const { data } = await query
    setBooks(data || [])

    if (!data || !user) return;
    const ids = data.map(b=>b.id)
    const { data: loansData } = await supabase.from('loans').select('*').in('book_id', ids).in('status',['reserved','loaned'])
    const map: Record<string,Loan|null> = {}
    loansData?.forEach(l=>{ if (!map[l.book_id]) map[l.book_id] = l })
    setLoans(map)
  }

  useEffect(()=>{ load() },[onlyAvailable, q])

  return (
    <div className="container">
      <div className="section">
        <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
      </div>
      <div className="grid">
        {books.map(b=> <BookCard key={b.id} book={b} activeLoan={loans[b.id]||null} />)}
      </div>
    </div>
  )
}
EOF

# src/pages/MyLibrary.tsx
cat <<'EOF' > src/pages/MyLibrary.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Book, Loan } from '../types'

export default function MyLibrary(){
  const [owned,setOwned] = useState<Book[]>([])
  const [myLoans,setMyLoans] = useState<Loan[]>([])

  async function load(){
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: ownedBooks } = await supabase.from('books').select('*').eq('owner_id', user.id).order('created_at',{ascending:false})
    setOwned(ownedBooks||[])
    const { data: loans } = await supabase.from('loans').select('*').or(\`owner_id.eq.${user.id},borrower_id.eq.${user.id}\`).order('requested_at',{ascending:false})
    setMyLoans(loans||[])
  }

  useEffect(()=>{ load() },[])

  return (
    <div className="container">
      <div className="section">
        <h2>내 소유 도서</h2>
        <div className="grid">{owned.map(b=> (
          <div className="card" key={b.id}>
            <div style={{fontWeight:700}}>{b.title}</div>
            <div className="label">{b.authors?.join(', ')}</div>
            <div className="label">상태: {b.available ? '대여 가능' : '대여 중/예약 중'}</div>
          </div>
        ))}</div>
      </div>
      <div className="section">
        <h2>대출/예약 현황</h2>
        <div className="grid">{myLoans.map(l=> (
          <div className="card" key={l.id}>
            <div className="label">대출 상태</div>
            <div style={{fontWeight:700,marginBottom:6}}>{l.status}</div>
            <div className="label">반납 예정일: {l.due_at ? new Date(l.due_at).toLocaleDateString() : '-'}</div>
          </div>
        ))}</div>
      </div>
    </div>
  )
}
EOF

# src/pages/NewBook.tsx
cat <<'EOF' > src/pages/NewBook.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchBookMeta } from '../lib/bookApis'

export default function NewBook(){
  const [isbn,setIsbn] = useState('')
  const [title,setTitle] = useState('')
  const [authors,setAuthors] = useState('')
  const [publisher,setPublisher] = useState('')
  const [publishedYear,setPublishedYear] = useState<number|''>('')
  const [cover,setCover] = useState('')
  const [source,setSource] = useState<'auto'|'domestic'|'foreign'>('auto')

  async function autoFill(){
    const meta = await fetchBookMeta(isbn, source)
    if (!meta) { alert('메타데이터를 찾을 수 없습니다.'); return }
    setTitle(meta.title||'')
    setAuthors((meta.authors||[]).join(', '))
    setPublisher(meta.publisher||'')
    setPublishedYear(meta.year||'')
    setCover(meta.cover||'')
  }

  async function save(){
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return alert('로그인이 필요합니다');
    const payload = { owner_id: user.id, isbn, title, authors: authors? authors.split(',').map(s=>s.trim()) : null, publisher, published_year: publishedYear||null, cover_url: cover, available: true }
    const { error } = await supabase.from('books').insert(payload)
    if (error) return alert(error.message)
    alert('등록 완료'); setIsbn(''); setTitle(''); setAuthors(''); setPublisher(''); setPublishedYear(''); setCover('')
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{gap:12,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <div className="label">ISBN</div>
            <input className="input" value={isbn} onChange={e=>setIsbn(e.target.value)} placeholder="예: 9788998139018" />
          </div>
          <div>
            <div className="label">데이터 소스</div>
            <select className="input" value={source} onChange={e=>setSource(e.target.value as any)}>
              <option value="auto">자동(국내 우선)</option>
              <option value="domestic">국내 우선</option>
              <option value="foreign">해외(Google Books)</option>
            </select>
          </div>
          <button className="btn" onClick={autoFill}>자동입력</button>
        </div>
      </div>

      <div className="section card">
        <div className="row" style={{gap:12}}>
          <div style={{flex:2}}>
            <div className="label">제목</div>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div style={{flex:1}}>
            <div className="label">저자(쉼표 구분)</div>
            <input className="input" value={authors} onChange={e=>setAuthors(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{gap:12, marginTop:12}}>
          <div style={{flex:1}}>
            <div className="label">출판사</div>
            <input className="input" value={publisher} onChange={e=>setPublisher(e.target.value)} />
          </div>
          <div style={{width:160}}>
            <div className="label">출간연도</div>
            <input className="input" value={publishedYear} onChange={e=>setPublishedYear(Number(e.target.value)||'')} />
          </div>
          <div style={{flex:1}}>
            <div className="label">표지 URL</div>
            <input className="input" value={cover} onChange={e=>setCover(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{marginTop:12,justifyContent:'flex-end'}}>
          <button className="btn" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  )
}
EOF

# src/pages/Scan.tsx
cat <<'EOF' > src/pages/Scan.tsx
import { useState } from 'react'
import IsbnScanner from '../components/IsbnScanner'
import NewBook from './NewBook'

export default function Scan(){
  const [detected,setDetected] = useState<string|undefined>()
  return (
    <div className="container">
      <IsbnScanner onDetect={setDetected} />
      {detected && (
        <div className="card" style={{marginTop:12}}>
          <div className="label">감지된 ISBN</div>
          <div style={{fontWeight:700,fontSize:18}}>{detected}</div>
        </div>
      )}
    </div>
  )
}
EOF

echo "✅ src 폴더 파일 생성 완료."

# 4. supabase 폴더 내부 파일 생성
# supabase/sql/schema.sql
cat <<'EOF' > supabase/sql/schema.sql
-- 타입
create type public.loan_status as enum ('reserved','loaned','returned','cancelled');

-- profiles (Auth 연동)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'user',
  created_at timestamptz default now()
);

-- books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  isbn text,
  title text not null,
  authors text[],
  publisher text,
  published_year int,
  cover_url text,
  available boolean default true,
  created_at timestamptz default now()
);

-- loans
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  status loan_status not null default 'reserved',
  requested_at timestamptz default now(),
  approved_at timestamptz,
  due_at timestamptz,
  returned_at timestamptz,
  cancel_reason text
);

-- action tokens (메일 승인 링크)
create table public.action_tokens (
  token uuid primary key default gen_random_uuid(),
  action text not null,
  loan_id uuid not null references public.loans(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- notifications (리마인더 중복 방지)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  kind text not null,
  sent_at timestamptz default now(),
  unique (loan_id, kind)
);

-- 가용성 동기화 트리거
create or replace function public.sync_book_availability()
returns trigger as $$
begin
  if (new.status in ('reserved','loaned')) then
    update public.books set available=false where id=new.book_id;
  elsif (new.status in ('returned','cancelled')) then
    update public.books b
      set available = not exists (
        select 1 from public.loans l where l.book_id=b.id and l.status in ('reserved','loaned')
      )
    where b.id=new.book_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_loans_status_sync on public.loans;
create trigger trg_loans_status_sync
after insert or update of status on public.loans
for each row execute function public.sync_book_availability();

-- RLS
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.loans enable row level security;
alter table public.action_tokens enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles self read" on public.profiles for select using ( id = auth.uid() );
create policy "profiles self upsert" on public.profiles for insert with check ( id = auth.uid() );
create policy "profiles self update" on public.profiles for update using ( id = auth.uid() );

-- books
create policy "books read all" on public.books for select using ( true );
create policy "books owner write" on public.books for all using ( owner_id = auth.uid() ) with check ( owner_id = auth.uid() );

-- loans: 오너/차용자만 접근
create policy "loans read" on public.loans for select using ( owner_id = auth.uid() or borrower_id = auth.uid() );
create policy "loans create (borrower only)" on public.loans for insert with check ( borrower_id = auth.uid() );
create policy "loans update (owner only except service)" on public.loans for update using ( owner_id = auth.uid() ) with check ( true );

-- tokens: 함수(서비스롤)만 접근. 일반사용자 차단
create policy "tokens no read" on public.action_tokens for select using ( false );
create policy "tokens no write" on public.action_tokens for all using ( false ) with check ( false );

-- notifications: 함수 전용
create policy "notif no read" on public.notifications for select using ( false );
create policy "notif no write" on public.notifications for all using ( false ) with check ( false );

-- get_due_loans_on 함수 추가
create or replace function public.get_due_loans_on(ymd text)
returns setof public.loans
language sql
security definer
as $$
  select * from public.loans
  where status = 'loaned'::public.loan_status
    and to_char(due_at at time zone 'UTC', 'YYYY-MM-DD') = ymd
$$;
EOF

# supabase/functions/functions.toml
cat <<'EOF' > supabase/functions.toml
[functions]

[functions.request-loan]
verify_jwt = true

[functions.approve-loan]
verify_jwt = false

[functions.return-loan]
verify_jwt = true

[functions.due-reminder-cron]
verify_jwt = false
# 배포 시 스케줄 설정(예: 매일 09:00 KST = 00:00 UTC)
# CLI 예시: supabase functions deploy due-reminder-cron --no-verify-jwt --schedule "0 0 * * *"
EOF

# supabase/functions/_shared/email.ts
cat <<'EOF' > supabase/functions/_shared/email.ts
// deno-lint-ignore-file no-explicit-any
export async function sendEmail(to: string, subject: string, html: string){
  const apiKey = Deno.env.get('RESEND_API_KEY')!;
  const from = Deno.env.get('MAIL_FROM')!;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer ${apiKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html })
  })
  if (!res.ok) { const j = await res.text(); console.error('Email failed', j); throw new Error('Email send failed') }
}
EOF

# supabase/functions/request-loan/index.ts
cat <<'EOF' > supabase/functions/request-loan/index.ts
// deno run --allow-net --allow-env --allow-read
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

serve(async (req) => {
  try{
    const { book_id } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // 서비스 롤 키 사용
    const client = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);
    
    const borrowerId = authUser?.id; if (!borrowerId) return new Response(JSON.stringify({message:'로그인이 필요합니다'}),{status:401});

    const { data: book } = await client.from('books').select('id, title, owner_id').eq('id', book_id).single();
    if (!book) return new Response(JSON.stringify({message:'도서를 찾을 수 없습니다'}),{status:404});

    const { data: active } = await client.from('loans').select('id').eq('book_id', book_id).in('status',['reserved','loaned']);
    if (active && active.length > 0) return new Response(JSON.stringify({message:'이미 예약/대여 중입니다'}),{status:400});

    const { data: loan, error } = await client.from('loans').insert({
      book_id, owner_id: book.owner_id, borrower_id: borrowerId, status:'reserved'
    }).select('id').single();
    if (error) throw error;

    const expires = new Date(Date.now()+1000*60*60*48).toISOString();
    const { data: tokenRow, error: tokenErr } = await client.from('action_tokens').insert({ action:'approve_loan', loan_id: loan.id, expires_at: expires }).select('token').single();
    if (tokenErr) throw tokenErr;

    const { data: owner } = await client.from('profiles').select('email').eq('id', book.owner_id).single();
    if (!owner) throw new Error('Owner profile not found');
    
    const approveUrl = `${Deno.env.get('APP_BASE_URL')}/functions/v1/approve-loan?token=${tokenRow.token}`;

    await sendEmail(owner.email, \`[승인요청] "${book.title}" 대출 요청\`,
      \`<p>도서: <b>${book.title}</b></p>
       <p>대출 요청이 들어왔습니다. 아래 버튼을 눌러 승인하세요.</p>
       <p><a href="${approveUrl}" style="display:inline-block;padding:10px 16px;background:#6b4efc;color:white;border-radius:8px;text-decoration:none">승인하기</a></p>\`
    )

    return new Response(JSON.stringify({ ok:true }), { headers:{'Content-Type':'application/json'} })
  }catch(e){
    console.error(e); return new Response(JSON.stringify({message:'서버 오류: ' + e.message}),{status:500})
  }
})
EOF

# supabase/functions/approve-loan/index.ts
cat <<'EOF' > supabase/functions/approve-loan/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try{
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return new Response('토큰이 없습니다', { status: 400 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, service);

    const { data: t } = await client.from('action_tokens').select('*').eq('token', token).single();
    if (!t) return new Response('유효하지 않은 토큰', { status: 400 });
    if (t.used_at) return new Response('이미 사용된 토큰', { status: 400 });
    if (new Date(t.expires_at).getTime() < Date.now()) return new Response('만료된 토큰', { status: 400 });
    if (t.action !== 'approve_loan') return new Response('토큰 액션 불일치', { status: 400 });

    const { data: loan } = await client.from('loans').select('*').eq('id', t.loan_id).single();
    if (!loan) return new Response('대출 정보를 찾을 수 없음', { status: 404 });

    const days = Number(Deno.env.get('DEFAULT_LOAN_DAYS') || '14');
    const due = new Date(Date.now()+days*24*60*60*1000).toISOString();

    await client.from('loans').update({ status:'loaned', approved_at: new Date().toISOString(), due_at: due }).eq('id', loan.id);
    await client.from('action_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);

    return new Response('대여가 승인되었습니다. 이제 창을 닫아도 됩니다.', { headers:{ 'Content-Type':'text/plain; charset=utf-8' } })
  }catch(e){ console.error(e); return new Response('서버 오류', { status: 500 }) }
})
EOF

# supabase/functions/return-loan/index.ts
cat <<'EOF' > supabase/functions/return-loan/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try{
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, service, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { loan_id } = await req.json();
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);

    const uid = authUser?.id; if (!uid) return new Response('인증 필요', { status: 401 });

    const { data: loan } = await client.from('loans').select('id, owner_id, borrower_id').eq('id', loan_id).single();
    if (!loan) return new Response('대출 없음', { status: 404 });
    if (!(loan.owner_id === uid || loan.borrower_id === uid)) return new Response('권한 없음', { status: 403 });

    await client.from('loans').update({ status:'returned', returned_at: new Date().toISOString() }).eq('id', loan.id);
    return new Response(JSON.stringify({ ok:true }), { headers:{'Content-Type':'application/json'} })
  }catch(e){ console.error(e); return new Response(JSON.stringify({message:'서버 오류'}),{status:500}) }
})
EOF

# supabase/functions/due-reminder-cron/index.ts
cat <<'EOF' > supabase/functions/due-reminder-cron/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const client = createClient(supabaseUrl, service);

  const today = new Date();
  const day = (d:number)=> new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()+d)).toISOString().slice(0,10);

  const targets = [ { label:'due_minus_2', date: day(2) }, { label:'due_minus_1', date: day(1) }, { label:'due_day', date: day(0) } ];

  for (const t of targets){
    const { data: loans } = await client.rpc('get_due_loans_on', { ymd: t.date });
    for (const l of loans || []){
      const { data: exists } = await client.from('notifications').select('id').eq('loan_id', l.id).eq('kind', t.label).maybeSingle();
      if (exists) continue;

      const { data: book } = await client.from('books').select('title').eq('id', l.book_id).single();
      const { data: borrower } = await client.from('profiles').select('email').eq('id', l.borrower_id).single();
      if (book && borrower) {
        await sendEmail(borrower.email, \`[반납 알림] ${book.title}\`,
          \`<p>도서 <b>${book.title}</b> 반납 예정일이 임박했습니다.</p>
           <p>반납 예정일: ${l.due_at?.slice(0,10)}</p>\`)
        await client.from('notifications').insert({ loan_id: l.id, kind: t.label })
      }
    }
  }

  return new Response('ok')
})
EOF

echo "✅ supabase 폴더 파일 생성 완료."

# --- 스크립트 종료 ---
echo "🎉 모든 파일이 성공적으로 생성되었습니다!"
echo "➡️ 다음 단계: 'npm install' 명령어를 실행하여 패키지를 설치하세요."
