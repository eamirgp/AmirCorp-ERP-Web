import * as Menu from '@radix-ui/react-dropdown-menu'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, PlusCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'

export interface Option<T extends string> {
  value: T
  label: string
}

const menuClass = 'z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-float'
const itemClass =
  'relative flex cursor-pointer items-center gap-2 rounded py-1.5 pr-8 pl-2 text-sm outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4'

/**
 * Filtro como chip, al estilo de Stripe o Linear.
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

/**
 * Filtro de fecha como chip: "Desde  28/09/2026 ✕". Usa el selector de fecha del navegador.
 * El valor es un día en formato yyyy-mm-dd.
 */
export function DateFilter({ label, value, onChange }: { label: string; value: string | undefined; onChange: (value: string | undefined) => void }) {
  return (
    <span
      className={`inline-flex h-9 items-center rounded-full border text-sm ${value ? 'border-line-strong' : 'border-dashed border-line-strong text-muted hover:border-ink/40'}`}
    >
      <label className="flex h-full cursor-pointer items-center gap-1.5 pr-2 pl-3">
        <span className={value ? 'text-muted' : ''}>{label}</span>
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="num bg-transparent text-ink outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50"
          aria-label={label}
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="flex h-full items-center rounded-r-full border-l border-line pr-2.5 pl-1.5 text-faint hover:bg-surface-2 hover:text-ink"
          aria-label={`Quitar filtro ${label}`}
        >
          <X className="size-3.5" />
        </button>
      )}
    </span>
  )
}

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
      <Menu.Trigger className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted outline-none hover:text-ink focus-visible:text-ink">
        <DirIcon className="size-4" />
        <span>
          Ordenar: <span className="text-ink">{current.label}</span>
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} className={menuClass}>
          <Menu.Label className="px-2 pt-1 pb-1.5 text-xs text-faint">Ordenar por</Menu.Label>
          <Menu.RadioGroup value={current.value} onValueChange={(v) => onChange(v as T, descending)}>
            {options.map((o) => (
              <Menu.RadioItem key={o.value} value={o.value} className={itemClass}>
                {o.label}
                <Menu.ItemIndicator className="absolute right-2">
                  <Check className="text-accent" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.RadioGroup value={descending ? 'desc' : 'asc'} onValueChange={(v) => onChange(current.value, v === 'desc')}>
            <Menu.RadioItem value="asc" className={itemClass}>
              <ArrowUpNarrowWide className="text-muted" />
              Ascendente
              <Menu.ItemIndicator className="absolute right-2">
                <Check className="text-accent" />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
            <Menu.RadioItem value="desc" className={itemClass}>
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
 * Barra de filtros de una lista:
 * [buscador] [chips de filtro] [Limpiar filtros] ········ [n resultados] [Vistas] [Ordenar]
 */
export function FilterBar({
  search,
  filters,
  onClear,
  count,
  views,
  sort,
  busy,
}: {
  search: ReactNode
  filters?: ReactNode
  /** Si se pasa, muestra "Limpiar filtros". Pásalo solo cuando haya filtros aplicados. */
  onClear?: () => void
  count?: string
  /** Menú de vistas guardadas de la pantalla. */
  views?: ReactNode
  sort?: ReactNode
  busy?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {search}
        {filters}
        {onClear && (
          <button type="button" onClick={onClear} className="px-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {busy && <span className="text-sm text-faint">Actualizando…</span>}
          {count && <span className="num text-sm text-faint">{count}</span>}
          {views}
          {sort}
        </div>
      </div>
    </div>
  )
}
