import { useState } from 'react'

type Props = {
  onSearch: (query: string) => void;
  onlyAvailable: boolean;
  onToggleAvailable: (checked: boolean) => void;
};

export default function FilterBar({ onSearch, onlyAvailable, onToggleAvailable }: Props) {
  const [searchValue, setSearchValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearch = () => {
    onSearch(searchValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      {/* Search Input Container */}
      <div className="flex px-1 flex-col items-start max-w-3xl mx-auto">
        <div 
          className="flex p-3 flex-col items-start border rounded-[40px] bg-white w-full"
          style={{ borderColor: '#EEEEEC' }}
        >
          <div className="flex items-end gap-1.5 w-full">
            <div className="flex min-h-9 py-2 items-center flex-1">
              <div className="flex flex-col items-start flex-1">
                <div className="flex flex-col items-start w-full">
                  <div className="flex justify-center items-center w-full">
                    <div className="flex w-full flex-col items-start">
                      <div className="flex h-5 items-center gap-1 w-full">
                        <div className="flex pr-2 flex-col items-start flex-1">
                          <div 
                            className="w-full text-sm leading-5"
                            style={{
                              color: searchValue ? '#1A1C1E' : '#44474E',
                              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                            }}
                          >
                            <input
                              type="search"
                              placeholder="Title, author"
                              value={searchValue}
                              onChange={handleInputChange}
                              onKeyDown={handleKeyDown}
                              className="w-full border-none outline-none bg-transparent text-sm leading-5"
                              style={{
                                color: '#1A1C1E',
                                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                              }}
                            />
                          </div>
                        </div>
                        <button onClick={handleSearch} className="flex h-6 flex-col items-start cursor-pointer">
                          <svg width="20" height="24" viewBox="0 0 21 21" fill="none">
                            <path d="M17.0134 15.7607V6.17741H18.2634V15.7607H17.0134ZM10.4925 15.6774L9.59669 14.8024L12.805 11.5941H2.43002V10.3441H12.7842L9.61752 7.13574L10.4925 6.26074L15.18 10.9691L10.4925 15.6774Z" fill="#44474E"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={e => onToggleAvailable(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span 
              className="text-sm leading-5"
              style={{
                color: '#44474E',
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
              }}
            >
              Available only
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
