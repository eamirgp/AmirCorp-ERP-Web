import * as Sheet from '@radix-ui/react-dialog'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, LogOut, Menu as MenuIcon, Monitor, Moon, Search, Sun, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { meQuery } from '@/api/account'
import { brand } from '@/brand'
import { Logo, LogoMark } from '@/brand/logo'
import { modKey } from '@/lib/hotkeys'
import { session } from '@/lib/session'
import { getTheme, setTheme, type ThemeChoice } from '@/lib/theme'
import { CommandPalette } from './command-palette'
import { navGroups } from './nav'

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Cierra la sesión justo cuando vence el token, sin esperar a que falle una petición.
  useEffect(() => {
    const t = setTimeout(() => session.end(), session.msUntilExpiry)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[252px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-bg px-4 sm:px-8">
          <MobileNav />
          <Link to="/" className="flex items-center lg:hidden" aria-label={`${brand.name}, inicio`}>
            <LogoMark height={30} />
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex min-w-0 items-center gap-2.5 text-base text-faint transition-colors hover:text-ink"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Buscar o ir a…</span>
            <span className="hidden text-xs sm:inline">{modKey} K</span>
          </button>
          <div className="flex-1" />
          <UserMenu />
        </header>
        <main className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-col gap-6 px-4 py-8 sm:px-8">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

/** Lista de módulos: la usan el menú lateral y el menú del celular. */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6" aria-label="Módulos">
      {navGroups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-px">
          {group.label && <div className="label-caps px-2 pb-2">{group.label}</div>}
          {group.items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                onClick={onNavigate}
                activeOptions={{ exact: item.to === '/' }}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-base text-muted transition-colors hover:text-ink data-[status=active]:bg-surface-2 data-[status=active]:font-medium data-[status=active]:text-ink [&[data-status=active]_svg]:text-accent"
              >
                <item.icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className="flex cursor-default items-center gap-2.5 px-2 py-1.5 text-base text-faint/70" title="Módulo en desarrollo">
                <item.icon className="size-4" strokeWidth={1.75} />
                {item.label}
                <span className="ml-auto text-2xs">pronto</span>
              </span>
            ),
          )}
        </div>
      ))}
    </nav>
  )
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-8 overflow-y-auto border-r border-line px-4 py-5 lg:flex">
      <Link to="/" className="flex h-9 items-center px-2" aria-label={`${brand.name}, inicio`}>
        <Logo size={21} />
      </Link>
      <NavList />
    </aside>
  )
}

/** Menú del celular: el mismo menú lateral, abierto como panel desde el botón ☰. */
function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet.Root open={open} onOpenChange={setOpen}>
      <Sheet.Trigger className="-ml-1.5 rounded-md p-1.5 text-muted hover:text-ink lg:hidden" aria-label="Abrir menú">
        <MenuIcon className="size-6" />
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <Sheet.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-8 overflow-y-auto border-r border-line bg-bg px-4 py-5 shadow-float focus:outline-none">
          <Sheet.Title className="sr-only">Menú</Sheet.Title>
          <Sheet.Description className="sr-only">Módulos del sistema</Sheet.Description>
          <div className="flex items-center justify-between px-2">
            <Logo size={21} />
            <Sheet.Close className="rounded-md p-1.5 text-muted hover:text-ink" aria-label="Cerrar menú">
              <X className="size-5" />
            </Sheet.Close>
          </div>
          <NavList onNavigate={() => setOpen(false)} />
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  )
}

const themeOptions: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Según el sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
]

function UserMenu() {
  const me = useQuery(meQuery)
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme)
  const name = me.data?.name ?? '…'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const itemClass =
    'flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted'

  return (
    <Menu.Root>
      <Menu.Trigger className="flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-ink" aria-label="Menú de usuario">
        <span className="hidden sm:inline">{name}</span>
        <span className="grid size-8 place-items-center rounded-full border border-line-strong font-display text-xs font-semibold text-ink">{initials}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className="z-50 w-56 rounded-lg border border-line bg-surface p-1 shadow-float">
          <div className="px-2 py-2">
            <div className="text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-muted">{me.data?.email}</div>
            <div className="mt-0.5 text-xs text-faint">{me.data?.roleDescription}</div>
          </div>
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.Label className="label-caps px-2 pt-1.5 pb-1">Tema</Menu.Label>
          {themeOptions.map((o) => (
            <Menu.Item
              key={o.value}
              className={itemClass}
              onSelect={() => {
                setTheme(o.value)
                setThemeState(o.value)
              }}
            >
              <o.icon />
              {o.label}
              {theme === o.value && <Check className="ml-auto !text-accent" />}
            </Menu.Item>
          ))}
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.Item className={itemClass} onSelect={() => session.end()}>
            <LogOut />
            Cerrar sesión
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
