import { useEffect, useRef, useState } from 'react'

// Quick-start prompts shown as pills above the persistent input — cover the
// four modules the rule-based /api/chat engine (chatbot.js) most reliably
// answers from data already on file.
const SUGGESTED_PROMPTS = [
  'How many applications are staged?',
  'Any interviews this week?',
  "What's due in goals today?",
  'Summarize my inbox',
]

export default function ChatWidget() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([]) // {from: 'me'|'howz', text}
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)
  const barRef = useRef(null)

  // The floating message log sits just above the bar (see .chat-messages-float
  // in theme.css), so it needs the bar's real rendered height — not a guessed
  // constant — or it silently overlaps the bar whenever the bar's height
  // changes. Confirmed live that a synchronous mount-time measurement alone
  // isn't reliable: measured 50px right after mount vs. a settled 86px
  // moments later (single-row vs. two-row pill layout), with neither
  // document.fonts.ready (irrelevant — this app has no @font-face) nor
  // ResizeObserver ever catching the correction. Layered instead:
  //   1. Synchronous measurement on mount — correct in the common case.
  //   2. A one-shot setTimeout backstop shortly after mount — a plain
  //      wall-clock timer, not tied to any paint/layout/resize callback, so
  //      it fires reliably regardless of what caused the initial mismatch.
  //   3. ResizeObserver — genuine later changes (viewport resize, pill row
  //      wrapping), when the browser's observer queue is actually running.
  useEffect(() => {
    const el = barRef.current
    if (!el) return undefined
    // offsetHeight (border-box), not contentRect (content-box only) — the
    // bar's padding is exactly what the float panel needs to clear too.
    const setHeight = () => document.documentElement.style.setProperty('--chat-bar-height', `${el.offsetHeight}px`)
    setHeight()
    const backstopTimer = setTimeout(setHeight, 300)
    if (typeof ResizeObserver === 'undefined') {
      return () => clearTimeout(backstopTimer)
    }
    const observer = new ResizeObserver(setHeight)
    observer.observe(el)
    return () => {
      clearTimeout(backstopTimer)
      observer.disconnect()
    }
  }, [])

  async function ask(q) {
    if (sending) return
    if (!q.trim()) return
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
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    ask(question)
  }

  return (
    <>
      {messages.length > 0 && (
        <div className="chat-messages-float">
          <div className="chat-messages-inner" aria-live="polite" aria-atomic="false">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.from}`}>{m.text}</div>
            ))}
            {sending && <div className="chat-msg howz">…</div>}
          </div>
        </div>
      )}
      <div className="chat-bar" ref={barRef}>
        <div className="chat-bar-inner">
          <div className="chat-pills">
            {SUGGESTED_PROMPTS.map((p) => (
              <button key={p} type="button" className="chat-pill" onClick={() => ask(p)} disabled={sending}>
                {p}
              </button>
            ))}
          </div>
          <form data-testid="chat-form" onSubmit={handleSubmit} className="chat-input-row">
            <input
              ref={inputRef}
              placeholder="Ask HoWz…"
              aria-label="Ask HoWz"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit" disabled={sending}>send</button>
          </form>
        </div>
      </div>
    </>
  )
}
