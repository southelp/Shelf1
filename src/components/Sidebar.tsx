import { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'framer-motion';

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
      `}
      style={{
        borderColor: '#EEEEEC',
        background: '#F8F8F7'
      }}
      animate={{ width: isCollapsed ? 75 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Logo Section */}
      <div className="flex h-[120px] items-center px-[20px]">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'linear' }}
            >
              <Logo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Menu */}
      <div className={`flex flex-col items-start flex-1 pt-4 ${!isCollapsed ? 'px-[20px]' : 'px-[15px]'}`}>
        <div className="flex flex-col items-start self-stretch">
          {menuItems.map((item) => (
            <div key={item.path} className="flex flex-col self-stretch items-start mb-1">
              <Link
                to={item.path}
                onClick={(e) => handleNavClick(item, e)}
                className={`
                  flex items-center rounded-xl py-2
                  ${isCollapsed ? 'px-2 self-center' : 'px-3 self-stretch'}
                  transition-colors duration-200 ease-out
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
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      className="flex flex-col items-start ml-2 overflow-hidden whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15, ease: 'linear' }}
                    >
                      <div 
                        className="text-sm font-medium leading-5"
                        style={{
                          color: item.variant === 4 ? '#32302C' : '#5D5D5F',
                          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                        }}
                      >
                        {item.label}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              flex items-center rounded-xl py-2
              ${isCollapsed ? 'px-2 self-center' : 'px-3 self-stretch'}
              transition-colors duration-200 ease-out
              hover:bg-gray-100/50
            `}
          >
            <div className="flex w-9 min-w-9 justify-center items-center">
              <div className="flex flex-col items-start text-gray-500">
                <span className="material-symbols-outlined">gavel</span>
              </div>
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  className="flex flex-col items-start ml-2 overflow-hidden whitespace-nowrap"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15, ease: 'linear' }}
                >
                  <div 
                    className="text-sm font-medium leading-5"
                    style={{
                      color: '#5D5D5F',
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif'
                    }}
                  >
                    Terms of Use
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>
    </motion.div>
  );
});

export default Sidebar;
