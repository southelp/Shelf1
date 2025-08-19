import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import BookCard from '../components/BookCard';
import { useUser } from '@supabase/auth-helpers-react';

export default function UserLibrary() {
  const { userId } = useParams<{ userId: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [ownerName, setOwnerName] = useState<string>('');
  const currentUser = useUser();

  const loadData = useCallback(async () => {
    if (!userId) return;

    // 1. 서재 주인의 이름을 가져옵니다.
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    setOwnerName(profileData?.full_name || 'User');

    // 2. 서재 주인이 소유한 모든 책을 가져옵니다.
    const { data: bookData } = await supabase
      .from('books')
      .select('*, profiles(id, full_name)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
    setBooks(bookData || []);

    // 3. 가져온 책들의 대출/예약 상태를 확인합니다.
    if (bookData && bookData.length > 0) {
      const bookIds = bookData.map(b => b.id);
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .in('book_id', bookIds)
        .in('status', ['reserved', 'loaned']);
      
      const loansMap: Record<string, Loan | null> = {};
      loansData?.forEach(l => {
        if (!loansMap[l.book_id]) {
          loansMap[l.book_id] = l;
        }
      });
      setLoans(loansMap);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // ✨ 이름 포맷팅 함수를 정규식을 사용하도록 수정하여 대소문자/띄어쓰기 문제를 해결합니다.
  const formatOwnerName = (name: string) => {
    if (!name) return 'User';
    // 정규식을 사용하여 '(school of innovation foundations)'와 유사한 모든 패턴을 제거합니다.
    // 'i' 플래그는 대소문자를 구분하지 않으며, '\\s*'는 0개 이상의 공백을 의미합니다.
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