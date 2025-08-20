import type { Book } from '../types';

interface FeaturedBookDisplayProps {
  book: Book;
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export default function FeaturedBookDisplay({ 
  book, 
  className = '',
  onAction,
  actionLabel = 'View Details'
}: FeaturedBookDisplayProps) {
  return (
    <div 
      className={`
        max-w-2xl
        p-4
        bg-white
        border border-gray-200/60
        rounded-2xl
        shadow-sm
        hover:shadow-md
        transition-all
        duration-300
        ease-out
        ${className}
      `}
      style={{
        backgroundColor: '#FCFCFC',
        borderColor: '#EEEEEC',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)'
      }}
    >
      <div className="flex gap-4 items-start">
        {/* Book Cover */}
        <div 
          className="
            w-24 h-36
            flex-shrink-0
            relative
            bg-white
            border border-gray-200/40
            rounded-xl
            shadow-sm
            overflow-hidden
            group
          "
          style={{
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.08)'
          }}
        >
          <img
            src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'}
            alt={book.title}
            className="
              w-full 
              h-full 
              object-cover
              group-hover:scale-[1.02]
              transition-transform
              duration-300
              ease-out
            "
            style={{
              filter: 'contrast(1.05) saturate(1.1)',
            }}
          />
          
          {/* Subtle overlay for depth */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.02) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.05)'
            }}
          />
        </div>

        {/* Book Information */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <h3 
              className="
                text-lg
                font-medium
                text-gray-900
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
            
            {book.authors && book.authors.length > 0 && (
              <p 
                className="
                  text-sm
                  text-gray-600
                  line-clamp-1
                  font-normal
                "
                style={{
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                  color: '#44474E'
                }}
              >
                by {book.authors.join(', ')}
              </p>
            )}

            {book.description && (
              <p 
                className="
                  text-sm
                  text-gray-600
                  line-clamp-3
                  leading-relaxed
                  mt-1
                "
                style={{
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                  color: '#5D5D5F'
                }}
              >
                {book.description}
              </p>
            )}

            {/* Action Button */}
            {onAction && (
              <div className="mt-3">
                <button
                  onClick={onAction}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-gray-700
                    bg-white
                    border border-gray-300
                    rounded-xl
                    hover:bg-gray-50
                    hover:border-gray-400
                    focus:outline-none
                    focus:ring-2
                    focus:ring-offset-2
                    focus:ring-gray-400
                    transition-all
                    duration-200
                  "
                  style={{
                    fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                    color: '#32302C',
                    borderColor: '#E1E1E1'
                  }}
                >
                  {actionLabel}
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path 
                      d="M6 12L10 8L6 4" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
