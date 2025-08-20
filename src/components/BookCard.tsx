import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Book, Loan } from '../types';

export default function BookCard({
  book,
  activeLoan,
  userId,
}: {
  book: Book;
  activeLoan: Loan | null;
  userId?: string;
}) {
  const isOwner = userId !== undefined && book.owner_id === userId;

  let badgeText = 'Available';
  if (activeLoan) {
    badgeText = activeLoan.status === 'loaned' ? 'Borrowed' : 'Reserved';
  } else if (!book.available) {
    badgeText = 'Borrowed';
  }

  const disabled = Boolean(activeLoan) || isOwner;

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'Available':
        return { background: '#dcfce7', color: '#166534' };
      case 'Reserved':
        return { background: '#ffedd5', color: '#9a3412' };
      case 'Borrowed':
        return { background: '#fee2e2', color: '#991b1b' };
      default:
        return { background: '#e5e7eb', color: '#4b5563' };
    }
  };

  const formatOwnerName = (name: string | null | undefined) => {
    if (!name) return 'User';
    return name.replace('(School of Innovation Foundations)', '').trim();
  };

  const formatKSTDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ✨ 1. Request Loan 버튼 로직을 복구하고 확인 창을 추가합니다.
  async function requestLoan() {
    if (!confirm(`Are you sure you want to request "${book.title}"?`)) {
      return;
    }
    if (!book.id) {
      alert('Error: Book ID not found.');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('request-loan', {
        body: { book_id: book.id },
      });
      if (error) throw error;
      if (data && data.message && !data.ok) throw new Error(data.message);
      alert('Loan request sent successfully.');
      window.location.reload();
    } catch (err: any) {
      console.error('Loan request failed:', err);
      alert(`Request failed: ${err.message}`);
    }
  }

  return (
    <div className="g-card flex flex-col h-full">
      <div className="relative flex-grow">
        <img
          src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'}
          alt={book.title}
          className={`w-full h-60 object-contain rounded-md mb-2 bg-gray-100 ${badgeText !== 'Available' ? 'opacity-20' : ''}`}
        />
      </div>
      
      <div 
        className="px-2 py-1 text-xs font-semibold rounded-full self-start mb-2"
        style={getBadgeStyle(badgeText)}
      >
        {badgeText}
      </div>

      <h3 className="font-bold text-md mb-1 truncate">{book.title}</h3>
      {book.authors && (
        <p className="text-sm text-gray-600 mb-2 truncate">{book.authors.join(', ')}</p>
      )}

      {activeLoan?.status === 'loaned' && activeLoan.due_at && (
        <p className="text-sm font-semibold text-red-600 mt-2">
          Due: {formatKSTDate(activeLoan.due_at)}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-gray-100">
        {userId && (
          <div className="flex items-center justify-between">
            {isOwner ? (
              <span className="px-4 py-2 text-sm font-semibold text-green-800 bg-green-100 rounded-lg">My Book</span>
            ) : (
              <button className={activeLoan ? "g-button-gray" : "g-button-blue"} disabled={disabled} onClick={requestLoan}>
                {activeLoan ? badgeText : 'Request Loan'}
              </button>
            )}
            <div className="text-right text-xs text-gray-500">
              <div>{formatKSTDate(book.created_at)}</div>
              <Link to={`/users/${book.owner_id}`} className="font-semibold text-gray-700 hover:underline">
                 {formatOwnerName(book.profiles?.full_name)}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}