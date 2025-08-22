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
  const [isScrollable, setIsScrollable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridContentRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const scrollSpeed = 0.2; // Constant speed

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
      setIsScrollable(gridContentRef.current.scrollHeight > gridContainerRef.current.clientHeight);
    } else {
      setIsScrollable(false);
    }
  }, [books, isPcScreen]);

  useEffect(() => {
    const animate = () => {
      if (isHovered || !isScrollable || !gridContentRef.current || !gridContainerRef.current || selectedBook) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const maxScroll = gridContentRef.current.scrollHeight - gridContainerRef.current.clientHeight;
      if (positionRef.current < maxScroll) {
        positionRef.current += scrollSpeed;
        positionRef.current = Math.min(positionRef.current, maxScroll); // Clamp to max
        gridContentRef.current.style.transform = `translateY(-${positionRef.current}px)`;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (isPcScreen) animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPcScreen, isScrollable, isHovered, selectedBook]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isPcScreen || !isScrollable || !gridContentRef.current || !gridContainerRef.current) return;
    event.preventDefault();

    const maxScroll = gridContentRef.current.scrollHeight - gridContainerRef.current.clientHeight;
    let newPosition = positionRef.current + event.deltaY;
    newPosition = Math.max(0, Math.min(newPosition, maxScroll)); // Clamp between 0 and maxScroll

    positionRef.current = newPosition;
    gridContentRef.current.style.transform = `translateY(-${positionRef.current}px)`;
  };

  const handleMouseEnter = () => { if (isPcScreen && isScrollable) setIsHovered(true); };
  const handleMouseLeave = () => { if (isPcScreen && isScrollable) setIsHovered(false); };

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
              className="scrolling-grid-container"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            >
              <div ref={gridContentRef} className="scrolling-grid" style={{ pointerEvents: isHovered ? 'auto' : 'none' }}>
                {books.map((b, index) => (
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
