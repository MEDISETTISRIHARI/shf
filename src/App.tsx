import { useState, useEffect } from 'react'
import { useVault } from './VaultContext'
import { UnlockScreen } from './pages/Unlock'
import Dashboard from './pages/Dashboard'
import CategoryPage from './pages/CategoryPage'
import SettingsPage from './pages/Settings'
import { ToastContainer } from './components/Toast'

export type Route =
  | { name: 'unlock' }
  | { name: 'dashboard' }
  | { name: 'category'; id: string }
  | { name: 'settings' }

// GitHub Pages project base path
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')

export function App() {
  const { unlocked, loading } = useVault()
  const [route, setRoute] = useState<Route>(() =>
    pathToRoute(window.location.pathname),
  )

  useEffect(() => {
    if (loading) return

    if (unlocked) {
      if (route.name === 'unlock') {
        setRoute({ name: 'dashboard' })
      }
    } else {
      setRoute({ name: 'unlock' })
    }
  }, [unlocked, loading, route.name])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(pathToRoute(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (newRoute: Route) => {
    setRoute(newRoute)

    window.history.pushState(
      {},
      '',
      routeToPath(newRoute),
    )
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  const renderRoute = () => {
    if (!unlocked) {
      return <UnlockScreen />
    }

    switch (route.name) {
      case 'unlock':
        return <UnlockScreen />

      case 'dashboard':
        return <Dashboard onNavigate={navigate} />

      case 'category':
        return (
          <CategoryPage
            categoryId={route.id}
            onNavigate={navigate}
          />
        )

      case 'settings':
        return <SettingsPage onNavigate={navigate} />

      default:
        return <UnlockScreen />
    }
  }

  return (
    <>
      {renderRoute()}
      <ToastContainer />
    </>
  )
}

function pathToRoute(path: string): Route {
  // Remove GitHub Pages base path: /shf
  let appPath = path

  if (appPath.startsWith(BASE_PATH)) {
    appPath = appPath.slice(BASE_PATH.length) || '/'
  }

  if (appPath === '/settings') {
    return { name: 'settings' }
  }

  if (appPath.startsWith('/category/')) {
    const id = decodeURIComponent(
      appPath.slice('/category/'.length),
    )

    return {
      name: 'category',
      id,
    }
  }

  return { name: 'unlock' }
}

function routeToPath(route: Route): string {
  switch (route.name) {
    case 'unlock':
      return `${BASE_PATH}/`

    case 'dashboard':
      return `${BASE_PATH}/`

    case 'category':
      return `${BASE_PATH}/category/${encodeURIComponent(route.id)}`

    case 'settings':
      return `${BASE_PATH}/settings`

    default:
      return `${BASE_PATH}/`
  }
}