import { useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  // ✨ 로그인 상태 및 대출 요청 개수를 관리하는 useEffect 훅을 수정했습니다.
  useEffect(() => {
    // Supabase의 로딩 상태를 확인하여 초기 로딩을 처리합니다.
    const initialLoad = async () => {
      setIsLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { count } = await supabase
          .from('loans')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', currentUser.id)
          .eq('status', 'reserved');
        setLoanRequestsCount(count || 0);
      }
      setIsLoading(false);
    };
    initialLoad();

    // 실시간 구독 설정: loans 테이블의 변경사항을 감지합니다.
    const subscription = supabase
      .from('loans')
      .on('*', () => { 
        // 변경이 발생하면 다시 요청 개수를 불러옵니다.
        const fetchLoanRequests = async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { count } = await supabase
              .from('loans')
              .select('id', { count: 'exact', head: true })
              .eq('owner_id', currentUser.id)
              .eq('status', 'reserved');
            setLoanRequestsCount(count || 0);
          } else {
            setLoanRequestsCount(0);
          }
        };
        fetchLoanRequests();
      })
      .subscribe();
      
    // 컴포넌트 언마운트 시 구독을 해제합니다.
    return () => {
      supabase.removeSubscription(subscription);
    };

  }, [user]); // user 객체가 변경될 때만 재실행되도록 합니다.

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const navLinkClass = "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  
  if (isLoading) {
    return <div className="p-6 text-center text-gray-600">Loading...</div>;
  }

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
        <Route path="/loans" element={<Loans />} />
        <Route path="/books/new" element={<NewBook />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/users/:userId" element={<UserLibrary />} />
      </Routes>
    </>
  );
}
