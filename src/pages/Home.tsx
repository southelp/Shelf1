// src/pages/Home.tsx

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/FilterBar';
import BookCard from '../components/BookCard';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react'; // useUser 훅을 가져옵니다.

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [q, setQ] = useState('');
  const user = useUser(); // 훅을 사용해 사용자 정보를 가져옵니다.

  const load = useCallback(async () => {
    // supabase.auth.getUser()를 직접 호출할 필요가 없습니다.

    let query = supabase.from('books').select('*').order('created_at', { ascending: false });
    if (onlyAvailable) query = query.eq('available', true);
    if (q) query = query.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`);
    const { data } = await query;
    setBooks(data || []);

    if (!data || !user) {
      setLoans({}); // 사용자가 없으면 대출 목록을 비웁니다.
      return;
    }
    const ids = data.map(b => b.id);
    const { data: loansData } = await supabase.from('loans').select('*').in('book_id', ids).in('status', ['reserved', 'loaned']);
    const map: Record<string, Loan | null> = {};
    loansData?.forEach(l => { if (!map[l.book_id]) map[l.book_id] = l });
    setLoans(map);
  }, [onlyAvailable, q, user]); // user를 의존성 배열에 추가합니다.


  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container">
      <div className="section">
        <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
      </div>
      <div className="grid">
        {/* BookCard에 userId prop 전달 */}
        {books.map(b => <BookCard key={b.id} book={b} activeLoan={loans[b.id] || null} userId={user?.id} />)}
      </div>
    </div>
  );
}