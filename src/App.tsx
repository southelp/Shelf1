import { useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.tsx';
import MyLibrary from './pages/MyLibrary.tsx';
import MyNewBook from './pages/NewBook.tsx';
import Loans from './pages/Loans.tsx';
import UserLibrary from './pages/UserLibrary.tsx';
import GoogleSignInButton from './components/GoogleSignInButton.tsx';
import { supabase } from './lib/supabaseClient.ts';

export default function App() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();

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

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const navLinkClass = "relative px-3 py-2 rounded-md text-sm font-medium transition-colors";
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <div className="font-bold text-lg text-gray-800">Taejae Open Shelf</div>
              <nav className="hidden md:flex space-x-2">
                <Link to="/" className={`${navLinkClass} ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>Books</Link>
                <Link to="/my" className={`${navLinkClass} ${location.pathname === '/my' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} onClick={(e) => { if (!user) { e.preventDefault(); alert("Please log in to continue."); } }}>My Library</Link>
                <Link to="/loans" className={`${navLinkClass} ${location.pathname === '/loans' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} onClick={(e) => { if (!user) { e.preventDefault(); alert("Please log in to continue."); } }}>My Loans</Link>
                <Link to="/books/new" className={`${navLinkClass} ${location.pathname === '/books/new' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} onClick={(e) => { if (!user) { e.preventDefault(); alert("Please log in to continue."); } }}>Register Book</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
                  <button className="g-button-gray" onClick={signOut}>Sign Out</button>
                </>
              ) : (
                <GoogleSignInButton />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my" element={<MyLibrary />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/books/new" element={<MyNewBook />} />
          <Route path="/users/:userId" element={<UserLibrary />} />
        </Routes>
      </main>
    </div>
  );
}