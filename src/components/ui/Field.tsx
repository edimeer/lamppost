import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
  id?: string
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
}

function FieldFrame({
  id,
  label,
  error,
  hint,
  required,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold">
        {label}
        {!required && <span className="font-normal text-ink-soft"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 mb-0 text-[0.9375rem] text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 mb-0 text-[0.9375rem] font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  required,
  id,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'required' | 'id'>) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldFrame id={fieldId} label={label} error={error} hint={hint} required={required}>
      <input
        {...props}
        id={fieldId}
        className="input"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
      />
    </FieldFrame>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  id,
  ...props
}: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required' | 'id'>) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldFrame id={fieldId} label={label} error={error} hint={hint} required={required}>
      <textarea
        {...props}
        id={fieldId}
        className="input"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
      />
    </FieldFrame>
  )
}

export function SelectField({
  label,
  error,
  hint,
  required,
  id,
  children,
  ...props
}: FieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'required' | 'id'>) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldFrame id={fieldId} label={label} error={error} hint={hint} required={required}>
      <select
        {...props}
        id={fieldId}
        className="input"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
      >
        {children}
      </select>
    </FieldFrame>
  )
}
