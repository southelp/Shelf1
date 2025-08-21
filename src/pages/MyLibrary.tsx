import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { supabase } from '../lib/supabaseClient.ts';
import { BookWithLoan, Loan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';
import MyOwnedBookCard from '../components/MyOwnedBookCard.tsx';
import LoanRequestCard from '../components/LoanRequestCard.tsx';

export default function MyLibrary() {
  const [owned, setOwned] = useState<BookWithLoan[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const user = useUser();

  const handleBookClick = (bookId: string) => {
    setSelectedBookId(prevId => (prevId === bookId ? null : bookId));
  };

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]);
      setIncomingRequests([]);
      return;
    }

    // Fetch owned books
    const { data: allOwnedBooks } = await supabase
      .from('books')
      .select('*, loans(*, profiles:borrower_id(full_name))')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setOwned((allOwnedBooks as BookWithLoan[]) || []);

    // Fetch incoming loan requests
    const { data: requests } = await supabase
      .from('loans')
      .select('*, books(*), profiles:borrower_id(id, full_name)')
      .eq('owner_id', user.id)
      .eq('status', 'reserved')
      .order('requested_at', { ascending: false });
    setIncomingRequests(requests || []);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) {
    return (
      <div 
        className="flex flex-col justify-center items-center gap-6 self-stretch py-20"
        style={{ 
          backgroundColor: '#FCFCFC',
          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
        }}
      >
        <div 
          className="text-lg font-medium"
          style={{ color: '#1A1C1E' }}
        >
          Please log in to view your library
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full overflow-auto p-6"
      style={{ 
        backgroundColor: '#FCFCFC',
        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
      }}
    >
      <div className="flex flex-col gap-8">
        {/* Incoming Loan Requests Section */}
        {incomingRequests.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 
                className="text-xl font-medium"
                style={{
                  color: '#1A1C1E',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                Incoming Loan Requests
              </h2>
              <div 
                className="px-2 py-1 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: '#ffedd5',
                  color: '#9a3412'
                }}
              >
                {incomingRequests.length}
              </div>
            </div>
            
            <div 
              className="p-4 border rounded-2xl"
              style={{ 
                backgroundColor: '#F8F8F7',
                borderColor: '#EEEEEC'
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {incomingRequests.map(req => (
                  <LoanRequestCard key={req.id} loan={req} onComplete={loadData} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* My Owned Books Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 
              className="text-xl font-medium"
              style={{
                color: '#1A1C1E',
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
              }}
            >
              My Books
            </h2>
            <div 
              className="px-2 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: '#dcfce7',
                color: '#166534'
              }}
            >
              {owned.length}
            </div>
          </div>

          {owned.length === 0 ? (
            <Link 
              to="/books/new"
              className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl text-gray-500 hover:text-blue-600 hover:border-blue-500 transition-colors"
              style={{ 
                backgroundColor: '#F8F8F7',
                borderColor: '#EEEEEC'
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                <div 
                  className="text-base font-medium"
                >
                  Add your first book
                </div>
                <div 
                  className="text-sm text-center max-w-md"
                >
                  Start building your library by adding a book
                </div>
              </div>
            </Link>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
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
    </div>
  );
}
