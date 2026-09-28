import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="max-w-sm text-center">
        <p className="num text-sm text-faint">404</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Esta página no existe</h1>
        <p className="mt-2 text-sm text-muted">Revisa la dirección o vuelve al inicio.</p>
        <Link to="/" className="mt-5 inline-block font-semibold text-accent-text hover:underline">
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
