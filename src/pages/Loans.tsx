import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { Loan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';

function MyLoanCard({ loan, onComplete }: { loan: Loan; onComplete: () => void; }) {
  const handleAction = async (action: 'return' | 'cancel') => {
    if (!window.confirm(`Are you sure you want to ${action} this loan?`)) return;

    try {
      const functionName = action === 'return' ? 'return-loan' : 'cancel-loan';
      const { error, data } = await supabase.functions.invoke(functionName, { body: { loan_id: loan.id } });
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.message && !data.ok) throw new Error(data.message);
      window.alert(`Action completed successfully.`);
      onComplete();
    } catch (err: any) {
      window.alert(`Error: ${err.message}`);
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

export default function Loans() {
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setMyLoans([]);
      return;
    }

    const { data: loans } = await supabase
      .from('loans')
      .select('*, books(*, profiles(id, full_name))')
      .eq('borrower_id', user.id)
      .in('status', ['reserved', 'loaned'])
      .order('requested_at', { ascending: false });
    setMyLoans(loans || []);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="container">
      <div className="section">
        <h2>My Loans & Reservations</h2>
        <div className="grid">
          {myLoans.map(loan => 
            <MyLoanCard key={loan.id} loan={loan} onComplete={loadData} />
          )}
        </div>
      </div>
    </div>
  );
}
