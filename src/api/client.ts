import createClient, { type Middleware } from 'openapi-fetch'
import { session } from '@/lib/session'
import { apiBaseUrl } from './base-url'
import type { components, paths } from './schema'

/** Tipos de los DTOs de la API, generados desde su contrato OpenAPI (npm run api:generate). */
export type Schemas = components['schemas']

export const api = createClient<paths>({
  baseUrl: apiBaseUrl,
  // El inicio de sesión recibe la cookie del refresh token. La cookie solo va a /api/auth: los demás pedidos no la llevan.
  credentials: 'include',
})

// Copia de cada pedido con token, para repetirlo una vez si la API responde 401 (el cuerpo de un pedido ya enviado no se
// puede volver a leer).
const retries = new WeakMap<Request, Request>()

const auth: Middleware = {
  async onRequest({ request }) {
    // El token de acceso dura 15 minutos: si está por vencer, se renueva antes de enviar el pedido. Así la sesión se
    // renueva solo cuando se usa el sistema y una pestaña abierta sin usar vence igual.
    if (session.needsRefresh) await session.refresh()
    const token = session.token
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
      retries.set(request, request.clone())
    }
    return request
  },
  async onResponse({ request, response }) {
    // Un 401 del propio inicio de sesión no lleva token.
    const retry = retries.get(request)
    if (response.status !== 401 || !retry) return response

    // El token pudo vencer antes de lo que creía este equipo (su reloj no coincide con el de la API), o ser de antes
    // de un cambio en la API: se renueva una vez y se repite el pedido. Si la renovación dice que la sesión ya no
    // sirve, ella misma la cierra con el motivo.
    if (await session.refresh()) {
      retry.headers.set('Authorization', `Bearer ${session.token}`)
      const again = await fetch(retry)
      if (again.status !== 401) return again
      response = again
    } else if (session.token) {
      // No se pudo renovar por la conexión o un error del servidor: la sesión sigue y el pedido se puede reintentar.
      return response
    }

    // La API ya no acepta al usuario (por ejemplo, lo desactivaron): se cierra la sesión y el router lleva al login, que
    // muestra el motivo.
    const body = (await response.clone().json().catch(() => null)) as { errors?: unknown } | null
    session.end(Array.isArray(body?.errors) && body.errors.length > 0 ? String(body.errors[0]) : undefined)
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
