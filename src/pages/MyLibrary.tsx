import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

export default function MyLibrary() {
  const [owned, setOwned] = useState<Book[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]);
      return;
    }

    // 내가 소유한 책 목록만 가져옵니다.
    const { data: ownedBooks } = await supabase
      .from('books')
      .select('*, profiles(id, full_name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setOwned(ownedBooks || []);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    </div>
  );
}