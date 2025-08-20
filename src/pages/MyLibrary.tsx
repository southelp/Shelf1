import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { BookWithLoan, Loan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';
import MyOwnedBookCard from '../components/MyOwnedBookCard.tsx';
import LoanRequestCard from '../components/LoanRequestCard.tsx';

export default function MyLibrary() {
  const [owned, setOwned] = useState<BookWithLoan[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const user = useUser();

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

  return (
    <div className="container">
      {incomingRequests.length > 0 && (
        <div className="section">
          <h2>Incoming Loan Requests</h2>
          <div className="grid">
            {incomingRequests.map(req => (
              <LoanRequestCard key={req.id} loan={req} onComplete={loadData} />
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h2>My Owned Books</h2>
        <div className="grid">
          {owned.map(b => (
            <MyOwnedBookCard key={b.id} book={b} onComplete={loadData} />
          ))}
        </div>
      </div>
    </div>
  );
}
