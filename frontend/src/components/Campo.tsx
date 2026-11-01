import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './ui/input'

interface BaseProps {
  id: string
  label: string
  error?: string
  ayuda?: string
  className?: string
}

function Envoltura({ id, label, error, ayuda, className, children }: BaseProps & { children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
    </div>
  )
}

type TextoProps = BaseProps & Omit<ComponentProps<'input'>, 'id'>

/** Text input with its label, help and inline error, wired for screen readers. */
export function CampoTexto({ id, label, error, ayuda, className, ...props }: TextoProps) {
  return (
    <Envoltura id={id} label={label} error={error} ayuda={ayuda} className={className}>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        {...props}
      />
    </Envoltura>
  )
}

type SelectProps = BaseProps & Omit<ComponentProps<'select'>, 'id'>

/** Native select with the same label, help and error wiring as `CampoTexto`. */
export function CampoSelect({ id, label, error, ayuda, className, children, ...props }: SelectProps) {
  return (
    <Envoltura id={id} label={label} error={error} ayuda={ayuda} className={className}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
    </Envoltura>
  )
}

type AreaProps = BaseProps & Omit<ComponentProps<'textarea'>, 'id'>

/** Multiline field with the same label, help and error wiring as `CampoTexto`. */
export function CampoArea({ id, label, error, ayuda, className, ...props }: AreaProps) {
  return (
    <Envoltura id={id} label={label} error={error} ayuda={ayuda} className={className}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </Envoltura>
  )
}
