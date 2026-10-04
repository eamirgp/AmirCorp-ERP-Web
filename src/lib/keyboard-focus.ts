/**
 * Marca `<html data-keyboard>` mientras se usa el teclado para moverse (Tab) y lo quita al hacer clic o tocar. Con eso,
 * la variante `kbd:` de styles.css muestra el anillo azul del foco solo con teclado, como Cuenta de Apple
 * (`data-focus-method=key`). Se llama una vez al arrancar.
 */
export function trackKeyboardFocus() {
  const root = document.documentElement
  addEventListener('keydown', (e) => e.key === 'Tab' && root.setAttribute('data-keyboard', ''), true)
  addEventListener('pointerdown', () => root.removeAttribute('data-keyboard'), true)
}
