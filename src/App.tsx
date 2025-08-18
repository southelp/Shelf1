import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import MyLibrary from './pages/MyLibrary'
import NewBook from './pages/NewBook'
import Scan from './pages/Scan'
import GoogleSignInButton from './components/GoogleSignInButton'
import { supabase } from './lib/supabaseClient'

export default function App(){
  const [email,setEmail] = useState<string|undefined>()
  const nav = useNavigate()

  useEffect(()=>{ supabase.auth.getUser().then(({data})=> setEmail(data.user?.email||undefined)) },[])
  supabase.auth.onAuthStateChange((_e,{ user })=>{ setEmail(user?.email||undefined) })

  async function signOut(){ 
    await supabase.auth.signOut(); 
    nav('/') 
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
        <div style={{marginLeft:'auto'}}>
          {email ? (
            <div className="row" style={{gap:10}}>
              <span className="label">{email}</span>
              <button className="btn" onClick={signOut}>로그아웃</button>
            </div>
          ) : (
            <GoogleSignInButton />
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/my" element={<MyLibrary/>} />
        <Route path="/books/new" element={<NewBook/>} />
        <Route path="/scan" element={<Scan/>} />
      </Routes>
    </>
  )
}