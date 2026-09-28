import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Package } from 'lucide-react'
import { meQuery } from '@/api/account'
import { Kbd, PageHeader, Panel } from '@/components/ui/misc'
import { modKey } from '@/lib/hotkeys'

export const Route = createFileRoute('/_app/')({
  component: HomePage,
})

const shortcuts: { keys: string[]; label: string }[] = [
  { keys: [modKey, 'K'], label: 'Buscar productos o ir a cualquier pantalla' },
  { keys: ['N'], label: 'Crear un registro en la pantalla actual' },
  { keys: ['/'], label: 'Ir al buscador de la tabla' },
  { keys: ['↑', '↓', 'Enter'], label: 'Moverte por la tabla y abrir un registro' },
]

function HomePage() {
  const me = useQuery(meQuery)
  const firstName = me.data?.name.split(' ')[0]

  return (
    <>
      <PageHeader title={firstName ? `Hola, ${firstName}` : 'Inicio'} description="Esto es lo que ya puedes usar. Los demás módulos se irán activando en el menú." />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel className="p-5">
          <Link to="/productos" className="group flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Package className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-display text-[17px] font-bold">
                Productos
                <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </span>
              <span className="mt-1 block text-[13.5px] text-muted">
                Catálogo compartido por tus empresas: código, unidad de medida, afectación al IGV y precio de venta.
              </span>
            </span>
          </Link>
        </Panel>

        <Panel className="p-5">
          <h2 className="label-caps">Atajos de teclado</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {shortcuts.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4 text-[13.5px]">
                <span className="text-muted">{s.label}</span>
                <span className="flex shrink-0 gap-1">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
