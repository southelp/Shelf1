// src/components/BookCard.tsx

import { supabase } from '../lib/supabaseClient' // supabase 클라이언트를 import 합니다.
import type { Book, Loan } from '../types'

/**
 * Card component to display a book with status and actions.
 */
export default function BookCard({
  book,
  activeLoan,
  userId,
}: {
  book: Book
  activeLoan: Loan | null
  userId?: string
}) {
  const isOwner = userId !== undefined && book.owner_id === userId

  // Determine the badge text based on the current state of the book/loan
  let badge = 'Available'
  if (activeLoan) {
    badge = activeLoan.status === 'loaned' ? 'Borrowed' : 'Reserved'
  } else if (!book.available) {
    badge = 'Unavailable'
  }

  const disabled = Boolean(activeLoan) || isOwner

  // ✨ fetch를 supabase.functions.invoke로 변경합니다.
  async function requestLoan() {
    try {
      // supabase.functions.invoke를 사용하여 인증 정보와 함께 함수를 호출합니다.
      const { error } = await supabase.functions.invoke('request-loan', {
        body: { book_id: book.id },
      })
      if (error) throw error
      alert('대출 요청이 완료되었습니다. 소유자의 승인을 기다려주세요.')
      // 성공 후 목록을 새로고침하는 로직을 추가하면 더 좋습니다.
      window.location.reload(); 
    } catch (err: any) {
      alert(`요청 실패: ${err?.message || '알 수 없는 오류가 발생했습니다.'}`)
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
  )
}