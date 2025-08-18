import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './lib/supabaseClient'

// Import global styles so that the application retains its original
// colours and layout. Without this import Vite will omit the CSS
// bundle and the UI will appear unstyled.
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SessionContextProvider>
  </React.StrictMode>
)
