import { Pencil, RefreshCw, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessages } from '@/api/client'
import { useSavedViewMutations, type SavedView, type SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { MoreMenu } from '@/components/ui/more-menu'
import { SwitchRow } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'

/** Guarda la búsqueda, filtros, orden y filas por página actuales como una vista nueva. */
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
        <SwitchRow
          label="Abrir siempre con esta vista"
          description="Al entrar a esta pantalla se aplicará sola. Puedes cambiarla cuando quieras."
          checked={isDefault}
          onChange={setIsDefault}
        />
      </form>
    </Dialog>
  )
}

/**
 * Lista de vistas como una lista agrupada de Apple: la estrella marca con cuál abre la pantalla, y cada fila tiene un
 * menú "⋯" con "Usar los filtros de ahora", "Renombrar" y, al final y en rojo, "Eliminar" (que pide confirmación porque
 * no se puede deshacer). "Listo" cierra, como en las hojas de Apple.
 */
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

  const deleting = views.find((v) => v.id === confirmDelete)

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Administrar vistas"
      description="La estrella marca con cuál se abre la pantalla."
      footer={
        <Button variant="primary" onClick={onClose}>
          Listo
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <ErrorList messages={failed ? errorMessages(failed) : []} />
        <ul className="flex flex-col overflow-hidden rounded-2xl bg-muted-fill">
          {views.map((v) => (
            <li key={v.id} className="flex min-h-13 items-center gap-2.5 border-b border-hairline py-1.5 pr-1.5 pl-2 last:border-b-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => save(v, { isDefault: !v.isDefault }, v.isDefault ? `«${v.name}» ya no es la predeterminada` : `«${v.name}» es tu vista predeterminada`)}
                aria-label={v.isDefault ? `Dejar de abrir con ${v.name}` : `Abrir siempre con ${v.name}`}
                title={v.isDefault ? 'La pantalla abre con esta vista' : 'Abrir siempre con esta vista'}
              >
                <Star className={v.isDefault ? 'text-selected' : 'text-disabled'} fill={v.isDefault ? 'currentColor' : 'none'} />
              </Button>

              {renaming?.id === v.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    save(v, { name: renaming.name }, 'Vista renombrada', () => setRenaming(null))
                  }}
                >
                  <Input
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ id: v.id, name: e.target.value })}
                    // Esc deja el nombre como estaba, sin cerrar la ventana.
                    data-own-escape
                    onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                    aria-label="Nombre de la vista"
                  />
                  <Button size="sm" variant="primary" type="submit" loading={update.isPending}>
                    Listo
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base">{v.name}</span>
                    {v.isDefault && <span className="block text-xs text-fg-muted">Se abre con esta</span>}
                  </span>
                  <MoreMenu
                    label={`Más opciones de ${v.name}`}
                    items={[
                      {
                        label: 'Usar los filtros de ahora',
                        icon: <RefreshCw />,
                        disabled: v.filters === currentFilters,
                        onSelect: () => save(v, { filters: currentFilters }, `«${v.name}» ahora usa los filtros de la pantalla`),
                      },
                      { label: 'Renombrar', icon: <Pencil />, onSelect: () => setRenaming({ id: v.id, name: v.name }) },
                      { label: 'Eliminar', icon: <Trash2 />, danger: true, onSelect: () => setConfirmDelete(v.id) },
                    ]}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Eliminar no se puede deshacer: se pregunta con la alerta de Apple. */}
      <ConfirmDialog
        open={!!deleting}
        title={`¿Eliminar la vista «${deleting?.name ?? ''}»?`}
        confirmLabel="Eliminar"
        pending={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.ok('Vista eliminada')
              setConfirmDelete(null)
            },
          })
        }
      >
        No se puede deshacer. Los registros de la lista no cambian.
      </ConfirmDialog>
    </Dialog>
  )
}
