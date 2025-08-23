import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= DESKTOP_BREAKPOINT);
  const location = useLocation();

  const handleResize = () => {
    const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
    setIsDesktop(desktop);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false); // Close mobile menu on resize
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex w-full h-screen bg-[#FCFCFC] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!isDesktop && isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.div
              className="fixed top-0 left-0 h-full z-50 bg-white"
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Sidebar isCollapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      {isDesktop && (
        <div
          className="group relative z-30 flex-shrink-0 bg-white transition-all duration-200 ease-out w-[75px] hover:w-[260px] border-r border-gray-200"
        >
          <Sidebar isCollapsed={true} />
        </div>
      )}

      <div className="flex flex-col flex-1 h-screen">
        <Header 
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
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
