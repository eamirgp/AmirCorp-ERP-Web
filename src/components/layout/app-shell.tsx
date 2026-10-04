import * as Sheet from '@radix-ui/react-dialog'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, LogOut, PanelLeft } from 'lucide-react'
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react'
import { meQuery } from '@/api/account'
import { brand } from '@/brand'
import { LogoMark } from '@/brand/logo'
import { useClickMenu } from '@/components/ui/menu'
import { session } from '@/lib/session'
import { moduleTitle, navGroups, type NavGroup, type NavItem } from './nav'

/**
 * Marco de todas las pantallas con sesión, en el estilo Apple aprobado (docs/diseno.md, "Marco de la aplicación"):
 * menú lateral flotante de vidrio que se puede ocultar (HIG "Sidebars") y barra superior transparente que se vuelve
 * vidrio al desplazar, con el título chico de la pantalla y el menú del usuario a la derecha (HIG "Toolbars").
 */
export function AppShell({ children }: { children: ReactNode }) {
  // Cierra la sesión justo cuando vence por falta de uso, sin esperar a que falle una petición. Cada renovación (al
  // usar el sistema) vuelve a programar el plazo. Si se siguió usando en otra pestaña, la API lo dice y sigue abierta.
  useEffect(() => {
    let t = setTimeout(() => void session.expire(), session.msUntilExpiry)
    const unsubscribe = session.subscribe(() => {
      clearTimeout(t)
      if (session.isAuthenticated) t = setTimeout(() => void session.expire(), session.msUntilExpiry)
    })
    return () => {
      clearTimeout(t)
      unsubscribe()
    }
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const toggleSidebar = (open: boolean) => {
    setSidebarOpen(open)
    saveSidebarOpen(open)
  }
  const scrolled = useScrolled(40)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="min-h-dvh bg-page text-fg">
      {/* Computadora: el menú flota a la izquierda. Oculto, sale de la pantalla y no se puede alcanzar con Tab. */}
      <aside
        aria-label="Módulos"
        inert={!sidebarOpen}
        className={`${panelClass} fixed inset-y-2.5 left-2.5 z-40 hidden w-[264px] transition-[translate,opacity] duration-[420ms] ease-panel lg:block ${sidebarOpen ? '' : '-translate-x-[calc(100%+24px)] opacity-0'}`}
      >
        <SidebarPanel toggle={<GlassButton aria-label="Ocultar el menú lateral" onClick={() => toggleSidebar(false)} />} />
      </aside>

      <div className={`flex min-w-0 flex-col transition-[padding] duration-[420ms] ease-panel ${sidebarOpen ? 'lg:pl-[284px]' : ''}`}>
        <header
          className={`sticky top-0 z-30 flex h-16 items-center gap-3 px-4 transition-[background-color,box-shadow] duration-250 sm:px-6 ${scrolled ? 'bg-glass shadow-[0_1px_0_var(--hairline)] backdrop-blur-xl backdrop-saturate-[1.8]' : ''}`}
        >
          <MobileNav />
          {!sidebarOpen && <GlassButton aria-label="Mostrar el menú lateral" className="hidden lg:flex" onClick={() => toggleSidebar(true)} />}
          {/* Al bajar, el título de la pantalla pasa chico a la barra, como en el iPhone. */}
          <span aria-hidden className={`truncate text-apple font-semibold transition-[opacity,translate] duration-250 ${scrolled ? '' : 'translate-y-1.5 opacity-0'}`}>
            {moduleTitle(pathname)}
          </span>
          <div className="flex-1" />
          <UserMenu />
        </header>
        <main className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-col gap-6 px-4 pt-2 pb-16 sm:px-8 lg:px-12">{children}</main>
      </div>
    </div>
  )
}

/** El panel de vidrio del menú lateral: gris claro translúcido, flotando con esquinas redondeadas. */
const panelClass = 'rounded-[22px] border border-glass-line bg-sidebar shadow-glass backdrop-blur-[30px] backdrop-saturate-[1.8]'

const SIDEBAR_KEY = 'erp.sidebar'

/** Si se ocultó el menú lateral, sigue oculto la próxima vez (como la Mac). Sin acceso al almacenamiento, se ve. */
function readSidebarOpen() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'hidden'
  } catch {
    return true
  }
}

function saveSidebarOpen(open: boolean) {
  try {
    if (open) localStorage.removeItem(SIDEBAR_KEY)
    else localStorage.setItem(SIDEBAR_KEY, 'hidden')
  } catch {
    /* dura hasta recargar */
  }
}

/** Si la página bajó más de `threshold` px: la barra superior se vuelve vidrio y muestra el título. */
function useScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [threshold])
  return scrolled
}

/** Botón redondo de vidrio con el símbolo del menú lateral, sin borde (HIG "Toolbars"). */
function GlassButton({ className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={`press flex size-9 flex-none items-center justify-center rounded-full bg-glass text-fg shadow-[0_0_0_1px_var(--glass-line),0_2px_8px_rgb(29_29_31/0.06)] backdrop-blur-xl hover:bg-white ${className}`}
    >
      <PanelLeft className="size-[19px]" strokeWidth={1.75} />
    </button>
  )
}

function SidebarPanel({ toggle, onNavigate }: { toggle: ReactNode; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-2.5 py-3.5">
      <div className="flex h-10 flex-none items-center gap-2.5 pr-0.5 pl-1">
        <Link to="/" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg" aria-label={`${brand.name}, inicio`}>
          {/* El ícono de la marca, en chico: la "P" en un cuadrado blanco de esquinas redondeadas. */}
          <span aria-hidden className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-[#e8e8ed] bg-white shadow-[0_2px_6px_rgb(29_29_31/0.08)]">
            <LogoMark height={18} tone="light" />
          </span>
          <span className="truncate font-display text-lg font-bold tracking-[-0.015em]">{brand.shortName}</span>
        </Link>
        {toggle}
      </div>
      <NavList onNavigate={onNavigate} />
    </div>
  )
}

/** Lista de módulos por área: la usan el menú lateral y el del celular. */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <nav aria-label="Módulos" className="mt-3.5 flex flex-col gap-0.5">
      {navGroups.map((group, i) =>
        group.collapsible ? (
          <CollapsibleGroup key={group.label ?? i} group={group} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <div key={group.label ?? i} role="group" aria-label={group.label} className="flex flex-col gap-0.5">
            {group.label && <div className="mt-[18px] mb-1 px-3 text-xs font-semibold text-fg-muted">{group.label}</div>}
            {group.items.map((item) => (
              <NavRow key={item.label} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ),
      )}
    </nav>
  )
}

const isIn = (item: NavItem, pathname: string) => !!item.to && (pathname === item.to || pathname.startsWith(`${item.to}/`))

/**
 * Grupo que se abre y se cierra con su flecha (HIG "Sidebars": controles de despliegue). Empieza cerrado, salvo que la
 * pantalla actual esté adentro; si se llega a una de sus pantallas, se abre solo para que se vea dónde se está.
 */
function CollapsibleGroup({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate?: () => void }) {
  const hasActive = group.items.some((item) => isIn(item, pathname))
  const [open, setOpen] = useState(hasActive)
  const [hadActive, setHadActive] = useState(hasActive)
  if (hasActive !== hadActive) {
    setHadActive(hasActive)
    if (hasActive) setOpen(true)
  }
  const id = useId()
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="mt-3.5 mb-0.5 flex h-[30px] w-full items-center justify-between rounded-full px-3 text-xs font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg"
      >
        {group.label}
        <ChevronRight className={`size-3.5 transition-transform duration-250 ease-panel ${open ? 'rotate-90' : ''}`} strokeWidth={2} />
      </button>
      {open && (
        <div id={id} role="group" aria-label={group.label} className="animate-unfold flex flex-col gap-0.5">
          {group.items.map((item) => (
            <NavRow key={item.label} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

const rowClass = 'flex h-9 items-center gap-2.5 rounded-full px-3 text-sm'

/** Una opción del menú. La pantalla actual va en una píldora jade con texto blanco; los íconos, en jade. */
function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  if (!item.to)
    return (
      <span className={`${rowClass} cursor-default text-disabled`} title="Módulo en desarrollo">
        <item.icon className="size-[18px] flex-none" strokeWidth={1.75} />
        {item.label}
        <span className="ml-auto text-2xs">Pronto</span>
      </span>
    )
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === '/' }}
      className={`${rowClass} press text-fg hover:not-data-[status=active]:bg-hover data-[status=active]:bg-selected data-[status=active]:font-semibold data-[status=active]:text-selected-ink [&_svg]:text-link [&[data-status=active]_svg]:text-selected-ink`}
    >
      <item.icon className="size-[18px] flex-none" strokeWidth={1.75} />
      {item.label}
    </Link>
  )
}

/** Celular y tableta: el mismo menú, abierto encima del contenido con un velo detrás. Se cierra al elegir una pantalla. */
function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet.Root open={open} onOpenChange={setOpen}>
      <Sheet.Trigger asChild>
        <GlassButton aria-label="Mostrar el menú lateral" className="lg:hidden" />
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.Overlay className="fixed inset-0 z-40 bg-veil data-[state=open]:animate-[fade-in_300ms_ease-out]" />
        <Sheet.Content className={`${panelClass} animate-panel-in fixed inset-y-2.5 left-2.5 z-50 w-[min(300px,calc(100%-64px))] text-fg focus:outline-none`}>
          <Sheet.Title className="sr-only">Menú</Sheet.Title>
          <Sheet.Description className="sr-only">Módulos del sistema</Sheet.Description>
          <SidebarPanel
            onNavigate={() => setOpen(false)}
            toggle={
              <Sheet.Close asChild>
                <GlassButton aria-label="Ocultar el menú lateral" />
              </Sheet.Close>
            }
          />
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  )
}

/** Las iniciales en un círculo gris, como el de Contactos de Apple. */
function Monogram({ initials, large = false }: { initials: string; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center rounded-full bg-linear-to-b from-monogram-top to-monogram-bottom font-semibold tracking-[0.02em] text-white ${large ? 'size-11 text-md' : 'size-9 text-sm'}`}
    >
      {initials}
    </span>
  )
}

/** Menú del usuario, arriba a la derecha (Apple: lo importante no va abajo del menú lateral). */
function UserMenu() {
  const me = useQuery(meQuery)
  const name = me.data?.name ?? '…'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  // Se abre al soltar el clic, como los demás menús (decisión 18).
  const menu = useClickMenu()

  return (
    <Menu.Root {...menu.root}>
      <Menu.Trigger {...menu.trigger} className="press flex-none rounded-full transition-shadow hover:shadow-[0_0_0_4px_var(--hover)]" aria-label={`Menú de ${name}`}>
        <Monogram initials={initials} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          {...menu.content}
          align="end"
          sideOffset={10}
          className="animate-menu-open z-50 w-72 origin-(--radix-dropdown-menu-content-transform-origin) rounded-2xl bg-glass-menu p-1.5 text-fg shadow-menu backdrop-blur-[30px] backdrop-saturate-[1.8]"
        >
          <div className="flex items-center gap-3 px-2.5 pt-3 pb-3.5">
            <Monogram initials={initials} large />
            <div className="flex min-w-0 flex-col">
              <span className="text-base font-semibold">{name}</span>
              <span className="truncate text-sm text-fg-muted">{me.data?.email}</span>
              <span className="text-xs text-fg-muted">{me.data?.roleDescription}</span>
            </div>
          </div>
          <Menu.Separator className="mx-2.5 mb-1.5 h-px bg-hairline" />
          <Menu.Item
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 text-sm outline-none data-[highlighted]:bg-selected data-[highlighted]:text-selected-ink [&_svg]:size-[18px] [&_svg]:text-fg-muted data-[highlighted]:[&_svg]:text-selected-ink"
            onSelect={() => void session.logout()}
          >
            <LogOut strokeWidth={1.75} />
            Cerrar sesión
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
