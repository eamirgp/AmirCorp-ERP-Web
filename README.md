# AmirCorp ERP · Web

Frontend del ERP de AmirCorp: la aplicación que usan a diario las empresas del grupo para gestionar productos, compras, importaciones, inventario y ventas.

Consume la API de [AmirCorp-ERP](https://github.com/eamirgp/AmirCorp-ERP) y genera sus tipos a partir del contrato OpenAPI de esa API.

## Estado

| Pantalla | Estado |
|---|---|
| Inicio de sesión | ✅ |
| Layout, menú, paleta de comandos (Ctrl+K), tema claro/oscuro | ✅ |
| Productos: buscar, filtrar, crear, editar, activar/desactivar | ✅ |
| Ventas, importaciones, compras, inventario | 🚧 Aparecen en el menú como "Pronto" |

## Tecnología

| Pieza | Uso |
|---|---|
| React 19 + TypeScript 5.9 + Vite 8 | Base |
| TanStack Router | Rutas por archivos, con tipos y precarga al pasar el mouse |
| TanStack Query | Caché de datos del servidor y actualizaciones optimistas |
| TanStack Table 8 | Tablas |
| React Hook Form + Zod | Formularios y validación |
| Tailwind CSS 4 | Estilos, sobre el sistema de diseño propio de `src/styles.css` |
| Radix UI + cmdk | Diálogos, menús y paleta de comandos accesibles |
| openapi-typescript + openapi-fetch | Cliente de la API con tipos generados |

## Puesta en marcha

Requisitos: **Node 22 o superior** y la **API corriendo** en `http://localhost:5117` (ver el README de AmirCorp-ERP).

```bash
npm install
```
```bash
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con el SuperAdmin configurado en la API. El puerto 5173 es fijo: es el único origen que la API acepta (CORS).

Para usar otra dirección de API, copia `.env.example` como `.env.local` y cambia `VITE_API_URL`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga instantánea |
| `npm run build` | Build de producción en `dist/` y verificación de tipos |
| `npm run typecheck` | Solo verificación de tipos |
| `npm run api:generate` | Regenera `src/api/schema.d.ts` desde la API corriendo |

### Cuando cambia la API
1. Arranca la API con los cambios.
2. `npm run api:generate`.
3. `npm run typecheck`: TypeScript marca cada lugar del frontend que quedó desactualizado.

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl` `K` | Paleta de comandos: buscar productos, crear, ir a otra pantalla, cerrar sesión |
| `N` | Nuevo registro en la pantalla actual |
| `/` | Ir al buscador de la tabla |
| `↑` `↓` `Enter` | Recorrer la tabla y abrir un registro |
| `Esc` | Cerrar diálogos |

## Documentación

- [Arquitectura](docs/arquitectura.md): estructura de carpetas, flujo de datos y cómo agregar una pantalla.
- [Sistema de diseño](docs/diseno.md): colores, tipografía y reglas visuales.
- [Decisiones](docs/decisiones.md): qué se decidió y por qué.
