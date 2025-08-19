import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book, Loan } from '../types';
import { useUser } from '@supabase/auth-helpers-react';
import LoanRequestCard from '../components/LoanRequestCard';

// '나의 서재'를 위한 새로운 대출 카드 컴포넌트
function MyLoanCard({ loan, onComplete }: { loan: Loan; onComplete: () => void; }) {
  const handleAction = async (action: 'return' | 'cancel') => {
    const functionName = action === 'return' ? 'return-loan' : 'cancel-loan';
    if (!confirm(`Are you sure you want to ${action} this loan?`)) return;

    try {
      const { error, data } = await supabase.functions.invoke(functionName, { body: { loan_id: loan.id } });
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.message && !data.ok) throw new Error(data.message);
      alert(`Action completed successfully.`);
      onComplete();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };
  
  const formatKSTDate = (dateString: string) => new Date(dateString).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="card">
      {loan.books?.cover_url && <img src={loan.books.cover_url} alt={loan.books.title} style={{ width: '100%', height: 180, objectFit: 'contain', borderRadius: 12, marginBottom: 8, background: '#f9fafb' }} />}
      <div style={{ fontWeight: 700 }}>{loan.books?.title}</div>
      <div className="label">Owner: {loan.books?.profiles?.full_name || '...'}</div>
      
      {loan.status === 'loaned' && loan.due_at && (
        <div className="label" style={{ marginTop: 8, fontWeight: 600, color: '#dd2222' }}>
          Due: {formatKSTDate(loan.due_at)}
        </div>
      )}

      <div className="row" style={{ marginTop: 'auto', paddingTop: '12px' }}>
        {loan.status === 'loaned' && <button className="btn" onClick={() => handleAction('return')} style={{ flex: 1 }}>Return Book</button>}
        {loan.status === 'reserved' && <button className="btn" onClick={() => handleAction('cancel')} style={{ flex: 1, background: '#6b7280' }}>Cancel Reservation</button>}
      </div>
    </div>
  );
}


export default function MyLibrary() {
  const [owned, setOwned] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setOwned([]); setMyLoans([]); setIncomingRequests([]);
      return;
    }
    // ... (ownedBooks, requests 조회 로직은 동일)
    const { data: loans } = await supabase
      .from('loans')
      .select('*, books(*, profiles(id, full_name))')
      .eq('borrower_id', user.id)
      .in('status', ['reserved', 'loaned'])
      .order('requested_at', { ascending: false });
    setMyLoans(loans || []);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  
  const handleDeleteBook = async (bookId: string) => { /* ... */ };

  return (
    <div className="container">
      {/* ... (Incoming Loan Requests, My Owned Books 섹션은 동일) */}
      <div className="section">
        <h2>My Loans & Reservations</h2>
        <div className="grid">
          {myLoans.map(loan => 
            <MyLoanCard key={loan.id} loan={loan} onComplete={loadData} />
          )}
        </div>
      </div>
      {/* ... */}
    </div>
  );
}