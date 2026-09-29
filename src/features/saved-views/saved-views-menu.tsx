import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, BookmarkPlus, Check, ChevronDown, Settings2, Star, StarOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessages } from '@/api/client'
import { savedViewsQuery, useSavedViewMutations, type SavedView, type SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { fromFilters, toFilters } from './view-filters'

const menuClass = 'z-50 w-72 rounded-lg border border-line bg-surface p-1 shadow-float'
const itemClass =
  'relative flex cursor-pointer items-center gap-2 rounded py-1.5 pr-8 pl-2 text-sm outline-none data-[disabled]:cursor-default data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0'

/**
 * Menú "Vistas" de una lista: aplicar una vista guardada, guardar los filtros actuales y administrarlas.
 * La vista cuyo filtro coincide con la pantalla aparece con su nombre en el botón.
 */
export function SavedViewsMenu({
  screen,
  search,
  onApply,
}: {
  screen: SavedViewScreen
  search: Record<string, unknown>
  onApply: (search: Record<string, unknown>) => void
}) {
  const views = useQuery(savedViewsQuery(screen))
  const { update } = useSavedViewMutations(screen)
  const [dialog, setDialog] = useState<'save' | 'manage' | null>(null)

  const current = toFilters(search)
  const list = views.data ?? []
  const active = list.find((v) => v.filters === current)

  const toggleDefault = (v: SavedView) =>
    update.mutate(
      { id: v.id, name: v.name, filters: v.filters, isDefault: !v.isDefault },
      {
        onSuccess: () => toast.ok(v.isDefault ? `«${v.name}» ya no es la vista predeterminada` : `«${v.name}» es tu vista predeterminada`),
        onError: (e) => toast.error(errorMessages(e)[0]),
      },
    )

  return (
    <>
      <Menu.Root>
        <Menu.Trigger className="inline-flex h-9 max-w-56 items-center gap-1.5 rounded-md px-2 text-sm text-muted outline-none hover:text-ink focus-visible:text-ink">
          <Bookmark className="size-4 shrink-0" />
          {active ? <span className="truncate font-medium text-ink">{active.name}</span> : <span>Vistas</span>}
          <ChevronDown className="size-3.5 shrink-0 text-faint" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" sideOffset={6} className={menuClass}>
            <Menu.Label className="px-2 pt-1 pb-1.5 text-xs text-faint">Vistas guardadas</Menu.Label>
            {list.length === 0 ? (
              <p className="px-2 pb-2 text-sm text-muted">Guarda los filtros y el orden que más usas para volver a ellos con un clic.</p>
            ) : (
              list.map((v) => (
                <Menu.Item key={v.id} className={itemClass} onSelect={() => onApply(fromFilters(v.filters))}>
                  <span className="min-w-0 flex-1 truncate">{v.name}</span>
                  {v.isDefault && <span className="text-xs text-faint">predeterminada</span>}
                  {v.id === active?.id && <Check className="absolute right-2 text-accent" />}
                </Menu.Item>
              ))
            )}
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item className={itemClass} onSelect={() => setDialog('save')}>
              <BookmarkPlus className="text-muted" />
              Guardar filtros actuales como vista…
            </Menu.Item>
            {active && (
              <Menu.Item className={itemClass} onSelect={() => toggleDefault(active)}>
                {active.isDefault ? <StarOff className="text-muted" /> : <Star className="text-muted" />}
                {active.isDefault ? 'Dejar de abrir con esta vista' : 'Abrir siempre con esta vista'}
              </Menu.Item>
            )}
            {list.length > 0 && (
              <Menu.Item className={itemClass} onSelect={() => setDialog('manage')}>
                <Settings2 className="text-muted" />
                Administrar vistas…
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      {dialog === 'save' && <SaveViewDialog screen={screen} filters={current} onClose={() => setDialog(null)} />}
      {dialog === 'manage' && <ManageViewsDialog screen={screen} views={list} currentFilters={current} onClose={() => setDialog(null)} />}
    </>
  )
}

function SaveViewDialog({ screen, filters, onClose }: { screen: SavedViewScreen; filters: string; onClose: () => void }) {
  const { create } = useSavedViewMutations(screen)
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    create.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = () =>
    create.mutate(
      { name, filters, isDefault },
      {
        onSuccess: () => {
          toast.ok('Vista guardada')
          onClose()
        },
      },
    )

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Guardar vista"
      description="Guarda la búsqueda, los filtros, el orden y las filas por página que tienes ahora."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="save-view-form" loading={create.isPending}>
            Guardar vista
          </Button>
        </>
      }
    >
      <form
        id="save-view-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <ErrorList messages={create.isError ? errorMessages(create.error) : []} />
        <Field label="Nombre">{(a) => <Input {...a} autoFocus placeholder="Recién creados" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <label className="flex items-start gap-2.5 text-base">
          <input type="checkbox" className="mt-1 size-4 [accent-color:var(--ink)]" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          <span>
            Abrir siempre con esta vista
            <span className="block text-sm text-muted">Al entrar a esta pantalla se aplicará sola. Puedes cambiarla cuando quieras.</span>
          </span>
        </label>
      </form>
    </Dialog>
  )
}

function ManageViewsDialog({
  screen,
  views,
  currentFilters,
  onClose,
}: {
  screen: SavedViewScreen
  views: SavedView[]
  currentFilters: string
  onClose: () => void
}) {
  const { update, remove } = useSavedViewMutations(screen)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const failed = update.isError ? update.error : remove.isError ? remove.error : null

  useEffect(() => {
    update.reset()
    remove.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = (v: SavedView, patch: Partial<Pick<SavedView, 'name' | 'filters' | 'isDefault'>>, message: string, done?: () => void) =>
    update.mutate(
      { id: v.id, name: v.name, filters: v.filters, isDefault: v.isDefault, ...patch },
      {
        onSuccess: () => {
          toast.ok(message)
          done?.()
        },
      },
    )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Administrar vistas" width="max-w-2xl" footer={<Button onClick={onClose}>Cerrar</Button>}>
      <div className="flex flex-col gap-3">
        <ErrorList messages={failed ? errorMessages(failed) : []} />
        <ul className="flex flex-col">
          {views.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3 last:border-b-0">
              <button
                type="button"
                onClick={() => save(v, { isDefault: !v.isDefault }, v.isDefault ? `«${v.name}» ya no es la predeterminada` : `«${v.name}» es tu vista predeterminada`)}
                className={`rounded p-1 hover:bg-surface-2 ${v.isDefault ? 'text-accent' : 'text-faint hover:text-ink'}`}
                aria-label={v.isDefault ? `Dejar de abrir con ${v.name}` : `Abrir siempre con ${v.name}`}
                title={v.isDefault ? 'Vista predeterminada' : 'Abrir siempre con esta vista'}
              >
                <Star className="size-4" fill={v.isDefault ? 'currentColor' : 'none'} />
              </button>

              {renaming?.id === v.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    save(v, { name: renaming.name }, 'Vista renombrada', () => setRenaming(null))
                  }}
                >
                  <Input className="h-9" autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: v.id, name: e.target.value })} aria-label="Nuevo nombre" />
                  <Button size="sm" variant="primary" type="submit" loading={update.isPending}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                    Cancelar
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-base">
                    {v.name}
                    {v.isDefault && <span className="ml-2 text-xs text-faint">predeterminada</span>}
                  </span>
                  {confirmDelete === v.id ? (
                    <span className="flex items-center gap-1 text-sm">
                      ¿Eliminar?
                      <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(v.id, { onSuccess: () => toast.ok('Vista eliminada') })}>
                        Sí, eliminar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        No
                      </Button>
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={v.filters === currentFilters}
                        title={v.filters === currentFilters ? 'La pantalla ya tiene estos filtros' : undefined}
                        onClick={() => save(v, { filters: currentFilters }, `«${v.name}» actualizada con los filtros actuales`)}
                      >
                        Usar filtros actuales
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenaming({ id: v.id, name: v.name })}>
                        Renombrar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(v.id)}>
                        Eliminar
                      </Button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
