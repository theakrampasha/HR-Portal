import { useState, useRef } from 'react'
import Illustration from './Illustration'
import InputField from './InputField'

function SignUpPage({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const fullNameRef = useRef(null)

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 10) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 2) return { score, label: 'Weak', color: '#f72585', width: '33%' }
    if (score <= 4) return { score, label: 'Medium', color: '#fbbf24', width: '66%' }
    return { score, label: 'Strong', color: '#0d9488', width: '100%' }
  }

  const strength = getPasswordStrength(password)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fullName || !email || !password || !agreed) return
    setLoading(true)
    setTimeout(() => {
      console.log('Sign up:', { fullName, email, password, agreed })
      alert(`Account created successfully for: ${fullName}!`)
      setLoading(false)
      onSwitchToLogin()
    }, 1200)
  }

  const handleChairClick = () => {
    if (fullNameRef.current) {
      fullNameRef.current.focus()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Illustration onChairClick={handleChairClick} activeView="signup" />
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1 className="auth-title">Join the Team</h1>
          <p className="auth-subtitle">
            Create your account to apply and grab your seat!
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <InputField
              label="Full Name"
              type="text"
              placeholder="e.g. Alex Mercer"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              inputRef={fullNameRef}
              required
            />

            <InputField
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="input-field">
              <InputField
                label="Password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showToggle
                required
              />
              {password && (
                <>
                  <div className="password-strength-bar">
                    <div
                      className="password-strength-fill"
                      style={{
                        width: strength.width,
                        backgroundColor: strength.color
                      }}
                    ></div>
                  </div>
                  <div className="password-strength-text">
                    <span>Password Strength:</span>
                    <span style={{ color: strength.color, fontWeight: 'bold' }}>{strength.label}</span>
                  </div>
                </>
              )}
            </div>

            <label className="terms-checkbox">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <a href="#" className="auth-link">Terms of Service</a> and{' '}
                <a href="#" className="auth-link">Privacy Policy</a>
              </span>
            </label>

            <button type="submit" className="auth-button" disabled={loading || !fullName || !email || !password || !agreed}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <button type="button" className="auth-link-btn" onClick={onSwitchToLogin}>
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
