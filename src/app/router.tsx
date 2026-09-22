import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { KNOWN_APP_ROUTES } from './route-access'

export const router = createBrowserRouter([
  ...KNOWN_APP_ROUTES.map((path) => ({ path, element: <App /> })),
  {
    path: '*',
    element: <App />,
  },
])
