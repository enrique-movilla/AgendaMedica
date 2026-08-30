import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CatalogoProvider } from './context/CatalogoContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogoProvider tenantId={1}>
      <App />
    </CatalogoProvider>
  </StrictMode>,
)
