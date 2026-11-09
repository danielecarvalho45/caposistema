import { RouterProvider } from 'react-router-dom'
import { AccessGate } from '../components/auth/AccessGate'
import { AccessProvider } from '../features/access/access-context'
import { router } from './router'
import { PublicAppointmentConfirmation } from '../features/agenda/PublicAppointmentConfirmation'

export function AppProviders() {
  // Página de token público: não exige a sessão interna dos profissionais.
  if (window.location.pathname === '/confirmar-consulta') return <PublicAppointmentConfirmation />
  return (
    <AccessProvider>
      <AccessGate>
        <RouterProvider router={router} />
      </AccessGate>
    </AccessProvider>
  )
}
