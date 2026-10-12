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
// Installed iOS app: if the reported viewport is shorter than the screen, pull the tab bar down to the edge.
function fitViewport() {
  const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches
  const portrait = matchMedia('(orientation: portrait)').matches
  const gap = standalone && portrait ? screen.height - window.innerHeight : 0
  document.documentElement.style.setProperty('--vp-gap', `${gap > 0 && gap <= 100 ? gap : 0}px`)
}
fitViewport()
window.addEventListener('resize', fitViewport)
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 300))

// Safari pinch-zoom: block it so the app doesn't drift or scale like a web page.
document.addEventListener('gesturestart', (e) => e.preventDefault())

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
