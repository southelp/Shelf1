import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const user = useUser();

  const menuItems = [
    {
      path: '/',
      label: 'Browse Books',
      icon: (
        <svg width="20" height="24" viewBox="0 0 21 24" fill="none">
          <path d="M2.58331 19.5417V5.58332C2.58331 5.16666 2.72915 4.81249 3.02081 4.52082C3.31248 4.22916 3.66665 4.08332 4.08331 4.08332H12.4583C12.4166 4.29166 12.3923 4.49999 12.3854 4.70832C12.3785 4.91666 12.3889 5.12499 12.4166 5.33332H4.08331C4.02776 5.33332 3.9722 5.3611 3.91665 5.41666C3.86109 5.47221 3.83331 5.52777 3.83331 5.58332V16.4792L4.99998 15.3333H16.9166C16.9722 15.3333 17.0278 15.3055 17.0833 15.25C17.1389 15.1944 17.1666 15.1389 17.1666 15.0833V8.77082C17.4028 8.71527 17.625 8.64582 17.8333 8.56249C18.0416 8.47916 18.2361 8.36804 18.4166 8.22916V15.0833C18.4166 15.5 18.2708 15.8542 17.9791 16.1458C17.6875 16.4375 17.3333 16.5833 16.9166 16.5833H5.54165L2.58331 19.5417Z" fill="currentColor"/>
        </svg>
      ),
      variant: location.pathname === '/' ? 4 : 1
    },
    {
      path: '/my',
      label: 'My Books',
      icon: (
        <svg width="20" height="24" viewBox="0 0 19 22" fill="none">
          <path d="M4.475 17.375C4.1 17.375 3.78125 17.2437 3.51875 16.9812C3.25625 16.7188 3.125 16.4 3.125 16.025V5.975C3.125 5.6 3.25625 5.28125 3.51875 5.01875C3.78125 4.75625 4.1 4.625 4.475 4.625H7.8125C7.8625 4.2125 8.04688 3.85937 8.36563 3.56562C8.68438 3.27187 9.0625 3.125 9.5 3.125C9.95 3.125 10.3313 3.27187 10.6438 3.56562C10.9563 3.85937 11.1375 4.2125 11.1875 4.625H14.525C14.9 4.625 15.2188 4.75625 15.4813 5.01875C15.7438 5.28125 15.875 5.6 15.875 5.975V16.025C15.875 16.4 15.7438 16.7188 15.4813 16.9812C15.2188 17.2437 14.9 17.375 14.525 17.375H4.475Z" fill="currentColor"/>
        </svg>
      ),
      variant: location.pathname === '/my' ? 4 : 1,
      requiresAuth: true
    },
    {
      path: '/loans',
      label: 'My Borrows',
      icon: (
        <svg width="20" height="24" viewBox="0 0 21 24" fill="none">
          <path d="M6.12498 13.375H14.9375L12.2083 9.72916L9.85415 12.7708L8.18748 10.6458L6.12498 13.375ZM2.58331 19.5417V5.58332C2.58331 5.16666 2.72915 4.81249 3.02081 4.52082C3.31248 4.22916 3.66665 4.08332 4.08331 4.08332H16.9166C17.3333 4.08332 17.6875 4.22916 17.9791 4.52082C18.2708 4.81249 18.4166 5.16666 18.4166 5.58332V15.0833C18.4166 15.5 18.2708 15.8542 17.9791 16.1458C17.6875 16.4375 17.3333 16.5833 16.9166 16.5833H5.54165L2.58331 19.5417Z" fill="currentColor"/>
        </svg>
      ),
      variant: location.pathname === '/loans' ? 4 : 1,
      requiresAuth: true
    },
    {
      path: '/books/new',
      label: 'Add Book',
      icon: (
        <svg width="20" height="24" viewBox="0 0 21 24" fill="none">
          <path d="M7.89585 19.0833H4.66669C4.31946 19.0833 4.02433 18.9618 3.78127 18.7188C3.53821 18.4757 3.41669 18.1806 3.41669 17.8333V14.6042C3.98613 14.5347 4.47571 14.2986 4.88544 13.8958C5.29516 13.4931 5.50002 13 5.50002 12.4167C5.50002 11.8333 5.29516 11.3403 4.88544 10.9375C4.47571 10.5347 3.98613 10.2986 3.41669 10.2292V7.00001C3.41669 6.65279 3.53821 6.35765 3.78127 6.11459C4.02433 5.87154 4.31946 5.75001 4.66669 5.75001H8.00002C8.06947 5.22223 8.29863 4.78473 8.68752 4.43751C9.07641 4.09029 9.54169 3.91668 10.0834 3.91668C10.625 3.91668 11.0903 4.09029 11.4792 4.43751C11.8681 4.78473 12.0972 5.22223 12.1667 5.75001H15.5C15.8472 5.75001 16.1424 5.87154 16.3854 6.11459C16.6285 6.35765 16.75 6.65279 16.75 7.00001V10.3333C17.2778 10.4028 17.7153 10.632 18.0625 11.0208C18.4097 11.4097 18.5834 11.875 18.5834 12.4167C18.5834 12.9583 18.4097 13.4236 18.0625 13.8125C17.7153 14.2014 17.2778 14.4306 16.75 14.5V17.8333C16.75 18.1806 16.6285 18.4757 16.3854 18.7188C16.1424 18.9618 15.8472 19.0833 15.5 19.0833H12.2709C12.2014 18.4861 11.9584 17.9896 11.5417 17.5938C11.125 17.1979 10.6389 17 10.0834 17C9.5278 17 9.04169 17.1979 8.62502 17.5938C8.20835 17.9896 7.9653 18.4861 7.89585 19.0833Z" fill="currentColor"/>
        </svg>
      ),
      variant: location.pathname === '/books/new' ? 4 : 1,
      requiresAuth: true
    }
  ];

  const handleNavClick = (item: any, e: React.MouseEvent) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      alert("Please log in to continue.");
    }
  };

  return (
    <div 
      className={`
        flex flex-col
        ${isCollapsed ? 'w-[72px]' : 'w-[220px]'}
        transition-all duration-200 ease-out
        border-r
        self-stretch
        relative
      `}
      style={{
        borderColor: '#EEEEEC',
        background: '#F8F8F7'
      }}
    >
      {/* Logo Section & Toggle Button */}
      <div className="flex h-[76px] items-center px-[18px] justify-between">
        {!isCollapsed && (
          <div 
            className="font-medium text-lg"
            style={{
              color: '#191919',
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
            }}
          >
            Taejea Open Shelf
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-full hover:bg-gray-200"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <path d="M15 18L9 12L15 6" stroke="#32302C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex flex-col items-start flex-1 pt-4">
        <div className="flex flex-col items-start self-stretch">
          {menuItems.map((item) => (
            <div key={item.path} className="flex flex-col items-start self-stretch p-0.5">
              <Link
                to={item.path}
                onClick={(e) => handleNavClick(item, e)}
                className={`
                  flex items-center self-stretch px-1.5 py-1 rounded-xl
                  transition-all duration-200 ease-out
                  ${item.variant === 4 
                    ? 'bg-gray-200' 
                    : 'hover:bg-gray-100/50'
                  }
                `}
                style={{
                  backgroundColor: item.variant === 4 ? '#E4E4E2' : undefined
                }}
              >
                <div className="flex w-9 min-w-9 justify-center items-center">
                  <div 
                    className="flex flex-col items-start"
                    style={{
                      color: item.variant === 4 ? '#32302C' : '#5D5D5F'
                    }}
                  >
                    {item.icon}
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col items-start">
                    <div 
                      className="text-sm font-medium leading-5"
                      style={{
                        color: item.variant === 4 ? '#32302C' : '#5D5D5F',
                        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>
      </div>
    </div>
  );
}
