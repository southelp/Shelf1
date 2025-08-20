import type { Book } from '../types';

interface BookCoverDisplayProps {
  book: Book;
  size?: 'small' | 'medium' | 'large';
  showInfo?: boolean;
  className?: string;
}

export default function BookCoverDisplay({ 
  book, 
  size = 'medium', 
  showInfo = true, 
  className = '' 
}: BookCoverDisplayProps) {
  const sizeClasses = {
    small: {
      container: 'w-24 h-36',
      image: 'w-full h-full',
      title: 'text-xs',
      author: 'text-xs'
    },
    medium: {
      container: 'w-32 h-48',
      image: 'w-full h-full',
      title: 'text-sm',
      author: 'text-xs'
    },
    large: {
      container: 'w-40 h-60',
      image: 'w-full h-full',
      title: 'text-base',
      author: 'text-sm'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Book Cover Container with Google AI Studio inspired styling */}
      <div 
        className={`
          ${currentSize.container}
          relative
          bg-white
          border border-gray-200/60
          rounded-xl
          shadow-sm
          hover:shadow-md
          transition-all
          duration-200
          ease-out
          overflow-hidden
          group
        `}
        style={{
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Book Cover Image */}
        <img
          src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'}
          alt={book.title}
          className={`
            ${currentSize.image}
            object-cover
            group-hover:scale-[1.02]
            transition-transform
            duration-300
            ease-out
          `}
          style={{
            filter: 'contrast(1.05) saturate(1.1)',
          }}
        />
        
        {/* Subtle inner shadow overlay for depth */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.02) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.05)'
          }}
        />
      </div>

      {/* Book Information */}
      {showInfo && (
        <div className="mt-3 flex flex-col gap-1">
          <h3 
            className={`
              ${currentSize.title}
              font-medium
              text-gray-900
              line-clamp-2
              leading-tight
            `}
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
            }}
          >
            {book.title}
          </h3>
          {book.authors && book.authors.length > 0 && (
            <p 
              className={`
                ${currentSize.author}
                text-gray-600
                line-clamp-1
                font-normal
              `}
              style={{
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
              }}
            >
              {book.authors.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
