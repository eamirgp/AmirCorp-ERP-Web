import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { meQuery } from '@/api/account'
import { navGroups } from '@/components/layout/nav'
import { Kbd, PageHeader } from '@/components/ui/misc'
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
  const modules = navGroups.flatMap((g) => g.items).filter((i) => i.to && i.to !== '/')

  return (
    <>
      <PageHeader title={firstName ? `Hola, ${firstName}` : 'Inicio'} />

      <section>
        <h2 className="label-caps pb-2">Módulos</h2>
        <ul className="border-t border-line">
          {modules.map((m) => (
            <li key={m.label} className="border-b border-line">
              <Link to={m.to!} className="group flex items-center gap-3 py-3.5 text-[15px]">
                <m.icon className="size-4 text-faint group-hover:text-accent" strokeWidth={1.75} />
                {m.label}
                <ArrowRight className="ml-auto size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-lg">
        <h2 className="label-caps pb-2">Atajos de teclado</h2>
        <ul className="flex flex-col gap-2.5">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 text-[14px] text-muted">
              {s.label}
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
