import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import FilterBar from '../components/FilterBar';
import BookCard from '../components/BookCard';
import BookDetailsPanel from '../components/BookDetailsPanel';
import LoanRequestCard from '../components/LoanRequestCard';
import { Logo } from '../components/Logo';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';

const statusOrder = { 'Available': 0, 'Reserved': 1, 'Borrowed': 2 };
const LERP_FACTOR = 0.1; // Smoothing factor for scrolling
const INITIAL_OFFSET = 174; // Approx. one row height to start below the fold

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [q, setQ] = useState('');
  const user = useUser();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isPcScreen, setIsPcScreen] = useState(window.innerWidth >= 1024);
  const [isHovered, setIsHovered] = useState(false);
  
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridContentRef = useRef<HTMLDivElement>(null);
  
  const positionRef = useRef(0);
  const targetPositionRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const scrollSpeed = 0.2;

  const handleBookClick = (book: Book, loan: Loan | null) => {
    setSelectedBook(book);
    setSelectedLoan(loan);
  };
  const handleCloseDetailsPanel = () => setSelectedBook(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    let bookQuery = supabase.from('books').select('*, profiles(id, full_name)');
    if (onlyAvailable) bookQuery = bookQuery.eq('available', true);
    if (q) {
      bookQuery = bookQuery.or(`title.ilike.%${q}%,authors::text.ilike.%${q}%`);
    }
    
    const { data: bookData } = await bookQuery;
    const bookIds = (bookData || []).map(b => b.id);
    let loansMap: Record<string, Loan | null> = {};
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      (loansData || []).forEach(l => { if (!loansMap[l.book_id]) loansMap[l.book_id] = l; });
    }

    if (user) {
      const { data: requestsData } = await supabase.from('loans').select('*, books(*), profiles:borrower_id(id, full_name)').eq('owner_id', user.id).eq('status', 'reserved').order('requested_at', { ascending: false });
      setIncomingRequests(requestsData || []);
    }

    const getStatus = (book: Book) => (loansMap[book.id] ? (loansMap[book.id]?.status === 'loaned' ? 'Borrowed' : 'Reserved') : 'Available');
    const sortedBooks = (bookData || []).sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      if (statusOrder[statusA] !== statusOrder[statusB]) return statusOrder[statusA] - statusOrder[statusB];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setBooks(sortedBooks);
    setLoans(loansMap);
    setIsLoading(false);
  }, [onlyAvailable, q, user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleResize = () => setIsPcScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoading && !isInitialized && isPcScreen && books.length > 0 && gridContentRef.current) {
      positionRef.current = -INITIAL_OFFSET;
      targetPositionRef.current = 0;
      gridContentRef.current.style.transform = `translateY(-${positionRef.current}px)`;
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized, isPcScreen, books]);

  useEffect(() => {
    const animate = () => {
      if (!gridContentRef.current || !gridContainerRef.current || selectedBook) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const isContentScrollable = gridContentRef.current.scrollHeight > gridContainerRef.current.clientHeight;
      const maxScroll = gridContentRef.current.scrollHeight - gridContainerRef.current.clientHeight;

      if (isInitialized && !isHovered && !q && isPcScreen && isContentScrollable) {
        if (targetPositionRef.current >= 0 && targetPositionRef.current < maxScroll) {
          targetPositionRef.current += scrollSpeed;
        }
      }

      const currentPos = positionRef.current;
      const targetPos = targetPositionRef.current;
      if (Math.abs(targetPos - currentPos) > 0.01) {
        positionRef.current = currentPos + (targetPos - currentPos) * LERP_FACTOR;
        gridContentRef.current.style.transform = `translateY(-${positionRef.current}px)`;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPcScreen, isHovered, selectedBook, q, isInitialized]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isPcScreen || !gridContentRef.current || !gridContainerRef.current || q) return;
    event.preventDefault();

    const maxScroll = gridContentRef.current.scrollHeight - gridContainerRef.current.clientHeight;
    let newTargetPosition = targetPositionRef.current + event.deltaY;
    newTargetPosition = Math.max(0, Math.min(newTargetPosition, maxScroll));

    targetPositionRef.current = newTargetPosition;
  };

  const handleMouseEnter = () => { if (isPcScreen) setIsHovered(true); };
  const handleMouseLeave = () => { if (isPcScreen) setIsHovered(false); };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-grow flex justify-center items-center"><p>Loading books...</p></div>;
    }
    if (books.length === 0) {
      if (q) {
        return <div className="flex-grow text-center py-10"><p>No books found matching your search for "{q}".</p></div>;
      }
      return (
        <div className="flex-grow flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to the Shelf!</h2>
          <p className="text-gray-600">It looks like there are no books here yet. Be the first to add one!</p>
        </div>
      );
    }
    return (
      <div className="flex-grow overflow-y-auto mt-6 px-[50px]">
        {incomingRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-medium text-gray-800">Incoming Loan Requests</h2>
              <div className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">{incomingRequests.length}</div>
            </div>
            <div className="p-4 border rounded-2xl bg-gray-50/70" style={{ borderColor: '#EEEEEC' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {incomingRequests.map(req => <LoanRequestCard key={req.id} loan={req} onComplete={loadData} />)}
              </div>
            </div>
          </div>
        )}
        <div
          ref={gridContainerRef}
          className={q ? "" : "scrolling-grid-container"}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        >
          <div ref={gridContentRef} className="scrolling-grid" style={{ pointerEvents: q ? 'auto' : (isHovered ? 'auto' : 'none') }}>
            {books.map((b, index) => (
              <BookCard key={`${b.id}-${index}`} book={b} activeLoan={loans[b.id] || null} onClick={(book, loan) => handleBookClick(book, loan)} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#FCFCFC', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
      <div className="flex-shrink-0 flex flex-col items-center pt-8">
        <div className="w-full max-w-lg mb-8"><Logo /></div>
        <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
      </div>
      {renderContent()}
      {selectedBook && (
        <BookDetailsPanel book={selectedBook} activeLoan={selectedLoan} userId={user?.id} onClose={handleCloseDetailsPanel} onLoanRequested={loadData} />
      )}
    </div>
  );
}
