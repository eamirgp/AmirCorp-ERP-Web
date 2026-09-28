/**
 * Sesión del usuario: guarda el token JWT y avisa cuando cambia.
 *
 * El token se guarda en localStorage para sobrevivir a una recarga. Es la opción simple mientras
 * la API no emita un refresh token en cookie httpOnly (ver docs/decisiones.md).
 */

const KEY = 'erp.token'
type Listener = () => void

const listeners = new Set<Listener>()
let token: string | null = read()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function payloadOf(jwt: string): { exp?: number } | null {
  try {
    const part = jwt.split('.')[1] ?? ''
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function isExpired(jwt: string): boolean {
  const exp = payloadOf(jwt)?.exp
  return typeof exp !== 'number' || exp * 1000 <= Date.now()
}

export const session = {
  /** Token vigente, o null si no hay sesión o ya venció. */
  get token(): string | null {
    return token && !isExpired(token) ? token : null
  },

  get isAuthenticated(): boolean {
    return this.token !== null
  },

  /** Milisegundos hasta que venza el token (0 si no hay sesión). */
  get msUntilExpiry(): number {
    const exp = token ? payloadOf(token)?.exp : undefined
    return typeof exp === 'number' ? Math.max(0, exp * 1000 - Date.now()) : 0
  },

  start(newToken: string) {
    token = newToken
    try {
      localStorage.setItem(KEY, newToken)
    } catch {
      /* sin almacenamiento: la sesión dura hasta recargar */
    }
    listeners.forEach((l) => l())
  },

  end() {
    if (token === null) return
    token = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nada que limpiar */
    }
    listeners.forEach((l) => l())
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
