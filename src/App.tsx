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

export function App() {
  const { unlocked, loading } = useVault()
  const [route, setRoute] = useState<Route>({ name: 'unlock' })

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
      const path = window.location.pathname
      setRoute(pathToRoute(path))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path && path !== '/') {
      setRoute(pathToRoute(path))
    }
  }, [])

  const navigate = (newRoute: Route) => {
    setRoute(newRoute)
    window.history.pushState({}, '', routeToPath(newRoute))
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
        return <CategoryPage categoryId={route.id} onNavigate={navigate} />
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
  if (path === '/settings') return { name: 'settings' }
  if (path.startsWith('/category/')) {
    const id = decodeURIComponent(path.slice('/category/'.length))
    return { name: 'category', id }
  }
  return { name: 'unlock' }
}

function routeToPath(route: Route): string {
  switch (route.name) {
    case 'unlock':
      return '/'
    case 'dashboard':
      return '/'
    case 'category':
      return `/category/${encodeURIComponent(route.id)}`
    case 'settings':
      return '/settings'
    default:
      return '/'
  }
}
