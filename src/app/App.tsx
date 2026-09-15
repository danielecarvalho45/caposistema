import { AppShell } from '../components/shell/AppShell'
import { useAccessFlow } from '../features/access/access-context'
import { HomePage } from '../features/home/HomePage'

export function App() {
  const { accessContext, logout } = useAccessFlow()

  if (!accessContext) {
    return (
      <main className="app-context-loading" aria-live="polite">
        Carregando contexto de acesso…
      </main>
    )
  }

  return (
    <AppShell accessContext={accessContext} onLogout={logout}>
      <HomePage accessContext={accessContext} />
    </AppShell>
  )
}
