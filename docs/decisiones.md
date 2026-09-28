# Decisiones

### 1. Repositorio separado de la API
**Fecha:** setiembre 2026

El frontend vive en su propio repositorio, con su historial y su despliegue. Para que no se desincronice con la API, los tipos se generan desde el contrato OpenAPI (`npm run api:generate`) y TypeScript marca lo que cambió.

### 2. React + TanStack en vez de un framework completo
**Fecha:** setiembre 2026

Es una aplicación interna detrás de un login, sin necesidad de SEO ni renderizado en servidor. Una SPA con Vite es más simple de desplegar (archivos estáticos) y muy rápida. TanStack Router y Query aportan la precarga y la caché que hacen que la navegación se sienta instantánea.

### 3. Sistema de diseño propio
**Fecha:** setiembre 2026

Radix UI aporta el comportamiento accesible (diálogos, menús) sin imponer estilos. El aspecto es propio (jade, Archivo, IBM Plex) y parte del simulador que se le mostró al cliente, para no parecer una plantilla genérica. Ver [diseno.md](diseno.md).

### 4. Versiones fijadas
**Fecha:** setiembre 2026

- **TypeScript 5.9:** la 7 (el nuevo compilador) aún no es compatible con `openapi-typescript`.
- **TanStack Table 8:** la 9 cambió su API; se migrará cuando haga falta.

### 5. Token en localStorage (temporal)
**Fecha:** setiembre 2026

La API emite solo un JWT de 60 minutos, sin refresh token. El frontend lo guarda en `localStorage` para sobrevivir a una recarga y cierra la sesión cuando vence.

**Pendiente antes de producción:** que la API emita un refresh token en una cookie `httpOnly` y que el JWT viva solo en memoria. Guardarlo en `localStorage` lo expone si alguna vez hubiera un ataque XSS.

### 6. Pendientes conocidos
- **Navegación en celular:** el menú lateral se oculta en pantallas angostas. Hoy se navega con la paleta (Ctrl+K o el buscador superior); falta un menú móvil.
- **Selector de empresa:** cuando existan pantallas por empresa (compras, stock, ventas), irá en la barra superior.
