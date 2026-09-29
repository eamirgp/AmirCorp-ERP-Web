import { Boxes, Building2, FileText, HistoryIcon, House, Package, Ruler, ShieldCheck, ShoppingCart, Ship, Truck, Users, type LucideIcon } from 'lucide-react'

export type NavPath = '/' | '/productos' | '/empresas' | '/clientes' | '/proveedores' | '/usuarios' | '/compras' | '/unidades-medida' | '/auditoria'

export interface NavItem {
  label: string
  icon: LucideIcon
  /** Ruta de la pantalla. Sin ruta, el módulo aparece como "pronto". */
  to?: NavPath
}

// Clientes y proveedores son el mismo registro por dentro, pero cada uno aparece donde se usa:
// clientes junto a Ventas y proveedores junto a Compras.
export const navGroups: { label?: string; items: NavItem[] }[] = [
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
      { label: 'Inventario', icon: Boxes },
    ],
  },
  {
    label: 'Maestros',
    items: [
      { label: 'Productos', icon: Package, to: '/productos' },
      { label: 'Empresas', icon: Building2, to: '/empresas' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', icon: ShieldCheck, to: '/usuarios' },
      { label: 'Unidades de medida', icon: Ruler, to: '/unidades-medida' },
      { label: 'Auditoría', icon: HistoryIcon, to: '/auditoria' },
    ],
  },
]
