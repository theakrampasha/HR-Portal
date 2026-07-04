import { useState } from 'react'
import Illustration from './Illustration'
import InputField from './InputField'

function LoginPage({ onSwitchToSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setTimeout(() => {
      console.log('Login:', { email, password })
      alert(`Successfully logged in with: ${email}`)
      setLoading(false)
    }, 1200)
  }

  const handleChairClick = () => {
    onSwitchToSignUp()
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Illustration onChairClick={handleChairClick} activeView="login" />
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Enter your credentials to access the HR hiring portal.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <InputField
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showToggle
              required
            />

            <div className="auth-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="auth-link">Forgot password?</a>
            </div>

            <button type="submit" className="auth-button" disabled={loading || !email || !password}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account?{' '}
            <button type="button" className="auth-link-btn" onClick={onSwitchToSignUp}>
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
