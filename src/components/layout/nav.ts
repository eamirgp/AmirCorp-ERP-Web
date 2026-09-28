import { Boxes, FileText, House, Package, ShoppingCart, Ship, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  /** Ruta de la pantalla. Sin ruta, el módulo aparece como "Pronto". */
  to?: '/' | '/productos'
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
      { label: 'Importaciones', icon: Ship },
      { label: 'Compras', icon: ShoppingCart },
      { label: 'Inventario', icon: Boxes },
    ],
  },
  {
    label: 'Maestros',
    items: [{ label: 'Productos', icon: Package, to: '/productos' }],
  },
]
