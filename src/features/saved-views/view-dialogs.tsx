import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessages } from '@/api/client'
import { useSavedViewMutations, type SavedView, type SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

/** Guarda la bÃºsqueda, filtros, orden y filas por pÃ¡gina actuales como una vista nueva. */
export function SaveViewDialog({ screen, filters, onClose }: { screen: SavedViewScreen; filters: string; onClose: () => void }) {
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

/** Lista de vistas: cambiar la predeterminada, renombrar, actualizar con los filtros actuales o eliminar. */
export function ManageViewsDialog({
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
