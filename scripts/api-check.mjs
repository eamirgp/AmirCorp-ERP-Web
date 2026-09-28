// Verifica que src/api/schema.d.ts coincida con el contrato de la API que está corriendo.
// Uso: npm run api:check  (falla si el frontend quedó desactualizado)
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = process.env.VITE_API_URL ?? 'http://localhost:5117'
const dir = mkdtempSync(join(tmpdir(), 'api-check-'))
const fresh = join(dir, 'schema.d.ts')

try {
  execSync(`npx openapi-typescript "${url}/openapi/v1.json" -o "${fresh}"`, { stdio: 'pipe' })
} catch {
  console.error(`No se pudo leer el contrato en ${url}/openapi/v1.json. ¿Está corriendo la API?`)
  process.exit(2)
}

const normalize = (s) => s.replace(/\r\n/g, '\n')
const current = normalize(readFileSync('src/api/schema.d.ts', 'utf8'))
const latest = normalize(readFileSync(fresh, 'utf8'))
rmSync(dir, { recursive: true, force: true })

if (current === latest) {
  console.log('El frontend está sincronizado con la API.')
} else {
  console.error('El contrato de la API cambió. Ejecuta "npm run api:generate" y luego "npm run typecheck".')
  process.exit(1)
}
