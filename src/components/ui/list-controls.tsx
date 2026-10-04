import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { errorMessages } from '@/api/client'
import { formatInt } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'
import { useDebounced } from '@/lib/use-debounced'
import { Button, Spinner } from './button'
import { Select } from './field'

/**
 * Buscador de una lista: una cápsula gris con lupa (HIG "Search fields"). Avisa el texto 250 ms después de dejar de
 * escribir, así la lista se refina mientras se escribe. El atajo "/" lo enfoca. El texto de ejemplo es corto
 * ("Buscar productos") para que se lea completo; en qué campos busca va en `hint`, que aparece al pasar el mouse y lo
 * leen los lectores de pantalla.
 */
export function SearchBox({
  value,
  onSearch,
  placeholder,
  hint,
}: {
  value?: string
  onSearch: (value: string | undefined) => void
  placeholder: string
  hint?: string
}) {
  const [term, setTerm] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  // Lo último que este campo envió. Cuando la lista lo recibe, no se toca el campo: el usuario pudo seguir escribiendo
  // mientras tanto, y reemplazarlo le borraría letras.
  const sent = useRef(value)

  // Si la búsqueda cambia desde afuera (por ejemplo "Limpiar filtros" o una vista guardada), el campo se actualiza.
  useEffect(() => {
    if (value === sent.current) return
    sent.current = value
    setTerm(value ?? '')
  }, [value])

  const debounced = useDebounced(term.trim() || undefined, 250)
  useEffect(() => {
    if (debounced === sent.current) return
    sent.current = debounced
    onSearch(debounced)
  }, [debounced, onSearch])

  useHotkey('/', () => inputRef.current?.focus())

  return (
    // En celular ocupa toda la fila; en pantallas grandes, un ancho fijo junto a los filtros.
    <label
      className="flex h-9 w-full min-w-0 items-center gap-2 rounded-full bg-muted-fill px-3 text-fg-muted transition-[background-color,box-shadow] duration-200 ease-apple focus-within:bg-field focus-within:shadow-[0_0_0_1px_var(--fg),var(--focus-ring)] sm:w-72 sm:flex-none"
      title={hint ? `${hint}. Atajo: /` : 'Atajo: /'}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted [&::-webkit-search-cancel-button]:cursor-pointer"
        aria-label={hint ? `${placeholder}: ${hint}` : placeholder}
      />
    </label>
  )
}

/**
 * Una lista completa (vistas, filtros, tabla y pie) sin tarjeta alrededor: en el estilo Apple la página es blanca y la
 * tabla se distingue por sus franjas.
 */
export function ListPanel({ children }: { children: ReactNode }) {
  return <section className="flex min-w-0 flex-col gap-3">{children}</section>
}

/** Datos de paginación que devuelve la API en cada lista paginada. */
export interface PageInfo {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  from: number
  to: number
  pageSizeOptions: number[]
  /** Filas por página cuando no se elige otra cantidad (lo dice la API). */
  defaultPageSize: number
}

/**
 * Pie de una lista paginada: "1–20 de 57", filas por página y botones redondos para ir a la primera, anterior,
 * siguiente y última página.
 * Todo sale de la respuesta de la API: la pantalla no calcula páginas ni rangos.
 * Volver a la cantidad por defecto avisa `undefined`: así no queda "filas=10" en la URL y la lista se reconoce igual a
 * la que abre normalmente o a su vista guardada.
 */
export function Pagination({
  info,
  onPage,
  onPageSize,
}: {
  info: PageInfo | undefined
  onPage: (page: number) => void
  onPageSize: (size: number | undefined) => void
}) {
  if (!info || info.totalCount === 0) return null
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-1 pl-4 text-sm text-fg-muted">
      <span className="num">
        {formatInt(info.from)}–{formatInt(info.to)} de {formatInt(info.totalCount)}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span aria-hidden>Filas por página</span>
          <Select popup aria-label="Filas por página" className="num" value={info.pageSize} onChange={(e) => {
              const size = Number(e.target.value)
              onPageSize(size === info.defaultPageSize ? undefined : size)
            }}>
            {info.pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
        {info.totalPages > 1 && (
          // Solo íconos: las flechas de página se reconocen sin texto. El nombre sale al pasar el mouse y lo leen los
          // lectores de pantalla.
          <div className="flex items-center gap-1">
            <PageButton label="Primera página" disabled={!info.hasPreviousPage} onClick={() => onPage(1)}>
              <ChevronsLeft />
            </PageButton>
            <PageButton label="Página anterior" disabled={!info.hasPreviousPage} onClick={() => onPage(info.page - 1)}>
              <ChevronLeft />
            </PageButton>
            <span className="num min-w-14 text-center whitespace-nowrap text-fg">
              {info.page} / {info.totalPages}
            </span>
            <PageButton label="Página siguiente" disabled={!info.hasNextPage} onClick={() => onPage(info.page + 1)}>
              <ChevronRight />
            </PageButton>
            <PageButton label="Última página" disabled={!info.hasNextPage} onClick={() => onPage(info.totalPages)}>
              <ChevronsRight />
            </PageButton>
          </div>
        )}
      </div>
    </footer>
  )
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button size="icon" disabled={disabled} onClick={onClick} aria-label={label} title={label}>
      {children}
    </Button>
  )
}

/** Mensaje cuando una lista no tiene registros: un ícono en un círculo gris, el título y qué hacer. */
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title?: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 border-t border-rule px-6 py-16 text-center">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-muted-fill text-fg-muted [&_svg]:size-[26px]">
        {icon}
      </span>
      {title && <p className="text-lg font-semibold text-fg">{title}</p>}
      <p className="max-w-sm text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

/** La lista no se pudo cargar (sin conexión, error del servidor): el mensaje y "Reintentar", como en una pantalla. */
export function ListError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2.5 border-t border-rule px-6 py-16 text-center">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-bad-soft text-bad">
        <TriangleAlert className="size-[26px]" strokeWidth={1.75} />
      </span>
      {errorMessages(error).map((m) => (
        <p key={m} className="max-w-md text-sm text-fg-muted">
          {m}
        </p>
      ))}
      <Button variant="primary" size="sm" className="mt-1" onClick={onRetry}>
        <RotateCw />
        Reintentar
      </Button>
    </div>
  )
}

/** Mientras carga: el círculo que gira y qué se está cargando. */
export function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 border-t border-rule py-16 text-sm text-fg-muted">
      <Spinner className="size-[18px] text-disabled" />
      {text}
    </div>
  )
}

/**
 * Cuerpo de una lista, en el orden de siempre: el error con "Reintentar", "Cargando…", las filas o el mensaje de
 * lista vacía. Si no hay filas y hay filtros (o la lista no tiene un estado inicial propio, como Usuarios), dice que
 * nada coincide, con una lupa; "Limpiar filtros" ya está en la barra de filtros y no se repite. Si no, muestra el
 * estado inicial con su ícono y su acción (por ejemplo, crear el primero).
 */
export function ListBody<T>({
  query,
  rows,
  loading,
  icon,
  filtered = false,
  noMatch,
  empty,
  children,
}: {
  /** La consulta de la lista: si falló, su error y cómo reintentar. */
  query: { isError: boolean; error: unknown; refetch: () => unknown }
  /** Las filas que llegaron; `undefined` mientras la lista carga. */
  rows: T[] | undefined
  /** Texto mientras carga ("Cargando productos…"). */
  loading: string
  icon: ReactNode
  /** Si hay búsqueda o filtros aplicados. */
  filtered?: boolean
  /** Texto cuando nada coincide con la búsqueda o los filtros. */
  noMatch: string
  /** Estado inicial, cuando todavía no hay registros. Sin él, una lista vacía siempre dice que nada coincide. */
  empty?: { title: string; text: string; action?: ReactNode }
  children: (rows: T[]) => ReactNode
}) {
  if (query.isError) return <ListError error={query.error} onRetry={() => void query.refetch()} />
  if (!rows) return <Loading text={loading} />
  if (rows.length > 0) return children(rows)
  if (filtered || !empty) return <EmptyState icon={<SearchX strokeWidth={1.75} />} text={noMatch} />
  return <EmptyState icon={icon} title={empty.title} text={empty.text} action={empty.action} />
}
