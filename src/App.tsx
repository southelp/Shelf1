import { useEffect, useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import MyLibrary from './pages/MyLibrary.tsx';
import MyNewBook from './pages/NewBook.tsx';
import Loans from './pages/Loans.tsx';
import UserLibrary from './pages/UserLibrary.tsx';
import BookDisplayDemo from './pages/BookDisplayDemo.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import { supabase } from './lib/supabaseClient.ts';

export default function App() {
  const user = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  return (
    <div 
      // 'absolute' 클래스를 제거하여 레이아웃을 정상화합니다.
      className="flex w-full h-screen flex-col justify-center items-start"
      style={{
        background: 'linear-gradient(0deg, #FCFCFC 0%, #FCFCFC 100%), #FFF',
        backdropFilter: 'blur(100px)'
      }}
    >
      <div className="flex items-start flex-1 self-stretch">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />

        <div className="flex flex-col items-start flex-1 self-stretch">
          <Header />

          <div className="flex flex-col items-start flex-1 self-stretch overflow-hidden">
            <main className="w-full h-full overflow-auto p-6">
              <div className="max-w-7xl mx-auto">
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
      </div>
    </div>
  );
}