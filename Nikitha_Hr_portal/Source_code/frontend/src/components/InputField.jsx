import { useState } from 'react'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  showToggle = false,
  inputRef,
  required = false,
}) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const inputType = showToggle ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="input-field">
      <label className="input-label" style={{ color: focused ? 'var(--teal)' : 'var(--gray)' }}>
        {label}
      </label>
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type={inputType}
          className={`input-control ${focused ? 'focused' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
        />
        {showToggle && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{ color: focused ? 'var(--teal)' : 'var(--gray)' }}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
    </div>
  )
}

export default InputField
