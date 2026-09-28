# Arquitectura

## Carpetas

```
src/
  main.tsx               Arranque: router, caché de datos, cierre de sesión global
  styles.css             Sistema de diseño (colores, fuentes, utilidades)
  routeTree.gen.ts       Generado por el plugin de rutas. No se edita a mano.
  brand/                 Marca de la instalación: nombre, textos, logo y tapa de rueda
  routes/                Una ruta por archivo (TanStack Router)
    __root.tsx           Raíz y página 404
    login.tsx            /login
    _app.tsx             Layout con sesión obligatoria (menú + barra superior)
    _app/index.tsx       /
    _app/productos.tsx   /productos
  api/                   Todo lo que habla con la API
    schema.d.ts          Tipos generados desde OpenAPI (npm run api:generate)
    client.ts            Cliente HTTP, token, manejo de errores
    account.ts, catalogs.ts, products.ts   Consultas y mutaciones por recurso
  features/              Componentes propios de un módulo
    products/            Tabla y formulario de productos
  components/
    ui/                  Piezas reutilizables: botón, campos, diálogo, avisos
    layout/              Menú, barra superior, paleta de comandos
  lib/                   Utilidades sin UI: sesión, formatos, atajos, tema
```

## Flujo de datos

1. **La ruta declara qué datos necesita** en su `loader`. Como el router precarga al pasar el mouse sobre un link (`defaultPreload: 'intent'`), los datos suelen estar listos antes del clic.
2. **TanStack Query guarda los datos en caché** (`queryOptions` en `src/api/*.ts`). La misma consulta la usan el `loader` y el componente, y no se pide dos veces.
3. **Las mutaciones invalidan la caché** al terminar, y la tabla se actualiza sola.
4. **Activar o desactivar es optimista**: la fila cambia al instante y se revierte si la API responde error.

## Estado en la URL

Búsqueda, filtros, página y diálogos abiertos viven en la URL (`/productos?q=cable&estado=todos&page=2`). Así una pantalla se puede recargar o compartir, y el botón Atrás funciona. Cada ruta valida sus parámetros con Zod en `validateSearch`; un parámetro inválido se ignora en vez de romper la pantalla.

## Llamadas a la API

```ts
const data = await unwrap(api.GET('/api/products', { params: { query: { Page: 1 } } }))
```

- `api` es el cliente de `openapi-fetch`, tipado con `schema.d.ts`: rutas, parámetros y respuestas se validan al compilar.
- `unwrap` devuelve los datos o lanza `ApiError` con los mensajes que envió la API (`{ errors: [...] }`), listos para mostrar.
- Un **401** cierra la sesión y lleva al login, conservando la pantalla a la que se quería ir.

## Sesión

`lib/session.ts` guarda el token JWT y avisa cuando cambia. `main.tsx` escucha ese aviso: al cerrar sesión limpia la caché y navega al login. La sesión también se cierra sola cuando vence el token.

## Cálculos en pantalla

El frontend no calcula montos. Cuando una pantalla necesita mostrar un resultado antes de guardar, la API tiene un endpoint de cálculo. Ejemplo: al registrar una compra, cada cambio en las líneas llama (con 300 ms de pausa) a `POST /api/purchases/preview` y la pantalla muestra los montos por línea, los mensajes de error por línea y los totales que devuelve la API.

## Cómo agregar una pantalla de lista

Ejemplo: `/ventas`. Usa `src/routes/_app/socios.tsx` como modelo.

1. **API:** crea `src/api/sales.ts` con sus `queryOptions` (listado paginado con filtros y orden) y mutaciones. Para activar/desactivar usa `useToggleActive`.
2. **Ruta:** crea `src/routes/_app/ventas/index.tsx` con su `validateSearch` (búsqueda, página, filtros y orden en la URL), `loader` y componente. El plugin actualiza `routeTree.gen.ts` solo.
3. **Lista:** `FilterBar` con `SearchBox`, un `FilterChip` por cada filtro que soporte la API y `SortMenu` con sus campos de orden; luego `DataTable` y `Pagination`.
4. **Formularios y detalle:** en `src/features/sales/`.
5. **Menú:** agrega `to: '/ventas'` en `src/components/layout/nav.ts` (y a `NavPath`).
6. Conecta el atajo `N` con `useHotkey('n', ...)` y agrega "Nueva venta" a la paleta de comandos.
