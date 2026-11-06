import { useLocation, useNavigate } from 'react-router-dom'

/** Volta à função anterior; acessos diretos sem histórico interno usam o início como fallback. */
export function useBackToPreviousFunction() {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    const browserIndex: unknown = window.history.state?.idx
    if (typeof browserIndex === 'number' && browserIndex > 0) {
      navigate(-1)
      return
    }
    const previousPath = location.state && typeof location.state === 'object' && 'from' in location.state
      ? (location.state as { from?: unknown }).from
      : null
    if (typeof previousPath === 'string' && previousPath.startsWith('/') && !previousPath.startsWith('//') && previousPath !== location.pathname) {
      navigate(previousPath, { replace: true })
      return
    }
    navigate('/', { replace: true })
  }
}
