# Sistema de diseño

Basado en el **Manual de Identidad Visual de H&P Pizarro Accesorios E.I.R.L.** (Lorena Salcedo). La marca combina el negro como base, el verde jade como color secundario y el gris como acento, con un lenguaje automotriz: fibra de carbono, aros, luces verdes sobre negro.

Un ERP se usa muchas horas al día, así que la identidad se aplica con criterio de herramienta: se prioriza leer rápido, operar con teclado y entender el estado de cada registro de un vistazo.

## Dónde vive la marca

| Qué | Dónde |
|---|---|
| Nombre, razón social, lema, textos del login | `src/brand/index.ts` |
| Logo (ícono + palabra "pizarro ACCESORIOS") | `src/brand/logo.tsx`, `icon-light.png`, `icon-dark.png` |
| Tapa de rueda decorativa | `src/brand/wheel-motif.tsx` |
| Colores y fuentes | `src/styles.css` |
| Favicon | `public/favicon.png`, `public/apple-touch-icon.png` |

Las pantallas no nombran la marca directamente: usan `brand` y `<Logo />`. Para otra empresa basta con cambiar esa carpeta, los colores y el favicon.

## Colores del manual

| Manual | Valor | Uso en el ERP |
|---|---|---|
| Negro (base) | `#000000` | Texto principal, menú lateral, panel del login |
| Verde jade (secundario) | `#5AAF76` | Botón principal, indicador de pantalla activa, foco, ícono |
| Gris (acento) | `#737373` | Texto secundario (cumple el contraste mínimo sobre blanco) |

Decisiones de uso:
- **Sobre el jade el texto va en negro**, como el logo sobre fondo verde (página 12 del manual). El blanco sobre jade no tiene contraste suficiente para leerse bien.
- **El jade como texto** sobre fondo claro se oscurece (`accent-text`, `#2A7445`) para que sea legible. En modo oscuro se usa un jade más claro (`#6CC08A`).
- **El menú lateral es negro en ambos temas**, como las vitrinas negras con luz verde del moodboard.

Tokens en `src/styles.css`, usados como utilidades de Tailwind:

| Token | Uso |
|---|---|
| `bg`, `surface`, `surface-2` | Fondo de la app, paneles, cabeceras de tabla |
| `line`, `line-strong` | Bordes; `line-strong` en controles |
| `ink`, `muted`, `faint` | Texto principal, secundario (gris del manual) y de apoyo |
| `accent`, `accent-ink`, `accent-soft`, `accent-text` | Jade: relleno, texto sobre jade, fondo suave, jade legible como texto |
| `ok`, `warn`, `bad` (+ `-soft`) | Estados: activo/aceptado, pendiente, anulado/error |
| `side-*` | Menú lateral negro |

## Tipografía del manual

| Rol | Fuente | Clase |
|---|---|---|
| Títulos y logo | League Spartan (Bold) | `font-display` |
| Textos | Source Sans (versión actual: Source Sans 3) | (por defecto) |
| Códigos | Source Code Pro, de la misma familia que Source Sans | `font-mono` |
| Montos y cantidades | Source Sans con cifras tabulares | `num` |

Las fuentes están instaladas en el proyecto (`@fontsource-variable`), sin depender de Google Fonts.

Las etiquetas pequeñas (`label-caps`) van en mayúsculas espaciadas, como el "A C C E S O R I O S" del logo.

## Logo

- `<Logo tone="dark" />` sobre fondos oscuros: P jade y rueda blanca, palabra en blanco.
- `<Logo tone="light" />` sobre fondos claros: P negra y rueda jade, palabra en negro.
- `<Logo />` (tone `auto`) cambia solo según el tema.
- La palabra "pizarro ACCESORIOS" se escribe con la fuente real (League Spartan Bold), no es una imagen.
- El ícono se extrajo del PDF del manual (PNG transparente de 828×992). La versión para fondo oscuro se generó recoloreando esa imagen con los colores de la variante oficial.

## Reglas

- **Densidad de herramienta:** tablas compactas y paneles con borde fino.
- **El estado se ve en la forma, no solo en el texto:** `Pill` con punto de color.
- **Todo se puede hacer con teclado:** `/` para buscar, `N` para crear, flechas y Enter.
- **Los mensajes hablan como el usuario** y vienen de la API.
- **Nada de emojis ni degradados.** Los íconos (lucide) acompañan acciones y módulos.
- **Movimiento mínimo:** solo la aparición de diálogos y avisos, desactivado con `prefers-reduced-motion`.

## Componentes base

En `src/components/ui/`: `Button`, `Input`, `Select`, `Field`, `Dialog`, `Pill`, `Kbd`, `Panel`, `PageHeader`, `ErrorList` y `toast`.
