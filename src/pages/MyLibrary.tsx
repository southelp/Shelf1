import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { BookWithLoan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';
import MyOwnedBookCard from '../components/MyOwnedBookCard.tsx';

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
      .order('created_at', { ascending: false });

    // Supabase는 위 쿼리에서 대출/예약이 없는 책은 반환하지 않습니다.
    // 모든 책을 가져와서 loan 정보를 병합해야 합니다.
    const { data: allOwnedBooks } = await supabase
      .from('books')
      .select('*, profiles:owner_id(full_name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    // 두 결과를 합쳐서 최종 목록을 만듭니다.
    const finalOwnedBooks = allOwnedBooks?.map(book => {
      const bookWithLoan = ownedBooks?.find(b => b.id === book.id);
      if (bookWithLoan) {
        return bookWithLoan;
      }
      return { ...book, loans: [] };
    }) || [];

    setOwned(finalOwnedBooks as BookWithLoan[]);
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
