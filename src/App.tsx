import { useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import MyLibrary from './pages/MyLibrary';
import NewBook from './pages/NewBook';
import Scan from './pages/Scan';
import GoogleSignInButton from './components/GoogleSignInButton';
import { supabase, allowedDomain } from './lib/supabaseClient';

export default function App() {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const email = user.email?.toLowerCase();
      // ✨ 버그 수정: '@' 기호를 제거하여 올바른 도메인 검증 로직으로 변경
      if (email && !email.endsWith(allowedDomain)) {
        alert(`학교 이메일(${allowedDomain})로만 로그인할 수 있습니다.`);
        supabase.auth.signOut();
        navigate('/');
      }
    }
  }, [user, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <>
      <header className="header">
        <div className="brand">Taejae Residence Library</div>
        <nav className="nav">
          <Link to="/">도서</Link>
          <Link to="/my">나의 서재</Link>
          <Link to="/books/new">도서 등록</Link>
          <Link to="/scan">ISBN 스캔</Link>
        </nav>
        <div style={{ marginLeft: 'auto' }}>
          {user ? (
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