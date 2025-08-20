import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/FilterBar';
import BookCard from '../components/BookCard';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

// 책 상태에 따른 정렬 순서를 정의합니다.
const statusOrder = { 'Available': 0, 'Reserved': 1, 'Borrowed': 2 };

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [q, setQ] = useState('');
  const user = useUser();

  const loadData = useCallback(async () => {
    let query = supabase.from('books').select('*, profiles(id, full_name)');
    
    if (onlyAvailable) {
      query = query.eq('available', true);
    }
    if (q) {
      query = query.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`);
    }
    
    const { data: bookData, error } = await query;
    if (error) {
      console.error('Error fetching books:', error);
      return { books: [], loans: {} };
    }

    if (!bookData) return { books: [], loans: {} };

    const bookIds = bookData.map(b => b.id);
    let loansMap: Record<string, Loan | null> = {};
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      loansData?.forEach(l => {
        if (!loansMap[l.book_id]) {
          loansMap[l.book_id] = l;
        }
      });
    }
    return { books: bookData, loans: loansMap };

  }, [onlyAvailable, q]);
  
  // ✨ 1. 정렬 로직을 별도의 함수로 분리합니다.
  const sortBooks = (booksToSort: Book[], loansToSort: Record<string, Loan | null>) => {
    const getStatus = (book: Book) => {
      const loan = loansToSort[book.id];
      if (loan) return loan.status === 'loaned' ? 'Borrowed' : 'Reserved';
      return 'Available';
    };

    return [...booksToSort].sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      // 상태 순서에 따라 정렬하고, 상태가 같으면 최신 등록순으로 정렬합니다.
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  useEffect(() => {
    const fetchDataAndSort = async () => {
      const { books: fetchedBooks, loans: fetchedLoans } = await loadData();
      const sorted = sortBooks(fetchedBooks, fetchedLoans);
      setBooks(sorted);
      setLoans(fetchedLoans);
    };
    fetchDataAndSort();
  }, [loadData]);


  return (
    <div>
      <div className="mb-6">
        <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {books.map(b => <BookCard key={b.id} book={b} activeLoan={loans[b.id] || null} userId={user?.id} />)}
      </div>
    </div>
  );
}