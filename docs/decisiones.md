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
