import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { retireLegacyServiceWorkersAndCaches, setupChunkLoadRecovery } from './services/pwaMigration'

// Retirada controlada y acotada al scope de FORJA de Service Workers y cachés heredadas
if (typeof window !== 'undefined') {
  void retireLegacyServiceWorkersAndCaches()
  setupChunkLoadRecovery(window)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

