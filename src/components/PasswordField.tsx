import { useState, useRef, useEffect } from 'react'

interface PasswordFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  id?: string
  placeholder?: string
  showCopy?: boolean
  onCopy?: () => void
  showLabel?: boolean
}

export function PasswordField({
  value,
  onChange,
  label = 'Password',
  id,
  placeholder = '',
  showCopy = false,
  onCopy,
  showLabel = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        const activeEl = document.activeElement
        if (activeEl?.getAttribute('data-toggle-password') === 'true') {
          e.preventDefault()
          setVisible((v) => !v)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const copyToClipboard = async () => {
    if (value && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value)
        onCopy?.()
      } catch (err) {
        console.error('Copy failed:', err)
        onCopy?.()
      }
    }
  }

  const maskedValue = visible ? value : '•'.repeat(Math.max(value.length, 8))

  return (
    <div className="password-field">
      {showLabel && <label htmlFor={id}>{label}</label>}
      <div className="password-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          value={maskedValue}
          onChange={(e) => onChange(e.target.value === '•' ? '' : e.target.value)}
          placeholder={placeholder}
          readOnly={visible}
          autoComplete="off"
        />
        <div className="password-actions">
          {showCopy && (
            <button
              type="button"
              className="btn btn-icon"
              onClick={copyToClipboard}
              aria-label={value ? 'Copy password' : 'No password to copy'}
              disabled={!value}
              data-toggle-password="false"
            >
              📋
            </button>
          )}
          <button
            type="button"
            className="btn btn-icon"
            data-toggle-password="true"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? '🙈' : '👁'}
          </button>
        </div>
      </div>
    </div>
  )
}
