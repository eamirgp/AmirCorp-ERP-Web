import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, LogOut, Monitor, Moon, Search, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { meQuery } from '@/api/account'
import { Kbd } from '@/components/ui/misc'
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
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur sm:px-7">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <BrandMark />
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-left text-[13.5px] text-faint transition-colors hover:border-line-strong sm:max-w-md"
          >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Buscar o ir a…</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>{modKey}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="flex-1 max-sm:hidden" />
          <UserMenu />
        </header>
        <main className="flex min-w-0 flex-col gap-5 px-4 py-6 sm:px-7">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function BrandMark() {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-accent font-display text-[13px] font-extrabold text-accent-ink" aria-hidden>
      AC
    </span>
  )
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
      <Link to="/" className="flex items-center gap-2.5 px-2">
        <BrandMark />
        <span>
          <span className="block font-display text-[17px] leading-none font-bold">AmirCorp</span>
          <span className="label-caps text-[10.5px]">Importación y ventas</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-4" aria-label="Módulos">
        {navGroups.map((group, i) => (
          <div key={group.label ?? i} className="flex flex-col gap-0.5">
            {group.label && <div className="label-caps px-2.5 pb-1 text-[10.5px] text-faint">{group.label}</div>}
            {group.items.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  activeOptions={{ exact: item.to === '/' }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink data-[status=active]:bg-accent-soft data-[status=active]:text-accent"
                >
                  <item.icon className="size-[17px]" strokeWidth={1.8} />
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-faint" title="Módulo en desarrollo">
                  <item.icon className="size-[17px]" strokeWidth={1.8} />
                  {item.label}
                  <span className="ml-auto rounded border border-line px-1.5 text-[10.5px] font-semibold tracking-wide uppercase">Pronto</span>
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
    'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted'

  return (
    <Menu.Root>
      <Menu.Trigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2">
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft font-display text-[12.5px] font-bold text-accent">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] leading-tight font-semibold">{name}</span>
          <span className="block text-[11.5px] leading-tight text-muted">{me.data?.roleDescription}</span>
        </span>
        <ChevronDown className="size-4 text-faint" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} className="z-50 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-float">
          <div className="px-2.5 py-2">
            <div className="text-[13.5px] font-semibold">{name}</div>
            <div className="truncate text-[12.5px] text-muted">{me.data?.email}</div>
          </div>
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.Label className="label-caps px-2.5 pt-1.5 pb-1 text-[10.5px]">Tema</Menu.Label>
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
