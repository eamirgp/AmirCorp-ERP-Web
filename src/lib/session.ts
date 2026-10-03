/**
 * Sesión del usuario con refresh token (decisión 24 de docs/decisiones.md).
 *
 * - El token de acceso dura 15 minutos y se guarda **solo en memoria**: un código malicioso en la página no lo encuentra
 *   guardado en el navegador, y al cerrar la pestaña desaparece.
 * - El refresh token lo guarda el navegador en una cookie httpOnly que JavaScript no puede leer. Con ella se recupera
 *   la sesión al abrir la página (restore) y se pide un token de acceso nuevo cuando el actual está por vencer (refresh).
 * - La sesión vence tras 8 horas sin usar el sistema (`sessionExpiresAt`, lo dice la API).
 */
import { apiBaseUrl } from '@/api/base-url'

type Listener = () => void
type SessionResponse = { token: string; sessionExpiresAt: string }

// Antes el token se guardaba en localStorage: se borra si quedó de una versión anterior.
try {
  localStorage.removeItem('erp.token')
} catch {
  /* sin almacenamiento */
}

const listeners = new Set<Listener>()
let token: string | null = null
let sessionExpiresAt = 0
// Por qué la API cerró la sesión ("Tu cuenta está desactivada…"), para mostrarlo en el inicio de sesión.
let endReason: string | null = null
// Una sola renovación a la vez: si varios pedidos la necesitan juntos, esperan la misma.
let refreshing: Promise<boolean> | null = null

function payloadOf(jwt: string): { exp?: number } | null {
  try {
    const part = jwt.split('.')[1] ?? ''
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

const notify = () => listeners.forEach((l) => l())

async function callAuth(path: 'refresh' | 'logout'): Promise<Response | null> {
  try {
    return await fetch(`${apiBaseUrl}/api/auth/${path}`, { method: 'POST', credentials: 'include' })
  } catch {
    return null
  }
}

export const session = {
  /** Token de acceso actual (puede estar por vencer: el cliente de la API lo renueva antes de usarlo). */
  get token(): string | null {
    return token
  },

  /** Hay sesión mientras no venza por falta de uso; el token de acceso se renueva solo. */
  get isAuthenticated(): boolean {
    return token !== null && sessionExpiresAt > Date.now()
  },

  /** Si el token de acceso vence en menos de un minuto: hay que renovarlo antes del próximo pedido. */
  get needsRefresh(): boolean {
    const exp = token ? payloadOf(token)?.exp : undefined
    return token !== null && (typeof exp !== 'number' || exp * 1000 - Date.now() < 60_000)
  },

  /** Milisegundos hasta que la sesión venza por falta de uso (0 si no hay sesión). */
  get msUntilExpiry(): number {
    return Math.max(0, sessionExpiresAt - Date.now())
  },

  /** El motivo del último cierre hecho por la API; se olvida al volver a iniciar sesión. */
  get endReason(): string | null {
    return endReason
  },

  /** Al iniciar sesión o renovarla: guarda el token de acceso (en memoria) y cuándo vence la sesión. */
  start(response: SessionResponse) {
    token = response.token
    sessionExpiresAt = Date.parse(response.sessionExpiresAt)
    endReason = null
    notify()
  },

  /**
   * Pide un token de acceso nuevo con la cookie. Si la sesión ya no sirve (venció, cuenta desactivada), la cierra con
   * el motivo que envió la API.
   * @returns Si hay sesión después de intentarlo.
   */
  refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      const response = await callAuth('refresh')
      if (response?.ok) {
        session.start((await response.json()) as SessionResponse)
        return true
      }
      // Sin conexión no se cierra la sesión: el pedido fallará y se podrá reintentar.
      if (response) {
        const body = (await response.json().catch(() => null)) as { errors?: unknown } | null
        const errors = Array.isArray(body?.errors) ? (body.errors as unknown[]) : []
        session.end(errors.length > 0 ? String(errors[0]) : undefined)
      }
      return session.isAuthenticated
    })().finally(() => (refreshing = null))
    return refreshing
  },

  /** Al abrir la página: recupera la sesión con la cookie, si la hay. */
  async restore() {
    const response = await callAuth('refresh')
    if (response?.ok) session.start((await response.json()) as SessionResponse)
  },

  /** "Cerrar sesión": la anula también en el servidor, para que la cookie ya no sirva. */
  async logout() {
    await callAuth('logout')
    session.end()
  },

  /** @param reason El motivo que envió la API, si la sesión no terminó por voluntad del usuario. */
  end(reason?: string) {
    if (token === null) return
    token = null
    sessionExpiresAt = 0
    endReason = reason ?? null
    notify()
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
