import { CircleAlert } from 'lucide-react'

/**
 * Error del estilo Apple (docs/diseno.md): junto a los campos, en rojo, con letra pequeña y un ícono, no en un recuadro
 * aparte ni en una ventana. Aparece con la misma entrada suave que el resto de la pantalla. Sin mensajes no se muestra.
 */
export function InlineError({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <div role="alert" className="animate-enter flex gap-2 px-1 text-sm text-bad">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="space-y-0.5">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
