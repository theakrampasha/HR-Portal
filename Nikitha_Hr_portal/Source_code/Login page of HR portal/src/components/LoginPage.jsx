import { useState } from 'react'
import Illustration from './Illustration'
import InputField from './InputField'

function LoginPage({ onSwitchToSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) return;

    setLoading(true);

    try {
      const response = await fetch(
        "https://vivacious-perfection-production-4c2d.up.railway.app/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Invalid email or password");
        setLoading(false);
        return;
      }

      // Save login details
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("email", data.gmail);

      alert(`Welcome ${data.username}!`);

      // Redirect to your home page
      window.location.href = "/";

    } catch (error) {
      console.error("Login Error:", error);
      alert("Unable to connect to the server.");
    }

    setLoading(false);
  };
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
