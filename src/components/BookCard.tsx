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
    if (!name) return '...';
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
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative' }}>
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            style={{
              width: '100%',
              height: '240px',
              objectFit: 'contain',
              borderRadius: '12px',
              marginBottom: '8px',
              backgroundColor: '#f9fafb',
              opacity: badgeText !== 'Available' ? 0.7 : 1,
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '240px',
              borderRadius: '12px',
              marginBottom: '8px',
              backgroundColor: '#f0f2f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0aec0',
              fontSize: '14px',
              opacity: badgeText !== 'Available' ? 0.7 : 1,
            }}
          >
            <span>No Image</span>
          </div>
        )}
      </div>
      
      <div className="badge" style={{ ...getBadgeStyle(badgeText), marginBottom: 8 }}>
        {badgeText}
      </div>

      <div style={{ fontWeight: 700, marginBottom: 6 }}>{book.title}</div>
      {book.authors && (
        <div className="label" style={{ marginBottom: 8 }}>
          {book.authors.join(', ')}
        </div>
      )}

      {activeLoan?.status === 'loaned' && activeLoan.due_at && (
        <div className="label" style={{ marginTop: 8, fontWeight: 600, color: '#dd2222' }}>
          Due: {formatKSTDate(activeLoan.due_at)}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px' }}>
        {isOwner ? (
          <div className="btn" style={{ background: '#10b981', cursor: 'default' }}>
            My Book
          </div>
        ) : (
          <button className="btn" disabled={disabled} onClick={requestLoan}>
            {activeLoan ? badgeText : 'Request Loan'}
          </button>
        )}
        <div className="label" style={{ textAlign: 'right', lineHeight: 1.4 }}>
          <div>{formatKSTDate(book.created_at)}</div>
          {/* ✨ 2. 소유자 이름 표시 형식을 변경하고 링크를 유지합니다. */}
          <Link to={`/users/${book.owner_id}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'underline' }}>
            Owner: {formatOwnerName(book.profiles?.full_name)}
          </Link>
        </div>
      </div>
    </div>
  );
}