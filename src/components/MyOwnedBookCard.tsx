import { supabase } from '../lib/supabaseClient.ts';
import type { BookWithLoan } from '../types.ts';

export default function MyOwnedBookCard({ book, onComplete }: { book: BookWithLoan; onComplete: () => void; }) {
  const activeLoan = book.loans && book.loans.length > 0 ? book.loans[0] : null;

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

  const handleDeleteBook = async () => {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;
    const { error } = await supabase.from('books').delete().eq('id', book.id);
    if (error) {
      alert('Delete failed: ' + error.message);
    } else {
      alert('The book has been deleted.');
      onComplete();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col h-full text-sm">
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
