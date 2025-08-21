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

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleResize = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (mobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // On mobile, close sidebar after navigation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const bind = useDrag(({ down, movement: [mx], direction: [xDir], velocity }) => {
    if (!isMobile) return;

    // If the user swipes left with enough velocity, close the sidebar
    if (!down && xDir < 0 && velocity > 0.2) {
      setIsSidebarOpen(false);
    }
    
    // If the user just releases the drag (not a fast swipe) and has moved left, close it
    if (!down && mx < -50) {
      setIsSidebarOpen(false);
    }
  }, {
    axis: 'x',
    filterTaps: true,
    rubberband: true,
  });

  return (
    <div className="flex w-full h-screen bg-[#FCFCFC] overflow-hidden">
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          />
        )}
      </AnimatePresence>

      <div
        className={`
          absolute top-0 left-0 h-full z-20 md:relative md:z-auto
          ${isMobile ? '' : 'transition-all duration-200 ease-out'}
          ${isMobile && (isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}
        `}
        style={{
          transform: isMobile ? (isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: isMobile ? 'transform 0.3s ease-out' : 'none',
        }}
        {...bind()}
        ref={sidebarRef}
      >
        <Sidebar isCollapsed={!isSidebarOpen} />
      </div>

      <div className="flex flex-col flex-1 h-screen">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isCollapsed={!isSidebarOpen} 
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
