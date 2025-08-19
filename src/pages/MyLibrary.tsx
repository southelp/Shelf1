import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';
import BookCard from '../components/BookCard'; // ✨ BookCard를 재사용합니다.

export default function MyLibrary() {
  const [owned, setOwned] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]);
      setMyLoans([]);
      return;
    }

    // 내 소유 도서 목록 가져오기
    const { data: ownedBooks } = await supabase.from('books').select('*, profiles(id, full_name)').eq('owner_id', user.id).order('created_at', { ascending: false });
    setOwned(ownedBooks || []);

    // ✨ 내 대출/예약 현황을 책 상세 정보와 함께 가져오기
    const { data: loans } = await supabase
      .from('loans')
      .select('*, books(*, profiles(id, full_name))') // books 테이블과 profiles 테이블을 JOIN
      .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`)
      .in('status', ['reserved', 'loaned']) // 반납/취소된 건은 제외
      .order('requested_at', { ascending: false });
      
    setMyLoans(loans || []);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- ✨ Handle book deletion ---
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase.from('books').delete().eq('id', bookId);

    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      alert('The book has been deleted.');
      // Refresh the list after a successful deletion
      loadData();
    }
  };
  return (
    <div className="container">
      <div className="section">
        <h2>My Owned Books</h2>
        <div className="grid">{owned.map(b => (
          // ... (내 소유 도서 카드)
        ))}</div>
      </div>
      <div className="section">
        <h2>Loan/Reservation Status</h2>
        <div className="grid">
          {myLoans.map(loan => 
            loan.books ? ( // ✨ loan 객체 안의 book 데이터로 BookCard를 렌더링
              <BookCard 
                key={loan.id} 
                book={loan.books} 
                activeLoan={loan} // activeLoan에는 loan 객체 전체를 전달
                userId={user?.id} 
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}