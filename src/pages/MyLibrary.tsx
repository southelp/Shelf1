import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';
import BookCard from '../components/BookCard'; // BookCard 컴포넌트를 재사용합니다.

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

    // 1. 내가 소유한 책 목록을 가져옵니다.
    const { data: ownedBooks } = await supabase
      .from('books')
      .select('*, profiles(id, full_name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setOwned(ownedBooks || []);

    // 2. 나의 대출/예약 현황을 관련 책 정보와 함께 가져옵니다.
    const { data: loans } = await supabase
      .from('loans')
      .select('*, books(*, profiles(id, full_name))') // books 테이블과 그 안의 profiles 정보까지 JOIN
      .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`)
      .in('status', ['reserved', 'loaned']) // 현재 진행 중인 대출/예약만 필터링
      .order('requested_at', { ascending: false });
      
    setMyLoans(loans || []);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 책 삭제 핸들러
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase.from('books').delete().eq('id', bookId);

    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      alert('The book has been deleted.');
      loadData(); // 성공적으로 삭제 후 목록을 새로고침합니다.
    }
  };

  return (
    <div className="container">
      <div className="section">
        <h2>My Owned Books</h2>
        <div className="grid">{owned.map(b => (
          <div className="card" key={b.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{b.title}</div>
              <div className="label">{b.authors?.join(', ')}</div>
              <div className="label">
                Status: {b.available ? 'Available' : 'Borrowed/Reserved'}
              </div>
            </div>
            <button
              className="btn"
              onClick={() => handleDeleteBook(b.id)}
              style={{ background: '#ef4444', marginTop: '12px' }}
            >
              Delete
            </button>
          </div>
        ))}</div>
      </div>
      <div className="section">
        <h2>Loan/Reservation Status</h2>
        <div className="grid">
          {myLoans.map(loan => 
            // 3. loan 객체에 포함된 book 데이터로 BookCard를 렌더링합니다.
            loan.books ? (
              <BookCard 
                key={loan.id} 
                book={loan.books} 
                activeLoan={loan} // activeLoan prop에는 loan 객체 전체를 전달합니다.
                userId={user?.id} 
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}