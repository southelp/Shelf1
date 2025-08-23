import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDrag } from 'react-use-gesture';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home.tsx';
import MyLibrary from './pages/MyLibrary.tsx';
import MyNewBook from './pages/NewBook.tsx';
import Loans from './pages/Loans.tsx';
import UserLibrary from './pages/UserLibrary.tsx';
import BookDisplayDemo from './pages/BookDisplayDemo.tsx';
import TermsOfUse from './pages/TermsOfUse.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';

const DESKTOP_BREAKPOINT = 1024;

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleResize = () => {
    const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    setIsDesktop(desktop);
    if (desktop) {
      setIsSidebarOpen(false); // Default to collapsed on desktop
    } else {
      setIsSidebarOpen(false); // Default to collapsed on mobile
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isDesktop]);

  const bind = useDrag(({ down, movement: [mx], direction: [xDir], velocity }) => {
    if (isDesktop) return;
    if (!down && xDir < 0 && velocity > 0.2) setIsSidebarOpen(false);
    if (!down && mx < -50) setIsSidebarOpen(false);
  }, {
    axis: 'x',
    filterTaps: true,
    rubberband: true,
  });

  const isCollapsed = isDesktop ? !isHovered : !isSidebarOpen;
  const sidebarWidth = isCollapsed ? '75px' : '260px';

  return (
    <div className="flex w-full h-screen bg-[#FCFCFC] overflow-hidden">
      <AnimatePresence>
        {isSidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div
        onMouseEnter={() => isDesktop && setIsHovered(true)}
        onMouseLeave={() => isDesktop && setIsHovered(false)}
        className={`
          absolute top-0 left-0 h-full z-20 lg:relative lg:z-auto
          transition-transform duration-300 ease-out lg:transition-none
          ${isSidebarOpen && !isDesktop ? 'translate-x-0' : ''}
          ${!isSidebarOpen && !isDesktop ? '-translate-x-full' : ''}
        `}
        style={{
          width: isDesktop ? sidebarWidth : (isSidebarOpen ? '260px' : '0'),
          transition: isDesktop ? 'width 0.2s ease-out' : 'transform 0.3s ease-out',
        }}
        {...(!isDesktop ? bind() : {})}
        ref={sidebarRef}
      >
        <Sidebar isCollapsed={isCollapsed} />
      </div>

      <div 
        className="flex flex-col flex-1 h-screen transition-all duration-200 ease-out"
        style={{ marginLeft: isDesktop ? sidebarWidth : '0' }}
      >
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isCollapsed={isCollapsed}
          isDesktop={isDesktop}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/my" element={<MyLibrary />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/books/new" element={<MyNewBook />} />
              <Route path="/users/:userId" element={<UserLibrary />} />
              <Route path="/demo" element={<BookDisplayDemo />} />
              <Route path="/terms" element={<TermsOfUse />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}