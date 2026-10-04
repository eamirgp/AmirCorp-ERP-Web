# Decisiones

### 1. Repositorio separado de la API
**Fecha:** setiembre 2026

El frontend vive en su propio repositorio, con su historial y su despliegue. Para que no se desincronice con la API, los tipos se generan desde el contrato OpenAPI (`npm run api:generate`) y TypeScript marca lo que cambió.

### 2. React + TanStack en vez de un framework completo
**Fecha:** setiembre 2026

Es una aplicación interna detrás de un login, sin necesidad de SEO ni renderizado en servidor. Una SPA con Vite es más simple de desplegar (archivos estáticos) y muy rápida. TanStack Router y Query aportan la precarga y la caché que hacen que la navegación se sienta instantánea.

### 3. Sistema de diseño propio
**Fecha:** setiembre 2026

Radix UI aporta el comportamiento accesible (diálogos, menús) sin imponer estilos. El aspecto es propio, para no parecer una plantilla genérica. Ver [diseno.md](diseno.md).

**Actualización:** el ERP lo usarán dos empresas de la familia, cada una en su propia instalación. La primera identidad aplicada es la de **Pizarro Accesorios**, según su Manual de Identidad Visual (negro, jade `#5AAF76`, gris `#737373`, League Spartan y Source Sans). Todo lo propio de la marca quedó concentrado en `src/brand/`, `src/styles.css` y `public/`, para poder preparar la versión de la otra empresa sin tocar las pantallas.

### 4. Versiones fijadas
**Fecha:** setiembre 2026

- **TypeScript 5.9:** la 7 (el nuevo compilador) aún no es compatible con `openapi-typescript`.
- **TanStack Table 8:** la 9 cambió su API; se migrará cuando haga falta.

### 5. Token en localStorage (temporal)
**Fecha:** setiembre 2026

La API emite solo un JWT de 60 minutos, sin refresh token. El frontend lo guarda en `localStorage` para sobrevivir a una recarga y cierra la sesión cuando vence.

**Pendiente antes de producción:** que la API emita un refresh token en una cookie `httpOnly` y que el JWT viva solo en memoria. Guardarlo en `localStorage` lo expone si alguna vez hubiera un ataque XSS. *(Hecho: ver la decisión 9.)*

### 6. Frontend "tonto": la API es la única fuente de verdad
**Fecha:** setiembre 2026

El frontend no decide nada del negocio. Muestra lo que la API devuelve, envía lo que el usuario escribe y muestra los errores de la API.

**El frontend NO hace:**
- Validaciones de negocio: requeridos, largos máximos, formatos de RUC o DNI, montos mínimos. Si el usuario escribe algo inválido, la API responde con el mensaje y el formulario lo muestra.
- Cálculos: IGV, totales, costos, conversiones de unidades o de moneda. Cuando una pantalla necesita ver un total antes de guardar (por ejemplo, una compra), la API expone un endpoint que lo calcula.
- Normalizaciones: mayúsculas, ceros a la izquierda, recortes.
- Decidir permisos por su cuenta: qué módulos o acciones ve cada rol lo informará la API.

**El frontend SÍ hace:**
- Presentación: formatos de números y fechas, orden visual, colores de estado.
- Convertir lo escrito al tipo que pide el contrato (texto a número). Si no se puede, envía `null` y la API responde con el error.
- Comodidades que no deciden nada: estado en la URL, atajos, búsqueda con pausa, actualizaciones optimistas que se revierten si la API rechaza.

**Textos:** las descripciones de catálogos, roles y estados vienen de la API (`unitOfMeasureDescription`, `roleDescription`...).

### 7. Sincronización con la API
**Fecha:** setiembre 2026

- Los tipos se generan del contrato OpenAPI: `npm run api:generate`.
- `npm run api:check` falla si el contrato de la API corriendo no coincide con `src/api/schema.d.ts`. Se corre antes de cada commit que toque llamadas a la API.
- Flujo al cambiar la API: cambio en el backend → `api:generate` → `typecheck` → corregir lo que TypeScript marque → commit en ambos repos.

### 8. Pendientes conocidos
- **Selector de empresa:** cuando existan pantallas por empresa (compras, stock, ventas), irá en la barra superior.

### 9. Token solo en memoria (reemplaza la decisión 5)
**Fecha:** octubre 2026

Lo pendiente de la decisión 5 ya se hizo (decisiones 24 y 28 de la API): el token de acceso vive solo en memoria y la sesión se recupera con un refresh token en una cookie httpOnly. Ver "Sesión" en [arquitectura.md](arquitectura.md#sesión). Lo que quedaba en `localStorage` de la versión anterior se borra al abrir la página.

### 10. Tercera revisión de octubre: lo que cambió en la pantalla
**Fecha:** octubre 2026

El detalle y el motivo de cada cambio están en las decisiones 32, 33 y 34 de la API. En la pantalla:

- **Datos que no se pierden ni se guardan mal (32):** un 409 vuelve a pedir los datos; las ventanas no se cierran con un clic fuera, con Esc si hay algo escrito ni mientras guardan; "S/. 1500" se lee como 1500 y más de 15 cifras se avisa; sin conexión al abrir se muestra "Reintentar" en vez del login; si otro usuario inició sesión en otra pestaña, la pantalla se limpia.
- **Legible para personas mayores (33):** contraste medido (rojo de errores, gris tenue y borde propio de los campos), errores del mismo tamaño, avisos con todos los mensajes, "Reintentar" en las listas y montos con el símbolo de moneda que envía la API.
- **La pantalla deja de decidir (34):** si se puede anular una compra (`cancelError`) y qué acciones hay sobre cada usuario (`canManage`) lo dice la API; las empresas activas las filtra la API; los códigos se ven en mayúsculas solo con CSS. Las 7 listas usan `ListBody`.
- **Pendiente:** algunas explicaciones fijas siguen escritas aquí (bloqueo de compras o ventas, etiquetas de orden, resumen de la importación). ESLint no está instalado aunque el código tiene comentarios para él.

### 11. Usuarios: el equipo completo, no solo personas mayores
**Fecha:** octubre 2026

Hasta ahora el diseño se pensó para personas mayores (letra y campos grandes, nada de etiquetas dentro de los campos). Los usuarios reales son el dueño y su equipo, en buena parte gente joven (sus hijos y trabajadores). Desde ahora el diseño apunta a un estilo moderno, al estilo Apple, sin agrandar todo por defecto. Se mantiene lo que sirve a cualquiera: textos claros, pocos campos, contraste medido y movimiento suave que se apaga con "reducir movimiento". La primera pantalla con este criterio es el inicio de sesión, diseñada antes de programarla.

### 12. Inicio de sesión al estilo de Cuenta de Apple
**Fecha:** octubre 2026

Primero se aprobó y programó una pantalla dividida (panel negro de la marca y formulario). Al revisar las páginas reales de Apple (Cuenta de Apple e iCloud) se vio que Apple no divide la pantalla: centra todo en una columna con un emblema arriba. Se cambió a eso: el ícono de la "P" como ícono de app (quieto, con un brillo jade que respira detrás), el título "Inicia sesión" con "Portal de gestión de Pizarro Accesorios." debajo (como la ventana de inicio de sesión de Apple: el título es la acción), y los efectos de Apple al interactuar (la etiqueta del campo sube al escribir, el botón se hunde al presionarlo). Todo se volvió regla en `diseno.md`, con los componentes `FloatingField`, `PillButton`, `Notice` y `AppIcon` para las próximas pantallas.

### 13. Marco de la aplicación al estilo Apple, menú por área y todo claro
**Fecha:** octubre 2026

La segunda pieza rediseñada, aprobada en el lienzo de diseño antes de programarla. Sigue la guía de Apple (HIG, "Sidebars" y "Toolbars"):

- **Menú lateral flotante:** un panel de vidrio gris claro con esquinas redondeadas, separado del borde, como los menús laterales de macOS e iPadOS que flotan sobre el contenido. Se puede ocultar (Apple pide que se pueda, pero que se vea al entrar) y la elección se recuerda en esa computadora. En el celular se abre encima, con un velo detrás, y se cierra al elegir una pantalla.
- **Íconos en jade y la pantalla actual en una píldora jade** con texto blanco, como en las imágenes de la guía: los íconos del menú lateral van en el color de acento.
- **Barra superior transparente** que al bajar la página se vuelve vidrio con una línea fina y muestra el nombre del módulo en chico (como el título grande del iPhone que pasa a la barra). El menú del usuario (sus iniciales en un círculo gris, como Contactos) va arriba a la derecha: Apple aconseja no poner lo importante abajo del menú lateral.
- **Menú por área, como Odoo:** Comercial (Ventas, Clientes), Abastecimiento (Compras, Proveedores, Importaciones), Almacén (Productos, Inventario) y Configuración (Empresas, Unidades de medida, Usuarios, Auditoría). Se quitó "Maestros", que es palabra de SAP y escondía Productos. Los títulos no repiten el nombre de una opción. Configuración se abre y se cierra con una flecha (Apple: agrupar con controles de despliegue) y se abre sola si la pantalla actual está adentro. Los módulos que aún no existen siguen visibles con "Pronto", a pedido del dueño.
- **Todo claro por ahora:** el dueño pidió hacer primero todo el sistema en claro y ver el modo oscuro después. `index.html` fija `data-theme="light"`, se quitó la opción de tema del menú del usuario (y `lib/theme.ts`), y los colores del modo oscuro quedan en `styles.css` sin usarse hasta rediseñarlo.
- **Pendiente:** las pantallas de adentro siguen con el estilo anterior hasta rediseñarlas una por una; mientras tanto se ven sobre fondo blanco en vez del gris de antes.

### 14. Componentes base al estilo Apple, desactivar sin confirmar y orden por columna
**Fecha:** octubre 2026

La tercera pieza del rediseño, aprobada en el lienzo de diseño. Se cambiaron los componentes de `src/components/ui` sin cambiar cómo se usan, así que todas las pantallas los toman a la vez. Cada uno sigue una página de la guía de Apple (HIG); el detalle está en `diseno.md`, "Componentes base".

- **Botones, campos, ventanas, avisos, tabla, filtros, vistas y panel lateral** con el estilo del inicio de sesión y del marco: píldoras que se hunden, campos de formulario con la etiqueta adentro, hojas y alertas como las de la Mac, avisos en cápsula arriba al centro, menús y paneles de vidrio, vistas como control segmentado y filtros aplicados como fichas.
- **Tabla en franjas**, a pedido del dueño (Apple las sugiere en la Mac para tablas anchas), y sin tarjeta alrededor.
- **Desactivar no pide confirmación** (reemplaza la regla "Confirmar lo que quita algo" de `diseno.md`). La guía de Apple pide no interrumpir con una alerta lo que se puede deshacer, y desactivar se deshace activando: la fila queda atenuada y un aviso dice lo que pasó. `useConfirmToggle` pasó a ser `useActivation`. La alerta (`ConfirmDialog`) queda para lo que pierde algo y no se puede deshacer: salir sin guardar una compra o cambiar el proveedor con productos en las líneas. Bloquear un cliente o proveedor sigue abriendo su ventana, porque pide el motivo.
- **Ordenar con un clic en el título de una columna** (Apple, en la Mac: otro clic invierte el orden). Lo ordena la API (decisión 35 de la API, que agregó los campos que faltaban): productos por código, nombre y precio; clientes y proveedores por documento y nombre; compras por fecha, comprobante, proveedor, empresa y total. Fechas y montos empiezan de mayor a menor. El menú "Ordenar" sigue para lo que no es una columna (fecha de creación o de registro). Las listas cortas sin paginar (empresas, usuarios, unidades) no ordenan por columna: la API ya las devuelve en orden y ordenarlas en la pantalla sería lógica fuera de la API.

### 15. Pantalla de Productos al estilo Apple
**Fecha:** octubre 2026

La primera pantalla rediseñada completa, aprobada en el lienzo de diseño. La lista ya usaba los componentes base; cambiaron sus ventanas:

- **Formulario del producto:** el precio lleva "S/" delante del número (`Field prefix`) y la ayuda debajo ("En soles, con IGV.") en vez de dentro de la etiqueta. Los códigos de proveedores van en una lista agrupada, como Ajustes de Apple: un bloque gris con una fila por proveedor y "Agregar código de proveedor" al final.
- **Importar, paso 1:** dos pasos numerados (descargar la plantilla, subir el archivo), una zona para soltar el archivo que, ya elegido, muestra su nombre, tamaño y "Cambiar", y "Actualizar los productos que ya existen" como interruptor en una fila (`SwitchRow`; la guía de Apple usa interruptores para encender o apagar una opción, dentro de una fila de lista).
- **Importar, paso 2:** el resumen en mosaicos con la cifra grande (como Recordatorios de Apple). Un clic en un mosaico muestra solo esas filas y otro clic las muestra todas; reemplaza al filtro "Resultado", y `FilterChip` se quitó porque solo lo usaba esta ventana.
- **Importar, paso 3:** un check grande en jade que llega creciendo.
- **Exportar:** las dos opciones como tarjetas con su marca; la elegida queda blanca con borde.
- **Historial:** la línea de tiempo en el panel de vidrio, con el evento más reciente en jade y cada cambio como "Precio de venta: ~~S/ 139.00~~ → S/ 149.00" (`ChangeList`, que también usa Auditoría).

### 16. Colores de Apple para los estados; el jade sigue de acento
**Fecha:** octubre 2026

El dueño pidió usar los mismos colores que Apple. Se revisó la guía (HIG "Color") y apple.com:

- **Los grises ya eran los de Apple** (`#1D1D1F`, `#6E6E73`, `#F5F5F7` y los de bordes y botones, medidos en apple.com).
- **El acento sigue siendo el jade de la marca.** Apple usa azul (`#0071E3` en botones y `#0066CC` en enlaces de apple.com), pero su guía dice que en apps de contenido sin color elegir el color de la marca como acento "puede ser una forma efectiva de reflejar la identidad de la empresa". El dueño eligió esta opción entre jade, azul de Apple o dejarlo igual.
- **Los estados pasan a los colores de Apple:** verde, naranja y rojo del sistema. Los normales no se leen como texto sobre blanco (verde `#34C759` da 2.2:1, rojo `#FF383C` 3.6:1); sus versiones de alto contraste (`#008932`, `#C55300`, `#E9152D`) pasan sobre blanco pero no sobre un fondo de color (4.0:1). Se usa el mismo tono apenas más oscuro: verde `#007A2C`, naranja `#B04A00` (texto; el punto usa `#C55300`) y rojo `#D10F25`, que dan 4.9:1 sobre su fondo suave, 5.5:1 sobre blanco y 4.5:1 sobre el gris de los botones. Cambian las pastillas de estado, los errores, el aviso de éxito y los mosaicos de la importación; las fichas de filtro siguen en jade porque son acento, no estado.
- **Filas de la tabla:** se mantiene el tinte suave al pasar el mouse. En la Mac (Finder, Mail) las filas no se sombrean y se abren con doble clic; en el iPad con mouse Apple pide un tinte suave para elementos grandes como una fila (HIG "Pointing devices", sin agrandarla). Aquí un solo clic abre el registro, como en el iPad.

### 17. Listas desplegables y menús como en la Mac
**Fecha:** octubre 2026

La lista desplegable nativa del navegador se veía como la de Windows (lista blanca con la opción en azul) y no se le puede cambiar el aspecto. Se reemplazó por la de Apple (HIG "Pop-up buttons" y "Menus"), aprobada en el lienzo de diseño:

- **`Select` propio:** un botón con la opción elegida y flechas arriba y abajo que abre el menú de vidrio del sistema, con una marca ✓ en la opción actual. Como en la Mac, el menú se abre con la opción elegida justo sobre el botón y queda marcada para seguir con las flechas. Lo usan todas las listas: filas por página, unidad, IGV, tipo de documento, empresa, moneda, rol…
- **Los formularios no cambiaron:** por dentro sigue un `<select>` nativo oculto que los formularios registran como siempre (`form.register`, `value`, `onChange`); el menú cambia su valor y dispara `change`. Cuando el formulario escribe el valor por código (al cargar o limpiar), el botón se entera y se actualiza.
- **Todos los menús resaltan en jade con letra blanca** la opción bajo el mouse o elegida con las flechas (antes, gris suave): el del usuario, el "⋯" de las filas, "Ordenar", las listas y los resultados de los buscadores. Es lo que hace la Mac con el color de acento.

### 18. Los menús se abren al soltar el clic
**Fecha:** octubre 2026

Radix abre sus menús apenas se presiona el botón del mouse (la Mac hace lo mismo), y al dueño no le gustó que se abrieran tan rápido: pidió que se abran al soltar el clic, como la mayoría de las páginas web. Todos los menús usan `useClickMenu` (`components/ui/menu.ts`): las listas desplegables, "Ordenar", el "⋯" de las filas y el menú del usuario.

- **Al presionar no pasa nada; el clic completo abre o cierra el menú.** Un clic afuera lo cierra; un clic en su propio botón también (no cuenta como "afuera").
- **Los menús dejaron de ser "modales":** con el menú abierto, Radix bloqueaba los clics en el resto de la página y, según el momento, el clic en el botón le llegaba o no, así que a veces el menú no se cerraba. Ahora el clic siempre llega al botón y se comporta igual cada vez.
- **El teclado no cambia:** Enter, espacio o flecha abajo abren el menú y Esc lo cierra (lo maneja Radix).

### 19. Volver a lo de por defecto no deja rastro en la URL
**Fecha:** octubre 2026

Error que encontró el dueño: en la vista "Activos", cambiar las filas por página y volver a 10 dejaba la vista sin marcar, porque la URL quedaba con `filas=10` y la vista guardada no lo tiene. Ahora la API dice cuál es su tamaño de página y su orden por defecto (decisión 36 de la API) y la pantalla los quita de la URL cuando se vuelve a ellos:

- `Pagination` avisa `undefined` al elegir el tamaño por defecto (`defaultPageSize`).
- Ordenar (con el menú o con un clic en una columna) pasa por `sortSearch` (`lib/filters.ts`): si el orden elegido es el de por defecto (`defaultSortBy`, `defaultSortDescending`), no va a la URL.
- Así la lista se reconoce igual a la que abre normalmente (se marca "Todos") o a su vista guardada.

### 20. Un producto nuevo empieza con precio 0.00
**Fecha:** octubre 2026

A pedido del dueño, el formulario de un producto nuevo trae el precio de venta en 0.00 en vez de vacío. El dominio ya acepta 0 como "producto todavía sin precio" (`Product.SalePriceError`): así se puede registrar un producto antes de saber a cuánto se venderá. **Pendiente para Ventas:** avisar al vender un producto con precio 0, para que no salga una venta gratis por olvido.

### 21. El azul de Apple como acento y en el botón principal (reemplaza parte de la decisión 16)
**Fecha:** octubre 2026

El dueño pidió los colores originales de Apple. Se le mostraron lado a lado en el lienzo el jade de la marca (decisión 16) y el azul de apple.com, y eligió el azul, también para el botón principal (antes negro).

- **Azul `#0071E3`** (el de los botones de apple.com): botón principal, pantalla elegida del menú lateral, opción resaltada de los menús, interruptor encendido, halo del campo enfocado y contorno del foco con teclado. Texto blanco encima: 4.7:1. Al pasar el mouse, `#0077ED`, como apple.com.
- **Azul `#0066CC`** (el de los enlaces de apple.com): enlaces, botones de solo texto ("Limpiar filtros", "Guardar vista"), íconos del menú lateral y texto de las fichas de filtro. 5.6:1 sobre blanco, 5.1:1 sobre el vidrio del menú, 4.9:1 sobre la ficha celeste (`#E8F1FB`).
- **El jade de la marca** queda en el logo y en el brillo detrás del ícono del inicio de sesión (token `brand`). El botón "Continuar" del inicio de sesión también pasa a azul.
- **Sin cambio:** los grises (ya eran los de apple.com) y los colores de estado de Apple (verde, naranja y rojo, decisión 16).
- **Por qué cambia:** Apple recomienda el color de la marca como acento en apps de una empresa (por eso la decisión 16 eligió jade), pero el azul es lo que más hace sentir una app de Apple, y eso es lo que pidió el dueño.

### 22. Revisión de Productos: detalles que no eran del estilo Apple
**Fecha:** octubre 2026

El dueño notó cosas que "no encajaban" y se revisó todo el módulo de Productos (código y cada ventana, en computadora y celular). Se arreglaron cinco detalles:

- **Fondo al cargar:** la página se veía gris (el fondo del estilo anterior) un instante antes de aparecer; ahora el `body` es blanco desde el inicio.
- **"Limpiar filtros" repetido:** salía en la barra y otra vez en el mensaje de "nada coincide". Queda solo en la barra (`ListBody` ya no lo ofrece).
- **Ícono de "nada coincide":** era el del estado inicial (por ejemplo, una caja con "+", que sugiere crear). Ahora es una lupa tachada (`SearchX`), como Apple cuando una búsqueda no encuentra nada.
- **Administrar vistas:** el botón tenía barritas, igual que "Filtros" a su lado. Ahora es "⋯", el símbolo de Apple para "más opciones".
- **Guardar vista:** "Abrir siempre con esta vista" era una casilla cuadrada del navegador; ahora es el interruptor de Apple (`SwitchRow`).

Quedan para una maqueta: la ventana "Administrar vistas" (recargada, "Eliminar" en azul) y la lista en el celular. Y, con un cambio en la API, los errores de cada campo debajo del campo.

### 23. Administrar vistas y Productos en el celular
**Fecha:** octubre 2026

Las dos maquetas que quedaron de la decisión 22 (`VistasAdministrar` y `ProductosCelular` en el lienzo), aprobadas por el dueño.

**Administrar vistas** (`ManageViewsDialog`): antes cada vista tenía tres botones de texto azul ("Usar filtros actuales", "Renombrar", "Eliminar") y un "¿Eliminar? Sí / No" en la misma fila.
- Las vistas son una **lista agrupada** como Ajustes del iPhone (HIG "Lists and tables"): la estrella a la izquierda (azul y rellena en la que abre la pantalla, con "Se abre con esta" debajo del nombre) y un **"⋯"** a la derecha.
- El "⋯" (`MoreMenu`, HIG "Pull-down buttons") tiene "Usar los filtros de ahora" (apagado si ya son los mismos), "Renombrar" y, separado, al final y en rojo, "Eliminar".
- **Eliminar pregunta con la alerta de Apple** (`ConfirmDialog`), porque no se puede deshacer: "¿Eliminar la vista «Inactivos»?".
- Renombrar cambia la fila por un campo compacto y "Listo"; Esc deja el nombre como estaba sin cerrar la ventana (el campo lleva `data-own-escape`, que `Dialog` respeta).
- La ventana se cierra con **"Listo"** (azul), como las hojas de Apple que solo muestran algo, en vez de "Cerrar".

**Productos en el celular** (menos de 768 px, `useIsPhone`): la computadora no cambia.
- **Encabezado:** el título baja a 34 px (el "Large Title" del iPhone, `text-large-title`) y los tres botones se resumen en dos redondos junto al título: "⋯" de vidrio (Importar desde Excel, Exportar a Excel) y "+" azul (Nuevo producto), como la barra de una app del iPhone (`PageHeader compactActions`).
- **Buscador a todo el ancho** y debajo, en **un carril que se desliza de lado**, las vistas, "Filtros" y "Ordenar" (como las barras de filtros de la App Store o Fotos): una sola línea en vez de tres. `FilterBar` recibe las vistas en `views`; en la computadora siguen en su propia fila, arriba.
- **Filas como las del iPhone** en lugar de la tabla (`GroupedList`, estilo "inset grouped"): el nombre arriba (16 px), el código y la unidad debajo en gris, el precio a la derecha y la pastilla "Inactivo" solo si lo está (lo normal no se marca). Tocar la fila abre el producto.
- **Cambio frente a la maqueta:** la maqueta tenía una flecha ">" a la derecha de cada fila. Con la flecha no había cómo ver el historial ni desactivar en el celular, así que en su lugar va el mismo **"⋯"** de la tabla, como en las filas de la app Archivos del iPhone.
- **Pie compacto:** "1–10 de 214" y "‹ 1 / 22 ›". Las filas por página y los saltos a la primera y última página quedan para la computadora.

Las demás listas (Clientes, Proveedores, Compras, Usuarios, Empresas, Auditoría) todavía ponen sus vistas fuera de `FilterBar` y usan la tabla en el celular; pasan a este diseño cuando se rediseñe cada una.


### 24. Foco y error de los campos, y botones de solo texto, como Cuenta de Apple
**Fecha:** octubre 2026

El dueño preguntó si Apple sombrea de azul "Agregar código de proveedor" al pasar el mouse y si pone un halo azul en los campos. Se revisó la hoja de estilos del inicio de sesión de Cuenta de Apple (account.apple.com, servida desde `appleid.cdn-apple.com`): no hace ninguna de las dos cosas.

- **Botones de solo texto** (`Button variant="ghost"`: "Agregar código de proveedor", "Limpiar filtros", "Guardar vista"): sin fondo celeste al pasar el mouse; se subrayan, como los enlaces de Apple (`a:hover { text-decoration: underline }`). Siguen hundiéndose al presionarlos. La ✕ de una ficha de filtro se aclara en vez de pintar un círculo celeste.
- **Campo enfocado con el mouse:** solo el borde se pone azul `#0071E3` (Apple: `border-color:#0071e3; outline:none`), sin halo y sin el borde negro de antes. Vale para los campos de formulario, los compactos, las listas desplegables, el buscador y el inicio de sesión.
- **Foco con teclado:** al llegar con Tab, el anillo de Apple: 2 px azules separados 3 px del campo (`box-shadow: 0 0 0 3px #fff, 0 0 0 5px #0071e3`). Apple lo muestra solo con teclado (`data-focus-method=key`); aquí `lib/keyboard-focus.ts` marca `<html data-keyboard>` al presionar Tab y lo quita al hacer clic, y la variante `kbd:` de `styles.css` lo usa. `:focus-visible` no sirve en los campos de texto porque el navegador lo activa también con el clic. Los botones y el resto usan el mismo anillo (contorno de 2 px a 3 px de distancia), que el navegador ya muestra solo con teclado.
- **Campo con error:** como Apple, borde rojo, fondo rosado (`field-bad`, `#FFF2F4`) y etiqueta roja mientras no tenga el foco; al enfocarlo para corregir vuelve a verse normal, con su borde azul. Contrastes medidos: texto 15.4:1, etiqueta roja 5.1:1 y gris 4.7:1 sobre el rosado. Se usa el rojo de la decisión 16 (`#D10F25`), no el `#E30000` de Apple.
- **De dónde venía el halo:** de la Mac (sus campos muestran un resplandor azul al enfocarlos). La referencia de esta pantalla es la web de Apple, que no lo usa.

Reemplaza en esto a la decisión 21, que hablaba del "halo del campo enfocado". Se quitaron los tokens `link-tint` y `error-ring` (`shadow-error`).

### 25. "Administrar vistas" sin "Se abre con esta"
**Fecha:** octubre 2026

El dueño pidió quitar el texto "Se abre con esta" debajo del nombre de la vista predeterminada (decisión 23): la descripción de la ventana ("La estrella marca con cuál se abre la pantalla.") y la estrella azul ya lo dicen. Cada fila muestra solo el nombre. Los lectores de pantalla lo siguen sabiendo por el nombre del botón de la estrella ("Dejar de abrir con Activos").

### 26. Errores debajo de cada campo
**Fecha:** octubre 2026

El dueño no quería la lista de errores arriba del formulario de producto (con el formulario vacío y tres filas de proveedores eran diez líneas). Se hizo la maqueta `ProductosErrores` en el lienzo, siguiendo la guía de Apple ("Entering data": avisar junto al dato) y el inicio de sesión de Cuenta de Apple, y el dueño la aprobó.

- **Cada error de la API va debajo de su campo**, con el aspecto de la decisión 24 (borde y etiqueta rojos, fondo rosado). La API ahora dice de qué campo es cada error (decisión 37 de la API): `ApiError.details` trae `{ message, field }` y `useApiErrors` (`lib/form-errors.ts`) los reparte con `setError` de react-hook-form. Arriba (`ErrorList`) quedan solo los que no son de un campo, como "otra persona cambió este producto".
- **Al guardar con errores, el cursor va al primer campo marcado** y la ventana baja hasta él; si ninguno es de un campo, vuelve arriba, donde está el mensaje.
- **Al escribir o elegir en un campo, su error se va.** Agregar o quitar filas no borra los errores de las demás.
- **Filas de proveedores vacías:** no se envían ni dan error, como Contactos del iPhone con un teléfono agregado y no llenado. Una fila a medias marca solo lo que falta ("Elige el proveedor." o "Escribe el código del proveedor."). Como no se envían todas las filas, la pantalla traduce la fila de la API a la suya (`toFormField` en `product-form-dialog.tsx`).
- **Mensajes cortos que dicen qué hacer**, de la API: "Escribe el código interno.", "Elige la unidad de medida.".
- El botón "Crear producto" no se apaga mientras falten datos (la guía de Apple lo sugiere para formularios cortos): con cuatro campos obligatorios, un botón apagado no dice qué falta.

Solo el formulario de Productos usa esto por ahora; los demás siguen mostrando la lista arriba hasta que se rediseñen (necesitan también el cambio en su parte de la API).

### 27. Código interno ocupado, en una línea
**Fecha:** octubre 2026

Debajo del campo, "El código interno MT2005 ya es de «Moto de amir 2005». Usa otro código interno." ocupaba tres líneas. Ahora la API dice "El código interno MT2005 ya existe." (o "… ya existe en un producto desactivado.", para que se sepa por qué no aparece en la lista). La pantalla no cambia: muestra el texto de la API (decisión 38 de la API).