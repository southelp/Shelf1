import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import MyLibrary from './pages/MyLibrary.tsx';
import MyNewBook from './pages/NewBook.tsx';
import Loans from './pages/Loans.tsx';
import UserLibrary from './pages/UserLibrary.tsx';
import BookDisplayDemo from './pages/BookDisplayDemo.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  return (
    <div 
      className="flex w-full h-screen"
      style={{
        background: 'linear-gradient(0deg, #FCFCFC 0%, #FCFCFC 100%), #FFF',
      }}
    >
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      <div className="flex flex-col flex-1 h-screen">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/my" element={<MyLibrary />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/books/new" element={<MyNewBook />} />
              <Route path="/users/:userId" element={<UserLibrary />} />
              <Route path="/demo" element={<BookDisplayDemo />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}