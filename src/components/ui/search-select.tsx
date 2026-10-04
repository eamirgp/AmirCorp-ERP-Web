import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useDebounced } from '@/lib/use-debounced'
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
  extraOptions,
  placeholder,
  autoFocus,
  disabled,
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
   * Opciones al final de la lista que actúan sobre lo escrito ("Crear producto nuevo con código X"). Se calculan con
   * lo escrito y los resultados (una lista vacía las oculta), y se alcanzan con las flechas como un resultado más.
   * Con Enter se elige la primera si no hay ningún resultado.
   */
  extraOptions?: (term: string, items: T[]) => { key: string; label: ReactNode; onSelect: (term: string) => void }[]
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const debounced = useDebounced(term.trim(), 200)
  const [active, setActive] = useState(0)

  const results = useQuery({
    queryKey: [queryKey, 'search', scope ?? '', debounced],
    queryFn: () => fetchItems(debounced),
    enabled: open,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
  const items = results.data ?? []
  // Mientras llega la búsqueda de lo último escrito, la lista muestra la anterior: Enter no debe elegir de ahí.
  const upToDate = debounced === term.trim() && !results.isFetching && !results.isPlaceholderData
  // Las opciones extra van al final y se alcanzan con las flechas, como un resultado más.
  const extras = extraOptions && term.trim() && upToDate ? extraOptions(term.trim(), items) : []
  const lastIndex = items.length - 1 + extras.length

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

  const runExtra = (option: (typeof extras)[number]) => {
    const text = term.trim()
    setOpen(false)
    writeTerm('')
    option.onSelect(text)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(lastIndex, 0)))
    } else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter' && open) {
      if (!upToDate) {
        // Todavía no llegan los resultados de lo escrito: no se elige nada (Enter tampoco envía el formulario).
      } else if (items[active]) choose(items[active])
      else if (extras[active - items.length]) runExtra(extras[active - items.length])
      else if (term.trim()) onSubmitTerm?.(term.trim())
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
        disabled={disabled}
        placeholder={placeholder ?? 'Buscar…'}
        value={open ? term : value ? itemLabel(value) : ''}
        onChange={(e) => {
          writeTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Al salir sin elegir, lo escrito se descarta: el campo vuelve a mostrar lo elegido y ningún botón
        // (como SUNAT) puede actuar sobre un texto que ya no se ve.
        onBlur={() => {
          setOpen(false)
          writeTerm('')
        }}
        onKeyDown={onKeyDown}
        {...aria}
      />
      {open && placement && (
        <ul
          id={listId}
          role="listbox"
          style={placement}
          // El mismo vidrio de los menús.
          className="animate-menu-open fixed z-50 origin-top overflow-y-auto rounded-[14px] bg-glass-menu p-1.5 text-fg shadow-menu backdrop-blur-[30px] backdrop-saturate-[1.8]"
        >
          {items.length === 0 ? (
            <li className="px-2.5 py-2 text-sm text-fg-muted">{results.isFetching ? 'Buscando…' : (emptyText?.(debounced) ?? 'Sin resultados.')}</li>
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
                // La opción activa en el color de acento con letra blanca, como los menús de la Mac (también lo de adentro: documento, avisos).
                className="cursor-pointer rounded-lg px-2.5 py-2 text-sm aria-selected:bg-selected aria-selected:text-selected-ink aria-selected:[&_*]:!text-selected-ink aria-disabled:cursor-not-allowed aria-disabled:text-disabled aria-selected:aria-disabled:bg-hover aria-selected:aria-disabled:text-disabled"
              >
                {renderItem ? renderItem(item) : itemLabel(item)}
              </li>
            ))
          )}
          {extras.map((option, k) => (
            <li
              key={option.key}
              role="option"
              aria-selected={active === items.length + k}
              onMouseDown={(e) => {
                e.preventDefault()
                runExtra(option)
              }}
              onMouseEnter={() => setActive(items.length + k)}
              className={`cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium aria-selected:bg-selected aria-selected:text-selected-ink ${k === 0 ? 'mt-1 border-t border-hairline' : ''}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
