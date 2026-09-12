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

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')

export function App() {
  const { unlocked, initialized } = useVault()
  const [route, setRoute] = useState<Route>(() =>
    pathToRoute(window.location.pathname),
  )

  useEffect(() => {
    if (!initialized) return

    if (unlocked) {
      if (route.name === 'unlock') {
        setRoute({ name: 'dashboard' })
      }
    } else if (route.name !== 'unlock') {
      setRoute({ name: 'unlock' })
    }
  }, [initialized, unlocked, route.name])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(pathToRoute(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (newRoute: Route) => {
    setRoute(newRoute)
    window.history.pushState({}, '', routeToPath(newRoute))
  }

  if (!initialized) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!unlocked) {
    return <UnlockScreen />
  }

  switch (route.name) {
    case 'category':
      return (
        <>
          <CategoryPage categoryId={route.id} onNavigate={navigate} />
          <ToastContainer />
        </>
      )
    case 'settings':
      return (
        <>
          <SettingsPage onNavigate={navigate} />
          <ToastContainer />
        </>
      )
    case 'unlock':
    case 'dashboard':
    default:
      return (
        <>
          <Dashboard onNavigate={navigate} />
          <ToastContainer />
        </>
      )
  }
}

function pathToRoute(path: string): Route {
  let appPath = path

  if (appPath.startsWith(BASE_PATH)) {
    appPath = appPath.slice(BASE_PATH.length) || '/'
  }

  if (appPath === '/settings') return { name: 'settings' }

  if (appPath.startsWith('/category/')) {
    return {
      name: 'category',
      id: decodeURIComponent(appPath.slice('/category/'.length)),
    }
  }

  return { name: 'unlock' }
}

function routeToPath(route: Route): string {
  switch (route.name) {
    case 'category':
      return `${BASE_PATH}/category/${encodeURIComponent(route.id)}`
    case 'settings':
      return `${BASE_PATH}/settings`
    case 'unlock':
    case 'dashboard':
    default:
      return `${BASE_PATH}/`
  }
}
