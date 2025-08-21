import React, { useState, ReactNode } from 'react';

interface PaginatedBookGridProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  itemsPerPage?: number;
}

const PaginatedBookGrid = <T,>({ items, renderItem, itemsPerPage = 20 }: PaginatedBookGridProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
        {currentItems.map((item, index) => (
          <React.Fragment key={index}>
            {renderItem(item)}
          </React.Fragment>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-4">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-800">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-md bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginatedBookGrid;
