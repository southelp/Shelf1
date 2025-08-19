import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { Loan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';
import LoanRequestCard from '../components/LoanRequestCard.tsx';

// '나의 서재'에 있던 MyLoanCard 컴포넌트를 이곳으로 이동시킵니다.
function MyLoanCard({ loan, onComplete }: { loan: Loan; onComplete: () => void; }) {
  // ✨ `alert` 대신 사용자 정의 메시지 박스를 사용합니다.
  const showMessage = (message: string) => {
    // 실제 구현에서는 모달 또는 토스트 알림을 사용해야 합니다.
    console.log(message);
    // 현재는 `alert`를 대체하기 위해 console.log를 사용합니다.
  };

  const handleAction = async (action: 'return' | 'cancel') => {
    // `confirm` 대신 사용자 정의 모달을 사용해야 합니다.
    if (!window.confirm(`Are you sure you want to ${action} this loan?`)) return;

    try {
      const functionName = action === 'return' ? 'return-loan' : 'cancel-loan';
      const { error, data } = await supabase.functions.invoke(functionName, { body: { loan_id: loan.id } });
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.message && !data.ok) throw new Error(data.message);
      showMessage(`Action completed successfully.`);
      onComplete();
    } catch (err: any) {
      showMessage(`Error: ${err.message}`);
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

// ✨ setLoanRequestsCount prop을 받도록 수정
export default function Loans({ setLoanRequestsCount }: { setLoanRequestsCount: (count: number) => void }) {
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Loan[]>([]);
  const user = useUser();

  const loadData = useCallback(async () => {
    if (!user) {
      setMyLoans([]);
      setIncomingRequests([]);
      return;
    }

    // 내가 빌린 책/예약 현황 (상대방이 소유자)
    const { data: loans } = await supabase
      .from('loans')
      .select('*, books(*, profiles(id, full_name))')
      .eq('borrower_id', user.id)
      .in('status', ['reserved', 'loaned'])
      .order('requested_at', { ascending: false });
    setMyLoans(loans || []);
      
    // 나에게 들어온 대출 요청 목록 (내가 소유자)
    const { data: requests } = await supabase
      .from('loans')
      .select('*, books(*), profiles:borrower_id(id, full_name)')
      .eq('owner_id', user.id)
      .eq('status', 'reserved')
      .order('requested_at', { ascending: false });
    
    // ✨ Incoming requests 개수를 App.tsx로 전달
    setLoanRequestsCount((requests || []).length);
    setIncomingRequests(requests || []);

  }, [user, setLoanRequestsCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="container">
      {/* 나에게 들어온 대출 요청 섹션 */}
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

      {/* 나의 대출/예약 현황 섹션 (내가 빌린 책들) */}
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
