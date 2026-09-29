import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Input } from './field'

/** Alto máximo de la lista de resultados (px), el de max-h-72. */
const LIST_MAX_HEIGHT = 288

/** Zona visible donde cabe la lista: el contenedor con scroll más cercano o, si no hay, la ventana. */
function clippingArea(el: HTMLElement): { top: number; bottom: number } {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY, overflowX } = getComputedStyle(node)
    if (overflowY !== 'visible' || overflowX !== 'visible') {
      const r = node.getBoundingClientRect()
      return { top: Math.max(r.top, 0), bottom: Math.min(r.bottom, window.innerHeight) }
    }
  }
  return { top: 0, bottom: window.innerHeight }
}

/**
 * Campo para elegir un registro buscándolo en la API (proveedor, producto...).
 * Escribe para buscar, ↑/↓ para moverte, Enter para elegir, Esc para cerrar.
 */
export function SearchSelect<T>({
  id,
  value,
  onChange,
  queryKey,
  fetchItems,
  itemKey,
  itemLabel,
  renderItem,
  placeholder,
  autoFocus,
  ...aria
}: {
  id?: string
  value: T | null
  onChange: (value: T | null) => void
  /** Raíz de las claves del recurso ('products', 'partners'): al guardar o desactivar uno, la búsqueda también se refresca. */
  queryKey: string
  fetchItems: (term: string) => Promise<T[]>
  itemKey: (item: T) => string
  itemLabel: (item: T) => string
  renderItem?: (item: T) => ReactNode
  placeholder?: string
  autoFocus?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 200)
    return () => clearTimeout(t)
  }, [term])

  const results = useQuery({
    queryKey: [queryKey, 'search', debounced],
    queryFn: () => fetchItems(debounced),
    enabled: open,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
  const items = results.data ?? []

  useEffect(() => setActive(0), [debounced])

  // Dentro de un contenedor con scroll (un diálogo, una tabla) la lista se cortaría en el borde: si abajo
  // no hay espacio, se abre hacia arriba, y su alto se ajusta al espacio que queda.
  const wrapper = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<{ up: boolean; maxHeight: number }>({ up: false, maxHeight: LIST_MAX_HEIGHT })
  useLayoutEffect(() => {
    if (!open || !wrapper.current) return
    const box = wrapper.current.getBoundingClientRect()
    const area = clippingArea(wrapper.current)
    const below = area.bottom - box.bottom - 8
    const above = box.top - area.top - 8
    const up = below < LIST_MAX_HEIGHT && above > below
    setPlacement({ up, maxHeight: Math.max(120, Math.min(LIST_MAX_HEIGHT, up ? above : below)) })
  }, [open])

  const choose = (item: T) => {
    onChange(item)
    setOpen(false)
    setTerm('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter' && open) {
      if (items[active]) choose(items[active])
    } else if (e.key === 'Escape' && open) setOpen(false)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div ref={wrapper} className="relative min-w-0">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'Buscar…'}
        value={open ? term : value ? itemLabel(value) : ''}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        {...aria}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          style={{ maxHeight: placement.maxHeight }}
          className={`absolute right-0 left-0 z-40 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-float ${placement.up ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {items.length === 0 ? (
            <li className="px-2.5 py-2 text-sm text-faint">{results.isFetching ? 'Buscando…' : 'Sin resultados.'}</li>
          ) : (
            items.map((item, i) => (
              <li
                key={itemKey(item)}
                role="option"
                aria-selected={i === active}
                // mousedown en vez de click: se elige antes de que el campo pierda el foco.
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(item)
                }}
                onMouseEnter={() => setActive(i)}
                className="cursor-pointer rounded px-2.5 py-2 text-sm aria-selected:bg-surface-2"
              >
                {renderItem ? renderItem(item) : itemLabel(item)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
