import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from '@/api/client'
import { RouteError } from '@/components/layout/route-error'
import { Toaster } from '@/components/ui/toast'
import { session } from '@/lib/session'
import { routeTree } from './routeTree.gen'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Reintenta solo fallas de red o del servidor; un 400/404 no se arregla reintentando.
      retry: (count, error) => count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  // Precarga los datos de una pantalla al pasar el mouse sobre su link: al hacer clic ya está lista.
  defaultPreload: 'intent',
  // La caché la maneja TanStack Query; el router no guarda una copia propia.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Si una pantalla no se puede cargar (API apagada, error del servidor), mensaje en español con "Reintentar".
  defaultErrorComponent: RouteError,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Al cerrar la sesión (manual, por vencimiento o por un 401) se limpian los datos y se vuelve al login.
session.subscribe(() => {
  if (session.isAuthenticated) return
  queryClient.clear()
  const { pathname, href } = router.state.location
  if (pathname !== '/login') router.navigate({ to: '/login', search: { redirect: href } })
})

// El token de acceso solo vive en memoria: al abrir o recargar la página, la sesión se recupera con la cookie del
// refresh token antes de decidir si mostrar el sistema o el inicio de sesión.
await session.restore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
