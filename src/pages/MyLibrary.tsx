import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BookWithLoan } from '../types'; // ✨ 새로운 타입을 임포트합니다.
import { useUser } from '@supabase/auth-helpers-react';
import MyOwnedBookCard from '../components/MyOwnedBookCard'; // ✨ 새 컴포넌트를 임포트합니다.

export default function MyLibrary() {
  const [owned, setOwned] = useState<BookWithLoan[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]);
      return;
    }

    // ✨ 내가 소유한 책과 함께, 현재 대출/예약 정보(loans) 및 요청자 정보(profiles)를 함께 가져옵니다.
    const { data: ownedBooks } = await supabase
      .from('books')
      .select('*, loans(*, profiles:borrower_id(full_name))')
      .eq('owner_id', user.id)
      .in('loans.status', ['reserved', 'loaned'])
      .order('created_at', { ascending: false });
      
    // Supabase는 위 쿼리에서 대출/예약이 없는 책은 반환하지 않으므로, 별도로 모든 책을 다시 조회합니다.
    const { data: allOwnedBooks } = await supabase
      .from('books')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    // 두 결과를 합쳐서 최종 목록을 만듭니다.
    const finalOwnedBooks = allOwnedBooks?.map(book => {
      const bookWithLoan = ownedBooks?.find(b => b.id === book.id);
      return bookWithLoan || { ...book, loans: [] };
    }) || [];

    setOwned(finalOwnedBooks);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="container">
      <div className="section">
        <h2>My Owned Books</h2>
        <div className="grid">
          {owned.map(b => (
            // ✨ 새로운 MyOwnedBookCard 컴포넌트를 사용합니다.
            <MyOwnedBookCard key={b.id} book={b} onComplete={loadData} />
          ))}
        </div>
      </div>
    </div>
  );
}