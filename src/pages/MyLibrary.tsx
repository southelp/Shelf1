import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react'; // useUser 훅 가져오기

export default function MyLibrary() {
  const [owned, setOwned] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const user = useUser(); // 훅으로 사용자 정보 가져오기

  const loadData = useCallback(async () => {
    if (!user) { // 훅에서 가져온 user 사용
      setOwned([]);
      setMyLoans([]);
      return;
    }

    const { data: ownedBooks } = await supabase.from('books').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    setOwned(ownedBooks || []);

    const { data: loans } = await supabase.from('loans').select('*').or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`).order('requested_at', { ascending: false });
    setMyLoans(loans || []);
  }, [user]); // 의존성 배열에 user 추가

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
          <div className="card" key={b.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{b.title}</div>
              <div className="label">{b.authors?.join(', ')}</div>
              <div className="label">
                Status: {b.available ? 'Available' : 'Borrowed/Reserved'}
              </div>
            </div>
            {/* --- ✨ 삭제 버튼 추가 --- */}
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
          {myLoans.map(l => (
            <div className="card" key={l.id}>
              <div className="label">Loan status</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{l.status}</div>
              <div className="label">
                Due date: {l.due_at ? new Date(l.due_at).toLocaleDateString() : '-'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}