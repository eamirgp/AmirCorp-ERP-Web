import { useEffect, useRef } from 'react'

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** Hay un diálogo, panel o menú abierto: los atajos de la pantalla de atrás no deben actuar. */
const overlayOpen = () => !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')

/**
 * Atajo de teclado de una sola tecla. Ejemplos: "n", "/".
 * No actúa mientras el usuario escribe en un campo, ni con Ctrl/Alt/⌘ pulsadas, ni con un diálogo abierto.
 */
export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return
    const expected = key.toLowerCase()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTyping(e.target) || overlayOpen()) return
      if (e.key.toLowerCase() !== expected) return
      e.preventDefault()
      handlerRef.current(e)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, enabled])
}
