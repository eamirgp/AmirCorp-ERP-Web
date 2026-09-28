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
  onResponse({ response }) {
    // Token vencido o revocado: se cierra la sesión y el router lleva al login.
    if (response.status === 401) session.end()
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
