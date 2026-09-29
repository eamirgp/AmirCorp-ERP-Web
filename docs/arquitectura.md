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
    layout/              Menú, barra superior, pantalla de error
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
- Si una pantalla no se puede cargar (API apagada, error del servidor), `RouteError` muestra el mensaje en español con "Reintentar" (`defaultErrorComponent` en `main.tsx`).
- **Números, sin comas:** se muestran con punto decimal y un espacio para los miles ("S/ 1 234.50", `lib/format.ts`), igual que los textos que arma la API. Se escriben con `NumberInput`: solo dígitos y punto; si hay una coma avisa "Usa punto para los decimales. No uses comas." y no la adivina; al salir del campo reordena el número ("1500.5" → "1 500.50", sin redondear). `parseNumberInput` lo lee para enviarlo; si no es un número envía `null` y la API responde el mensaje.

## Sesión

`lib/session.ts` guarda el token JWT y avisa cuando cambia. `main.tsx` escucha ese aviso: al cerrar sesión limpia la caché y navega al login. La sesión también se cierra sola cuando vence el token.

## Cálculos en pantalla

El frontend no calcula montos. Cuando una pantalla necesita mostrar un resultado antes de guardar, la API tiene un endpoint de cálculo. Ejemplo: al registrar una compra, cada cambio en las líneas llama (con 300 ms de pausa) a `POST /api/purchases/preview` y la pantalla muestra los montos por línea, los mensajes de error por línea y los totales que devuelve la API.

## Archivos (Excel)

- **Descargar:** `download()` en `src/api/products.ts` pide el archivo como `blob` y `lib/download.ts` lo guarda con el nombre que manda la API en `Content-Disposition` (la API expone esa cabecera en CORS).
- **Subir:** los endpoints `multipart/form-data` reciben un `FormData` armado en el `bodySerializer` de la llamada (`importForm`).
- **Exportar productos:** botón "Exportar" en `/productos`. Sin filtros descarga todo; con filtros, `ProductExportDialog` pregunta si solo lo que se ve (con los filtros y el orden de la pantalla) o todo. La API filtra y genera el Excel.
- **Carga masiva de productos** (`features/products/product-import-dialog.tsx`, `/productos?importar=true`): subir → revisar → listo. La revisión muestra lo que devuelve `POST /api/products/import/preview` (resumen, acción y cambios por fila); el botón Importar se habilita solo si la API responde `canImport`. El frontend no lee el Excel ni valida filas.

## Historial (auditoría)

- **De un registro:** `HistorySheet` (`features/audit/`) es un panel lateral con la línea de tiempo de `GET /api/audit?EntityType=…&EntityId=…`, con "Ver más" para lo más antiguo. Se abre desde la acción "Historial" de cada fila (y en el detalle de una compra).
- **General:** `/auditoria`, con filtros por módulo, acción, usuario, rango de fechas y texto. Doble clic o Enter en un evento abre el historial de ese registro.
- La API envía los nombres de los campos y los valores ya formateados; `ChangeList` solo los dibuja ("Precio de venta  S/ 25.00 → S/ 30.00").

## Vistas guardadas

- `ViewTabs` (`features/saved-views/`) va arriba del `FilterBar` de cada lista, como pestañas: "Todos" (la pantalla sin vista), una pestaña por vista (★ = predeterminada), "Guardar vista" cuando lo que se ve no coincide con ninguna, y ⚙ para "Administrar vistas" (predeterminada, renombrar, actualizar con los filtros actuales, eliminar). Los diálogos están en `view-dialogs.tsx`.
- Una vista es la URL de la pantalla sin la página ni los diálogos abiertos (`toFilters`), guardada como JSON en la API por usuario.
- "Todos" y "Limpiar filtros" hacen lo mismo: vuelven la pantalla a como abre normalmente (`navigate({ search: {} })`), incluidos el orden y las filas por página. "Limpiar filtros" aparece cuando `isCustomized(search)`.
- La barra de filtros queda en una sola fila: búsqueda, filtros, "Limpiar filtros" y, a la derecha, el orden. En las listas paginadas el total va solo en el pie.
- `applyDefaultView(screen)` va en el `beforeLoad` de la ruta: al **entrar** a la pantalla sin filtros, redirige a la vista predeterminada. Estando dentro no actúa, así "Limpiar filtros" muestra todo.

## Cómo agregar una pantalla de lista

Ejemplo: `/ventas`. Usa `src/routes/_app/socios.tsx` como modelo.

1. **API:** crea `src/api/sales.ts` con sus `queryOptions` (listado paginado con filtros y orden) y mutaciones. Para activar/desactivar usa `useToggleActive`.
2. **Ruta:** crea `src/routes/_app/ventas/index.tsx` con su `validateSearch` (búsqueda, página, filtros y orden en la URL), `loader` y componente. El plugin actualiza `routeTree.gen.ts` solo.
3. **Lista:** `FilterBar` con `SearchBox`, un `FilterChip` por cada filtro que soporte la API y `SortMenu` con sus campos de orden; luego `DataTable` y `Pagination info={data}`. El orden va en `?orden=` y `?dir=` solo cuando el usuario elige uno; si no, no se envía y `SortMenu` muestra el que devuelve la API (`data.sortBy`, `data.sortDescending`). La página va en `?page=` y las filas por página en `?filas=`; los rangos, el total de páginas y las opciones de filas salen de la respuesta. La tabla muestra solo lo que se usa para trabajar: la auditoría no va como columna ni en los formularios. Agrega `<ViewTabs>` antes del `FilterBar` y `beforeLoad: applyDefaultView('<Pantalla>')` (la pantalla debe existir en `SavedViewScreen` de la API).
4. **Formularios y detalle:** en `src/features/sales/`. Agrega la acción "Historial" en cada fila, que abre `HistorySheet` con el tipo de registro de la API (`AuditEntityType`) y su ID.
5. **Menú:** agrega `to: '/ventas'` en `src/components/layout/nav.ts` (y a `NavPath`).
6. Conecta el atajo `N` con `useHotkey('n', ...)`.
