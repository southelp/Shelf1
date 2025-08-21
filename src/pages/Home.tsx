import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/FilterBar';
import BookCard from '../components/BookCard';
import PaginatedBookGrid from '../components/PaginatedBookGrid';
import BookDetailsPanel from '../components/BookDetailsPanel';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

// Book status sorting order
const statusOrder = { 'Available': 0, 'Reserved': 1, 'Borrowed': 2 };

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
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
    let query = supabase.from('books').select('*, profiles(id, full_name)');
    
    if (onlyAvailable) {
      query = query.eq('available', true);
    }
    if (q) {
      query = query.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`);
    }
    
    const { data: bookData, error } = await query;
    if (error) {
      console.error('Error fetching books:', error);
      return { books: [], loans: {} };
    }

    if (!bookData) return { books: [], loans: {} };

    const bookIds = bookData.map(b => b.id);
    let loansMap: Record<string, Loan | null> = {};
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      loansData?.forEach(l => {
        if (!loansMap[l.book_id]) {
          loansMap[l.book_id] = l;
        }
      });
    }
    return { books: bookData, loans: loansMap };

  }, [onlyAvailable, q]);
  
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
    const fetchDataAndSort = async () => {
      const { books: fetchedBooks, loans: fetchedLoans } = await loadData();
      const sorted = sortBooks(fetchedBooks, fetchedLoans);
      setBooks(sorted);
      setLoans(fetchedLoans);
    };
    fetchDataAndSort();
  }, [loadData]);

  return (
    <div 
      className="w-full h-full flex flex-col"
      style={{ 
        backgroundColor: '#FCFCFC',
        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
      }}
    >
      {/* Main content area */}
      <div className="flex flex-col items-start self-stretch h-full">
        {/* Zero state or search area */}
        {books.length === 0 && !q ? (
          <div className="flex flex-col justify-center items-center gap-3 self-stretch flex-grow">
            <div className="flex flex-col items-center">
              <div className="flex flex-col items-start">
                {/* Logo similar to Google AI Studio */}
                <div 
                  className="text-3xl font-medium mb-2"
                  style={{
                    color: '#191919',
                    fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                  }}
                >
                  Taejea Open Shelf
                </div>
              </div>
            </div>

            {/* Search input similar to Google AI Studio */}
            <div className="flex max-w-3xl pt-3 justify-center items-start">
              <div className="flex px-1 flex-col items-start">
                <div 
                  className="flex flex-col items-start"
                >
                  <div 
                    className="flex p-3 flex-col items-start rounded-[40px] border bg-white"
                    style={{ borderColor: '#EEEEEC' }}
                  >
                    <div className="flex items-end gap-1.5">
                      <div className="flex min-h-9 py-2 items-center flex-1">
                        <div className="flex flex-col items-start flex-1">
                          <div className="flex flex-col items-start">
                            <div className="flex justify-center items-center self-stretch">
                              <div className="flex w-[577px] flex-col items-start absolute">
                                <div className="flex h-5 items-center gap-1 self-stretch">
                                  <div className="flex pr-2 flex-col items-start self-stretch">
                                    <FilterBar 
                                      onSearch={setQ} 
                                      onlyAvailable={onlyAvailable} 
                                      onToggleAvailable={setOnlyAvailable} 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            {/* Filter bar for when we have content */}
            <div className="w-full mb-6 pt-6 flex-shrink-0">
              <FilterBar 
                onSearch={setQ} 
                onlyAvailable={onlyAvailable} 
                onToggleAvailable={setOnlyAvailable} 
              />
            </div>

            {/* Scrollable content area */}
            <div className="w-full flex-grow overflow-y-auto">
              {/* Books grid */}
              <div className="w-full">
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
                  itemsPerPage={50} // 10 columns * 5 rows
                />
              </div>

              {/* Featured section when we have books */}
              {books.length > 0 && (
                <div className="w-full mt-12">
                  <div 
                    className="max-w-3xl"
                    style={{ 
                      backgroundColor: '#F8F8F7',
                      borderColor: '#EEEEEC' 
                    }}
                  >
                    <div className="mb-3">
                      <div 
                        className="text-xs font-normal leading-5"
                        style={{
                          color: '#5D5D5F',
                          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                        }}
                      >
                        Recently Added
                      </div>
                    </div>
                    
                    <div 
                      className="h-48 grid grid-cols-2 gap-1 p-3 border rounded-2xl"
                      style={{ 
                        backgroundColor: '#F8F8F7',
                        borderColor: '#EEEEEC' 
                      }}
                    >
                      {books.slice(0, 4).map((book) => (
                        <div 
                          key={book.id}
                          className="flex justify-center"
                        >
                          <div className="flex flex-col items-center">
                            <div 
                              className="w-16 h-24 bg-white border rounded-lg shadow-sm overflow-hidden"
                              style={{ borderColor: '#EEEEEC' }}
                            >
                              <img
                                src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div 
                              className="mt-1 text-xs text-center line-clamp-2 max-w-16"
                              style={{
                                color: '#1A1C1E',
                                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                              }}
                            >
                              {book.title}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
