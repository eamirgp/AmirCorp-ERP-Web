# Sistema de diseño

## Regla: estilo Apple en todas las pantallas (desde octubre 2026)

Todas las pantallas se rediseñan, una por una, con el mismo estilo Apple que se aprobó en el inicio de sesión, que sigue a Cuenta de Apple (account.apple.com): centrado, en una columna, con el ícono de la marca arriba. (Antes se aprobó una pantalla dividida; se cambió al ver que Apple no divide la pantalla en sus inicios de sesión.) Lo de abajo de esta sección es el sistema anterior: se reemplaza a medida que cada pantalla se rediseña, sin mezclar los dos estilos en una misma pantalla.

**Cómo se trabaja:** cada pantalla se diseña primero en el lienzo de diseño (Claude Design), el usuario la revisa y aprueba, y recién entonces se programa. Al programarla, los valores pasan a tokens de `src/styles.css` (una sola fuente de los colores y medidas) y esta sección se completa con lo nuevo.

| Elemento | Regla |
|---|---|
| Fondo | Blanco. |
| Texto | Principal `#1D1D1F`; secundario `#6E6E73` sobre blanco (5:1). Todo par de colores se mide con la fórmula de WCAG (mínimo 4.5:1; 3:1 en bordes de campos). |
| Títulos | League Spartan 700, grandes y apretados (`letter-spacing` de -0.02em a -0.03em). La jerarquía se marca con tamaño, no con colores. |
| Texto general | Source Sans 3, 17 px. |
| Marca | Negro como base; jade (`#5AAF76`) solo como acento puntual: el foco, el brillo detrás del ícono. Jade como texto sobre blanco: `#2A7445`. El emblema es la "P" dentro de un ícono de app (cuadrado blanco de esquinas redondeadas con sombra suave, `AppIcon`), con un brillo jade difuminado detrás. |
| Campos | 56 px de alto, esquinas de 12 px, borde de 1 px `#86868B` (3.6:1), `FloatingField`. Como en Cuenta de Apple, la etiqueta va dentro: con el campo vacío se ve grande, como texto de ejemplo; al hacer clic o al escribir sube y se achica (12 px) en 200 ms. Al enfocarlo: borde `#1D1D1F` y halo jade suave. Lo que autocompleta el navegador no lo pinta de amarillo. |
| Botones | Principal en forma de píldora, `#1D1D1F` con texto blanco, 50 px de alto (`PillButton`). Efectos de Apple al interactuar (`press`): al pasar el mouse cambia apenas de tono (`#2C2C2E`) y al presionarlo se hunde (escala 0.97) y vuelve al soltarlo, en 150 ms. Acciones secundarias como texto en jade oscuro, con el mismo efecto. |
| Errores | Como pide la guía de Apple (HIG, "Entering data" y "Feedback"): junto a los campos, en rojo, pequeño y con ícono (`InlineError`), no en un recuadro aparte ni en una ventana; los campos con problema, con borde rojo. Al volver a escribir, el error se va. Si el inicio de sesión se rechaza (401), los campos se sacuden de lado a lado como en la Mac o el iPhone (`shake` en `lib/motion.ts`); una falla de conexión o "demasiados intentos" no se sacude. Las ventanas de alerta quedan para lo crítico. |
| Espacio | Generoso. Contenido angosto y centrado (formularios de 360 a 420 px). Pocos elementos por pantalla. |
| Movimiento | Suave, nunca tosco ni con rebotes. Al aparecer, cada bloque sube 14 px y se vuelve visible en 900 ms con la curva `cubic-bezier(0.16, 1, 0.3, 1)`, escalonados de 60 a 80 ms. Cambios de estado en 150 a 200 ms. El ícono de la marca llega creciendo un poco y queda quieto; solo el brillo de atrás respira, en un ciclo lento de 7 s. Todo se apaga con "reducir movimiento" (`prefers-reduced-motion`). |
| Tipografía de Apple | SF Pro no se puede usar en una web: se usan las fuentes del manual con proporciones de Apple. |
| Pantallas grandes | Como Apple: los tamaños suben por escalones (1536, 1920 y 2400 px de ancho), no de forma continua. Títulos grandes, logo e ilustraciones crecen bastante (`grow-on-large`: 15 %, 30 % y 45 %); formularios y texto que se lee crecen poco (`grow-on-large-subtle`: 5 %, 10 % y 15 %) y quedan en una columna de ancho máximo. |
| Tema | Por ahora todo es claro, aunque el sistema operativo esté en modo oscuro: `index.html` fija `data-theme="light"` (decisión 13). El modo oscuro se rediseña al final. El inicio de sesión además usa `always-light`. |
| Marco de la aplicación | `AppShell` (`components/layout/app-shell.tsx`), según la guía de Apple ("Sidebars" y "Toolbars"). **Menú lateral** flotante: panel de vidrio `sidebar` (gris `#F5F5F7` al 82 % con desenfoque), 264 px de ancho, a 10 px de los bordes, esquinas de 22 px, sombra suave. Se oculta con el botón redondo de vidrio (`GlassButton`, símbolo del panel lateral) y entra o sale en 420 ms con la curva `ease-panel`. Opciones de 36 px de alto en píldora, texto de 15 px, íconos de 18 px en jade (`link`); la pantalla actual en píldora `selected` (`#2A7445`, texto blanco 5.7:1); al pasar el mouse, `hover`; los módulos "Pronto" en `disabled`. Títulos de grupo de 13.5 px en gris (`fg-muted`, 4.7:1 sobre el vidrio), sin mayúsculas. El grupo Configuración se despliega con una flecha que gira (`animate-unfold`). **Barra superior** de 64 px, transparente; al bajar 40 px se vuelve vidrio `glass` con una línea fina (`hairline`) y aparece el nombre del módulo. **Menú del usuario:** iniciales en un círculo gris degradado (`monogram-top` a `monogram-bottom`, blanco 5.4:1 al centro) y un menú de vidrio (`glass-menu`, `shadow-menu`) que crece desde la esquina en 180 ms (`animate-menu-open`). En pantallas angostas el menú lateral se abre encima con un velo (`veil`) y entra desde la izquierda (`animate-panel-in`). |

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
| Gris (acento) | `#737373` | Referencia de marca. Como texto se oscurece a `#6B6B6B`: el del manual no llegaba al contraste mínimo sobre el gris de la página (4.31:1) |

Decisiones de uso:
- **El jade no se usa en bloques grandes.** Aparece en detalles: la marca se reconoce sin cargar la pantalla.
- **Neutros puros**, sin tinte, en la línea del gris del manual.
- **Sin sombras en la página.** Los bloques se separan con líneas finas o solo con espacio. Las sombras quedan para lo que flota: diálogos, menús y paneles laterales.
- **El jade como texto** se oscurece (`accent-text`, `#2A7445`) para leerse sobre blanco. En modo oscuro se aclara (`#6CC08A`).

Tokens en `src/styles.css`, usados como utilidades de Tailwind:

| Token | Uso |
|---|---|
| `bg`, `surface`, `surface-2` | Fondo, paneles y fondo suave del ítem o fila activa |
| `line`, `line-strong` | Bordes finos y decorativos (tarjetas, separadores, botones) |
| `control` | Borde de campos y listas desplegables (`#8A8A87`, en oscuro `#6E6E6E`): 3:1 o más sobre la página y las tarjetas, para que se vea dónde escribir (WCAG 1.4.11) |
| `ink`, `muted`, `faint` | Texto principal, secundario (`#525252`, 7.8:1) y de apoyo (`#6B6B6B`, 4.8:1 sobre la página). Todo texto cumple el contraste AA, medido con la fórmula de WCAG y no a ojo: se lee bien en cualquier pantalla y a cualquier edad |
| `primary`, `primary-ink` | Botón principal: negro con texto blanco, invertido en modo oscuro |
| `accent`, `accent-soft`, `accent-text` | Jade: acento, fondo suave y jade legible como texto |
| `ok`, `warn`, `bad` | Color del punto de estado: activo o aceptado, pendiente, anulado o error. El rojo (`#C0392F`) da 4.9:1 sobre su fondo rosado (`bad-soft`) |

Hasta octubre de 2026 el tema seguía al sistema operativo y el usuario podía fijarlo en claro u oscuro desde su menú. Desde la decisión 13 todo es claro mientras se rediseña; los valores del modo oscuro siguen en `styles.css` para cuando se haga.

## Tipografía

### Tamaños

La escala está en `src/styles.css` (`@theme`) y es cómoda a propósito: el sistema se usa muchas horas al día. (Al principio se pensó para personas mayores; los usuarios son el dueño y su equipo, en buena parte gente joven: ver la decisión 11 en decisiones.md.) **Para agrandar o achicar toda la aplicación se cambian esos valores**, no los componentes. En el código nunca se escriben tamaños a mano (`text-[13px]`): se usa la escala.

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

- **Listas en tarjeta (estilo Stripe/Shopify):** la página es gris claro (`--bg`) y cada lista va en una tarjeta blanca (`ListPanel`) con, de arriba abajo: pestañas de vistas como pastillas, barra de filtros, tabla y pie de paginación. La cabecera de la tabla tiene fondo `surface-2` y letra `text-sm`; las filas se separan con una línea fina.
- **Acciones de fila:** un clic en la fila la abre. Las demás acciones van en un solo botón **"⋯"** siempre visible (`RowMenu`), con los nombres escritos; lo que quita algo (desactivar) va al final, en rojo y separado. No se usan íconos sueltos: un ícono sin texto no le dice a una persona mayor qué hace.
- **Paginación con íconos:** cuatro botones cuadrados con borde (primera, anterior, siguiente, última) y "3 / 21" al medio. Las flechas se reconocen sin texto; el nombre sale al pasar el mouse.
- **Buscadores con texto corto** ("Buscar productos") para que se lea completo; en qué campos busca aparece al pasar el mouse (`hint` de `SearchBox`).
- **Estados como pastillas** de color suave (`Pill`): verde jade para activo, gris para inactivo, rojo para anulado.
- **Confirmar lo que quita algo:** desactivar pide confirmación con `ConfirmDialog` (`useConfirmToggle`), explicando qué pasa; activar no. El botón queda bloqueado mientras se guarda.
- **Avisos:** los de éxito se van solos a los 5 s; los de error se quedan hasta que el usuario los cierra.
- **Filtros al estilo de Shopify:** la barra tiene el buscador, un botón **"Filtros"** con el número de filtros aplicados y, a su lado, **"Ordenar"** con el mismo aspecto (el orden no va dentro del panel: decide en qué orden se ven, no qué se ve, y se usa a un clic). El conteo de resultados queda a la derecha. El botón abre un panel lateral con todos los filtros, que se aplican al instante. Debajo de la barra aparecen **solo los filtros aplicados**, como chips `Estado: Activos ✕`, y "Limpiar filtros". Así la barra se ve igual con 1 filtro o con 10. Cada pantalla describe sus filtros (`FilterDef`) y `FilterBar` los dibuja. Por defecto no hay filtros: se ve todo y lo inactivo aparece atenuado.
- **Atajos discretos:** se enseñan en Inicio y como ayuda al pasar el mouse. No hay cajitas de teclas en cada botón.
- **Todo se puede hacer con teclado:** `/` para buscar, `N` para crear, flechas y Enter.
- **Los mensajes hablan como el usuario** y vienen de la API. Los errores de los formularios van todos en `text-sm`; la ayuda de un campo, en `text-xs`.
- **Las ventanas no pierden lo escrito:** un clic fuera no las cierra, Esc tampoco si ya se escribió algo, y mientras guardan no se cierran.
- **Un botón que no se puede usar se explica:** si la API dice que algo no se puede (anular una compra con salidas), se muestra el motivo en vez de esconder el botón sin decir nada.
- **Nada de emojis, degradados ni íconos decorativos.**
- **Movimiento mínimo:** solo la aparición de diálogos y avisos, desactivado con `prefers-reduced-motion`.

## Componentes base

En `src/components/ui/`:

| Componente | Uso |
|---|---|
| `Button`, `Input`, `Select`, `Field` | Controles de formulario; `Field` enlaza etiqueta, control y ayuda |
| `Dialog`, `ConfirmDialog`, `toast` | Ventanas modales, confirmaciones y avisos |
| `DataTable`, `RowMenu` | Tabla estándar con navegación por teclado y el menú "⋯" de cada fila |
| `FilterBar`, `FilterChip`, `SortMenu` | Barra de filtros, chips y menú de orden |
| `ListPanel`, `SearchBox`, `Pagination` | Tarjeta de la lista, buscador y pie de paginación |
| `ListBody` (`ListError`, `EmptyState`, `Loading`) | Los estados de una lista: error con "Reintentar", cargando, filas, nada coincide con "Limpiar filtros" y estado inicial |
| `SearchSelect` | Elegir un registro buscándolo en la API (proveedor, producto) |
| `LookupResult` | Lo que respondió SUNAT o RENIEC, con el resumen y los avisos de la API |
| `Pill`, `Kbd`, `PageHeader`, `ErrorList` | Estado, tecla, título de pantalla, errores de la API |

En `src/components/layout/`: el menú, la barra superior, `RouteError` (una pantalla que no cargó) y `ConnectionError` (al abrir la página sin conexión con la API).
