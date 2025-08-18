// src/App.tsx
import { useUser } from '@supabase/auth-helpers-react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import MyLibrary from './pages/MyLibrary';
import NewBook from './pages/NewBook';
import Scan from './pages/Scan';
import GoogleSignInButton from './components/GoogleSignInButton';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const user = useUser(); // useUser 훅으로 사용자 정보 직접 가져오기
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <>
      <header className="header">
        <div className="brand">Taejae Library</div>
        <nav className="nav">
          <Link to="/">도서</Link>
          <Link to="/my">나의 서재</Link>
          <Link to="/books/new">도서 등록</Link>
          <Link to="/scan">ISBN 스캔</Link>
        </nav>
        <div style={{ marginLeft: 'auto' }}>
          {user ? ( // user 객체의 존재 여부로 로그인 상태 확인
            <div className="row" style={{ gap: 10 }}>
              <span className="label">{user.email}</span>
              <button className="btn" onClick={signOut}>로그아웃</button>
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