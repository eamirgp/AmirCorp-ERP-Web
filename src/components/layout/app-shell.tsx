import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, LogOut, Monitor, Moon, Search, Sun } from 'lucide-react'
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
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-bg px-4 sm:px-8">
          <Link to="/" className="flex items-center lg:hidden" aria-label={`${brand.name}, inicio`}>
            <LogoMark height={26} />
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex min-w-0 items-center gap-2.5 text-[14px] text-faint transition-colors hover:text-ink"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Buscar o ir a…</span>
            <span className="hidden text-[12px] sm:inline">{modKey} K</span>
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

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line px-4 py-5 lg:flex">
      <Link to="/" className="flex h-9 items-center px-2" aria-label={`${brand.name}, inicio`}>
        <Logo size={18} />
      </Link>

      <nav className="flex flex-col gap-6" aria-label="Módulos">
        {navGroups.map((group, i) => (
          <div key={group.label ?? i} className="flex flex-col gap-px">
            {group.label && <div className="label-caps px-2 pb-2">{group.label}</div>}
            {group.items.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  activeOptions={{ exact: item.to === '/' }}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[14px] text-muted transition-colors hover:text-ink data-[status=active]:bg-surface-2 data-[status=active]:font-medium data-[status=active]:text-ink [&[data-status=active]_svg]:text-accent"
                >
                  <item.icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className="flex cursor-default items-center gap-2.5 px-2 py-1.5 text-[14px] text-faint/70" title="Módulo en desarrollo">
                  <item.icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                  <span className="ml-auto text-[11px]">pronto</span>
                </span>
              ),
            )}
          </div>
        ))}
      </nav>
    </aside>
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
    'flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-[13.5px] outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted'

  return (
    <Menu.Root>
      <Menu.Trigger className="flex items-center gap-2.5 text-[13.5px] text-muted transition-colors hover:text-ink" aria-label="Menú de usuario">
        <span className="hidden sm:inline">{name}</span>
        <span className="grid size-8 place-items-center rounded-full border border-line-strong font-display text-[12px] font-semibold text-ink">{initials}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className="z-50 w-56 rounded-lg border border-line bg-surface p-1 shadow-float">
          <div className="px-2 py-2">
            <div className="text-[13.5px] font-medium">{name}</div>
            <div className="truncate text-[12.5px] text-muted">{me.data?.email}</div>
            <div className="mt-0.5 text-[12px] text-faint">{me.data?.roleDescription}</div>
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
