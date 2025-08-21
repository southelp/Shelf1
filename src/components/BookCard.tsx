import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Book, Loan } from '../types';

export default function BookCard({
  book,
  activeLoan,
  userId,
  onClick, // New prop for click handler
}: {
  book: Book;
  activeLoan: Loan | null;
  userId?: string;
  onClick: (book: Book, activeLoan: Loan | null) => void; // Define onClick prop type
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

  // Removed requestLoan function as it will be handled by BookDetailsPanel

  return (
    <div
      className="relative" // Make it relative for absolute positioning of the panel
      onClick={() => onClick(book, activeLoan)} // Pass book and activeLoan on click
    >
      <div
        className="
          w-16
          h-24
          bg-white
          border border-gray-200/40
          rounded-lg
          shadow-sm
          overflow-hidden
          relative
          cursor-pointer // Indicate it's clickable
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
  );
}