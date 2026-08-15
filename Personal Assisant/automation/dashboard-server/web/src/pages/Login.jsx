import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      setSubmitting(false)
      if (res.ok) {
        onSuccess()
      } else {
        setError(true)
      }
    } catch (err) {
      setSubmitting(false)
      setError(true)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">H</div>
        <h1>HoWz</h1>
        <p className="login-sub">Chief of Staff AI Assistant</p>
        <p className="login-hint">{error ? 'incorrect password' : "this device isn't recognized yet"}</p>
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'checking…' : 'unlock'}
        </button>
      </form>
    </div>
  )
}
