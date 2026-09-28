import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatInt } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'
import { Button } from './button'
import { Input } from './field'

/**
 * Buscador de una lista. Avisa el texto 250 ms después de dejar de escribir.
 * El atajo "/" lo enfoca.
 */
export function SearchBox({ value, onSearch, placeholder }: { value?: string; onSearch: (value: string | undefined) => void; placeholder: string }) {
  const [term, setTerm] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Si la búsqueda cambia desde afuera (por ejemplo "Limpiar filtros"), el campo se actualiza.
  useEffect(() => {
    setTerm((current) => (current.trim() === (value ?? '') ? current : (value ?? '')))
  }, [value])

  useEffect(() => {
    const next = term.trim() || undefined
    if (next === value) return
    const t = setTimeout(() => onSearch(next), 250)
    return () => clearTimeout(t)
  }, [term, value, onSearch])

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
        aria-label={placeholder}
        title="Atajo: /"
      />
    </div>
  )
}

/** Pie de una lista paginada: "1–20 de 57" y botones de página. */
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  // Con una sola página el pie no aporta nada: el contador de la barra ya dice cuántos hay.
  if (total <= pageSize && page === 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const last = Math.max(1, Math.ceil(total / pageSize))
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted">
      <span className="num">
        {formatInt(from)}–{formatInt(to)} de {formatInt(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
          Anterior
        </Button>
        <span className="num px-2">
          {page} / {last}
        </span>
        <Button size="sm" variant="ghost" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Siguiente
          <ChevronRight />
        </Button>
      </div>
    </footer>
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

export function Loading({ text }: { text: string }) {
  return <div className="py-16 text-center text-base text-faint">{text}</div>
}
