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
    // activeLoan이 없더라도 available이 false일 수 있으므로, 'Borrowed'로 간주합니다.
    badgeText = 'Borrowed';
  }

  const disabled = Boolean(activeLoan) || isOwner;

  // ✨ 3. 상태에 따라 뱃지의 스타일(배경색, 글자색)을 반환하는 함수
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
  
  const formatOwnerName = (name: string | null | undefined) => { /* ... */ };
  const formatKSTDate = (dateString: string) => { /* ... */ };
  async function requestLoan() { /* ... */ }

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
              // ✨ 2. 대출 불가 상태일 때 이미지를 흐리게 처리합니다.
              opacity: badgeText !== 'Available' ? 0.3 : 1,
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
              opacity: badgeText !== 'Available' ? 0.3 : 1,
            }}
          >
            <span>No Image</span>
          </div>
        )}
      </div>
      
      {/* ✨ 3. 동적 스타일을 뱃지에 적용합니다. */}
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
          <Link to={`/users/${book.owner_id}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'underline' }}>
            {formatOwnerName(book.profiles?.full_name)}
          </Link>
        </div>
      </div>
    </div>
  );
}