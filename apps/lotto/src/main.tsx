import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { badgeFavicon, envBadgeColor } from '@therious/utils'
if (import.meta.env.DEV) badgeFavicon(envBadgeColor())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
