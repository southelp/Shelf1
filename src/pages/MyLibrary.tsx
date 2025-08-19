import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';
import BookCard from '../components/BookCard';
import LoanRequestCard from '../components/LoanRequestCard';

export default function MyLibrary() {
  const [owned, setOwned] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]);
      setMyLoans([]);
      setIncomingRequests([]);
      return;
    }

    // 내가 소유한 책 목록
    const { data: ownedBooks } = await supabase
      .from('books')
      .select('*, profiles(id, full_name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setOwned(ownedBooks || []);

    // 내가 빌린 책/예약 현황
    const { data: loans } = await supabase
      .from('loans')
      .select('*, books(*, profiles(id, full_name))')
      .eq('borrower_id', user.id)
      .in('status', ['reserved', 'loaned'])
      .order('requested_at', { ascending: false });
    setMyLoans(loans || []);
      
    // ✨ 나에게 들어온 대출 요청 목록 (쿼리 수정)
    const { data: requests } = await supabase
      .from('loans')
      // Supabase의 관계 조인 문법을 사용하여 borrower_id와 일치하는 profiles 레코드를 가져옵니다.
      .select('*, books(*), profiles:borrower_id(id, full_name)')
      .eq('owner_id', user.id)
      .eq('status', 'reserved')
      .order('requested_at', { ascending: false });
    setIncomingRequests(requests || []);

  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 책 삭제 핸들러
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      alert('The book has been deleted.');
      loadData();
    }
  };

  return (
    <div className="container">
      {/* 나에게 들어온 대출 요청 섹션 */}
      {incomingRequests.length > 0 && (
        <div className="section">
          <h2>Incoming Loan Requests</h2>
          <div className="grid">
            {incomingRequests.map(req => (
              <LoanRequestCard key={req.id} loan={req} onComplete={loadData} />
            ))}
          </div>
        </div>
      )}

      {/* 나의 대출/예약 현황 섹션 (내가 빌린 책들) */}
      <div className="section">
        <h2>My Loans & Reservations</h2>
        <div className="grid">
          {myLoans.map(loan => 
            loan.books ? (
              <BookCard key={loan.id} book={loan.books} activeLoan={loan} userId={user?.id} />
            ) : null
          )}
        </div>
      </div>

      {/* 내가 소유한 책 섹션 */}
      <div className="section">
        <h2>My Owned Books</h2>
        <div className="grid">{owned.map(b => (
          <div className="card" key={b.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{b.title}</div>
              <div className="label">{b.authors?.join(', ')}</div>
              <div className="label">Status: {b.available ? 'Available' : 'Borrowed/Reserved'}</div>
            </div>
            <button className="btn" onClick={() => handleDeleteBook(b.id)} style={{ background: '#ef4444', marginTop: '12px' }}>Delete</button>
          </div>
        ))}</div>
      </div>
    </div>
  );
}