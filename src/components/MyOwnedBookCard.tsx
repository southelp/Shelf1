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
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {book.cover_url ? (
        <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '240px', objectFit: 'contain', borderRadius: '12px', marginBottom: '8px', backgroundColor: '#f9fafb', opacity: badgeText !== 'Available' ? 0.7 : 1 }} />
      ) : (
        <div style={{ width: '100%', height: '240px', borderRadius: '12px', marginBottom: '8px', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', fontSize: '14px', opacity: badgeText !== 'Available' ? 0.7 : 1 }}>
          <span>No Image</span>
        </div>
      )}
      <div className="badge" style={{ ...getBadgeStyle(badgeText), marginBottom: 8 }}>{badgeText}</div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{book.title}</div>
      {book.authors && <div className="label" style={{ marginBottom: 8 }}>{book.authors.join(', ')}</div>}
      
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px' }}>
        <button className="btn" onClick={handleDeleteBook} style={{ background: '#ef4444' }}>Delete</button>
        <div className="label" style={{ textAlign: 'right', lineHeight: 1.4 }}>
          {activeLoan ? (
            <>
              <div>{activeLoan.status === 'loaned' ? 'Loaned to:' : 'Reserved by:'}</div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{formatName(activeLoan.profiles?.full_name)}</div>
              {/* ✨ 대출 상태일 경우 반납 예정일 표시 */}
              {activeLoan.status === 'loaned' && activeLoan.due_at && (
                <div style={{ fontWeight: 600, color: '#dd2222', marginTop: '4px' }}>Due: {formatKSTDate(activeLoan.due_at)}</div>
              )}
            </>
          ) : (
            <div>{formatKSTDate(book.created_at)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
