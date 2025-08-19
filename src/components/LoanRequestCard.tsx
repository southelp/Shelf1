// src/components/LoanRequestCard.tsx

import { supabase } from '../lib/supabaseClient';
import type { Loan } from '../types';

// 이름 포맷팅 함수
const formatOwnerName = (name: string | null | undefined) => {
  if (!name) return '...';
  return name.replace('(School of Innovation Foundations)', '').trim();
};

export default function LoanRequestCard({ loan, onComplete }: { loan: Loan; onComplete: () => void; }) {
  const handleAction = async (action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    try {
      const { error } = await supabase.functions.invoke('manage-loan-request', {
        body: { loan_id: loan.id, action },
      });
      if (error) throw new Error(error.message);

      alert(`Request has been successfully ${action}d.`);
      onComplete(); // 부모 컴포넌트에 알려 목록을 새로고침하게 함
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };
  
  // 대출을 요청한 사람(borrower)의 프로필 정보를 가져와야 합니다.
  // 이 부분은 Loan 타입 정의와 MyLibrary의 쿼리가 borrower의 profile을 포함하도록 수정되어야 합니다.
  // 현재 타입 정의상 borrower의 이름은 loan.books.profiles.full_name 으로 잘못 연결되어 있을 수 있습니다.
  // 정확한 borrower의 이름을 표시하려면 MyLibrary에서 loan 조회 시 borrower의 profile을 join해야 합니다.
  // 임시로 'A user'로 표시합니다.
  const borrowerName = 'A user'; // TODO: Fix this by fetching borrower profile

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