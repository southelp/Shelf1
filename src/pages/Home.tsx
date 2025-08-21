import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/FilterBar';
import BookCard from '../components/BookCard';
import PaginatedBookGrid from '../components/PaginatedBookGrid';
import BookDetailsPanel from '../components/BookDetailsPanel';
import LoanRequestCard from '../components/LoanRequestCard'; // New import
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

// Book status sorting order
const statusOrder = { 'Available': 0, 'Reserved': 1, 'Borrowed': 2 };

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]); // New state for loan requests
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [q, setQ] = useState('');
  const user = useUser();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const handleBookClick = (book: Book, loan: Loan | null) => {
    setSelectedBook(book);
    setSelectedLoan(loan);
  };

  const handleCloseDetailsPanel = () => {
    setSelectedBook(null);
    setSelectedLoan(null);
  };

  const loadData = useCallback(async () => {
    // Fetch books
    let bookQuery = supabase.from('books').select('*, profiles(id, full_name)');
    if (onlyAvailable) {
      bookQuery = bookQuery.eq('available', true);
    }
    if (q) {
      bookQuery = bookQuery.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`);
    }
    const { data: bookData, error: bookError } = await bookQuery;
    if (bookError) console.error('Error fetching books:', bookError);

    // Fetch active loans for the books
    const bookIds = (bookData || []).map(b => b.id);
    let loansMap: Record<string, Loan | null> = {};
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      (loansData || []).forEach(l => {
        if (!loansMap[l.book_id]) {
          loansMap[l.book_id] = l;
        }
      });
    }

    // Fetch incoming loan requests for the current user
    if (user) {
      const { data: requestsData } = await supabase
        .from('loans')
        .select('*, books(*), profiles:borrower_id(id, full_name)')
        .eq('owner_id', user.id)
        .eq('status', 'reserved')
        .order('requested_at', { ascending: false });
      setIncomingRequests(requestsData || []);
    } else {
      setIncomingRequests([]);
    }

    // Sort and set books
    const sortedBooks = sortBooks(bookData || [], loansMap);
    setBooks(sortedBooks);
    setLoans(loansMap);

  }, [onlyAvailable, q, user]);
  
  const sortBooks = (booksToSort: Book[], loansToSort: Record<string, Loan | null>) => {
    const getStatus = (book: Book) => {
      const loan = loansToSort[book.id];
      if (loan) return loan.status === 'loaned' ? 'Borrowed' : 'Reserved';
      return 'Available';
    };

    return [...booksToSort].sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div 
      className="w-full h-full flex flex-col"
      style={{ 
        backgroundColor: '#FCFCFC',
        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
      }}
    >
      {/* Zero state or initial view */}
      {books.length === 0 && !q ? (
        <div className="flex flex-col justify-center items-center flex-grow">
          {/* ... existing zero state JSX ... */}
        </div>
      ) : (
        <>
          {/* --- Top Fixed Area --- */}
          <div className="flex-shrink-0">
            <FilterBar 
              onSearch={setQ} 
              onlyAvailable={onlyAvailable} 
              onToggleAvailable={setOnlyAvailable} 
            />
          </div>

          {/* --- Scrollable Content Area --- */}
          <div className="flex-grow overflow-y-auto mt-6 px-6 md:px-0">
            {/* Incoming Loan Requests Section */}
            {incomingRequests.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-medium text-gray-800">Incoming Loan Requests</h2>
                  <div className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                    {incomingRequests.length}
                  </div>
                </div>
                <div className="p-4 border rounded-2xl bg-gray-50/70" style={{ borderColor: '#EEEEEC' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {incomingRequests.map(req => (
                      <LoanRequestCard key={req.id} loan={req} onComplete={loadData} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Books grid */}
            <PaginatedBookGrid
              items={books}
              renderItem={(b) => (
                <BookCard
                  key={b.id}
                  book={b}
                  activeLoan={loans[b.id] || null}
                  onClick={handleBookClick}
                />
              )}
              itemsPerPage={50}
            />
          </div>
        </>
      )}

      {selectedBook && (
        <BookDetailsPanel
          book={selectedBook}
          activeLoan={selectedLoan}
          userId={user?.id}
          onClose={handleCloseDetailsPanel}
          onLoanRequested={loadData}
        />
      )}
    </div>
  );
}
