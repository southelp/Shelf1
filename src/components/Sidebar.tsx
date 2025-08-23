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
      icon: <span className="material-symbols-outlined">auto_stories</span>,
      variant: location.pathname === '/' ? 4 : 1
    },
    {
      path: '/my',
      label: 'My Books',
      icon: <span className="material-symbols-outlined">library_books</span>,
      variant: location.pathname === '/my' ? 4 : 1,
      requiresAuth: true
    },
    {
      path: '/loans',
      label: 'My Borrows',
      icon: <span className="material-symbols-outlined">sync</span>,
      variant: location.pathname === '/loans' ? 4 : 1,
      requiresAuth: true
    },
    {
      path: '/books/new',
      label: 'Add Books',
      icon: <span className="material-symbols-outlined">add_circle</span>,
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
        ${isCollapsed ? 'w-[75px]' : 'w-[260px]'}
        transition-all duration-200 ease-out
        border-r
        relative
        px-[20px]
      `}
      style={{
        borderColor: '#EEEEEC',
        background: '#F8F8F7'
      }}
      animate={{ width: isCollapsed ? 75 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Logo Section */}
      <div className="flex h-[120px] items-center">
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
            <div key={item.path} className="flex flex-col self-stretch items-start mb-1">
              <Link
                to={item.path}
                onClick={(e) => handleNavClick(item, e)}
                className={`
                  flex items-center rounded-xl px-3 py-2
                  transition-all duration-200 ease-out
                  ${!isCollapsed ? 'self-stretch' : ''}
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
                    className="flex flex-col items-center"
                    style={{
                      color: item.variant === 4 ? '#32302C' : '#5D5D5F'
                    }}
                  >
                    {item.icon}
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col items-start ml-2">
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
        <div className="flex flex-col self-stretch items-start pb-4">
          <Link
            to="/terms"
            className={`
              flex items-center rounded-xl px-3 py-2
              transition-all duration-200 ease-out
              hover:bg-gray-100/50
              ${!isCollapsed ? 'self-stretch' : ''}
            `}
          >
            <div className="flex w-9 min-w-9 justify-center items-center">
              <div className="flex flex-col items-start text-gray-500">
                <span className="material-symbols-outlined">gavel</span>
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col items-start ml-2">
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
