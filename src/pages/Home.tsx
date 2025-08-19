// src/pages/Home.tsx

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/FilterBar';
import BookCard from '../components/BookCard';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [q, setQ] = useState('');
  const user = useUser();

  const load = useCallback(async () => {
    // ✨ profiles에서 id와 full_name만 명시적으로 선택하여 보안을 강화합니다.
    let query = supabase.from('books').select('*, profiles(id, full_name)').order('created_at', { ascending: false });
    
    if (onlyAvailable) {
      query = query.eq('available', true);
    }
    if (q) {
      query = query.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`);
    }
    
    const { data: bookData, error } = await query;
    if (error) {
      console.error('Error fetching books:', error);
      return;
    }

    setBooks(bookData || []);

    if (!bookData || !user) {
      setLoans({});
      return;
    }

    const bookIds = bookData.map(b => b.id);
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      const loansMap: Record<string, Loan | null> = {};
      loansData?.forEach(l => {
        if (!loansMap[l.book_id]) {
          loansMap[l.book_id] = l;
        }
      });
      setLoans(loansMap);
    }

  }, [onlyAvailable, q, user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container">
      <div className="section">
        <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
      </div>
      <div className="grid">
        {books.map(b => <BookCard key={b.id} book={b} activeLoan={loans[b.id] || null} userId={user?.id} />)}
      </div>
    </div>
  );
}