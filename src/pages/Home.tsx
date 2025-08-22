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

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [q, setQ] = useState('');
  const user = useUser();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [isPcScreen, setIsPcScreen] = useState(window.innerWidth >= 1024);
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridContentRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const dynamicSpeedRef = useRef(0.2); // Base speed
  const animationFrameRef = useRef<number>();

  const handleBookClick = (book: Book, loan: Loan | null) => {
    setSelectedBook(book);
    setSelectedLoan(loan);
  };
  const handleCloseDetailsPanel = () => setSelectedBook(null);

  const loadData = useCallback(async () => {
    let bookQuery = supabase.from('books').select('*, profiles(id, full_name)');
    if (onlyAvailable) bookQuery = bookQuery.eq('available', true);
    if (q) bookQuery = bookQuery.or(`title.ilike.%${q}%,authors.cs.{${q}},isbn.ilike.%${q}%`);
    
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
  }, [onlyAvailable, q, user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleResize = () => setIsPcScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isPcScreen && gridContainerRef.current && gridContentRef.current) {
      setIsAnimationReady(gridContentRef.current.scrollHeight > gridContainerRef.current.clientHeight);
    } else {
      setIsAnimationReady(false);
    }
  }, [books, isPcScreen]);

  useEffect(() => {
    const animate = () => {
      if (isHovered || !isAnimationReady || !gridContentRef.current || selectedBook) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const contentHeight = gridContentRef.current.scrollHeight / 2;
      positionRef.current += dynamicSpeedRef.current;
      
      if (positionRef.current >= contentHeight) positionRef.current = 0;
      if (positionRef.current < 0) positionRef.current = contentHeight;

      gridContentRef.current.style.transform = `translateY(-${positionRef.current}px)`;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (isPcScreen) animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPcScreen, isAnimationReady, isHovered, selectedBook]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPcScreen || !isAnimationReady || isHovered) return;
    const container = gridContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    const topZone = height * 0.2;
    const bottomZone = height * 0.8;
    const maxSpeed = 2.5; // Max additional speed
    const baseSpeed = 0.2;

    if (y < topZone) {
      const speedMultiplier = (topZone - y) / topZone;
      dynamicSpeedRef.current = baseSpeed + maxSpeed * speedMultiplier;
    } else if (y > bottomZone) {
      const speedMultiplier = (y - bottomZone) / (height - bottomZone);
      dynamicSpeedRef.current = baseSpeed - maxSpeed * speedMultiplier;
    } else {
      dynamicSpeedRef.current = baseSpeed;
    }
  };

  const handleMouseEnter = () => { if (isPcScreen && isAnimationReady) setIsHovered(true); };
  const handleMouseLeave = () => { if (isPcScreen && isAnimationReady) setIsHovered(false); };

  const booksToRender = isAnimationReady ? [...books, ...books] : books;

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#FCFCFC', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
      {books.length === 0 && !q ? (
        <div className="flex flex-col justify-center items-center flex-grow">{/* Zero state */}</div>
      ) : (
        <>
          <div className="flex-shrink-0 flex flex-col items-center pt-8">
            <div className="w-full max-w-lg mb-8"><Logo /></div>
            <FilterBar onSearch={setQ} onlyAvailable={onlyAvailable} onToggleAvailable={setOnlyAvailable} />
          </div>
          <div className="flex-grow overflow-y-auto mt-6 px-6 md:px-0">
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
              className="scrolling-grid-container"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            >
              <div ref={gridContentRef} className="scrolling-grid" style={{ pointerEvents: isHovered ? 'auto' : 'none' }}>
                {booksToRender.map((b, index) => (
                  <BookCard key={`${b.id}-${index}`} book={b} activeLoan={loans[b.id] || null} onClick={(book, loan) => handleBookClick(book, loan)} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {selectedBook && (
        <BookDetailsPanel book={selectedBook} activeLoan={selectedLoan} userId={user?.id} onClose={handleCloseDetailsPanel} onLoanRequested={loadData} />
      )}
    </div>
  );
}
