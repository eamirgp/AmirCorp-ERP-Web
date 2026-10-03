import { RotateCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { CONNECTION_ERROR } from '@/api/client'
import { Button } from '@/components/ui/button'

/**
 * Al abrir la página no se pudo preguntar si hay sesión (sin internet, o el sistema reiniciándose). No se muestra el
 * inicio de sesión: la sesión puede seguir abierta. "Reintentar" vuelve a preguntar.
 */
export function ConnectionError({ onRetry }: { onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false)

  const retry = async () => {
    setRetrying(true)
    await onRetry()
    setRetrying(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <TriangleAlert className="size-7 text-bad" strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">No se pudo abrir el sistema</p>
        <p className="max-w-md text-base text-muted">{CONNECTION_ERROR}</p>
      </div>
      <Button variant="primary" onClick={() => void retry()} disabled={retrying}>
        <RotateCw />
        {retrying ? 'Conectando…' : 'Reintentar'}
      </Button>
    </div>
  )
}
