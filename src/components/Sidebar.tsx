import { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';
import { Logo } from './Logo';

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ isCollapsed }, ref) => {
  const location = useLocation();
  const user = useUser();

  const menuItems = [
    { path: '/', label: 'Browse Books', icon: 'auto_stories' },
    { path: '/my', label: 'My Books', icon: 'library_books', requiresAuth: true },
    { path: '/loans', label: 'My Borrows', icon: 'sync', requiresAuth: true },
    { path: '/books/new', label: 'Add Books', icon: 'add_circle', requiresAuth: true }
  ];

  const handleNavClick = (item: (typeof menuItems)[0], e: React.MouseEvent) => {
    if (item.requiresAuth && !user) {
      e.preventDefault();
      alert("Please log in to continue.");
    }
  };

  const NavLink = ({ path, icon, label, onClick }: { path: string, icon: string, label: string, onClick: (e: React.MouseEvent) => void }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        onClick={onClick}
        className={`
          flex items-center rounded-xl py-2 w-full
          transition-colors duration-400 ease-out
          ${isCollapsed ? 'px-3 justify-start' : 'px-3'}
          ${isActive ? 'bg-gray-200' : 'hover:bg-gray-100/50'}
        `}
        style={{ backgroundColor: isActive ? '#E4E4E2' : undefined }}
      >
        <div className={`flex items-center w-9 min-w-9 ${isActive ? 'text-gray-800' : 'text-gray-600'}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div 
          className={`
            overflow-hidden whitespace-nowrap transition-all duration-400 ease-out
            ${isCollapsed
              ? 'w-0 opacity-0 group-hover:ml-2 group-hover:w-full group-hover:opacity-100'
              : 'ml-2 w-full opacity-100'
            }
          `}
        >
          <span className={`text-sm font-medium leading-5 ${isActive ? 'text-gray-800' : 'text-gray-600'}`}>
            {label}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div ref={ref} className="flex flex-col h-full w-full">
      <div className={`flex h-[120px] items-center justify-center transition-all duration-400 ${isCollapsed ? 'px-[15px]' : 'px-[20px]'}`}>
        <div className={`transition-all duration-400 ease-out w-3/4 ${isCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
          <Logo />
        </div>
      </div>

      <div className={`flex flex-col items-start flex-1 pt-4 transition-all duration-400 ${isCollapsed ? 'px-[15px]' : 'px-[20px]'}`}>
        <div className="flex flex-col items-start self-stretch space-y-1">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
              onClick={(e) => handleNavClick(item, e)}
            />
          ))}
        </div>
        <div className="flex-1"></div>
        <div className="self-stretch pb-4 mb-1">
          <NavLink 
            path="/terms"
            icon="gavel"
            label="Terms of Use"
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
});

export default Sidebar;