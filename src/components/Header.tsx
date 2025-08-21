import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import GoogleSignInButton from './GoogleSignInButton';

export default function Header() {
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
      className="flex px-3 pr-6 items-center gap-3 self-stretch"
      style={{ height: '76px' }}
    >
      {/* Page Title */}
      <div className="h-[76px] flex-1">
        <div className="flex items-center h-full px-3">
          <h1 
            className="text-base font-semibold leading-6"
            style={{
              color: '#1A1C1E',
              fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
            }}
          >
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="hidden md:flex items-center gap-1">
        {/* Get API Key Button (placeholder for future) */}
        <div className="flex px-1 flex-col items-start">
          <div 
            className="flex h-9 px-3 items-center gap-1 rounded-xl border"
            style={{ 
              borderColor: '#E1E1E1',
              background: '#FFF'
            }}
          >
            <div className="flex flex-col items-start">
              <svg width="18" height="22" viewBox="0 0 19 22" fill="none">
                <path d="M6.09332 12.2188C5.75582 12.2188 5.46832 12.1 5.23082 11.8625C4.99332 11.625 4.87457 11.3375 4.87457 11C4.87457 10.6625 4.99332 10.375 5.23082 10.1375C5.46832 9.9 5.75582 9.78125 6.09332 9.78125C6.43082 9.78125 6.71832 9.9 6.95582 10.1375C7.19332 10.375 7.31207 10.6625 7.31207 11C7.31207 11.3375 7.19332 11.625 6.95582 11.8625C6.71832 12.1 6.43082 12.2188 6.09332 12.2188Z" fill="#32302C"/>
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className="text-sm text-center leading-5"
                style={{
                  color: '#32302C',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                Settings
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex px-1 flex-col items-start">
          <div className="flex flex-col items-start">
            <div 
              className="text-sm font-bold leading-5"
              style={{
                color: '#1A1C1E',
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
              }}
            >
              Library
            </div>
          </div>
        </div>

        <div className="flex px-1 flex-col items-start">
          <div className="flex flex-col items-start">
            <div 
              className="text-sm leading-5"
              style={{
                color: '#44474E',
                fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
              }}
            >
              Dashboard
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div className="flex px-1 flex-col items-start">
          {user ? (
            <button
              onClick={signOut}
              className="flex flex-col items-start hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
            >
              <div 
                className="text-sm leading-5"
                style={{
                  color: '#44474E',
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                }}
              >
                Sign Out
              </div>
            </button>
          ) : (
            <GoogleSignInButton />
          )}
        </div>

        {/* Settings Menu */}
        <div className="flex flex-col items-start">
          <div className="flex h-9 px-2 justify-center items-center rounded-[18px]">
            <div className="flex flex-col items-start">
              <svg width="18" height="22" viewBox="0 0 19 22" fill="none">
                <path d="M7.77501 18.125L7.47501 15.8375C7.27501 15.775 7.07189 15.6812 6.86564 15.5562C6.65939 15.4312 6.46876 15.3 6.29376 15.1625L4.17501 16.0625L2.45001 13.0625L4.28751 11.675C4.26251 11.5625 4.24689 11.45 4.24064 11.3375C4.23439 11.225 4.23126 11.1125 4.23126 11C4.23126 10.9 4.23439 10.7937 4.24064 10.6812C4.24689 10.5687 4.26251 10.45 4.28751 10.325L2.45001 8.9375L4.17501 5.95625L6.29376 6.8375C6.46876 6.7 6.65939 6.57187 6.86564 6.45312C7.07189 6.33437 7.27501 6.2375 7.47501 6.1625L7.77501 3.875H11.225L11.525 6.1625C11.75 6.25 11.9531 6.34687 12.1344 6.45312C12.3156 6.55937 12.5 6.6875 12.6875 6.8375L14.825 5.95625L16.55 8.9375L14.6938 10.3437C14.7188 10.4687 14.7313 10.5812 14.7313 10.6812C14.7313 10.7812 14.7313 10.8875 14.7313 11C14.7313 11.1 14.7281 11.2031 14.7219 11.3094C14.7156 11.4156 14.7 11.5375 14.675 11.675L16.5125 13.0625L14.7875 16.0625L12.6875 15.1625C12.5 15.3125 12.3094 15.4437 12.1156 15.5562C11.9219 15.6687 11.725 15.7625 11.525 15.8375L11.225 18.125H7.77501Z" fill="#32302C"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
