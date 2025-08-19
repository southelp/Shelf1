import { supabase } from '../lib/supabaseClient.ts';
import type { Loan } from '../types.ts';

// 이름에서 불필요한 문구를 제거하는 함수
const formatName = (name: string | null | undefined) => {
  if (!name) return 'Unknown User';
  return name.replace('(School of Innovation Foundations)', '').trim();
};

export default function LoanRequestCard({ loan, onComplete }: { loan: Loan; onComplete: () => void; }) {
  
  const handleAction = async (action: 'approve' | 'reject') => {
    // `confirm` 대신 사용자 정의 모달을 사용해야 합니다.
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

    try {
      const { error, data } = await supabase.functions.invoke('manage-loan-request', {
        body: { loan_id: loan.id, action },
      });
      
      if (error) throw new Error(`Function error: ${error.message}`);
      if (data.message && !data.ok) throw new Error(data.message);

      // `alert` 대신 사용자 정의 메시지 박스를 사용해야 합니다.
      window.alert(`Request has been successfully ${action}d.`);
      onComplete();
    } catch (err: any) {
      // `alert` 대신 사용자 정의 메시지 박스를 사용해야 합니다.
      window.alert(`Error: ${err.message}`);
      console.error(err);
    }
  };
  
  const borrowerName = formatName(loan.profiles?.full_name);

  return (
    <div className="card">
      {loan.books?.cover_url ? (
        <img src={loan.books.cover_url} alt={loan.books.title} style={{ width: '100%', height: 180, objectFit: 'contain', borderRadius: 12, marginBottom: 8, background: '#f9fafb' }} />
      ) : (
        <div style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 8, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>No Image</div>
      )}
      <div style={{ fontWeight: 700 }}>{loan.books?.title}</div>
      <div className="label" style={{ marginBottom: '12px' }}>
        Requested by: <strong>{borrowerName}</strong>
      </div>
      <div className="row" style={{ gap: '8px' }}>
        <button className="btn" onClick={() => handleAction('approve')} style={{ flex: 1, background: '#10b981' }}>Approve</button>
        <button className="btn" onClick={() => handleAction('reject')} style={{ flex: 1, background: '#ef4444' }}>Reject</button>
      </div>
    </div>
  );
}
