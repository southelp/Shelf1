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

  // ✨ 로그인 직후 대출 요청 개수를 실시간으로 가져오는 useEffect 훅 추가
  useEffect(() => {
    if (!user) {
      setLoanRequestsCount(0);
      return;
    }
    
    // Supabase Realtime을 활용하여 실시간으로 대출 요청 개수를 업데이트합니다.
    // 기존에 fetchLoanRequests를 중복 호출하는 부분을 최적화했습니다.
    const subscription = supabase
      .from('loans')
      .on('INSERT', (payload) => {
        if (payload.new.owner_id === user.id && payload.new.status === 'reserved') {
          setLoanRequestsCount(prevCount => prevCount + 1);
        }
      })
      .on('UPDATE', (payload) => {
        // 예약 상태에서 다른 상태로 변경되었을 때 (예: 승인, 거절)
        if (payload.old.owner_id === user.id && payload.old.status === 'reserved' && payload.new.status !== 'reserved') {
          setLoanRequestsCount(prevCount => Math.max(0, prevCount - 1));
        }
      })
      .on('DELETE', (payload) => {
        if (payload.old.owner_id === user.id && payload.old.status === 'reserved') {
          setLoanRequestsCount(prevCount => Math.max(0, prevCount - 1));
        }
      })
      .subscribe();

    const fetchLoanRequests = async () => {
      const { count } = await supabase
        .from('loans')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('status', 'reserved');
      setLoanRequestsCount(count || 0);
    };

    fetchLoanRequests();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [user]);

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
              // ✨ 배지 스타일을 수정하여 사진처럼 빨간색 원형 알림으로 변경했습니다.
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
        {/* Loan.tsx에서 더 이상 count를 가져올 필요가 없으므로 setLoanRequestsCount prop을 제거 */}
        <Route path="/loans" element={<Loans />} />
        <Route path="/books/new" element={<NewBook />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/users/:userId" element={<UserLibrary />} />
      </Routes>
    </>
  );
}
