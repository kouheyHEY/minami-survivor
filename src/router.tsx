import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  createHashHistory,
} from '@tanstack/react-router'
import { GamePage } from './screens/GamePage'
import { RulesPage } from './screens/RulesPage'

function RootLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="みなみサバイバー ホーム">
          <span className="brand-mark">M</span>
          <span>みなみサバイバー</span>
        </Link>
        <nav aria-label="メインナビゲーション">
          <Link to="/" activeProps={{ className: 'active' }}>ゲーム</Link>
          <Link to="/rules" activeProps={{ className: 'active' }}>遊び方</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })
const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: GamePage,
})
const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rules',
  component: RulesPage,
})

const routeTree = rootRoute.addChildren([gameRoute, rulesRoute])

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
