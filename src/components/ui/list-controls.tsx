import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw, Search, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { errorMessages } from '@/api/client'
import { formatInt } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'
import { useDebounced } from '@/lib/use-debounced'
import { Button } from './button'
import { Input, Select } from './field'

/**
 * Buscador de una lista. Avisa el texto 250 ms después de dejar de escribir.
 * El atajo "/" lo enfoca. El placeholder es corto ("Buscar productos") para que se lea completo; en qué campos
 * busca va en `hint`, que aparece al pasar el mouse y lo leen los lectores de pantalla.
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
    <div className="relative w-full min-w-0 sm:w-72 sm:flex-none">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
      <Input
        ref={inputRef}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={hint ? `${placeholder}: ${hint}` : placeholder}
        title={hint ? `${hint}. Atajo: /` : 'Atajo: /'}
      />
    </div>
  )
}

/**
 * Tarjeta blanca que contiene una lista completa (pestañas de vistas, filtros, tabla y pie), sobre el fondo gris
 * de la página, al estilo de Stripe o Shopify: la tabla se distingue del resto de la pantalla.
 */
export function ListPanel({ children }: { children: ReactNode }) {
  return <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">{children}</section>
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
}

/**
 * Pie de una lista paginada: "1–20 de 57", filas por página y botones para ir a la primera, anterior,
 * siguiente y última página.
 * Todo sale de la respuesta de la API: la pantalla no calcula páginas ni rangos.
 */
export function Pagination({ info, onPage, onPageSize }: { info: PageInfo | undefined; onPage: (page: number) => void; onPageSize: (size: number) => void }) {
  if (!info || info.totalCount === 0) return null
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span className="num">
        {formatInt(info.from)}–{formatInt(info.to)} de {formatInt(info.totalCount)}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 whitespace-nowrap">
          Filas por página
          <Select className="num w-auto" value={info.pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
            {info.pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
        {info.totalPages > 1 && (
          // Solo íconos, como en Shopify o Stripe: las flechas de página se reconocen sin texto. El nombre sale al
          // pasar el mouse y lo leen los lectores de pantalla.
          <div className="flex items-center gap-1.5">
            <PageButton label="Primera página" disabled={!info.hasPreviousPage} onClick={() => onPage(1)}>
              <ChevronsLeft />
            </PageButton>
            <PageButton label="Página anterior" disabled={!info.hasPreviousPage} onClick={() => onPage(info.page - 1)}>
              <ChevronLeft />
            </PageButton>
            <span className="num px-2 whitespace-nowrap">
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
    <Button size="sm" className="w-9 px-0 [&_svg]:size-5" disabled={disabled} onClick={onClick} aria-label={label} title={label}>
      {children}
    </Button>
  )
}

/** Mensaje cuando una lista no tiene registros. */
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title?: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-20 text-center">
      <span className="text-faint [&_svg]:size-6">{icon}</span>
      {title && <p className="font-display text-lg font-semibold">{title}</p>}
      <p className="max-w-sm text-base text-muted">{text}</p>
      {action}
    </div>
  )
}

/** La lista no se pudo cargar (sin conexión, error del servidor): el mensaje y "Reintentar", como en una pantalla. */
export function ListError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-16 text-center">
      <TriangleAlert className="size-6 text-bad" strokeWidth={1.5} />
      {errorMessages(error).map((m) => (
        <p key={m} className="max-w-md text-base text-muted">
          {m}
        </p>
      ))}
      <Button variant="primary" onClick={onRetry}>
        <RotateCw />
        Reintentar
      </Button>
    </div>
  )
}

export function Loading({ text }: { text: string }) {
  return <div className="py-16 text-center text-base text-faint">{text}</div>
}
