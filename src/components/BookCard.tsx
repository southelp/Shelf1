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

  let badge = 'Available';
  if (activeLoan) {
    badge = activeLoan.status === 'loaned' ? 'Borrowed' : 'Reserved';
  } else if (!book.available) {
    badge = 'Unavailable';
  }

  const disabled = Boolean(activeLoan) || isOwner;

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

  async function requestLoan() {
    if (!confirm(`Are you sure you want to request "${book.title}"?`)) {
      return;
    }

    if (!book.id) {
      alert('오류: 책의 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('request-loan', {
        body: { book_id: book.id },
      });

      if (error) throw error;
      
      if (data && data.message && !data.ok) {
        throw new Error(data.message);
      }
      
      alert('대출 요청이 성공적으로 전송되었습니다.');
      window.location.reload();

    } catch (err: any) {
      console.error('Loan request failed:', err);
      alert(`요청 실패: ${err.message}`);
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
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
          }}
        >
          <span>No Image</span>
        </div>
      )}
      <div className="badge gray" style={{ marginBottom: 8 }}>
        {badge}
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
            {activeLoan ? badge : 'Request Loan'}
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