import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Ask the browser to keep this site's storage (the saved login lives there) instead of evicting it.
void navigator.storage?.persist?.().catch(() => {})
// Safari pinch-zoom: block it so the app doesn't drift or scale like a web page.
document.addEventListener('gesturestart', (e) => e.preventDefault())

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
