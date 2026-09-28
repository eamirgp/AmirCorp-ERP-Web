# Sistema de diseño

Un ERP se usa muchas horas al día. El diseño prioriza leer rápido, operar con teclado y que el estado de cada registro se entienda de un vistazo, sin adornos que no aporten.

## Colores

Definidos como variables en `src/styles.css`, con versión clara y oscura. En el código se usan como utilidades de Tailwind: `bg-surface`, `text-muted`, `border-line`, `text-accent`.

| Token | Uso |
|---|---|
| `bg` | Fondo de la aplicación |
| `surface`, `surface-2` | Paneles, y cabeceras de tabla o fondos secundarios |
| `line`, `line-strong` | Bordes y separadores; `line-strong` para controles |
| `ink`, `muted`, `faint` | Texto principal, secundario y de apoyo |
| `accent` (jade) | Acción principal, selección, elemento activo |
| `ok`, `warn`, `bad` (+ `-soft`) | Estados: activo/aceptado, pendiente, anulado/error |

El jade es el color de marca. Los colores de estado son independientes: nunca se usa el jade para decir "correcto".

El tema sigue al sistema operativo, y el usuario puede fijarlo en claro u oscuro desde su menú.

## Tipografía

| Rol | Fuente | Clase |
|---|---|---|
| Títulos | Archivo | `font-display` |
| Texto | IBM Plex Sans | (por defecto) |
| Números, códigos, montos | IBM Plex Mono con cifras tabulares | `num`, `font-mono` |

Las fuentes están instaladas en el proyecto (`@fontsource`), sin depender de Google Fonts.

Los montos y cantidades siempre usan `num` y se alinean a la derecha, para que las cifras queden en columna.

## Reglas

- **Densidad de herramienta:** tablas compactas, texto de 13.5 px y paneles con borde fino. Nada de tarjetas gigantes con sombra.
- **El estado se ve en la forma, no solo en el texto:** `Pill` con punto de color para activo, inactivo, pendiente o anulado.
- **Todo se puede hacer con teclado:** cada pantalla con tabla tiene `/` para buscar, `N` para crear, flechas y Enter.
- **Los mensajes hablan como el usuario:** "El código es requerido", no "Validation failed".
- **Nada de emojis, degradados ni íconos decorativos.** Los íconos (lucide) acompañan acciones y módulos.
- **Movimiento mínimo:** solo la aparición de diálogos y avisos, y se desactiva con `prefers-reduced-motion`.

## Componentes base

En `src/components/ui/`: `Button`, `Input`, `Select`, `Field` (etiqueta, control y error enlazados), `Dialog`, `Pill`, `Kbd`, `Panel`, `PageHeader`, `ErrorList` y `toast`.
