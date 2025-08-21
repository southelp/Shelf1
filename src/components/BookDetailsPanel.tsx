import { Book, Loan } from '../types';

interface BookDetailsPanelProps {
  book: Book;
  activeLoan: Loan | null;
  userId?: string;
  onClose: () => void;
  position: { top: number, left: number };
}

export default function BookDetailsPanel({ book, activeLoan, userId, onClose, position }: BookDetailsPanelProps) {
  const isOwner = userId !== undefined && book.owner_id === userId;

  let loanStatusText = 'Available';
  if (activeLoan) {
    loanStatusText = activeLoan.status === 'loaned' ? 'Borrowed' : 'Reserved';
  } else if (!book.available) {
    loanStatusText = 'Borrowed';
  }

  const formatOwnerName = (name: string | null | undefined) => {
    if (!name) return 'User';
    return name.replace('(School of Innovation Foundations)', '').trim();
  };

  // Placeholder for the button logic (Request Loan / My Book / Reserved)
  const renderActionButton = () => {
    if (isOwner) {
      return (
        <button
          className="px-4 py-2 text-sm font-medium text-green-800 bg-green-100 border border-green-200 rounded-xl shadow-sm"
        >
          My Book
        </button>
      );
    } else if (activeLoan) {
      return (
        <button
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm"
          disabled
        >
          {loanStatusText}
        </button>
      );
    } else {
      return (
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-xl shadow-sm hover:bg-blue-700"
          onClick={() => alert('Request Loan functionality to be implemented')} // Placeholder
        >
          Request Loan
        </button>
      );
    }
  };

  return (
    <div
      className="absolute bg-white bg-opacity-80 backdrop-blur-sm p-3 rounded-lg shadow-lg flex flex-col justify-between z-10"
      style={{
        width: '192px', // Same as BookCard's original width, or adjust to fit content
        height: '96px', // Same height as book cover (h-24)
        top: `${position.top}px`,
        left: `${position.left}px`,
        borderColor: '#EEEEEC',
        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
      }}
      onClick={(e) => {
        e.stopPropagation(); // Prevent click from bubbling up to the main container
        onClose();
      }}
    >
      <div>
        <h4 className="font-medium text-sm line-clamp-1" style={{ color: '#1A1C1E' }}>
          {book.title}
        </h4>
        <p className="text-xs text-gray-600 line-clamp-1" style={{ color: '#44474E' }}>
          {book.authors?.join(', ') || 'Unknown Author'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Status: {loanStatusText}
        </p>
        <p className="text-xs text-gray-500">
          Owner: {formatOwnerName(book.profiles?.full_name)}
        </p>
      </div>
      <div className="mt-2">
        {renderActionButton()}
      </div>
    </div>
  );
}
