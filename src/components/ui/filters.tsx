import * as Menu from '@radix-ui/react-dropdown-menu'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, PlusCircle, SlidersHorizontal, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Option } from '@/lib/filters'
import { formatDate } from '@/lib/format'
import { Button } from './button'
import { Input } from './field'
import { Sheet } from './sheet'

export type { Option }

const menuClass = 'z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-float'
const itemClass =
  'relative flex cursor-pointer items-center gap-2 rounded py-1.5 pr-8 pl-2 text-sm outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4'

/**
 * Filtro suelto como chip, para listas pequeñas dentro de un diálogo (ej.: el resultado de la importación).
 * Las pantallas de lista usan FilterBar, que junta todos los filtros en un panel.
 * - Sin valor: botón punteado "⊕ Estado" que abre las opciones.
 * - Con valor: chip "Estado  Activos" que se cambia con un clic y se quita con la ✕.
 */
export function FilterChip<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T | undefined
  onChange: (value: T | undefined) => void
}) {
  const selected = options.find((o) => o.value === value)

  return (
    <Menu.Root>
      {selected ? (
        <span className="inline-flex h-9 items-center rounded-full border border-line-strong text-sm">
          <Menu.Trigger className="flex h-full items-center gap-1.5 rounded-l-full pr-1.5 pl-3 outline-none hover:bg-surface-2 focus-visible:bg-surface-2">
            <span className="text-muted">{label}</span>
            <span className="font-medium text-ink">{selected.label}</span>
            <ChevronDown className="size-3.5 text-faint" />
          </Menu.Trigger>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="flex h-full items-center rounded-r-full border-l border-line pr-2.5 pl-1.5 text-faint hover:bg-surface-2 hover:text-ink"
            aria-label={`Quitar filtro ${label}`}
          >
            <X className="size-3.5" />
          </button>
        </span>
      ) : (
        <Menu.Trigger className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-sm text-muted outline-none hover:border-ink/40 hover:text-ink focus-visible:border-ink/40">
          <PlusCircle className="size-3.5" />
          {label}
        </Menu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={6} className={menuClass}>
          <Menu.Label className="px-2 pt-1 pb-1.5 text-xs text-faint">Filtrar por {label.toLowerCase()}</Menu.Label>
          <Menu.RadioGroup value={value ?? ''} onValueChange={(v) => onChange(v as T)}>
            {options.map((o) => (
              <Menu.RadioItem key={o.value} value={o.value} className={itemClass}>
                {o.label}
                <Menu.ItemIndicator className="absolute right-2">
                  <Check className="text-accent" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

// Al elegir una opción el menú sigue abierto: se elige el campo y la dirección de una vez, y la lista de atrás
// se reordena al instante. Se cierra con un clic afuera o con Esc.
const keepOpen = (e: Event) => e.preventDefault()

/** Menú "Ordenar": campo y dirección. Las opciones son las que la API permite ordenar. */
export function SortMenu<T extends string>({
  options,
  value,
  descending,
  onChange,
}: {
  options: Option<T>[]
  value: T
  descending: boolean
  onChange: (value: T, descending: boolean) => void
}) {
  const current = options.find((o) => o.value === value) ?? options[0]
  const DirIcon = descending ? ArrowDownWideNarrow : ArrowUpNarrowWide

  return (
    <Menu.Root>
      {/* Con el mismo aspecto que el botón "Filtros", a su lado: el orden siempre a la vista y a un clic. */}
      <Menu.Trigger className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-base font-medium text-ink outline-none hover:border-ink/40 focus-visible:border-ink/40">
        <DirIcon className="size-4 text-muted" />
        <span>
          <span className="font-normal text-muted">Ordenar:</span> {current.label}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={6} className={menuClass}>
          <Menu.Label className="px-2 pt-1 pb-1.5 text-xs text-faint">Ordenar por</Menu.Label>
          <Menu.RadioGroup value={current.value} onValueChange={(v) => onChange(v as T, descending)}>
            {options.map((o) => (
              <Menu.RadioItem key={o.value} value={o.value} className={itemClass} onSelect={keepOpen}>
                {o.label}
                <Menu.ItemIndicator className="absolute right-2">
                  <Check className="text-accent" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.RadioGroup value={descending ? 'desc' : 'asc'} onValueChange={(v) => onChange(current.value, v === 'desc')}>
            <Menu.RadioItem value="asc" className={itemClass} onSelect={keepOpen}>
              <ArrowUpNarrowWide className="text-muted" />
              Ascendente
              <Menu.ItemIndicator className="absolute right-2">
                <Check className="text-accent" />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
            <Menu.RadioItem value="desc" className={itemClass} onSelect={keepOpen}>
              <ArrowDownWideNarrow className="text-muted" />
              Descendente
              <Menu.ItemIndicator className="absolute right-2">
                <Check className="text-accent" />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

/**
 * Un filtro de la lista. La pantalla solo lo describe; la barra lo muestra en el panel y como chip.
 * - `select`: una opción de una lista (estado, rol, módulo…).
 * - `date`: un día (yyyy-mm-dd), con el selector de fecha del navegador.
 */
export type FilterDef =
  | { kind: 'select'; key: string; label: string; options: Option<string>[]; value: string | undefined; onChange: (value: string | undefined) => void }
  | { kind: 'date'; key: string; label: string; value: string | undefined; onChange: (value: string | undefined) => void }

/** Texto del valor aplicado, para el chip: "Activos", "28/09/2026". */
function valueLabel(f: FilterDef) {
  if (f.value === undefined) return undefined
  return f.kind === 'date' ? formatDate(f.value) : (f.options.find((o) => o.value === f.value)?.label ?? f.value)
}

const clearLinkClass = 'px-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline'

/**
 * Barra de filtros de una lista, al estilo de Shopify:
 *   [buscador] [Filtros (2)] [Ordenar: Nombre] [Limpiar filtros] ········ [Actualizando…] [n resultados]
 *   Estado: Activos ✕   Desde: 28/09/2026 ✕   Limpiar filtros        ← solo si hay filtros aplicados
 * Todos los filtros viven en un panel lateral que abre "Filtros": la barra se ve igual con 1 o con 10.
 * Debajo solo aparece lo aplicado, para ver siempre qué filtra la lista y quitarlo con un clic.
 * Las vistas guardadas van arriba, como pestañas (ViewTabs). En las listas paginadas el total va en el pie.
 */
export function FilterBar({
  search,
  filters = [],
  onClear,
  count,
  sort,
  busy,
}: {
  search: ReactNode
  filters?: FilterDef[]
  /** Si se pasa, muestra "Limpiar filtros". Pásalo solo cuando la lista esté filtrada, buscada u ordenada. */
  onClear?: () => void
  count?: string
  sort?: ReactNode
  busy?: boolean
}) {
  const [panelOpen, setPanelOpen] = useState(false)
  const applied = filters.filter((f) => f.value !== undefined)

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {search}
        {filters.length > 0 && (
          <Button onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal />
            Filtros
            {applied.length > 0 && (
              <span className="num inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-ink">{applied.length}</span>
            )}
          </Button>
        )}
        {sort}
        {onClear && applied.length === 0 && (
          <button type="button" onClick={onClear} className={clearLinkClass}>
            Limpiar filtros
          </button>
        )}
        {(busy || count) && (
          <div className="ml-auto flex items-center gap-2">
            {busy && <span className="text-sm text-faint">Actualizando…</span>}
            {count && <span className="num text-sm text-faint">{count}</span>}
          </div>
        )}
      </div>

      {applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {applied.map((f) => (
            <span key={f.key} className="inline-flex h-9 items-center rounded-full border border-line-strong text-sm">
              {/* Un clic en el chip abre el panel para cambiarlo; la ✕ lo quita. */}
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="flex h-full items-center gap-1.5 rounded-l-full pr-2 pl-3 outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <span className="text-muted">{f.label}:</span>
                <span className="num font-medium text-ink">{valueLabel(f)}</span>
              </button>
              <button
                type="button"
                onClick={() => f.onChange(undefined)}
                className="flex h-full items-center rounded-r-full border-l border-line pr-2.5 pl-1.5 text-faint hover:bg-surface-2 hover:text-ink"
                aria-label={`Quitar filtro ${f.label}`}
                title={`Quitar filtro ${f.label}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {onClear && (
            <button type="button" onClick={onClear} className={clearLinkClass}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <FilterPanel open={panelOpen} onOpenChange={setPanelOpen} filters={filters} />
    </div>
  )
}

/**
 * Panel lateral con todos los filtros. Cada cambio se aplica al instante (la lista de atrás se actualiza), como en
 * Shopify: no hay que acordarse de pulsar "Aplicar".
 */
function FilterPanel({ open, onOpenChange, filters }: { open: boolean; onOpenChange: (open: boolean) => void; filters: FilterDef[] }) {
  const applied = filters.filter((f) => f.value !== undefined)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filtros"
      description="Los cambios se aplican al instante."
      footer={
        <>
          {applied.length > 0 && <Button onClick={() => applied.forEach((f) => f.onChange(undefined))}>Quitar todos</Button>}
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Listo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {filters.map((f) => (
          <fieldset key={f.key} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-muted">{f.label}</legend>
            {f.kind === 'select' ? (
              <div className="flex flex-col gap-1">
                {[{ value: undefined, label: 'Todos' }, ...f.options].map((o) => {
                  const checked = f.value === o.value
                  return (
                    <label
                      key={o.value ?? ''}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-base hover:bg-surface-2 ${checked ? 'bg-surface-2 font-medium' : ''}`}
                    >
                      <input type="radio" name={`filtro-${f.key}`} checked={checked} onChange={() => f.onChange(o.value)} className="size-4 accent-[var(--accent)]" />
                      {o.label}
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input type="date" className="num w-auto" value={f.value ?? ''} onChange={(e) => f.onChange(e.target.value || undefined)} aria-label={f.label} />
                {f.value && (
                  <Button size="sm" variant="ghost" onClick={() => f.onChange(undefined)}>
                    Quitar
                  </Button>
                )}
              </div>
            )}
          </fieldset>
        ))}
      </div>
    </Sheet>
  )
}
