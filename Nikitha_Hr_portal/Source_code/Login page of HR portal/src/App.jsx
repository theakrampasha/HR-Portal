import { useState } from 'react'
import LoginPage from './components/LoginPage'
import SignUpPage from './components/SignUpPage'

function App() {
  const [view, setView] = useState('login')

  return view === 'login' ? (
    <LoginPage onSwitchToSignUp={() => setView('signup')} />
  ) : (
    <SignUpPage onSwitchToLogin={() => setView('login')} />
  )
}

export default App
