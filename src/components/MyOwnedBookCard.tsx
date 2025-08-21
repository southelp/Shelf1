import { supabase } from '../lib/supabaseClient.ts';
import type { BookWithLoan } from '../types.ts';

interface MyOwnedBookCardProps {
  book: BookWithLoan;
  onComplete: () => void;
  isSelected: boolean;
  onClick: () => void;
}

export default function MyOwnedBookCard({ book, onComplete, isSelected, onClick }: MyOwnedBookCardProps) {
  // Find the active loan ('reserved' or 'loaned') from all associated loans.
  const activeLoan = book.loans?.find(loan => loan.status === 'reserved' || loan.status === 'loaned');

  let badgeText = 'Available';
  if (activeLoan) {
    badgeText = activeLoan.status === 'loaned' ? 'Borrowed' : 'Reserved';
  }

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'Available': return { background: '#dcfce7', color: '#166534' };
      case 'Reserved': return { background: '#ffedd5', color: '#9a3412' };
      case 'Borrowed': return { background: '#fee2e2', color: '#991b1b' };
      default: return { background: '#e5e7eb', color: '#4b5563' };
    }
  };
  
  const formatName = (name: string | null | undefined) => {
    if (!name) return '...';
    return name.replace('(School of Innovation Foundations)', '').trim();
  };

  const formatKSTDate = (dateString: string) => new Date(dateString).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

  const handleDeleteBook = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click event from firing
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;
    const { error } = await supabase.from('books').delete().eq('id', book.id);
    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      alert('The book has been deleted.');
      onComplete();
    }
  };

  if (!isSelected) {
    return (
      <div className="w-full cursor-pointer" onClick={onClick}>
        <div
          className="
            w-full 
            pb-[150%] /* 2:3 aspect ratio */
            bg-white
            border border-gray-200/40
            rounded-lg
            shadow-sm
            overflow-hidden
            relative
          "
          style={{
            boxShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <img
            src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'}
            alt={book.title}
            className={`
              absolute
              inset-0
              w-full
              h-full
              object-cover
              group-hover:scale-[1.02]
              transition-transform
              duration-300
              ease-out
              ${badgeText !== 'Available' ? 'opacity-30' : ''}
            `}
            style={{
              filter: badgeText !== 'Available' ? 'contrast(0.8) saturate(0.7)' : 'contrast(1.05) saturate(1.1)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.02) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.05)'
            }}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col h-full text-sm ring-2 ring-blue-500" onClick={onClick}>
      <div className="relative flex-grow">
        <img 
          src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'} 
          alt={book.title} 
          className={`w-full h-48 object-contain rounded-md mb-2 bg-gray-50 ${badgeText !== 'Available' ? 'opacity-40' : ''}`} 
        />
      </div>
      
      <div 
        className="px-2 py-1 text-xs font-semibold rounded-full self-start my-2"
        style={getBadgeStyle(badgeText)}
      >
        {badgeText}
      </div>

      <h3 className="font-bold truncate">{book.title}</h3>
      {book.authors && <p className="text-gray-600 truncate text-xs mb-2">{book.authors.join(', ')}</p>}
      
      <div className="mt-auto pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-2">
          {activeLoan ? (
            <div>
              <span>{activeLoan.status === 'loaned' ? 'Loaned to ' : 'Reserved by '}</span>
              <span className="font-semibold text-gray-700">{formatName(activeLoan.profiles?.full_name)}</span>
              {activeLoan.status === 'loaned' && activeLoan.due_at && (
                <div className="font-semibold text-red-600">Due: {formatKSTDate(activeLoan.due_at)}</div>
              )}
            </div>
          ) : (
            <span>Registered: {formatKSTDate(book.created_at)}</span>
          )}
        </div>
        <button 
          onClick={handleDeleteBook} 
          className="w-full text-center bg-red-500 text-white text-xs font-bold py-1.5 px-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
