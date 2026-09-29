# Sistema de diseño

Basado en el **Manual de Identidad Visual de H&P Pizarro Accesorios E.I.R.L.** (Lorena Salcedo): negro como base, verde jade como secundario y gris como acento. Títulos en League Spartan y textos en Source Sans.

Un ERP se usa muchas horas al día, así que la identidad se aplica con criterio **minimalista**: fondo blanco, neutros puros, bordes finos, sin sombras en la página y mucho aire. El negro es la acción principal y el jade aparece solo como acento puntual.

## Dónde vive la marca

| Qué | Dónde |
|---|---|
| Nombre y razón social | `src/brand/index.ts` |
| Logo (ícono + palabra "pizarro ACCESORIOS") | `src/brand/logo.tsx`, `icon-light.png`, `icon-dark.png` |
| Colores y fuentes | `src/styles.css` |
| Favicon | `public/favicon.png`, `public/apple-touch-icon.png` |

Las pantallas no nombran la marca directamente: usan `brand` y `<Logo />`. Para otra empresa basta con cambiar esos archivos.

## Colores

| Manual | Valor | Uso en el ERP |
|---|---|---|
| Negro (base) | `#000000` (`#0A0A0A` en pantalla) | Texto principal y **acción principal**: botón negro, blanco en modo oscuro |
| Verde jade (secundario) | `#5AAF76` | Acento puntual: ícono de la pantalla activa, foco de las filas, estado "Activo", marca de selección |
| Gris (acento) | `#737373` | Texto secundario. Cumple el contraste mínimo sobre blanco |

Decisiones de uso:
- **El jade no se usa en bloques grandes.** Aparece en detalles: la marca se reconoce sin cargar la pantalla.
- **Neutros puros**, sin tinte, en la línea del gris del manual.
- **Sin sombras en la página.** Los bloques se separan con líneas finas o solo con espacio. Las sombras quedan para lo que flota: diálogos, menús y paneles laterales.
- **El jade como texto** se oscurece (`accent-text`, `#2A7445`) para leerse sobre blanco. En modo oscuro se aclara (`#6CC08A`).

Tokens en `src/styles.css`, usados como utilidades de Tailwind:

| Token | Uso |
|---|---|
| `bg`, `surface`, `surface-2` | Fondo, paneles y fondo suave del ítem o fila activa |
| `line`, `line-strong` | Bordes finos; `line-strong` en controles |
| `ink`, `muted`, `faint` | Texto principal, secundario (gris del manual) y de apoyo |
| `primary`, `primary-ink` | Botón principal: negro con texto blanco, invertido en modo oscuro |
| `accent`, `accent-soft`, `accent-text` | Jade: acento, fondo suave y jade legible como texto |
| `ok`, `warn`, `bad` | Color del punto de estado: activo o aceptado, pendiente, anulado o error |

El tema sigue al sistema operativo y el usuario puede fijarlo en claro u oscuro desde su menú.

## Tipografía

### Tamaños

La escala está en `src/styles.css` (`@theme`) y es generosa a propósito: el sistema se usa muchas horas al día y lo usan también personas mayores. **Para agrandar o achicar toda la aplicación se cambian esos valores**, no los componentes. En el código nunca se escriben tamaños a mano (`text-[13px]`): se usa la escala.

| Clase | Tamaño | Uso |
|---|---|---|
| `text-2xs` | 12.5 px | Etiquetas en mayúsculas, teclas de atajos |
| `text-xs` | 13.5 px | Datos secundarios: documentos, códigos, cabeceras de tabla |
| `text-sm` | 15 px | Botones, etiquetas de campos, filtros, menús |
| `text-base` | 16 px | Texto general, tablas, campos |
| `text-md` | 17 px | Texto destacado |
| `text-lg` | 19 px | Totales, títulos de diálogo |
| `text-xl` / `text-2xl` | 24 / 28 px | Títulos de pantalla |

Los campos y botones miden 40 px de alto, y los botones pequeños y chips de filtro 36 px.

### Fuentes

| Rol | Fuente | Clase |
|---|---|---|
| Títulos y logo | League Spartan | `font-display` |
| Textos | Source Sans 3 (versión actual de Source Sans Pro) | (por defecto) |
| Códigos | Source Code Pro, de la misma familia | `font-mono` |
| Montos y cantidades | Source Sans con cifras tabulares | `num` |

Las fuentes están instaladas en el proyecto (`@fontsource-variable`), sin depender de Google Fonts. Las etiquetas pequeñas (`label-caps`) van en mayúsculas espaciadas, como el "A C C E S O R I O S" del logo.

## Logo

- `<Logo />` cambia solo según el tema: P negra con rueda jade sobre claro, P jade con rueda blanca sobre oscuro.
- `tone="light"` o `tone="dark"` fuerzan una versión.
- La palabra "pizarro ACCESORIOS" se escribe con la fuente real (League Spartan Bold), no es una imagen.
- El ícono se extrajo del PDF del manual (PNG transparente de 828×992). La versión para fondo oscuro se generó recoloreando esa imagen con los colores de la variante oficial. Si el diseñador entrega el SVG original, conviene reemplazarlo.

## Reglas

- **Tablas limpias:** cabecera sin fondo, filas separadas por una línea fina, acciones visibles al pasar el mouse o al enfocar la fila.
- **Filtros como chips**, al estilo de Stripe o Linear: `⊕ Estado` punteado sin valor, `Estado: Activos ✕` con valor. A la derecha, el número de resultados y el menú "Ordenar". "Limpiar filtros" aparece solo con filtros aplicados. Por defecto no hay filtros: se ve todo y lo inactivo aparece atenuado.
- **Estados como punto de color + texto** (`Pill`), sin fondo.
- **Atajos discretos:** se enseñan en Inicio y como ayuda al pasar el mouse. No hay cajitas de teclas en cada botón.
- **Todo se puede hacer con teclado:** `/` para buscar, `N` para crear, flechas y Enter.
- **Los mensajes hablan como el usuario** y vienen de la API.
- **Nada de emojis, degradados ni íconos decorativos.**
- **Movimiento mínimo:** solo la aparición de diálogos y avisos, desactivado con `prefers-reduced-motion`.

## Componentes base

En `src/components/ui/`:

| Componente | Uso |
|---|---|
| `Button`, `Input`, `Select`, `Field` | Controles de formulario; `Field` enlaza etiqueta, control y ayuda |
| `Dialog`, `toast` | Ventanas modales y avisos breves |
| `DataTable`, `RowActions` | Tabla estándar con navegación por teclado y acciones por fila |
| `FilterBar`, `FilterChip`, `SortMenu` | Barra de filtros, chips y menú de orden |
| `SearchBox`, `Pagination`, `EmptyState`, `Loading` | Piezas de las listas |
| `SearchSelect` | Elegir un registro buscándolo en la API (proveedor, producto) |
| `Pill`, `Kbd`, `PageHeader`, `ErrorList`, `Panel` | Estado, tecla, título de pantalla, errores de la API |
