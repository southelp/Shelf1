import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import GoogleSignInButton from './GoogleSignInButton';

interface HeaderProps {
  onToggleSidebar: () => void;
  isCollapsed: boolean;
  isDesktop: boolean;
}

export default function Header({ onToggleSidebar, isCollapsed, isDesktop }: HeaderProps) {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return null; // Hide title on home page
      case '/my':
        return 'My Library';
      case '/loans':
        return 'My Loans';
      case '/books/new':
        return 'Add Book';
      case '/terms':
        return 'Terms of Use';
      default:
        if (location.pathname.startsWith('/users/')) {
          return 'User Library';
        }
        return 'Taejea Open Shelf';
    }
  };

  return (
    <div 
      className="relative flex px-4 items-center gap-2 self-stretch border-b"
      style={{ height: '76px', borderColor: '#EEEEEC' }}
    >
      {!isDesktop && (
        <>
          {/* Hamburger Icon for Mobile */}
          <div className="md:hidden">
            <button 
              onClick={onToggleSidebar}
              className="text-2xl p-2 focus:outline-none"
            >
              ☰
            </button>
          </div>
          
          {/* Collapse Button for Tablet */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-full hover:bg-gray-200 hidden md:block"
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
        </>
      )}
      
      {/* Page Title */}
      <div className="flex-1 flex items-center gap-2">
        <h1 
          className="text-base font-semibold leading-6"
          style={{ color: '#1A1C1E' }}
        >
          {getPageTitle()}
        </h1>
      </div>

      {/* Auth Section */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="hidden md:flex items-center gap-3">
              {user.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  {user.user_metadata.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user.user_metadata.full_name?.replace(/\s*\((school of innovation foundation)s?\)\s*/i, '') || user.email}
              </span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              title="Sign Out"
            >
              <span className="hidden md:inline">Sign Out</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </>
        ) : (
          <div className="text-center">
            <GoogleSignInButton />
            <p className="text-xs text-gray-500 mt-2">
              By signing in, you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-700">
                Terms of Use
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}