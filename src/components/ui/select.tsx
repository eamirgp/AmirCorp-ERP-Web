import * as Menu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ForwardedRef,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { useControlClass, useInField } from './control'
import { glassItemClass, glassMenuClass, useClickMenu } from './menu'

interface Option {
  value: string
  label: string
  disabled?: boolean
}

const textOf = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(textOf).join('') : ''

/** Las opciones que se escribieron como `<option>` (también dentro de listas o fragmentos). */
function readOptions(children: ReactNode): Option[] {
  const options: Option[] = []
  const walk = (nodes: ReactNode) =>
    Children.forEach(nodes, (node) => {
      if (!isValidElement(node)) return
      const props = node.props as { value?: string | number; children?: ReactNode; disabled?: boolean }
      if (node.type === Fragment) walk(props.children)
      else if (node.type === 'option') options.push({ value: String(props.value ?? textOf(props.children)), label: textOf(props.children), disabled: props.disabled })
    })
  walk(children)
  return options
}

const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!

/**
 * Avisa cuando alguien cambia el valor de la lista por código (react-hook-form, al cargar o limpiar un formulario,
 * escribe `select.value` sin disparar eventos): así el botón muestra siempre la opción que tiene la lista.
 */
function watchValue(el: HTMLSelectElement) {
  if ((el as HTMLSelectElement & { erpWatched?: boolean }).erpWatched) return
  ;(el as HTMLSelectElement & { erpWatched?: boolean }).erpWatched = true
  Object.defineProperty(el, 'value', {
    configurable: true,
    get() {
      return nativeValue.get!.call(this)
    },
    set(v: string) {
      nativeValue.set!.call(this, v)
      this.dispatchEvent(new Event('erp-value'))
    },
  })
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

// Alto de cada opción del menú (h-9) y relleno del menú (p-1.5).
const ITEM = 36
const PAD = 6

/**
 * Lista desplegable como el botón desplegable de la Mac (HIG "Pop-up buttons" y "Menus"): un botón con la opción elegida
 * y flechas arriba y abajo que abre el menú de vidrio del sistema, con una marca en la opción actual. El menú se abre con
 * la opción elegida justo sobre el botón, como en la Mac, y la opción bajo el mouse se pinta del color de acento.
 *
 * Por dentro sigue habiendo un `<select>` nativo, oculto: los formularios lo registran y lo leen como siempre
 * (`form.register`, `value` y `onChange`), y las opciones se escriben con `<option>`. `popup` es el botón gris en píldora de
 * las barras ("Filas por página"); si no, tiene el aspecto de un campo.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { popup?: boolean }>(function Select(
  { className = '', children, popup, id, title, disabled, value, 'aria-invalid': invalid, 'aria-describedby': describedBy, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const inField = useInField()
  const control = useControlClass()
  const native = useRef<HTMLSelectElement | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState('')
  const options = readOptions(children)

  // El valor que tiene la lista: el que le pasan (`value`) o el que escribió el formulario.
  useLayoutEffect(() => {
    const el = native.current
    if (!el) return
    watchValue(el)
    const sync = () => setCurrent(el.value)
    sync()
    el.addEventListener('erp-value', sync)
    el.addEventListener('change', sync)
    return () => {
      el.removeEventListener('erp-value', sync)
      el.removeEventListener('change', sync)
    }
  }, [])
  // Si las opciones llegan después (un catálogo que se carga), la lista recién puede tomar su valor.
  useEffect(() => {
    if (native.current) setCurrent(native.current.value)
  }, [options.length])

  // Se abre al soltar el clic (decisión 18). Como en la Mac, al abrir queda marcada la opción elegida: las flechas y
  // Enter siguen desde ahí.
  const menu = useClickMenu()
  useEffect(() => {
    if (!menu.open) return
    const frame = requestAnimationFrame(() => content.current?.querySelector<HTMLElement>('[data-state="checked"]')?.focus())
    return () => cancelAnimationFrame(frame)
  }, [menu.open])

  const shown = value !== undefined ? String(value) : current
  const selected = options.find((o) => o.value === shown)
  const index = Math.max(0, options.findIndex((o) => o.value === shown))
  const triggerHeight = popup || !inField ? 36 : 56

  // Elegir en el menú es como elegir en la lista: cambia su valor y avisa con un evento "change", que llega al
  // formulario por su onChange de siempre.
  const choose = (v: string) => {
    const el = native.current
    if (!el) return
    nativeValue.set!.call(el, v)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const look = popup
    ? 'press h-9 rounded-full bg-fill pr-2.5 pl-3.5 text-sm text-fg outline-none hover:bg-fill-hover focus-visible:shadow-focus data-[state=open]:bg-fill-hover'
    : `${control} pr-3`

  return (
    <>
      <select
        ref={(el) => {
          native.current = el
          assignRef(ref, el)
        }}
        value={value}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        {...props}
      >
        {children}
      </select>
      <Menu.Root {...menu.root}>
        <Menu.Trigger
          {...menu.trigger}
          id={id}
          title={title}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          className={`${look} flex cursor-pointer items-center gap-2 text-left disabled:cursor-not-allowed ${className}`}
        >
          <span className={`min-w-0 flex-1 truncate ${selected && selected.value !== '' ? '' : 'text-fg-muted'}`}>{selected?.label ?? ''}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-fg-muted" strokeWidth={2} aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            {...menu.content}
            ref={content}
            side="bottom"
            align="start"
            // La opción elegida queda centrada sobre el botón.
            sideOffset={-(triggerHeight / 2) - PAD - ITEM / 2 - index * ITEM}
            alignOffset={-PAD}
            collisionPadding={8}
            className={`${glassMenuClass} max-h-(--radix-dropdown-menu-content-available-height) min-w-[calc(var(--radix-dropdown-menu-trigger-width)+12px)] overflow-y-auto`}
          >
            <Menu.RadioGroup value={shown} onValueChange={choose}>
              {options.map((o) => (
                <Menu.RadioItem key={o.value} value={o.value} disabled={o.disabled} className={`${glassItemClass} pr-3 pl-8 data-[disabled]:opacity-40`}>
                  <Menu.ItemIndicator className="absolute left-2.5 flex">
                    <Check strokeWidth={2.5} />
                  </Menu.ItemIndicator>
                  <span className="num">{o.label}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </>
  )
})
