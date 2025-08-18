import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import MyLibrary from './pages/MyLibrary';
import NewBook from './pages/NewBook';
import Scan from './pages/Scan';
import GoogleSignInButton from './components/GoogleSignInButton';
import { supabase } from './lib/supabaseClient';
import { useSession } from '@supabase/auth-helpers-react'; // useSession 훅 가져오기

export default function App() {
  const session = useSession(); // useSession 훅으로 세션 정보 가져오기
  const nav = useNavigate();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    // 로그아웃 후 홈페이지로 이동합니다.
    nav('/');
  }

  return (
    <>
      <header className="header">
        <div className="brand">Taejae Open Shelf </div>
        <nav className="nav">
          <Link to="/">Books</Link>
          <Link to="/my">My Books</Link>
          <Link to="/books/new">Manual Entry</Link>
          <Link to="/scan">Book Scanning</Link>
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