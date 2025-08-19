// src/components/BookCard.tsx

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

  // Function to format the owner's name
  const formatOwnerName = (name: string | null | undefined) => {
    if (!name) return '...';
    return name.replace('(School of Innovation Foundations)', '').trim();
  };
  
  // Function to format the date to KST (GMT+9)
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
    if (!book.id) {
      alert('오류: 책의 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      // supabase.functions.invoke를 사용하여 body에 book_id를 담아 호출
      const { data, error } = await supabase.functions.invoke('request-loan', {
        body: { book_id: book.id },
      });

      if (error) throw error;
      
      // 함수가 반환한 데이터에 오류 메시지가 있는지 확인
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
    <div className="card">
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
      <div className="row" style={{ justifyContent: 'space-between' }}>
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
          <div>{formatOwnerName(book.profiles?.full_name)}</div>
        </div>
      </div>
    </div>
  );
}