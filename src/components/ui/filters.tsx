import * as Menu from '@radix-ui/react-dropdown-menu'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Option } from '@/lib/filters'
import { formatDate } from '@/lib/format'
import { Button } from './button'
import { glassItemClass, glassMenuClass, useClickMenu } from './menu'
import { Input } from './field'
import { Sheet } from './sheet'

export type { Option }

/** Botón gris en píldora que abre un menú (HIG "Pop-up buttons"): "Filtros", "Ordenar: Nombre". */
const popupClass =
  'press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-fill pr-3 pl-3.5 text-sm text-fg outline-none hover:bg-fill-hover focus-visible:shadow-focus data-[state=open]:bg-fill-hover [&_svg]:size-4'
const checkClass = 'absolute right-2.5 [&_svg]:text-link'

/** Ficha de un filtro aplicado (HIG "Search fields": tokens): "Estado: Activos ✕". */
function Token({ label, value, onOpen, onRemove }: { label: string; value: ReactNode; onOpen?: () => void; onRemove: () => void }) {
  return (
    <span className="inline-flex h-[30px] items-center rounded-full bg-accent-soft text-sm text-fg">
      <button type="button" onClick={onOpen} className="flex h-full items-center gap-1 rounded-l-full pr-1 pl-3 outline-none focus-visible:shadow-focus">
        {label}: <span className="num font-semibold">{value}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="press mr-1 flex size-[22px] items-center justify-center rounded-full text-link hover:bg-[rgb(42_116_69/0.12)]"
        aria-label={`Quitar filtro ${label}`}
        title={`Quitar filtro ${label}`}
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </button>
    </span>
  )
}

// Al elegir una opción el menú sigue abierto: se elige el campo y la dirección de una vez, y la lista de atrás
// se reordena al instante. Se cierra con un clic afuera o con Esc.
const keepOpen = (e: Event) => e.preventDefault()

/**
 * Menú "Ordenar": campo y dirección. Las opciones son las que la API permite ordenar. Las columnas de la tabla también
 * ordenan con un clic en su título; el menú queda para lo que no es una columna (por ejemplo, la fecha de creación).
 */
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
  const menu = useClickMenu()

  return (
    <Menu.Root {...menu.root}>
      <Menu.Trigger className={popupClass} {...menu.trigger}>
        <span>
          Ordenar: <span className="font-semibold">{current.label}</span>
        </span>
        <ChevronDown className="text-fg-muted" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content {...menu.content} align="start" sideOffset={6} className={glassMenuClass}>
          <Menu.Label className="px-2.5 pt-1 pb-1.5 text-xs text-fg-muted">Ordenar por</Menu.Label>
          <Menu.RadioGroup value={current.value} onValueChange={(v) => onChange(v as T, descending)}>
            {options.map((o) => (
              <Menu.RadioItem key={o.value} value={o.value} className={`${glassItemClass} pr-9`} onSelect={keepOpen}>
                {o.label}
                <Menu.ItemIndicator className={checkClass}>
                  <Check />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="mx-2 my-1.5 h-px bg-hairline" />
          <Menu.RadioGroup value={descending ? 'desc' : 'asc'} onValueChange={(v) => onChange(current.value, v === 'desc')}>
            <Menu.RadioItem value="asc" className={`${glassItemClass} pr-9`} onSelect={keepOpen}>
              <ArrowUpNarrowWide className="text-fg-muted" />
              Ascendente
              <Menu.ItemIndicator className={checkClass}>
                <Check />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
            <Menu.RadioItem value="desc" className={`${glassItemClass} pr-9`} onSelect={keepOpen}>
              <ArrowDownWideNarrow className="text-fg-muted" />
              Descendente
              <Menu.ItemIndicator className={checkClass}>
                <Check />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

/**
 * Un filtro de la lista. La pantalla solo lo describe; la barra lo muestra en el panel y como ficha.
 * - `select`: una opción de una lista (estado, rol, módulo…).
 * - `date`: un día (yyyy-mm-dd), con el selector de fecha del navegador.
 */
export type FilterDef =
  | { kind: 'select'; key: string; label: string; options: Option<string>[]; value: string | undefined; onChange: (value: string | undefined) => void }
  | { kind: 'date'; key: string; label: string; value: string | undefined; onChange: (value: string | undefined) => void }

/** Texto del valor aplicado, para la ficha: "Activos", "28/09/2026". */
function valueLabel(f: FilterDef) {
  if (f.value === undefined) return undefined
  return f.kind === 'date' ? formatDate(f.value) : (f.options.find((o) => o.value === f.value)?.label ?? f.value)
}

/**
 * Barra de filtros de una lista:
 *   [buscador] [Filtros 2] [Ordenar: Nombre ⌄] [Limpiar filtros] ········ [Actualizando…] [n resultados]
 *   Estado: Activos ✕   Desde: 28/09/2026 ✕   Limpiar filtros        ← solo si hay filtros aplicados
 * Todos los filtros viven en un panel lateral que abre "Filtros": la barra se ve igual con 1 o con 10.
 * Debajo solo aparece lo aplicado, como fichas, para ver siempre qué filtra la lista y quitarlo con un clic.
 * Las vistas guardadas van arriba, como control segmentado (ViewTabs). En las listas paginadas el total va en el pie.
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
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {search}
        {filters.length > 0 && (
          <button type="button" className={popupClass} onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal className="text-fg-muted" />
            Filtros
            {applied.length > 0 && (
              <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pill px-1.5 text-label font-semibold text-pill-ink">{applied.length}</span>
            )}
          </button>
        )}
        {sort}
        {onClear && applied.length === 0 && (
          <Button size="sm" variant="ghost" onClick={onClear}>
            Limpiar filtros
          </Button>
        )}
        {(busy || count) && (
          <div className="ml-auto flex items-center gap-2 text-sm text-fg-muted">
            {busy && <span>Actualizando…</span>}
            {count && <span className="num">{count}</span>}
          </div>
        )}
      </div>

      {applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Un clic en la ficha abre el panel para cambiarla; la ✕ la quita. */}
          {applied.map((f) => (
            <Token key={f.key} label={f.label} value={valueLabel(f)} onOpen={() => setPanelOpen(true)} onRemove={() => f.onChange(undefined)} />
          ))}
          {onClear && (
            <Button size="sm" variant="ghost" onClick={onClear}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      <FilterPanel open={panelOpen} onOpenChange={setPanelOpen} filters={filters} />
    </div>
  )
}

/**
 * Panel lateral con todos los filtros. Cada cambio se aplica al instante (la lista de atrás se actualiza): no hay que
 * acordarse de pulsar "Aplicar". Cada opción es una fila con una marca, como las listas de opciones de Apple.
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
          {applied.length > 0 && (
            <Button variant="ghost" onClick={() => applied.forEach((f) => f.onChange(undefined))}>
              Quitar todos
            </Button>
          )}
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Listo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {filters.map((f) => (
          <fieldset key={f.key} className="flex flex-col">
            <legend className="mb-2 px-1 text-xs font-semibold text-fg-muted">{f.label}</legend>
            {f.kind === 'select' ? (
              <div className="flex flex-col gap-0.5">
                {[{ value: undefined, label: 'Todos' }, ...f.options].map((o) => {
                  const checked = f.value === o.value
                  return (
                    <label
                      key={o.value ?? ''}
                      className={`flex h-10 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 text-base transition-colors hover:bg-hover has-[:focus-visible]:shadow-focus ${checked ? 'bg-page font-semibold shadow-[0_1px_3px_rgb(0_0_0/0.08)]' : ''}`}
                    >
                      <input type="radio" name={`filtro-${f.key}`} checked={checked} onChange={() => f.onChange(o.value)} className="sr-only" />
                      {o.label}
                      {checked && <Check className="size-[18px] text-link" aria-hidden />}
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
