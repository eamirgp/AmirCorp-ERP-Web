import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, KeyRound, Pencil, Plus, Power, ShieldCheck, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { userRolesQuery } from '@/api/catalogs'
import { usersListQuery, useToggleUser, type UserRow } from '@/api/users'
import { Button } from '@/components/ui/button'
import { DataTable, RowMenu } from '@/components/ui/data-table'
import { FilterBar } from '@/components/ui/filters'
import { EmptyState, Loading, SearchBox, ListPanel, ListError } from '@/components/ui/list-controls'
import { PageHeader, Pill } from '@/components/ui/misc'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { useConfirmToggle } from '@/features/shared/use-confirm-toggle'
import { UserDialog } from '@/features/users/user-dialogs'
import { countLabel, listFilterOf, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: statusSchema,
  rol: z.string().optional().catch(undefined),
  nuevo: z.boolean().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

// Abrir el formulario "nuevo" no vuelve a pedir la lista.
const listParams = (s: Search) => ({ ...listFilterOf(s), rol: s.rol })

export const Route = createFileRoute('/_app/usuarios')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('Users'),
  loaderDeps: ({ search }) => listParams(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(userRolesQuery)
    return context.queryClient.ensureQueryData(usersListQuery(deps))
  },
  component: UsersPage,
})

type Action = 'profile' | 'role' | 'password'
const col = createColumnHelper<UserRow>()

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(usersListQuery(listParams(search)))
  const roles = useQuery(userRolesQuery)
  const toggle = useToggleUser()
  const [action, setAction] = useState<{ mode: Action; user: UserRow } | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeDialog = () => {
    setAction(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const activation = useConfirmToggle<UserRow>(toggle, {
    title: '¿Desactivar este usuario?',
    body: (u) => (
      <>
        <strong className="font-medium text-ink">{u.name}</strong> ({u.email}) ya no podrá iniciar sesión. Lo que registró se conserva y puedes activarlo de nuevo
        cuando quieras.
      </>
    ),
    done: (u, active) => `${u.name} ${active ? 'activado' : 'desactivado'}`,
  })
  const onToggle = activation.request

  const rows = list.data ?? []
  const roleOptions = (roles.data ?? []).map((r) => ({ value: r.userRole ?? '', label: r.description }))

  const columns = useMemo(
    () => [
      col.accessor('name', { header: 'Nombre' }),
      col.accessor('email', { header: 'Correo', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('roleDescription', { header: 'Rol', cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => <Pill tone={c.getValue() ? 'ok' : 'neutral'}>{c.row.original.statusDescription}</Pill> }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => {
          const u = c.row.original
          return (
            <RowMenu
              label={u.name}
              busy={activation.busyId === u.id}
              items={[
                { label: 'Editar nombre y correo', icon: <Pencil />, onSelect: () => setAction({ mode: 'profile', user: u }) },
                { label: 'Cambiar rol', icon: <ShieldCheck />, onSelect: () => setAction({ mode: 'role', user: u }) },
                { label: 'Restablecer contraseña', icon: <KeyRound />, onSelect: () => setAction({ mode: 'password', user: u }) },
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => setHistory({ entityType: 'User', entityId: u.id, label: `${u.name} · ${u.email}` }) },
                u.isActive
                  ? { label: 'Desactivar', icon: <Power />, onSelect: () => onToggle(u), danger: true }
                  : { label: 'Activar', icon: <Power />, onSelect: () => onToggle(u) },
              ]}
            />
          )
        },
      }),
    ],
    [onToggle, activation.busyId],
  )

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién puede entrar al sistema y con qué rol."
        actions={
          <Button variant="primary" onClick={openNew} title="Atajo: N">
            <Plus />
            Nuevo usuario
          </Button>
        }
      />

      <ListPanel>
        <ViewTabs screen="Users" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q }), replace: true })} placeholder="Buscar usuarios" hint="Por nombre o correo" />}
          filters={[
            { kind: 'select', key: 'rol', label: 'Rol', options: roleOptions, value: search.rol, onChange: (rol) => navigate({ search: (prev) => ({ ...prev, rol }) }) },
            {
              kind: 'select',
              key: 'estado',
              label: 'Estado',
              options: statusOptions,
              value: search.estado,
              onChange: (estado) => navigate({ search: (prev) => ({ ...prev, estado: estado as Search['estado'] }) }),
            },
          ]}
          onClear={isCustomized(search) ? () => navigate({ search: {} }) : undefined}
          count={list.data ? countLabel(rows.length, 'usuario', 'usuarios') : undefined}
        />

        {list.isError ? (
          <ListError error={list.error} onRetry={() => void list.refetch()} />
        ) : !list.data ? (
          <Loading text="Cargando usuarios…" />
        ) : rows.length > 0 ? (
          <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={(u) => setAction({ mode: 'profile', user: u })} isMuted={(r) => !r.isActive} />
        ) : (
          <EmptyState icon={<UserRound strokeWidth={1.5} />} text="Ningún usuario coincide con la búsqueda o el filtro." action={<Button onClick={() => navigate({ search: {} })}>Limpiar filtros</Button>} />
        )}
      </ListPanel>

      <UserDialog mode={search.nuevo ? 'create' : (action?.mode ?? null)} user={action?.user ?? null} onClose={closeDialog} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
      {activation.dialog}
    </>
  )
}
