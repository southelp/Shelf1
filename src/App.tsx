import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // On mobile, close sidebar after navigation
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div 
      className="flex w-full h-screen bg-[#FCFCFC]"
    >
      <div className={`
        absolute top-0 left-0 h-full z-20 md:relative md:z-auto
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <Sidebar 
          isCollapsed={!isSidebarOpen} 
        />
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