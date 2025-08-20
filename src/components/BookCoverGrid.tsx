import BookCoverDisplay from './BookCoverDisplay';
import type { Book } from '../types';

interface BookCoverGridProps {
  books: Book[];
  size?: 'small' | 'medium' | 'large';
  maxItems?: number;
  title?: string;
  className?: string;
}

export default function BookCoverGrid({ 
  books, 
  size = 'medium', 
  maxItems = 8,
  title,
  className = '' 
}: BookCoverGridProps) {
  const displayBooks = books.slice(0, maxItems);
  
  const gridClasses = {
    small: 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12',
    medium: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
    large: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Section Header - matching Google AI Studio style */}
      {title && (
        <div className="mb-4">
          <h2 
            className="text-sm font-normal text-gray-600 mb-3"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '12px',
              lineHeight: '20px'
            }}
          >
            {title}
          </h2>
        </div>
      )}

      {/* Books Grid Container */}
      <div 
        className={`
          grid 
          ${gridClasses[size]} 
          gap-4
          p-3
          bg-gray-50/30
          border border-gray-200/40
          rounded-2xl
        `}
        style={{
          backgroundColor: '#F8F8F7',
          borderColor: '#EEEEEC'
        }}
      >
        {displayBooks.map((book, index) => (
          <div 
            key={book.id || index}
            className="flex justify-center"
          >
            <BookCoverDisplay
              book={book}
              size={size}
              showInfo={size !== 'small'}
            />
          </div>
        ))}
        
        {/* Empty slots for visual balance */}
        {displayBooks.length < maxItems && (
          Array.from({ length: Math.min(4, maxItems - displayBooks.length) }).map((_, index) => (
            <div 
              key={`empty-${index}`}
              className={`
                ${size === 'small' ? 'w-24 h-36' : size === 'medium' ? 'w-32 h-48' : 'w-40 h-60'}
                border-2 border-dashed border-gray-300/50
                rounded-xl
                flex
                items-center
                justify-center
                text-gray-400
                text-xs
                bg-white/40
              `}
            >
              <div className="text-center">
                <div className="w-6 h-6 mx-auto mb-1">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                Add Book
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
