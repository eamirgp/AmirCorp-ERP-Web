import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { LogOut, Package, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { productListQuery } from '@/api/products'
import { Kbd } from '@/components/ui/misc'
import { formatPen } from '@/lib/format'
import { useHotkey } from '@/lib/hotkeys'
import { session } from '@/lib/session'
import { navGroups } from './nav'

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-base text-ink data-[selected=true]:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-faint data-[selected=true]:[&_svg]:text-accent'
const groupClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.07em] [&_[cmdk-group-heading]]:text-faint [&_[cmdk-group-heading]]:uppercase'

/** Paleta de comandos (Ctrl+K): ir a una pantalla, crear registros o buscar productos. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useHotkey('mod+k', () => onOpenChange(!open))

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const products = useQuery({
    ...productListQuery({ q: debounced, page: 1, pageSize: 5 }),
    enabled: open && debounced.length >= 2,
  })

  const run = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Buscar o ir a"
      overlayClassName="fixed inset-0 z-40 bg-overlay"
      contentClassName="fixed top-[14vh] left-1/2 z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-float animate-[pop-in_120ms_ease-out]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 text-faint" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Busca un producto por código o nombre, o escribe una acción…"
          className="h-13 w-full bg-transparent text-md text-ink placeholder:text-faint focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>

      <Command.List className="max-h-[52vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted">
          {products.isFetching ? 'Buscando…' : 'Sin resultados.'}
        </Command.Empty>

        {products.data && products.data.items.length > 0 && (
          <Command.Group heading="Productos" className={groupClass}>
            {products.data.items.map((p) => (
              <Command.Item
                key={p.id}
                value={`${p.code} ${p.name}`}
                className={itemClass}
                onSelect={() => run(() => navigate({ to: '/productos', search: { q: p.code, editar: p.id } }))}
              >
                <Package />
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{p.code}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="num text-xs text-muted">{formatPen(Number(p.salePrice))}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Crear" className={groupClass}>
          <Command.Item value="nueva compra registrar factura proveedor" className={itemClass} onSelect={() => run(() => navigate({ to: '/compras/nueva' }))}>
            <Plus />
            Nueva compra
          </Command.Item>
          <Command.Item value="nuevo producto crear" className={itemClass} onSelect={() => run(() => navigate({ to: '/productos', search: { nuevo: true } }))}>
            <Plus />
            Nuevo producto
          </Command.Item>
          <Command.Item value="nuevo cliente proveedor crear" className={itemClass} onSelect={() => run(() => navigate({ to: '/socios', search: { nuevo: true } }))}>
            <Plus />
            Nuevo cliente o proveedor
          </Command.Item>
          <Command.Item value="nueva empresa ruc crear" className={itemClass} onSelect={() => run(() => navigate({ to: '/empresas', search: { nuevo: true } }))}>
            <Plus />
            Nueva empresa
          </Command.Item>
          <Command.Item value="nuevo usuario crear" className={itemClass} onSelect={() => run(() => navigate({ to: '/usuarios', search: { nuevo: true } }))}>
            <Plus />
            Nuevo usuario
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Ir a" className={groupClass}>
          {navGroups
            .flatMap((g) => g.items)
            .filter((i) => i.to)
            .map((i) => (
              <Command.Item key={i.label} value={`ir a ${i.label}`} className={itemClass} onSelect={() => run(() => navigate({ to: i.to! }))}>
                <i.icon />
                {i.label}
              </Command.Item>
            ))}
        </Command.Group>

        <Command.Group heading="Cuenta" className={groupClass}>
          <Command.Item value="cerrar sesión salir" className={itemClass} onSelect={() => run(() => session.end())}>
            <LogOut />
            Cerrar sesión
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
