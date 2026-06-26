import { useState } from 'react'
import Illustration from './Illustration'
import InputField from './InputField'
import API from '../services/api'
import { toast } from 'react-hot-toast'

function LoginPage({ onSwitchToSignUp, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields.")
      return
    }
    
    setLoading(true)
    try {
      const res = await API.post("/login", {
        gmail: email.trim(),
        password: password
      })

      if (res.data && res.data.success) {
        toast.success(`Welcome back, ${res.data.username}! 🚀`)
        localStorage.setItem("token", res.data.token)
        localStorage.setItem("username", res.data.username)
        localStorage.setItem("gmail", res.data.gmail)
        
        onLoginSuccess()
      } else {
        toast.error("Authentication failed. Please try again.")
      }
    } catch (err) {
      console.error("Login request error:", err)
      const errMsg = err.response?.data?.detail || "Invalid Email or password. Please try again."
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleChairClick = () => {
    onSwitchToSignUp()
  }



  return (
    <div className="auth-page">
      <div className="auth-left" style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 10
        }}>
          <div style={{
            width: '110px',
            height: '110px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            <img src="/logo.png?v=2" alt="Nikitha Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>
        </div>
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

            <button type="submit" className="auth-button auth-button-dark" disabled={loading || !email || !password}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
