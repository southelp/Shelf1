import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.tsx';
import MyLibrary from './pages/MyLibrary.tsx';
import NewBook from './pages/NewBook.tsx';
import Scan from './pages/Scan.tsx';
import Loans from './pages/Loans.tsx';
import UserLibrary from './pages/UserLibrary.tsx';
import GoogleSignInButton from './components/GoogleSignInButton.tsx';
import { supabase, allowedDomain } from './lib/supabaseClient.ts';

export default function App() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [loanRequestsCount, setLoanRequestsCount] = useState(0);

  useEffect(() => {
    if (user) {
      const ensureUserProfile = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile && error && error.code === 'PGRST116') {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata.full_name,
          });
        }
      };
      ensureUserProfile();
    }
  }, [user]);

  const updateLoanRequestsCount = useCallback((count: number) => {
    setLoanRequestsCount(count);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  // ✨ 메뉴 링크 스타일링을 위한 Tailwind 클래스
  const navLinkClass = "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  
  return (
    <>
      <header className="header">
        <div className="brand">Taejae Open Shelf</div>
        <nav className="nav">
          <Link to="/" className={`${navLinkClass} ${location.pathname === '/' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>도서</Link>
          <Link to="/my" className={`${navLinkClass} ${location.pathname === '/my' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>나의 서재</Link>
          <Link to="/loans" className={`${navLinkClass} ${location.pathname === '/loans' ? 'bg-gray-100' : 'hover:bg-gray-100'} flex items-center`}>
            대출/예약
            {loanRequestsCount > 0 && (
              // ✨ 배지 스타일을 수정하여 작은 원형 알림으로 변경했습니다.
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs font-bold items-center justify-center">
                  {loanRequestsCount > 9 ? '9+' : loanRequestsCount}
                </span>
              </span>
            )}
          </Link>
          <Link to="/books/new" className={`${navLinkClass} ${location.pathname === '/books/new' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>도서 등록</Link>
          <Link to="/scan" className={`${navLinkClass} ${location.pathname === '/scan' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>ISBN 스캔</Link>
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
        <Route path="/loans" element={<Loans setLoanRequestsCount={updateLoanRequestsCount} />} />
        <Route path="/books/new" element={<NewBook />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/users/:userId" element={<UserLibrary />} />
      </Routes>
    </>
  );
}
