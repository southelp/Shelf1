import BookCoverDisplay from '../components/BookCoverDisplay';
import BookCoverGrid from '../components/BookCoverGrid';
import FeaturedBookDisplay from '../components/FeaturedBookDisplay';
import type { Book } from '../types';

const sampleBook: Book = {
  id: '1',
  title: 'The Design of Everyday Things',
  authors: ['Don Norman'],
  isbn: '9780465050659',
  description: 'A powerful primer on how—and why—some products satisfy customers while others only frustrate them. The book explores the principles of good design and how they apply to everyday objects.',
  cover_url: 'https://images-na.ssl-images-amazon.com/images/P/0465050654.01.L.jpg',
  available: true,
  owner_id: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  profiles: {
    id: 'user-1',
    full_name: 'Jane Smith'
  }
};

const sampleBooks: Book[] = [
  sampleBook,
  {
    ...sampleBook,
    id: '2',
    title: 'Atomic Habits',
    authors: ['James Clear'],
    cover_url: 'https://images-na.ssl-images-amazon.com/images/P/0735211299.01.L.jpg',
  },
  {
    ...sampleBook,
    id: '3',
    title: 'Clean Code',
    authors: ['Robert C. Martin'],
    cover_url: 'https://images-na.ssl-images-amazon.com/images/P/0132350884.01.L.jpg',
  },
  {
    ...sampleBook,
    id: '4',
    title: 'The Pragmatic Programmer',
    authors: ['David Thomas', 'Andrew Hunt'],
    cover_url: 'https://images-na.ssl-images-amazon.com/images/P/020161622X.01.L.jpg',
  },
  {
    ...sampleBook,
    id: '5',
    title: 'Don\'t Make Me Think',
    authors: ['Steve Krug'],
    cover_url: 'https://images-na.ssl-images-amazon.com/images/P/0321965515.01.L.jpg',
  }
];

export default function BookDisplayDemo() {
  return (
    <div 
      className="min-h-screen p-8"
      style={{ backgroundColor: '#FCFCFC' }}
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 
            className="text-3xl font-medium text-gray-900 mb-2"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#1A1C1E'
            }}
          >
            Book Display Components
          </h1>
          <p 
            className="text-sm text-gray-600"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#44474E'
            }}
          >
            Google AI Studio inspired book cover displays
          </p>
        </div>

        {/* Featured Book Display */}
        <section>
          <h2 
            className="text-lg font-medium text-gray-900 mb-4"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#1A1C1E'
            }}
          >
            Featured Book Display
          </h2>
          <div className="flex justify-center">
            <FeaturedBookDisplay 
              book={sampleBook}
              onAction={() => alert('View details clicked!')}
              actionLabel="View Details"
            />
          </div>
        </section>

        {/* Individual Book Cover Displays */}
        <section>
          <h2 
            className="text-lg font-medium text-gray-900 mb-4"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#1A1C1E'
            }}
          >
            Individual Book Cover Sizes
          </h2>
          <div className="flex items-end justify-center gap-8">
            <div className="text-center">
              <BookCoverDisplay book={sampleBook} size="small" />
              <p className="mt-2 text-xs text-gray-500">Small</p>
            </div>
            <div className="text-center">
              <BookCoverDisplay book={sampleBook} size="medium" />
              <p className="mt-2 text-xs text-gray-500">Medium</p>
            </div>
            <div className="text-center">
              <BookCoverDisplay book={sampleBook} size="large" />
              <p className="mt-2 text-xs text-gray-500">Large</p>
            </div>
          </div>
        </section>

        {/* Book Cover Grids */}
        <section>
          <h2 
            className="text-lg font-medium text-gray-900 mb-4"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#1A1C1E'
            }}
          >
            Book Cover Grids
          </h2>
          
          <div className="space-y-8">
            <BookCoverGrid 
              books={sampleBooks} 
              size="small" 
              title="Recently Added"
              maxItems={10}
            />
            
            <BookCoverGrid 
              books={sampleBooks} 
              size="medium" 
              title="Popular This Week"
              maxItems={6}
            />
            
            <BookCoverGrid 
              books={sampleBooks.slice(0, 3)} 
              size="large" 
              title="Staff Picks"
              maxItems={4}
            />
          </div>
        </section>

        {/* Usage Information */}
        <section 
          className="
            p-6
            bg-white
            border border-gray-200
            rounded-2xl
            shadow-sm
          "
          style={{
            backgroundColor: '#F8F8F7',
            borderColor: '#EEEEEC'
          }}
        >
          <h3 
            className="text-base font-medium text-gray-900 mb-3"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#1A1C1E'
            }}
          >
            Component Usage
          </h3>
          <div 
            className="text-sm text-gray-600 space-y-2"
            style={{
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
              color: '#44474E'
            }}
          >
            <p><strong>BookCoverDisplay:</strong> Individual book cover with optional info</p>
            <p><strong>BookCoverGrid:</strong> Grid layout for multiple books with different sizes</p>
            <p><strong>FeaturedBookDisplay:</strong> Horizontal layout for highlighting a single book</p>
            <p><strong>Updated BookCard:</strong> Enhanced card component with Google AI Studio styling</p>
          </div>
        </section>
      </div>
    </div>
  );
}
