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
    <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col h-full text-sm">
      <div className="relative flex-grow">
        <img 
          src={loan.books?.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'} 
          alt={loan.books?.title} 
          className="w-full h-48 object-contain rounded-md mb-2 bg-gray-50"
        />
      </div>
      
      <h3 className="font-bold truncate">{loan.books?.title}</h3>
      <p className="text-gray-600 truncate text-xs mb-2">
        Requested by: <span className="font-semibold text-gray-800">{borrowerName}</span>
      </p>
      
      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center gap-2">
        <button 
          onClick={() => handleAction('approve')} 
          className="w-full text-center bg-green-500 text-white text-xs font-bold py-1.5 px-2 rounded-md hover:bg-green-600 transition-colors"
        >
          Approve
        </button>
        <button 
          onClick={() => handleAction('reject')} 
          className="w-full text-center bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
