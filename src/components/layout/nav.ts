import { Boxes, Building2, FileText, House, Package, ShieldCheck, ShoppingCart, Ship, Users, type LucideIcon } from 'lucide-react'

export type NavPath = '/' | '/productos' | '/empresas' | '/socios' | '/usuarios' | '/compras'

export interface NavItem {
  label: string
  icon: LucideIcon
  /** Ruta de la pantalla. Sin ruta, el módulo aparece como "pronto". */
  to?: NavPath
}

export const navGroups: { label?: string; items: NavItem[] }[] = [
  { items: [{ label: 'Inicio', icon: House, to: '/' }] },
  {
    label: 'Comercial',
    items: [{ label: 'Ventas', icon: FileText }],
  },
  {
    label: 'Abastecimiento',
    items: [
      { label: 'Compras', icon: ShoppingCart, to: '/compras' },
      { label: 'Importaciones', icon: Ship },
      { label: 'Inventario', icon: Boxes },
    ],
  },
  {
    label: 'Maestros',
    items: [
      { label: 'Productos', icon: Package, to: '/productos' },
      { label: 'Clientes y proveedores', icon: Users, to: '/socios' },
      { label: 'Empresas', icon: Building2, to: '/empresas' },
    ],
  },
  {
    label: 'Administración',
    items: [{ label: 'Usuarios', icon: ShieldCheck, to: '/usuarios' }],
  },
]
