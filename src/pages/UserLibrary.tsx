import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import PaginatedBookGrid from '../components/PaginatedBookGrid';
import BookCard from '../components/BookCard';
import BookDetailsPanel from '../components/BookDetailsPanel';
import { useUser } from '@supabase/auth-helpers-react';

const statusOrder = { 'Available': 0, 'Reserved': 1, 'Borrowed': 2 };

export default function UserLibrary() {
  const { userId } = useParams<{ userId: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Record<string, Loan | null>>({});
  const [ownerName, setOwnerName] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const user = useUser();

  const handleBookClick = (book: Book, loan: Loan | null) => {
    setSelectedBook(book);
    setSelectedLoan(loan);
  };

  const handleCloseDetailsPanel = () => {
    setSelectedBook(null);
    setSelectedLoan(null);
  };

  const loadData = useCallback(async () => {
    if (!userId) return;

    const { data: profileData } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    setOwnerName(profileData?.full_name || 'User');

    const { data: bookData } = await supabase.from('books').select('*, profiles(id, full_name)').eq('owner_id', userId);
    if (!bookData) return;

    const bookIds = bookData.map(b => b.id);
    let loansMap: Record<string, Loan | null> = {};
    if (bookIds.length > 0) {
      const { data: loansData } = await supabase.from('loans').select('*').in('book_id', bookIds).in('status', ['reserved', 'loaned']);
      loansData?.forEach(l => { loansMap[l.book_id] = l; });
    }

    const getStatus = (book: Book) => {
      const loan = loansMap[book.id];
      if (loan) return loan.status === 'loaned' ? 'Borrowed' : 'Reserved';
      return 'Available';
    };

    const sortedBooks = [...bookData].sort((a, b) => {
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setBooks(sortedBooks);
    setLoans(loansMap);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatOwnerName = (name: string) => {
    if (!name) return 'User';
    return name.replace('(School of Innovation Foundations)', '').trim();
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {formatOwnerName(ownerName)}'s Books
        </h1>
      </div>

      <div className="flex-grow overflow-y-auto">
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
