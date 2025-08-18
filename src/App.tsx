// src/App.tsx

import { useEffect } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import MyLibrary from './pages/MyLibrary';
import NewBook from './pages/NewBook';
import Scan from './pages/Scan';
import GoogleSignInButton from './components/GoogleSignInButton';
import { supabase, allowedDomain } from './lib/supabaseClient';
import { useSession } from '@supabase/auth-helpers-react';

export default function App() {
  const session = useSession();
  const nav = useNavigate();
  const location = useLocation(); // 현재 경로를 확인하기 위해 useLocation 훅 사용

  useEffect(() => {
    if (session?.user?.email && !session.user.email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      alert(`You can only sign in using a school email (@${allowedDomain}).`);
      supabase.auth.signOut();
    }
  }, [session]);

  async function signOut() {
    await supabase.auth.signOut();
    nav('/');
  }

  // 스캔 페이지 새로고침을 위한 클릭 핸들러
  const handleScanLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/scan') {
      e.preventDefault(); // 기본 링크 동작 방지
      window.location.reload(); // 페이지 새로고침
    }
  };

  return (
    <>
      <header className="header">
        <div className="brand">Taejae Open Shelf </div>
        <nav className="nav">
          <Link to="/">Books</Link>
          <Link to="/my">My Books</Link>
          <Link to="/books/new">Manual Entry</Link>
          {/* "Book Scanning" 링크에 onClick 핸들러 추가 */}
          <Link to="/scan" onClick={handleScanLinkClick}>Book Scanning</Link>
        </nav>
        <div style={{ marginLeft: 'auto' }}>
          {session ? (
            <div className="row" style={{ gap: 10 }}>
              <span className="label">{session.user.email}</span>
              <button className="btn" onClick={signOut}>Sign Out</button>
            </div>
          ) : (
            <GoogleSignInButton />
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/my" element={<MyLibrary />} />
        <Route path="/books/new" element={<NewBook />} />
        <Route path="/scan" element={<Scan />} />
      </Routes>
    </>
  );
}