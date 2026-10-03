# AmirCorp ERP · Web

Frontend del ERP: la aplicación que usan a diario las empresas para gestionar productos, compras, importaciones, inventario y ventas.

La marca aplicada es la de **Pizarro Accesorios** (ver [docs/diseno.md](docs/diseno.md)). Todo lo propio de la marca vive en `src/brand/`, `src/styles.css` y `public/`.

Consume la API de [AmirCorp-ERP](https://github.com/eamirgp/AmirCorp-ERP) y genera sus tipos a partir del contrato OpenAPI de esa API.

## Estado

| Pantalla | Estado |
|---|---|
| Inicio de sesión | ✅ |
| Marco al estilo Apple: menú lateral por área, barra superior, menú del usuario (todo claro; el modo oscuro vuelve después) | ✅ |
| Productos | ✅ Buscar, filtrar, ordenar, crear, editar, activar/desactivar, importar y exportar con Excel |
| Clientes y proveedores | ✅ Filtros por rol, tipo de documento y estado |
| Empresas | ✅ |
| Usuarios | ✅ Crear, editar, cambiar rol, restablecer contraseña, activar/desactivar |
| Compras | ✅ Lista, detalle, anulación y registro con totales calculados por la API en vivo |
| Auditoría | ✅ Historial de cada registro (panel lateral) y pantalla general con filtros |
| Vistas guardadas | ✅ En todas las listas: guardar filtros y orden con un nombre, y abrir la pantalla con una vista predeterminada |
| Ventas, importaciones, inventario | 🚧 Aparecen en el menú como "pronto" |

## Tecnología

| Pieza | Uso |
|---|---|
| React 19 + TypeScript 5.9 + Vite 8 | Base |
| TanStack Router | Rutas por archivos, con tipos y precarga al pasar el mouse |
| TanStack Query | Caché de datos del servidor y actualizaciones optimistas |
| TanStack Table 8 | Tablas |
| React Hook Form + Zod | Formularios y validación |
| Tailwind CSS 4 | Estilos, sobre el sistema de diseño propio de `src/styles.css` |
| Radix UI | Diálogos y menús accesibles |
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
| `npm run api:check` | Falla si el frontend quedó desincronizado con la API |

## Regla principal: el frontend es "tonto"

La API es la única fuente de verdad. El frontend **no valida reglas de negocio, no calcula, no normaliza y no decide permisos**: envía lo que el usuario escribe y muestra lo que la API responde, incluidos sus mensajes de error. Detalle en [docs/decisiones.md](docs/decisiones.md#6-frontend-tonto-la-api-es-la-única-fuente-de-verdad).

### Cuando cambia la API
1. Arranca la API con los cambios.
2. `npm run api:generate`.
3. `npm run typecheck`: TypeScript marca cada lugar del frontend que quedó desactualizado.
4. `npm run api:check` debe decir que está sincronizado.

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `N` | Nuevo registro en la pantalla actual |
| `/` | Ir al buscador de la tabla |
| `↑` `↓` `Enter` | Recorrer la tabla y abrir un registro |
| `Esc` | Cerrar diálogos |

## Documentación

- [Arquitectura](docs/arquitectura.md): estructura de carpetas, flujo de datos y cómo agregar una pantalla.
- [Sistema de diseño](docs/diseno.md): colores, tipografía y reglas visuales.
- [Decisiones](docs/decisiones.md): qué se decidió y por qué.
