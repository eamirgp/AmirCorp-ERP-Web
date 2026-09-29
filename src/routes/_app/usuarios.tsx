import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, KeyRound, MoreHorizontal, Pencil, Plus, Power, ShieldCheck, UserRound } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'
import { assignableRolesQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { usersQuery, useToggleUser, type UserRow } from '@/api/users'
import { Button } from '@/components/ui/button'
import { DataTable, RowActions } from '@/components/ui/data-table'
import { FilterBar, FilterChip } from '@/components/ui/filters'
import { EmptyState, Loading, SearchBox } from '@/components/ui/list-controls'
import { ErrorList, PageHeader, Pill } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet, type HistoryTarget } from '@/features/audit/history-sheet'
import { ViewTabs } from '@/features/saved-views/view-tabs'
import { applyDefaultView, isCustomized } from '@/features/saved-views/view-filters'
import { UserDialog } from '@/features/users/user-dialogs'
import { countLabel, statusOptions, statusSchema } from '@/lib/filters'
import { useHotkey } from '@/lib/hotkeys'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: statusSchema,
  rol: z.string().optional().catch(undefined),
  nuevo: z.boolean().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/usuarios')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: applyDefaultView('Users'),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(assignableRolesQuery)
    return context.queryClient.ensureQueryData(usersQuery)
  },
  component: UsersPage,
})

type Action = 'profile' | 'role' | 'password'
const col = createColumnHelper<UserRow>()

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useQuery(usersQuery)
  const toggle = useToggleUser()
  const [action, setAction] = useState<{ mode: Action; user: UserRow } | null>(null)
  const [history, setHistory] = useState<HistoryTarget | null>(null)

  const openNew = () => navigate({ search: (prev) => ({ ...prev, nuevo: true }) })
  const closeDialog = () => {
    setAction(null)
    if (search.nuevo) navigate({ search: (prev) => ({ ...prev, nuevo: undefined }), replace: true })
  }
  useHotkey('n', openNew)

  const onToggle = useCallback(
    (u: UserRow) =>
      toggle.mutate(
        { id: u.id, active: !u.isActive },
        { onSuccess: () => toast.ok(`${u.name} ${u.isActive ? 'desactivado' : 'activado'}`), onError: (e) => toast.error(errorMessages(e)[0]) },
      ),
    [toggle],
  )

  // La API devuelve todos los usuarios (son pocos): buscar y filtrar aquí es solo presentación.
  const rows = useMemo(() => {
    const q = search.q?.toLowerCase()
    return (list.data ?? []).filter(
      (u) =>
        (!search.estado || u.isActive === (search.estado === 'activos')) &&
        (!search.rol || u.role === search.rol) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    )
  }, [list.data, search.q, search.estado, search.rol])

  // Roles presentes en la lista, con la descripción que envía la API.
  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const u of list.data ?? []) if (u.role) seen.set(u.role, u.roleDescription ?? u.role)
    return [...seen].map(([value, label]) => ({ value, label }))
  }, [list.data])

  const itemClass = 'flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted'

  const columns = useMemo(
    () => [
      col.accessor('name', { header: 'Nombre' }),
      col.accessor('email', { header: 'Correo', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('roleDescription', { header: 'Rol', cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => (c.getValue() ? <Pill tone="ok">Activo</Pill> : <Pill tone="neutral">Inactivo</Pill>) }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => {
          const u = c.row.original
          return (
            <RowActions>
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button size="sm" variant="ghost" aria-label={`Acciones para ${u.name}`}>
                    <MoreHorizontal />
                  </Button>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Content align="end" sideOffset={4} className="z-50 w-52 rounded-lg border border-line bg-surface p-1 shadow-float">
                    <Menu.Item className={itemClass} onSelect={() => setAction({ mode: 'profile', user: u })}>
                      <Pencil />
                      Editar nombre y correo
                    </Menu.Item>
                    <Menu.Item className={itemClass} onSelect={() => setAction({ mode: 'role', user: u })}>
                      <ShieldCheck />
                      Cambiar rol
                    </Menu.Item>
                    <Menu.Item className={itemClass} onSelect={() => setAction({ mode: 'password', user: u })}>
                      <KeyRound />
                      Restablecer contraseña
                    </Menu.Item>
                    <Menu.Item className={itemClass} onSelect={() => setHistory({ entityType: 'User', entityId: u.id, label: `${u.name} · ${u.email}` })}>
                      <HistoryIcon />
                      Ver historial
                    </Menu.Item>
                    <Menu.Separator className="my-1 h-px bg-line" />
                    <Menu.Item className={itemClass} onSelect={() => onToggle(u)}>
                      <Power />
                      {u.isActive ? 'Desactivar' : 'Activar'}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Portal>
              </Menu.Root>
            </RowActions>
          )
        },
      }),
    ],
    [onToggle],
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

      <section className="flex flex-col">
        <ViewTabs screen="Users" search={search} onApply={(s) => navigate({ search: s as Search })} />
        <FilterBar
          busy={list.isFetching && !list.isPending}
          search={<SearchBox value={search.q} onSearch={(q) => navigate({ search: (prev) => ({ ...prev, q }), replace: true })} placeholder="Buscar por nombre o correo" />}
          filters={
            <>
              <FilterChip label="Rol" options={roleOptions} value={search.rol} onChange={(rol) => navigate({ search: (prev) => ({ ...prev, rol }) })} />
              <FilterChip label="Estado" options={statusOptions} value={search.estado} onChange={(estado) => navigate({ search: (prev) => ({ ...prev, estado }) })} />
            </>
          }
          onClear={isCustomized(search) ? () => navigate({ search: {} }) : undefined}
          count={list.data ? countLabel(rows.length, 'usuario', 'usuarios') : undefined}
        />

        {list.isError ? (
          <ErrorList messages={errorMessages(list.error)} />
        ) : !list.data ? (
          <Loading text="Cargando usuarios…" />
        ) : rows.length > 0 ? (
          <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={(u) => setAction({ mode: 'profile', user: u })} isMuted={(r) => !r.isActive} />
        ) : (
          <EmptyState icon={<UserRound strokeWidth={1.5} />} text="Ningún usuario coincide con la búsqueda o el filtro." />
        )}
      </section>

      <UserDialog mode={search.nuevo ? 'create' : (action?.mode ?? null)} user={action?.user ?? null} onClose={closeDialog} />
      <HistorySheet target={history} onClose={() => setHistory(null)} />
    </>
  )
}
