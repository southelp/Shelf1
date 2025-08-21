import { Book, Loan } from '../types';

interface BookDetailsPanelProps {
  book: Book;
  activeLoan: Loan | null;
  userId?: string;
  onClose: () => void;
}

export default function BookDetailsPanel({ book, activeLoan, userId, onClose }: BookDetailsPanelProps) {
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

  const renderActionButton = () => {
    if (isOwner) {
      return (
        <button
          className="w-full px-4 py-2 mt-4 text-sm font-medium text-green-800 bg-green-100 border border-green-200 rounded-xl shadow-sm"
        >
          My Book
        </button>
      );
    } else if (activeLoan) {
      return (
        <button
          className="w-full px-4 py-2 mt-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm"
          disabled
        >
          {loanStatusText}
        </button>
      );
    } else {
      return (
        <button
          className="w-full px-4 py-2 mt-4 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-xl shadow-sm hover:bg-blue-700"
          onClick={() => alert('Request Loan functionality to be implemented')}
        >
          Request Loan
        </button>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 flex gap-6 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        style={{
          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
        }}
      >
        {/* Book Cover */}
        <div className="w-1/3 flex-shrink-0">
          <img
            src={book.cover_url || 'https://via.placeholder.com/150x220.png?text=No+Image'}
            alt={book.title}
            className="w-full h-auto object-contain rounded-md bg-gray-50"
          />
        </div>

        {/* Book Details */}
        <div className="w-2/3 flex flex-col">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{book.title}</h2>
            <p className="text-md text-gray-600 mt-1">
              {book.authors?.join(', ') || 'Unknown Author'}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              <span className="font-semibold">Owner:</span> {formatOwnerName(book.profiles?.full_name)}
            </p>
            <p className="text-sm text-gray-500">
              <span className="font-semibold">Status:</span> {loanStatusText}
            </p>
            {book.description && (
              <p className="text-sm text-gray-700 mt-4 max-h-40 overflow-y-auto">
                {book.description}
              </p>
            )}
          </div>
          <div className="mt-auto">
            {renderActionButton()}
          </div>
        </div>
      </div>
    </div>
  );
}
