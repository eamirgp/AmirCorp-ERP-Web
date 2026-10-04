import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from '@/api/client'
import { ConnectionError } from '@/components/layout/connection-error'
import { RouteError } from '@/components/layout/route-error'
import { Toaster } from '@/components/ui/toast'
import { trackKeyboardFocus } from '@/lib/keyboard-focus'
import { session } from '@/lib/session'
import { routeTree } from './routeTree.gen'
import './styles.css'

trackKeyboardFocus()

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Reintenta solo fallas de red o del servidor; un 400/404 no se arregla reintentando.
      retry: (count, error) => count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
    },
  },
  mutationCache: new MutationCache({
    // Un 409 dice que los datos cambiaron (otra persona los modificó, o el código ya es de otro): se vuelven a pedir.
    // Sin esto, al reabrir el formulario se enviaría otra vez la versión vieja y el 409 se repetiría hasta recargar.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries()
    },
  }),
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

// El usuario cuyos datos muestra la pantalla.
let shownUser: string | null = null

session.subscribe(() => {
  // Al cerrar la sesión (manual, por vencimiento o por un 401) se limpian los datos y se vuelve al login.
  if (!session.isAuthenticated) {
    shownUser = null
    queryClient.clear()
    const { pathname, href } = router.state.location
    if (pathname !== '/login') router.navigate({ to: '/login', search: { redirect: href } })
    return
  }

  // En otra pestaña se inició sesión con otro usuario y esta renovó con su cookie: no se deja a la vista lo del anterior.
  if (shownUser !== null && session.userId !== shownUser) {
    queryClient.clear()
    router.navigate({ to: '/' })
  }
  shownUser = session.userId
})

const root = createRoot(document.getElementById('root')!)

// El token de acceso solo vive en memoria: al abrir o recargar la página, la sesión se recupera con la cookie del
// refresh token antes de decidir si mostrar el sistema o el inicio de sesión. Sin conexión no se sabe si hay sesión:
// se avisa y se reintenta, en vez de mostrar el inicio de sesión como si se hubiera cerrado.
async function start() {
  if ((await session.restore()) === 'unreachable') {
    root.render(<ConnectionError onRetry={start} />)
    return
  }

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>,
  )
}

await start()
