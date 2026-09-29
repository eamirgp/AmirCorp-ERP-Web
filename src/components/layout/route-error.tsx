import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { errorMessages } from '@/api/client'
import { Button } from '@/components/ui/button'

/**
 * Pantalla que se muestra cuando no se pudo cargar una pantalla (API apagada, sin internet, error del servidor).
 * Reemplaza el mensaje en inglés de TanStack Router. "Reintentar" vuelve a pedir los datos.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const messages = errorMessages(error)

  const retry = () => {
    reset()
    void router.invalidate()
  }

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <TriangleAlert className="size-7 text-bad" strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">No se pudo cargar esta pantalla</p>
        {messages.map((m) => (
          <p key={m} className="max-w-md text-base text-muted">
            {m}
          </p>
        ))}
      </div>
      <Button variant="primary" onClick={retry}>
        <RotateCw />
        Reintentar
      </Button>
    </div>
  )
}
