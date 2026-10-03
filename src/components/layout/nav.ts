import { Boxes, Building2, FileText, HistoryIcon, House, Package, Ruler, ShieldCheck, ShoppingCart, Ship, Truck, Users, type LucideIcon } from 'lucide-react'

export type NavPath = '/' | '/productos' | '/empresas' | '/clientes' | '/proveedores' | '/usuarios' | '/compras' | '/unidades-medida' | '/auditoria'

export interface NavItem {
  label: string
  icon: LucideIcon
  /** Ruta de la pantalla. Sin ruta, el módulo aparece como "pronto". */
  to?: NavPath
}

export interface NavGroup {
  label?: string
  items: NavItem[]
  /** Grupo que se abre y se cierra (lo que no se usa a diario). Se abre solo si la pantalla actual está adentro. */
  collapsible?: boolean
}

// Por área, como Odoo: cada área junta sus registros (clientes junto a ventas, proveedores junto a compras, productos
// junto al inventario). Los títulos no repiten el nombre de una opción. La configuración va al final, cerrada.
export const navGroups: NavGroup[] = [
  { items: [{ label: 'Inicio', icon: House, to: '/' }] },
  {
    label: 'Comercial',
    items: [
      { label: 'Ventas', icon: FileText },
      { label: 'Clientes', icon: Users, to: '/clientes' },
    ],
  },
  {
    label: 'Abastecimiento',
    items: [
      { label: 'Compras', icon: ShoppingCart, to: '/compras' },
      { label: 'Proveedores', icon: Truck, to: '/proveedores' },
      { label: 'Importaciones', icon: Ship },
    ],
  },
  {
    label: 'Almacén',
    items: [
      { label: 'Productos', icon: Package, to: '/productos' },
      { label: 'Inventario', icon: Boxes },
    ],
  },
  {
    label: 'Configuración',
    collapsible: true,
    items: [
      { label: 'Empresas', icon: Building2, to: '/empresas' },
      { label: 'Unidades de medida', icon: Ruler, to: '/unidades-medida' },
      { label: 'Usuarios', icon: ShieldCheck, to: '/usuarios' },
      { label: 'Auditoría', icon: HistoryIcon, to: '/auditoria' },
    ],
  },
]

/** Nombre del módulo de una ruta ("/compras/12" → "Compras"), para el título chico de la barra superior. */
export function moduleTitle(pathname: string) {
  const items = navGroups.flatMap((g) => g.items)
  const match = items.find((i) => i.to && i.to !== '/' && (pathname === i.to || pathname.startsWith(`${i.to}/`)))
  return match?.label ?? (pathname === '/' ? 'Inicio' : '')
}
