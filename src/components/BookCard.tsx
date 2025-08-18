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

  async function requestLoan() {
    // book.id가 존재하는지 먼저 확인
    if (!book.id) {
      alert('오류: 책의 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      console.log(`Requesting loan for book_id: ${book.id}`); // 디버깅을 위한 로그

      const { data, error } = await supabase.functions.invoke('request-loan', {
        // body에 book_id를 JSON 형태로 담아서 보냅니다.
        body: { book_id: book.id },
      });

      if (error) {
        // invoke 함수 자체가 실패한 경우 (네트워크 등)
        throw error;
      }
      
      // 함수가 반환한 데이터에 오류 메시지가 있는지 확인
      if (data && data.message && !data.ok) {
        throw new Error(data.message);
      }
      
      alert('대출 요청이 성공적으로 전송되었습니다.');
      window.location.reload();

    } catch (err: any) {
      // 이제 서버에서 보낸 구체적인 오류 메시지가 여기에 표시됩니다.
      console.error('Loan request failed:', err);
      alert(`요청 실패: ${err.message}`);
    }
  }

  return (
    <div className="card">
      {book.cover_url && (
        <img
          src={book.cover_url}
          alt={book.title}
          style={{
            width: '100%',
            maxHeight: 240,
            objectFit: 'contain',
            borderRadius: 12,
            marginBottom: 8,
            background: '#f9fafb',
          }}
        />
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
        <div className="label">ISBN {book.isbn || '-'}</div>
      </div>
    </div>
  );
}