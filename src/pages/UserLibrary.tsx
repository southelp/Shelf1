import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import BookCard from '../components/BookCard';
import { useUser } from '@supabase/auth-helpers-react';

// 책 상태에 따른 정렬 순서
const statusOrder = { 'Available': 0, 'Reserved': 1, 'Borrowed': 2 };

export default function UserLibrary() {
  const { userId } = useParams<{ userId: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [ownerName, setOwnerName] = useState<string>('');
  const currentUser = useUser();

  // 1. 데이터 로딩 로직을 Home.tsx와 유사하게 수정
  const loadData = useCallback(async () => {
    if (!userId) return { books: [], loans: {} };

    // 서재 소유자 이름 가져오기
    const { data: profileData } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    setOwnerName(profileData?.full_name || 'User');

    // 해당 사용자의 모든 책 정보 가져오기
    const { data: bookData } = await supabase.from('books').select('*, profiles(id, full_name)').eq('owner_id', userId);
    if (!bookData) return { books: [], loans: {} };
    
    // 책들의 대출 정보 가져오기
    const bookIds = bookData.map(b => b.id);
    let loansMap: Record<string, Loan | null> = {};
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      loansData?.forEach(l => { loansMap[l.book_id] = l; });
    }
    return { books: bookData, loans: loansMap };
  }, [userId]);
  
  // 2. 책 정렬 로직
  const sortBooks = (booksToSort: Book[], loansToSort: Record<string, Loan | null>) => {
    const getStatus = (book: Book) => {
      const loan = loansToSort[book.id];
      if (loan) return loan.status === 'loaned' ? 'Borrowed' : 'Reserved';
      if (!book.available) return 'Borrowed'; // activeLoan이 없어도 대출 불가일 수 있음
      return 'Available';
    };
    return [...booksToSort].sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // 3. 데이터 로딩과 정렬을 실행하는 useEffect
  useEffect(() => {
    const fetchDataAndSort = async () => {
      const { books: fetchedBooks, loans: fetchedLoans } = await loadData();
      const sorted = sortBooks(fetchedBooks, fetchedLoans);
      setBooks(sorted);
      setLoans(fetchedLoans);
    };
    fetchDataAndSort();
  }, [loadData]);
  
  // 이름 포맷팅 함수
  const formatOwnerName = (name: string) => {
    if (!name) return 'User';
    return name.replace(/\(school\s*of\s*innovation\s*foundations\)/i, '').trim();
  };

  return (
    <div className="container">
      <h2 className="section" style={{ fontSize: '24px', fontWeight: 'bold' }}>
        {formatOwnerName(ownerName)}'s Library
      </h2>
      <div className="grid">
        {books.map(b => (
          <BookCard 
            key={b.id} 
            book={b} 
            activeLoan={loans[b.id] || null} 
            userId={currentUser?.id} 
          />
        ))}
      </div>
    </div>
  );
}