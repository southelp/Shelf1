import type { Book, Loan } from '../types';

export default function BookCard({
  book,
  activeLoan,
  onClick, // New prop for click handler
}: {
  book: Book;
  activeLoan: Loan | null;
  onClick: (book: Book, activeLoan: Loan | null, event: React.MouseEvent<HTMLDivElement>) => void; // Define onClick prop type
}) {
  // Determine if the book is currently unavailable (borrowed or reserved)
  const isUnavailable = activeLoan && (activeLoan.status === 'loaned' || activeLoan.status === 'reserved');

  const capitalize = (s: string | null | undefined) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div
      className="relative" // Make it relative for absolute positioning of the panel
      onClick={(event) => onClick(book, activeLoan, event)} // Pass book and activeLoan on click
    >
      <div
        className="
          w-full 
          pb-[150%] /* 2:3 aspect ratio */
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
            absolute
            inset-0
            w-full
            h-full
            object-cover
            group-hover:scale-[1.02]
            transition-transform
            duration-300
            ease-out
            ${isUnavailable ? 'opacity-30' : ''}
          `}
          style={{
            filter: isUnavailable ? 'contrast(0.8) saturate(0.7)' : 'contrast(1.05) saturate(1.1)',
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
        
        {/* Source API Badge */}
        {book.source_api && (
          <div className="absolute bottom-2 left-2">
            <span 
              className="text-white text-xs opacity-50"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              Source: {capitalize(book.source_api)} API
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
