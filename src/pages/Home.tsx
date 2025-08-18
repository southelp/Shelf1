import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import FilterBar from '../components/FilterBar'
import BookCard from '../components/BookCard'
import { Book, Loan } from '../types'

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [loans, setLoans] = useState<Record<string, Loan | null>>({})
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [q, setQ] = useState('')
  const [userId, setUserId] = useState<string | undefined>() // --- ✨ userId 상태 추가 ---

  const load = useCallback(async () => {
    // --- ✨ 현재 사용자 ID 가져오기 ---
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id)

    let query = supabase.from('books').select('*').order('created_at', { ascending: false })
    if (onlyAvailable) query = query.eq('available', true)
    if (q) query = query.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`)
    const { data } = await query
    setBooks(data || [])

    if (!data || !user) return;
    const ids = data.map(b => b.id)
    const { data: loansData } = await supabase.from('loans').select('*').in('book_id', ids).in('status', ['reserved', 'loaned'])
    const map: Record<string, Loan | null> = {}
    loansData?.forEach(l => { if (!map[l.book_id]) map[l.book_id] = l })
    setLoans(map)
  }, [onlyAvailable, q])


  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="container">
      <div className="section">
        <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
      </div>
      <div className="grid">
        {/* --- ✨ BookCard에 userId 전달 --- */}
        {books.map(b => <BookCard key={b.id} book={b} activeLoan={loans[b.id] || null} userId={userId} />)}
      </div>
    </div>
  )
}
