import { RouterProvider } from 'react-router-dom'
import { AccessGate } from '../components/auth/AccessGate'
import { AccessProvider } from '../features/access/access-context'
import { router } from './router'

export function AppProviders() {
  return (
    <AccessProvider>
      <AccessGate>
        <RouterProvider router={router} />
      </AccessGate>
    </AccessProvider>
  )
}
