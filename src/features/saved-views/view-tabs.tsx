import { useQuery } from '@tanstack/react-query'
import { BookmarkPlus, Settings2, Star } from 'lucide-react'
import { useState, type ButtonHTMLAttributes } from 'react'
import { savedViewsQuery, type SavedViewScreen } from '@/api/saved-views'
import { Button } from '@/components/ui/button'
import { ManageViewsDialog, SaveViewDialog } from './view-dialogs'
import { fromFilters, isCustomized, toFilters } from './view-filters'

/**
 * Vistas de una lista como pestañas sobre la tabla, al estilo de Shopify o Linear:
 * "Todos" (la pantalla sin vista), una pestaña por vista guardada y "Guardar vista" cuando lo que se ve
 * no coincide con ninguna. La estrella marca la vista con la que abre la pantalla.
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
      <div className="mb-4 flex items-center gap-2 border-b border-line">
        <nav className="-mb-px flex min-w-0 flex-1 items-center overflow-x-auto" aria-label="Vistas guardadas">
          <Tab active={!customized} onClick={() => onApply({})}>
            Todos
          </Tab>
          {list.map((v) => (
            <Tab key={v.id} active={v.id === active?.id} onClick={() => onApply(fromFilters(v.filters))} title={v.isDefault ? 'La pantalla abre con esta vista' : undefined}>
              {v.name}
              {v.isDefault && <Star className="size-3.5 text-accent" fill="currentColor" aria-label="predeterminada" />}
            </Tab>
          ))}
          {customized && !active && (
            <button
              type="button"
              onClick={() => setDialog('save')}
              className="ml-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-accent hover:bg-surface-2"
            >
              <BookmarkPlus className="size-4" />
              Guardar vista
            </button>
          )}
        </nav>
        {list.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setDialog('manage')} aria-label="Administrar vistas" title="Administrar vistas">
            <Settings2 />
          </Button>
        )}
      </div>

      {dialog === 'save' && <SaveViewDialog screen={screen} filters={current} onClose={() => setDialog(null)} />}
      {dialog === 'manage' && <ManageViewsDialog screen={screen} views={list} currentFilters={current} onClose={() => setDialog(null)} />}
    </>
  )
}

function Tab({ active, children, ...props }: { active: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-base whitespace-nowrap transition-colors first:pl-0.5 ${
        active ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}
