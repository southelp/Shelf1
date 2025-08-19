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

  // Loan requests count를 설정하는 함수를 useCallback으로 감싸서 안정성을 높였습니다.
  const updateLoanRequestsCount = useCallback((count: number) => {
    setLoanRequestsCount(count);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

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
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {loanRequestsCount > 9 ? '9+' : loanRequestsCount}
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
        {/* Loans 컴포넌트에 updateLoanRequestsCount 함수를 prop으로 전달 */}
        <Route path="/loans" element={<Loans setLoanRequestsCount={updateLoanRequestsCount} />} />
        <Route path="/books/new" element={<NewBook />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/users/:userId" element={<UserLibrary />} />
      </Routes>
    </>
  );
}
