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
    _app/productos.tsx   /productos (y clientes, proveedores, compras, empresas, usuarios, unidades, auditoría)
  api/                   Todo lo que habla con la API
    schema.d.ts          Tipos generados desde OpenAPI (npm run api:generate)
    client.ts            Cliente HTTP, token, manejo de errores
    products.ts, purchases.ts, …   Consultas y mutaciones por recurso
  features/              Componentes propios de un módulo (products, purchases, partners, companies, users, units,
                         audit, saved-views) y shared/ para lo que usan varios
  components/
    ui/                  Piezas reutilizables: botón, campos, diálogo, avisos, piezas de las listas
    layout/              Marco (menú lateral, barra superior, menú del usuario), lista de módulos (nav.ts), errores
  lib/                   Utilidades sin UI: sesión, formatos, números escritos, filtros, atajos, movimiento
```

## Flujo de datos

1. **La ruta declara qué datos necesita** en su `loader`. Como el router precarga al pasar el mouse sobre un link (`defaultPreload: 'intent'`), los datos suelen estar listos antes del clic.
2. **TanStack Query guarda los datos en caché** (`queryOptions` en `src/api/*.ts`). La misma consulta la usan el `loader` y el componente, y no se pide dos veces.
3. **Las mutaciones invalidan la caché** al terminar, y la tabla se actualiza sola.
4. **Un 409 vuelve a pedir los datos** (`MutationCache` en `main.tsx`): si otra persona cambió el registro, al reabrir el formulario ya trae la versión nueva en vez de repetir el 409 (decisión 32 de la API).
5. **Activar o desactivar es optimista**: la fila cambia al instante y se revierte si la API responde error.

## Estado en la URL

Búsqueda, filtros, página y diálogos abiertos viven en la URL (`/productos?q=cable&estado=todos&page=2`). Así una pantalla se puede recargar o compartir, y el botón Atrás funciona. Cada ruta valida sus parámetros con Zod en `validateSearch`; un parámetro inválido se ignora en vez de romper la pantalla.

## Llamadas a la API

```ts
const data = await unwrap(api.GET('/api/products', { params: { query: { Page: 1 } } }))
```

- `api` es el cliente de `openapi-fetch`, tipado con `schema.d.ts`: rutas, parámetros y respuestas se validan al compilar.
- `unwrap` devuelve los datos o lanza `ApiError` con los mensajes que envió la API (`{ errors: [...] }`), listos para mostrar.
- Un **401** renueva el token una vez y repite el pedido; si la sesión ya no sirve, la cierra y lleva al login, conservando la pantalla a la que se quería ir.
- Si una pantalla no se puede cargar (API apagada, error del servidor), `RouteError` muestra el mensaje en español con "Reintentar" (`defaultErrorComponent` en `main.tsx`). Una lista que no carga hace lo mismo dentro de su tarjeta (`ListError`, dentro de `ListBody`).
- Los avisos flotantes muestran todos los mensajes de la API (`errorText`), no solo el primero.
- **Números, sin comas:** se muestran con punto decimal y un espacio para los miles (`lib/format.ts`), igual que los textos que arma la API. Los montos llevan el símbolo que envía la API con la moneda ("S/", "US$": `formatMoney(valor, símbolo)`), siempre con céntimos y sin esconder decimales de más. Se escriben con `NumberInput` (`lib/number-input.ts`):
  - Solo dígitos y punto. Si hay una coma avisa "Usa punto para los decimales. No uses comas." y no la adivina.
  - El símbolo de soles se acepta solo al inicio, con o sin su punto: "S/. 1500" es 1500. "S/ .50" no se adivina.
  - Más de 15 cifras se avisa: un número de JavaScript las redondearía al enviarlo.
  - Al salir del campo reordena el número trabajando sobre el texto ("1500.5" → "1 500.50", nunca redondea).
  - `parseNumberInput` lo lee para enviarlo; si no es un número envía `null` y la API responde el mensaje.

## Sesión

Decisión 24 de la API: el token de acceso dura 15 minutos y vive **solo en memoria** (`lib/session.ts`); el refresh token va en una cookie httpOnly que JavaScript no puede leer.

- **Al abrir la página** `restore()` recupera la sesión con la cookie. Si la API no responde (sin conexión, reiniciándose), `main.tsx` muestra "No se pudo abrir el sistema" con "Reintentar" (`ConnectionError`) en vez del login: la sesión puede seguir abierta.
- **Renovación:** una sola a la vez, también entre pestañas (`navigator.locks`). Solo un 401 de la renovación cierra la sesión; un error de red no.
- **Cerrar sesión** en una pestaña la cierra en las demás (`BroadcastChannel`). `main.tsx` limpia la caché y navega al login.
- **Otro usuario en otra pestaña:** la cookie es una por navegador. Si la renovación trae el token de otro usuario, el pedido no se envía con esa cuenta y la pantalla se limpia y vuelve al inicio.

## Ventanas (formularios)

`Dialog` protege lo escrito, sin que cada formulario tenga que hacerlo: un clic fuera no la cierra, Esc no la cierra si ya se escribió algo (se cierra con Cancelar o la X), y mientras un botón está guardando (`loading`) no se cierra de ninguna forma.

Dentro de un `Field`, los campos (`Input`, `Select`, `NumberInput`, `SearchSelect`) toman el tamaño de formulario con la etiqueta adentro: lo saben por un contexto de React, así que el formulario solo escribe `<Field label="Nombre">{(a) => <Input {...a} />}</Field>`. Fuera de un `Field` son compactos y necesitan `aria-label`.

`Select` (`components/ui/select.tsx`) dibuja su propio botón y menú, pero por dentro tiene un `<select>` nativo oculto: se usa como una lista común (`form.register`, o `value` y `onChange`, y opciones con `<option>`). Elegir en el menú cambia el valor de la lista oculta y dispara `change`; cuando react-hook-form escribe `select.value` por código, el botón se actualiza solo.

Todo menú nuevo usa `useClickMenu()` (`components/ui/menu.ts`), que lo abre al soltar el clic (decisión 18): `<Menu.Root {...menu.root}>`, `<Menu.Trigger {...menu.trigger}>` y `<Menu.Content {...menu.content}>`, con las clases `glassMenuClass` y `glassItemClass` del mismo archivo.

`ConfirmDialog` es una alerta solo para lo que pierde algo y no se puede deshacer. Activar o desactivar desde una lista no pregunta: `useActivation(toggle, done)` (`features/shared/use-activation.ts`) cambia el estado, avisa con un `toast` y dice qué fila está guardando (`busyId`).

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

- `ViewTabs` (`features/saved-views/`) es el control segmentado de las vistas: "Todos" (la pantalla sin vista), un segmento por vista (★ = predeterminada), "Guardar vista" cuando lo que se ve no coincide con ninguna, y "⋯" para "Administrar vistas" (estrella para la predeterminada y, en el "⋯" de cada vista, usar los filtros de ahora, renombrar y eliminar con alerta; decisión 23). Los diálogos están en `view-dialogs.tsx`. En Productos va dentro del `FilterBar` (`views`), que en el celular lo pone en el carril junto a "Filtros" y "Ordenar"; las demás listas aún lo ponen arriba del `FilterBar`.
- Una vista es la URL de la pantalla sin la página ni los diálogos abiertos (`toFilters`), guardada como JSON en la API por usuario.
- "Todos" y "Limpiar filtros" hacen lo mismo: vuelven la pantalla a como abre normalmente (`navigate({ search: {} })`), incluidos el orden y las filas por página. "Limpiar filtros" aparece cuando `isCustomized(search)`.
- La barra de filtros queda en una sola fila: búsqueda, filtros, "Limpiar filtros" y, a la derecha, el orden. En las listas paginadas el total va solo en el pie.
- `applyDefaultView(screen)` va en el `beforeLoad` de la ruta: al **entrar** a la pantalla sin filtros, redirige a la vista predeterminada. Estando dentro no actúa, así "Limpiar filtros" muestra todo.

## Cómo agregar una pantalla de lista

Ejemplo: `/ventas`. Usa `src/routes/_app/productos.tsx` (paginada) o `empresas.tsx` (lista corta) como modelo.

1. **API:** crea `src/api/sales.ts` con sus `queryOptions` (listado paginado con filtros y orden) y mutaciones. Para activar/desactivar usa `useToggleActive`.
2. **Ruta:** crea `src/routes/_app/ventas/index.tsx` con su `validateSearch` (búsqueda, página, filtros y orden en la URL), `loader` y componente. El plugin actualiza `routeTree.gen.ts` solo.
3. **Lista:** `FilterBar` con `SearchBox`, un `FilterDef` por cada filtro que soporte la API y `SortMenu` con sus campos de orden; luego `ListBody` (error con "Reintentar", cargando, nada coincide (el "Limpiar filtros" está en la barra), estado inicial) con el `DataTable` adentro, y `Pagination info={data}`. Las acciones que dependen de permisos o del estado del registro las decide la API (como `canManage` en usuarios o `cancelError` en compras). El orden va en `?orden=` y `?dir=` solo cuando el usuario elige uno; si no, no se envía y `SortMenu` muestra el que devuelve la API (`data.sortBy`, `data.sortDescending`). Para ordenar con un clic en el título de una columna, ponle `meta: { sortBy: 'Campo' }` (el valor del enum de la API; `sortDescendingFirst` para fechas y montos) y pásale a `DataTable` `sort={sort && { ...sort, onSort }}`, donde `sort = shownSort(search.orden, search.dir, data)` (lo elegido o lo que aplicó la API) y `onSort` navega con `nextSort(prev, campo, descendingFirst, data)`: se calcula sobre la última URL pedida, así dos clics seguidos invierten el orden aunque la lista nueva no haya llegado. El menú "Ordenar" navega con `sortSearch(campo, descendente, data)`. Los dos quitan el orden de la URL si es el de por defecto de la API (`defaultSortBy`, `defaultSortDescending`; decisión 19). La página va en `?page=` y las filas por página en `?filas=` (`Pagination` avisa `undefined` al volver a `defaultPageSize`, para no dejar `filas=10`); los rangos, el total de páginas y las opciones de filas salen de la respuesta. La tabla muestra solo lo que se usa para trabajar: la auditoría no va como columna ni en los formularios. Pasa `<ViewTabs>` al `FilterBar` en `views` y agrega `beforeLoad: applyDefaultView('<Pantalla>')` (la pantalla debe existir en `SavedViewScreen` de la API). **En el celular** (`useIsPhone()`, menos de 768 px) muestra una `GroupedList` en lugar del `DataTable` (nombre arriba, datos chicos debajo, valor a la derecha y el mismo `RowMenu`) y dale a `PageHeader` sus `compactActions`: un `MoreMenu glass` con lo secundario y un `Button size="icon" variant="primary"` con "+" para crear (decisión 23; modelo: `productos.tsx` y `products-table.tsx`).
4. **Formularios y detalle:** en `src/features/sales/`. Agrega la acción "Historial" en cada fila, que abre `HistorySheet` con el tipo de registro de la API (`AuditEntityType`) y su ID.
5. **Menú:** agrega `to: '/ventas'` a su opción en `src/components/layout/nav.ts` (y a `NavPath`); deja de verse como "Pronto". Las opciones van agrupadas por área (decisión 13); el nombre chico de la barra superior sale de ahí (`moduleTitle`).
6. Conecta el atajo `N` con `useHotkey('n', ...)`.
