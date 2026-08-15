import { useState } from 'react'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([]) // {from: 'me'|'howz', text}
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!question.trim()) return
    const q = question
    setMessages((m) => [...m, { from: 'me', text: q }])
    setQuestion('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const { answer, matched } = await res.json()
      setMessages((m) => [...m, { from: 'howz', text: matched ? answer : "I don't have an answer for that yet — I can only answer from what's actually on file." }])
    } catch (err) {
      setMessages((m) => [...m, { from: 'howz', text: "Something went wrong reaching HoWz — try again in a moment." }])
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button className="chat-bubble" onClick={() => setOpen(true)} aria-label="Ask HoWz anything">
        Ask HoWz anything
      </button>
    )
  }

  return (
    <div className="chat-panel">
      <div className="chat-head">
        <span>Ask HoWz</span>
        <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.from}`}>{m.text}</div>
        ))}
        {sending && <div className="chat-msg howz">…</div>}
      </div>
      <form data-testid="chat-form" onSubmit={handleSubmit} className="chat-input-row">
        <input
          placeholder="Ask HoWz…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={sending}>send</button>
      </form>
    </div>
  )
}
