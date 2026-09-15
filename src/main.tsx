import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers'
import { readPublicEnvironment } from './lib/environment'
import './styles/tokens.css'
import './styles/global.css'
import './styles/utilities.css'

readPublicEnvironment(import.meta.env)

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento raiz da aplicação não foi encontrado.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
