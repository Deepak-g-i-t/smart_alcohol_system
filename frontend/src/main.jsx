import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/* ─── Environment validation ─────────────────────────────── */
if (!import.meta.env.VITE_API_BASE_URL) {
  console.error(
    '[SLMRS] VITE_API_BASE_URL is not set. ' +
    'Create frontend/.env with VITE_API_BASE_URL=http://localhost:5000/api'
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
