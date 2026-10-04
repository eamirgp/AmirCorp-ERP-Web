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
