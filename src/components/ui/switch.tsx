import { useId, type ReactNode } from 'react'

/**
 * Interruptor de encendido y apagado (HIG "Toggles"): va en una fila de una lista agrupada, con el texto que dice qué
 * controla a la izquierda. Encendido es azul (`selected`) con la bolita a la derecha; apagado, gris
 * (`switch-off`, 3:1 sobre la fila). Además del color cambia la posición, para no depender solo del color. La bolita se
 * desliza con la curva de los paneles.
 */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-muted-fill px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div id={`${id}-label`} className="text-base font-semibold text-fg">
          {label}
        </div>
        {description && (
          <div id={`${id}-desc`} className="text-sm text-fg-muted">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-250 outline-none focus-visible:shadow-focus ${checked ? 'bg-selected' : 'bg-switch-off'}`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-250 ease-panel ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
