import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabaseClient';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GoogleSignInButton from './GoogleSignInButton';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const getPageTitle = () => {
    // ... (getPageTitle function remains the same)
    switch (location.pathname) {
      case '/':
        return 'Browse Books';
      case '/my':
        return 'My Library';
      case '/loans':
        return 'My Loans';
      case '/books/new':
        return 'Add Book';
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
      {/* Hamburger Icon for Mobile */}
      <div className="md:hidden">
        <button 
          onClick={() => {
            onToggleSidebar();
            setIsMobileMenuOpen(false);
          }}
          className="text-2xl p-2 focus:outline-none"
        >
          ☰
        </button>
      </div>
      
      {/* Page Title */}
      <div className="flex-1">
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
            <div className="hidden md:flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user.email}
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
          <GoogleSignInButton />
        )}
      </div>
    </div>
  );
}
