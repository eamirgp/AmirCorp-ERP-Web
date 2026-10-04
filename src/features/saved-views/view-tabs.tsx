import { useQuery } from '@tanstack/react-query'
import { BookmarkPlus, Ellipsis, Star } from 'lucide-react'
import { useState, type ButtonHTMLAttributes } from 'react'
import { savedViewsQuery, type SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { ManageViewsDialog, SaveViewDialog } from './view-dialogs'
import { fromFilters, isCustomized, toFilters } from './view-filters'

/**
 * Vistas de una lista como control segmentado (HIG "Segmented controls": opciones muy relacionadas que cambian lo que
 * se ve): "Todos" (la pantalla sin vista) y una vista guardada por segmento; la elegida queda blanca y en relieve. Al
 * lado, "Guardar vista" cuando lo que se ve no coincide con ninguna. La estrella marca la vista con la que abre la
 * pantalla.
 */
export function ViewTabs({
  screen,
  search,
  onApply,
}: {
  screen: SavedViewScreen
  search: Record<string, unknown>
  onApply: (search: Record<string, unknown>) => void
}) {
  const views = useQuery(savedViewsQuery(screen))
  const [dialog, setDialog] = useState<'save' | 'manage' | null>(null)

  const current = toFilters(search)
  const list = views.data ?? []
  const active = list.find((v) => v.filters === current)
  const customized = isCustomized(search)

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <nav className="flex min-w-0 overflow-x-auto" aria-label="Vistas guardadas">
          <div className="flex shrink-0 gap-0.5 rounded-full bg-fill p-[3px]">
            <Segment active={!customized} onClick={() => onApply({})}>
              Todos
            </Segment>
            {list.map((v) => (
              <Segment key={v.id} active={v.id === active?.id} onClick={() => onApply(fromFilters(v.filters))} title={v.isDefault ? 'La pantalla abre con esta vista' : undefined}>
                {v.name}
                {v.isDefault && <Star className="size-3.5 text-link" fill="currentColor" aria-label="predeterminada" />}
              </Segment>
            ))}
          </div>
        </nav>
        {customized && !active && (
          <Button size="sm" variant="ghost" onClick={() => setDialog('save')}>
            <BookmarkPlus />
            Guardar vista
          </Button>
        )}
        {list.length > 0 && (
          // "⋯" como en Apple para "más opciones": no se confunde con el botón "Filtros", que tiene barritas.
          <Button size="icon" variant="ghost" onClick={() => setDialog('manage')} aria-label="Administrar vistas" title="Administrar vistas">
            <Ellipsis />
          </Button>
        )}
      </div>

      {dialog === 'save' && <SaveViewDialog screen={screen} filters={current} onClose={() => setDialog(null)} />}
      {dialog === 'manage' && <ManageViewsDialog screen={screen} views={list} currentFilters={current} onClose={() => setDialog(null)} />}
    </>
  )
}

function Segment({ active, children, ...props }: { active: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm whitespace-nowrap transition-[background-color,box-shadow] duration-200 ease-apple outline-none focus-visible:shadow-focus ${
        active ? 'bg-page font-semibold text-fg shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]' : 'font-medium text-fg hover:bg-fill-hover'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}
