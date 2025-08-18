import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import MyLibrary from './pages/MyLibrary'
import NewBook from './pages/NewBook'
import Scan from './pages/Scan'
import GoogleSignInButton from './components/GoogleSignInButton'
import { supabase } from './lib/supabaseClient'

export default function App() {
  const [email, setEmail] = useState<string | undefined>()
  const nav = useNavigate()

  // Subscribe to authentication state changes and update the
  // local `email` state when a user logs in or out. We also
  // return a cleanup function so the subscription is removed
  // when the component unmounts to prevent memory leaks.
  useEffect(() => {
    // 1. When the component first mounts fetch the current user
    //    and initialise the email state.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email)
    })

    // 2. Subscribe to changes in authentication state. Whenever the
    //    session changes (login or logout) update the email state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // When the session changes update the email state. When a
      // session becomes null (logged out) set the email back to undefined.
      setEmail(session?.user?.email)
    })

    // 3. Clean up the subscription when the component unmounts.
    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array so this effect only runs once when mounted.

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    // After signing out navigate back to the homepage.
    nav('/')
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
          {email ? (
            <div className="row" style={{ gap: 10 }}>
              <span className="label">{email}</span>
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
  )
}
