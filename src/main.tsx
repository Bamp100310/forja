import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Desregistro activo de Service Workers anteriores y purga de caché de Workbox
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {})
    }
  }).catch(() => {})

  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name).catch(() => {})
      }
    }).catch(() => {})
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

