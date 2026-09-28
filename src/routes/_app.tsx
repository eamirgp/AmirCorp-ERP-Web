import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { meQuery } from '@/api/account'
import { AppShell } from '@/components/layout/app-shell'
import { session } from '@/lib/session'

/** Layout de todas las pantallas que requieren sesión. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!session.isAuthenticated) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
