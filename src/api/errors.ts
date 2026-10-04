/**
 * Un error de la API: el mensaje y, si es de un campo del formulario, cuál ("code", "supplierCodes[1].code", con las
 * filas desde 0; decisión 37 de la API). Sin campo, es del formulario entero.
 */
export interface ApiErrorDetail {
  message: string
  field: string | null
}

/** Los errores de una respuesta `{ errors: [{ message, field }] }`, o una lista vacía si no los trae. */
export function readErrors(body: unknown): ApiErrorDetail[] {
  const errors = (body as { errors?: unknown } | null | undefined)?.errors
  if (!Array.isArray(errors)) return []
  return errors.map((e) =>
    typeof e === 'object' && e !== null && 'message' in e
      ? { message: String(e.message), field: 'field' in e && typeof e.field === 'string' ? e.field : null }
      : { message: String(e), field: null },
  )
}
