import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import { BookWithLoan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';
import MyOwnedBookCard from '../components/MyOwnedBookCard.tsx';

export default function MyLibrary() {
  const [owned, setOwned] = useState<BookWithLoan[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const user = useUser();

  const handleBookClick = (bookId: string) => {
    setSelectedBookId(prevId => (prevId === bookId ? null : bookId));
  };

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]);
      return;
    }
    const { data: allOwnedBooks } = await supabase
      .from('books')
      .select('*, loans(*, profiles:borrower_id(full_name))')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setOwned((allOwnedBooks as BookWithLoan[]) || []);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center gap-6 self-stretch py-20">
        <div className="text-lg font-medium">Please log in to view your library</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#FCFCFC' }}>
      {/* --- Top Fixed Area --- */}
      <div className="flex-shrink-0 px-6">
        <div className="flex items-center gap-3 my-6">
          <h2 className="text-xl font-medium" style={{ color: '#1A1C1E' }}>
            My Books
          </h2>
          <div className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            {owned.length}
          </div>
        </div>
      </div>

      {/* --- Scrollable Area --- */}
      <div className="flex-grow overflow-y-auto px-[50px] pb-6">
        {owned.length === 0 ? (
          <Link 
            to="/books/new"
            className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-2xl text-gray-500 hover:text-blue-600 hover:border-blue-500 transition-colors"
            style={{ backgroundColor: '#F8F8F7', borderColor: '#EEEEEC' }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              </div>
              <div className="text-base font-medium">Add your first book</div>
              <div className="text-sm text-center max-w-md">Start building your library by adding a book</div>
            </div>
          </Link>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {owned.map(b => (
              <MyOwnedBookCard 
                key={b.id} 
                book={b} 
                onComplete={loadData}
                isSelected={selectedBookId === b.id}
                onClick={() => handleBookClick(b.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}