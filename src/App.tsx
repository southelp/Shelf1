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
      className="flex w-full h-screen flex-col justify-center items-start absolute"
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

          <div className="flex flex-col items-start flex-1 self-stretch">
            <div className="flex items-start self-stretch min-h-0 flex-1">
              <div className="flex pr-1 flex-col justify-center items-start flex-1 self-stretch">
                <div 
                  className="flex flex-col items-start gap-0 flex-1 self-stretch rounded-[20px]"
                  style={{ background: '#FCFCFC' }}
                >
                  <div 
                    className="flex px-5 flex-col items-start self-stretch"
                    style={{ backdropFilter: 'blur(1px)' }}
                  >
                    <div 
                      className="flex py-2 px-0 justify-between items-center self-stretch border-b"
                      style={{ 
                        borderBottomColor: '#EEEEEC',
                        borderBottomWidth: '0.667px'
                      }}
                    >
                      <div className="flex px-3 items-center">
                      </div>

                      <div className="flex h-8 justify-center items-start gap-2">
                      </div>
                    </div>
                  </div>

                  <div className="flex px-5 pb-2 flex-col items-start flex-1 self-stretch">
                    <div className="flex flex-col items-start flex-1 self-stretch">
                      <main className="w-full h-full overflow-auto">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/my" element={<MyLibrary />} />
                          <Route path="/loans" element={<Loans />} />
                          <Route path="/books/new" element={<MyNewBook />} />
                          <Route path="/users/:userId" element={<UserLibrary />} />
                          <Route path="/demo" element={<BookDisplayDemo />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex p-2.5 flex-col items-center self-stretch">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
