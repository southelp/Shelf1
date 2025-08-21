import { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';
import { Logo } from './Logo';
import { motion } from 'framer-motion';

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ isCollapsed }, ref) => {
  const location = useLocation();
  const user = useUser();

  const menuItems = [
    {
      path: '/',
      label: 'Browse Books',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
      variant: location.pathname === '/' ? 4 : 1
    },
    {
      path: '/my',
      label: 'My Books',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 12l4.179 2.25M21.75 12l-4.179-2.25v4.5l4.179-2.25zM2.25 12l4.179 2.25m0 0l5.571 3m5.571-3l4.179-2.25M17.571 14.25l5.571-3M4.429 14.25l5.571 3m5.571-3l-5.571 3" />
        </svg>
      ),
      variant: location.pathname === '/my' ? 4 : 1,
      requiresAuth: true
    },
    {
      path: '/loans',
      label: 'My Borrows',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3 0l-3-3m0 0l3 3m-3-3h9" />
        </svg>
      ),
      variant: location.pathname === '/loans' ? 4 : 1,
      requiresAuth: true
    },
    {
      path: '/books/new',
      label: 'Add Book',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    <motion.div
      ref={ref}
      className={`
        flex flex-col h-full
        ${isCollapsed ? 'w-[72px]' : 'w-[220px]'}
        transition-all duration-200 ease-out
        border-r
        relative
      `}
      style={{
        borderColor: '#EEEEEC',
        background: '#F8F8F7'
      }}
      animate={{ width: isCollapsed ? 72 : 220 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Logo Section */}
      <div className="flex h-[76px] items-center px-4">
        {!isCollapsed && (
          <div className="w-full">
            <Logo />
          </div>
        )}
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

        {/* Terms of Use Link */}
        <div className="flex flex-col items-start self-stretch p-0.5 pb-4">
          <Link
            to="/terms"
            className="flex items-center self-stretch px-1.5 py-1 rounded-xl hover:bg-gray-100/50 transition-colors duration-200 ease-out"
          >
            <div className="flex w-9 min-w-9 justify-center items-center">
              <div className="flex flex-col items-start text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col items-start">
                <div 
                  className="text-sm font-medium leading-5"
                  style={{
                    color: '#5D5D5F',
                    fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                  }}
                >
                  Terms of Use
                </div>
              </div>
            )}
          </Link>
        </div>
      </div>
    </motion.div>
  );
});

export default Sidebar;
