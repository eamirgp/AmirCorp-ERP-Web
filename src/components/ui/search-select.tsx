import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Input } from './field'

/** Alto máximo de la lista de resultados (px), el de max-h-72. */
const LIST_MAX_HEIGHT = 288

/**
 * Elemento respecto al cual se ubica un `position: fixed`: el ancestro más cercano con transform (por ejemplo el
 * diálogo, que se centra con translate) o, si no hay, la ventana (null).
 */
function fixedOrigin(el: HTMLElement): DOMRect | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const s = getComputedStyle(node)
    if (s.transform !== 'none' || s.translate !== 'none' || s.filter !== 'none' || s.perspective !== 'none' || /paint|layout|strict|content/.test(s.contain))
      return node.getBoundingClientRect()
  }
  return null
}

interface Placement {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

/**
 * Posición de la lista junto al campo. Va con `position: fixed` para que ningún contenedor con scroll (el cuerpo
 * de un diálogo, una tabla ancha) la corte. Si abajo no cabe, se abre hacia arriba.
 */
function placeList(field: HTMLElement): Placement {
  const box = field.getBoundingClientRect()
  const origin = fixedOrigin(field)
  const below = window.innerHeight - box.bottom - 12
  const above = box.top - 12
  const up = below < LIST_MAX_HEIGHT && above > below
  const maxHeight = Math.max(120, Math.min(LIST_MAX_HEIGHT, up ? above : below))
  const left = box.left - (origin?.left ?? 0)
  return up
    ? { left, width: box.width, bottom: (origin?.bottom ?? window.innerHeight) - box.top + 4, maxHeight }
    : { left, width: box.width, top: box.bottom - (origin?.top ?? 0) + 4, maxHeight }
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
  scope,
  fetchItems,
  itemKey,
  itemLabel,
  renderItem,
  isItemDisabled,
  emptyText,
  onTermChange,
  onSubmitTerm,
  createOption,
  placeholder,
  autoFocus,
  ...aria
}: {
  id?: string
  value: T | null
  onChange: (value: T | null) => void
  /** Raíz de las claves del recurso ('products', 'partners'): al guardar o desactivar uno, la búsqueda también se refresca. */
  queryKey: string
  /** Lo que cambia los resultados además del texto (por ejemplo, el proveedor de la compra). */
  scope?: string
  fetchItems: (term: string) => Promise<T[]>
  itemKey: (item: T) => string
  itemLabel: (item: T) => string
  renderItem?: (item: T) => ReactNode
  /** Resultados que se muestran pero no se pueden elegir (por ejemplo, un proveedor con compras bloqueadas). */
  isItemDisabled?: (item: T) => boolean
  /** Qué decir cuando nada coincide con lo escrito (por defecto, "Sin resultados."). */
  emptyText?: (term: string) => ReactNode
  /** Avisa lo que se va escribiendo, para acciones fuera del campo (por ejemplo, un botón "SUNAT"). */
  onTermChange?: (term: string) => void
  /** Enter cuando no hay ningún resultado para elegir: qué hacer con lo escrito. */
  onSubmitTerm?: (term: string) => void
  /**
   * Última opción de la lista para crear un registro nuevo con lo escrito ("Crear producto nuevo con código X").
   * Aparece siempre que hay texto, también con resultados: lo escrito puede parecerse a otros sin ser ninguno.
   * Con Enter se elige si no hay ningún resultado.
   */
  createOption?: { label: (term: string) => ReactNode; onSelect: (term: string) => void }
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
    queryKey: [queryKey, 'search', scope ?? '', debounced],
    queryFn: () => fetchItems(debounced),
    enabled: open,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
  const items = results.data ?? []

  useEffect(() => setActive(0), [debounced])

  // La lista sigue al campo mientras está abierta, aunque se haga scroll o cambie el tamaño de la ventana.
  const wrapper = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  useLayoutEffect(() => {
    if (!open || !wrapper.current) return
    const field = wrapper.current
    const update = () => setPlacement(placeList(field))
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const writeTerm = (text: string) => {
    setTerm(text)
    onTermChange?.(text)
  }

  const choose = (item: T) => {
    if (isItemDisabled?.(item)) return
    onChange(item)
    setOpen(false)
    writeTerm('')
  }

  const create = () => {
    const text = term.trim()
    if (!text || !createOption) return
    setOpen(false)
    writeTerm('')
    createOption.onSelect(text)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter' && open) {
      if (items[active]) choose(items[active])
      else if (!results.isFetching && term.trim()) {
        if (createOption) create()
        else onSubmitTerm?.(term.trim())
      }
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
          writeTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        {...aria}
      />
      {open && placement && (
        <ul
          id={listId}
          role="listbox"
          style={placement}
          className="fixed z-50 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-float"
        >
          {items.length === 0 ? (
            <li className="px-2.5 py-2 text-sm text-faint">{results.isFetching ? 'Buscando…' : (emptyText?.(debounced) ?? 'Sin resultados.')}</li>
          ) : (
            items.map((item, i) => (
              <li
                key={itemKey(item)}
                role="option"
                aria-selected={i === active}
                aria-disabled={isItemDisabled?.(item) || undefined}
                // mousedown en vez de click: se elige antes de que el campo pierda el foco.
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(item)
                }}
                onMouseEnter={() => setActive(i)}
                className="cursor-pointer rounded px-2.5 py-2 text-sm aria-selected:bg-surface-2 aria-disabled:cursor-not-allowed aria-disabled:text-faint"
              >
                {renderItem ? renderItem(item) : itemLabel(item)}
              </li>
            ))
          )}
          {createOption && term.trim() && !results.isFetching && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                create()
              }}
              className="mt-1 cursor-pointer rounded border-t border-line px-2.5 py-2 text-sm font-medium hover:bg-surface-2"
            >
              {createOption.label(term.trim())}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
