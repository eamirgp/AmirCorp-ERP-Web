import createClient, { type Middleware } from 'openapi-fetch'
import { session } from '@/lib/session'
import type { components, paths } from './schema'

/** Tipos de los DTOs de la API, generados desde su contrato OpenAPI (npm run api:generate). */
export type Schemas = components['schemas']

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5117',
})

const auth: Middleware = {
  onRequest({ request }) {
    const token = session.token
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  async onResponse({ request, response }) {
    // Token vencido, o la API ya no acepta al usuario (por ejemplo, lo desactivaron): se cierra la sesión y el router
    // lleva al login, que muestra el motivo si la API lo envió. Un 401 del propio inicio de sesión no lleva token.
    if (response.status === 401 && request.headers.has('Authorization')) {
      const body = (await response.clone().json().catch(() => null)) as { errors?: unknown } | null
      session.end(Array.isArray(body?.errors) && body.errors.length > 0 ? String(body.errors[0]) : undefined)
    }
    return response
  },
}

api.use(auth)

/** Error de la API con los mensajes listos para mostrar al usuario. */
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join(' '))
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }
}

const fallbackMessages: Record<number, string> = {
  401: 'Tu sesión venció. Vuelve a iniciar sesión.',
  403: 'No tienes permisos para hacer esto.',
  404: 'No se encontró el registro.',
  409: 'Los datos cambiaron o ya existen. Revisa e inténtalo de nuevo.',
  429: 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
}

/**
 * Espera la respuesta de openapi-fetch y devuelve sus datos, o lanza ApiError con los mensajes
 * que envió la API ({ errors: [...] }).
 */
export async function unwrap<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  let result: { data?: T; error?: unknown; response: Response }
  try {
    result = await request
  } catch {
    throw new ApiError(0, ['No se pudo conectar con el servidor. Revisa que la API esté encendida.'])
  }

  const { data, error, response } = result
  if (response.ok) return data as T

  const body = error as { errors?: unknown } | undefined
  const messages =
    Array.isArray(body?.errors) && body.errors.length > 0
      ? body.errors.map(String)
      : [fallbackMessages[response.status] ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.']

  throw new ApiError(response.status, messages)
}

export const errorMessages = (error: unknown): string[] =>
  error instanceof ApiError ? error.messages : ['Ocurrió un error inesperado. Inténtalo de nuevo.']
