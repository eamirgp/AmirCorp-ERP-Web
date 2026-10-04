import { useEffect, useRef, useState } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { ApiError, errorMessages } from '@/api/client'

/** Qué campo del formulario es cada campo de la API ("unitOfMeasureCode" → "unitOfMeasure"), o undefined si ninguno. */
export type ToFormField<T extends FieldValues> = (apiField: string) => Path<T> | undefined

/**
 * Errores de la API en un formulario, como Apple (decisión 26): cada error debajo de su campo, en rojo, y arriba solo
 * los que no son de un campo ("otra persona cambió este producto"). Al guardar con errores, el cursor va al primer
 * campo marcado y la ventana baja hasta él. Al escribir en un campo, su error se va.
 *
 * El formulario pasa `ref` a su `<form>`, muestra `general` arriba (`ErrorList`) y cada campo lee su error de
 * `form.formState.errors`. `clear()` antes de enviar; `show(error, toField)` si la API respondió con errores.
 */
export function useApiErrors<T extends FieldValues>(form: UseFormReturn<T>) {
  const ref = useRef<HTMLFormElement>(null)
  const [general, setGeneral] = useState<string[]>([])
  const [shown, setShown] = useState(0)

  // Después de que la pantalla marcó los campos: el primero con error recibe el cursor. Si ninguno es de un campo, se
  // vuelve arriba, donde está el mensaje.
  useEffect(() => {
    if (shown === 0) return
    const field = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (field) field.focus()
    else ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [shown])

  // Lo que la persona escribe o elige borra el error de ese campo (agregar o quitar filas no borra los de las demás).
  useEffect(() => {
    const sub = form.watch((_, { name, type }) => {
      if (type === 'change' && name) form.clearErrors(name)
    })
    return () => sub.unsubscribe()
  }, [form])

  return {
    ref,
    general,
    clear: () => {
      setGeneral([])
      form.clearErrors()
    },
    show: (error: unknown, toField: ToFormField<T>) => {
      if (!(error instanceof ApiError)) {
        setGeneral(errorMessages(error))
        setShown((n) => n + 1)
        return
      }

      const top: string[] = []
      const byField = new Map<Path<T>, string[]>()
      for (const { message, field } of error.details) {
        const name = field ? toField(field) : undefined
        if (name) byField.set(name, [...(byField.get(name) ?? []), message])
        else top.push(message)
      }
      byField.forEach((messages, name) => form.setError(name, { type: 'server', message: messages.join(' ') }))
      setGeneral(top)
      setShown((n) => n + 1)
    },
  }
}
