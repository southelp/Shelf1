import { useState } from 'react'

type Props = {
  onSearch: (query: string) => void;
  onlyAvailable: boolean;
  onToggleAvailable: (checked: boolean) => void;
};

export default function FilterBar({ onSearch, onlyAvailable, onToggleAvailable }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
      <div className="w-full sm:w-auto sm:flex-grow">
        <input
          type="search"
          placeholder="Search by title, author, or ISBN..."
          onChange={e => onSearch(e.target.value)}
          className="g-search-input"
        />
      </div>
      <div className="flex items-center">
        <input
          id="available-toggle"
          type="checkbox"
          checked={onlyAvailable}
          onChange={e => onToggleAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="available-toggle" className="ml-2 block text-sm text-gray-900">
          Show available books only
        </label>
      </div>
    </div>
  );
}
