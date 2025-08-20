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
    <div
      className="
        bg-white
        border border-gray-200/60
        rounded-2xl
        shadow-sm
        hover:shadow-md
        transition-all
        duration-200
        ease-out
        p-4
        flex flex-col
        h-full
        group
      "
      style={{
        backgroundColor: '#FCFCFC',
        borderColor: '#EEEEEC',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)'
      }}
    >
      <div className="relative flex-grow mb-3">
        <div
          className="
            w-full
            h-60
            bg-white
            border border-gray-200/40
            rounded-xl
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
              filter: badgeText === 'Available' ? 'contrast(1.05) saturate(1.1)' : 'contrast(0.8) saturate(0.7)',
            }}
          />

          {/* Subtle overlay for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.02) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.05)'
            }}
          />
        </div>
      </div>
      
      <div
        className="
          px-3 py-1.5
          text-xs
          font-medium
          rounded-xl
          self-start
          mb-3
          border
          shadow-sm
        "
        style={{
          ...getBadgeStyle(badgeText),
          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
          borderColor: badgeText === 'Available' ? '#dcfce7' : badgeText === 'Reserved' ? '#ffedd5' : '#fee2e2'
        }}
      >
        {badgeText}
      </div>

      <h3
        className="
          font-medium
          text-base
          mb-2
          line-clamp-2
          leading-tight
        "
        style={{
          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
          color: '#1A1C1E'
        }}
      >
        {book.title}
      </h3>
      {book.authors && (
        <p
          className="
            text-sm
            text-gray-600
            mb-3
            line-clamp-1
            font-normal
          "
          style={{
            fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
            color: '#44474E'
          }}
        >
          {book.authors.join(', ')}
        </p>
      )}

      {activeLoan?.status === 'loaned' && activeLoan.due_at && (
        <p
          className="
            text-sm
            font-medium
            text-red-600
            mt-2
            px-3 py-1.5
            bg-red-50
            border border-red-200
            rounded-xl
            text-center
          "
          style={{
            fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
          }}
        >
          Due: {formatKSTDate(activeLoan.due_at)}
        </p>
      )}

      <div
        className="
          mt-auto
          pt-4
          border-t
          border-gray-200/50
        "
        style={{ borderColor: '#EEEEEC' }}
      >
        {userId && (
          <div className="flex items-center justify-between gap-3">
            {isOwner ? (
              <span
                className="
                  px-4 py-2
                  text-sm
                  font-medium
                  text-green-800
                  bg-green-100
                  border border-green-200
                  rounded-xl
                  shadow-sm
                "
                style={{
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                My Book
              </span>
            ) : (
              <button
                className={`
                  px-4 py-2
                  text-sm
                  font-medium
                  rounded-xl
                  border
                  transition-all
                  duration-200
                  shadow-sm
                  hover:shadow-md
                  focus:outline-none
                  focus:ring-2
                  focus:ring-offset-2
                  ${activeLoan
                    ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-gray-400'
                    : 'text-white bg-blue-600 border-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }
                `}
                style={{
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                  borderColor: activeLoan ? '#E1E1E1' : undefined
                }}
                disabled={disabled}
                onClick={requestLoan}
              >
                {activeLoan ? badgeText : 'Request Loan'}
              </button>
            )}
            <div
              className="
                text-right
                text-xs
                text-gray-500
                flex flex-col
                gap-1
              "
              style={{
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                color: '#5D5D5F'
              }}
            >
              <div>{formatKSTDate(book.created_at)}</div>
              <Link
                to={`/users/${book.owner_id}`}
                className="
                  font-medium
                  text-gray-700
                  hover:text-gray-900
                  hover:underline
                  transition-colors
                "
                style={{ color: '#32302C' }}
              >
                 {formatOwnerName(book.profiles?.full_name)}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
