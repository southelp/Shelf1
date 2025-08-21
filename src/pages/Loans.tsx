import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { supabase } from '../lib/supabaseClient.ts';
import { Loan } from '../types.ts';
import { useUser } from '@supabase/auth-helpers-react';
import PaginatedBookGrid from '../components/PaginatedBookGrid';

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
    <div className="g-card flex flex-col h-full text-sm">
      <div className="relative flex-grow">
        <img 
          src={loan.books?.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'} 
          alt={loan.books?.title} 
          className="w-full h-48 object-contain rounded-md mb-2 bg-gray-50"
        />
      </div>
      
      <h3 className="font-bold truncate">{loan.books?.title}</h3>
      <p className="text-gray-600 truncate text-xs mb-2">
        Owner: {loan.books?.profiles?.full_name || '...'}
      </p>

      <div 
        className={`px-2 py-1 text-xs font-semibold rounded-full self-start my-2 ${
          loan.status === 'loaned' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}
      >
        {loan.status === 'loaned' ? 'Borrowed' : 'Reserved'}
      </div>

      {loan.status === 'loaned' && loan.due_at && (
        <p className="font-semibold text-red-600">
          Due: {formatKSTDate(loan.due_at)}
        </p>
      )}

      <div className="mt-auto pt-2 border-t border-gray-100">
        {loan.status === 'loaned' && (
          <button onClick={() => handleAction('return')} className="w-full g-button-blue">
            Return Book
          </button>
        )}
        {loan.status === 'reserved' && (
          <button onClick={() => handleAction('cancel')} className="w-full g-button-gray">
            Cancel Reservation
          </button>
        )}
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

  if (!user) {
    return (
      <div 
        className="flex flex-col justify-center items-center gap-6 self-stretch py-20"
        style={{ 
          backgroundColor: '#FCFCFC',
          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
        }}
      >
        <div 
          className="text-lg font-medium"
          style={{ color: '#1A1C1E' }}
        >
          Please log in to view your loans
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-800">
          My Loans & Reservations
          {myLoans.length > 0 && (
            <span className="ml-3 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {myLoans.length}
            </span>
          )}
        </h2>
      </div>

      <div className="flex-grow overflow-y-auto">
        {myLoans.length === 0 ? (
          <Link
            to="/"
            className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-2xl text-gray-500 hover:text-blue-600 hover:border-blue-500 transition-colors"
            style={{ 
              backgroundColor: '#F8F8F7',
              borderColor: '#EEEEEC'
            }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Browse Books</h3>
            <p className="text-sm mt-1">
              You don't have any borrowed books or reservations at the moment.
            </p>
          </Link>
        ) : (
          <PaginatedBookGrid
            items={myLoans}
            renderItem={(loan) => (
              <MyLoanCard key={loan.id} loan={loan} onComplete={loadData} />
            )}
            itemsPerPage={20} // 5 columns * 4 rows
          />
        )}
      </div>
    </div>
  );
}
