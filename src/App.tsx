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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const location = useLocation();

  const handleResize = () => {
    const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    setIsDesktop(desktop);
    setIsSidebarOpen(false); // Close sidebar on resize
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
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

  const sidebarIsCollapsed = isDesktop ? !isHovered : false;
  const sidebarWidth = isDesktop ? (isHovered ? '260px' : '75px') : '0px';

  return (
    <div className="flex w-full h-screen bg-[#FCFCFC] overflow-hidden">
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-10"
            />
            <motion.div
              className="absolute top-0 left-0 h-full z-20"
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              {...bind()}
            >
              <Sidebar isCollapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isDesktop && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative z-20 transition-all duration-200 ease-out"
          style={{ width: sidebarWidth }}
        >
          <Sidebar isCollapsed={sidebarIsCollapsed} />
        </div>
      )}

      <div 
        className="flex flex-col flex-1 h-screen transition-all duration-200 ease-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isCollapsed={sidebarIsCollapsed}
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
