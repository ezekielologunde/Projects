import { useState } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'
import DetailPanel from '../components/DetailPanel'

function money(n) {
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  return num < 0 ? `-$${Math.abs(num).toFixed(2)}` : `$${num.toFixed(2)}`
}

export default function Money() {
  const { data, loading, error } = useDashboardData()
  const [open, setOpen] = useState(null)

  if (loading) return <div className="loading">loading…</div>
  if (error) return <div className="error-state">Couldn't load dashboard data — try refreshing.</div>
  if (!data) return null

  const f = data.finances
  const dueSoon = data.paymentsDueSoon || []

  return (
    <div className="page">
      <h2>money</h2>

      <div className="page-subhead">payments due soon</div>
      {dueSoon.length === 0 ? (
        <div className="empty">nothing due in the next two weeks.</div>
      ) : (
        <div className="page-list">
          {dueSoon.map((p) => (
            <Card key={`${p.institution}-${p.due}`} title={p.institution} badge={money(p.amount)}>
              due {p.due}
            </Card>
          ))}
        </div>
      )}

      <div className="page-subhead">accounts on file</div>
      <div className="page-list">
        {(f?.accounts || []).map((a) => {
          const id = `${a.institution}${a.last4 || ''}`
          return (
            <Card
              key={id} title={a.institution} sub={`${(a.type || '').replace(/_/g, ' ')} · ${a.owner_account || ''}`}
              badge={a.latest_statement ? money(a.latest_statement.balance) : undefined}
              onClick={() => setOpen({ id, title: a.institution, sub: a.type, note: a.note })}
            >
              {a.latest_statement ? `min payment ${money(a.latest_statement.minimum_payment)}${a.latest_statement.minimum_payment_due ? ` due ${a.latest_statement.minimum_payment_due}` : ''} — ` : ''}{a.note || ''}
            </Card>
          )
        })}
      </div>

      <div className="page-subhead">recurring payments</div>
      <div className="page-list">
        {(f?.recurring_payments || []).map((r) => (
          <Card key={r.payee} title={r.payee} sub={`${r.category || ''} · ${r.method || ''}`} badge={r.amount ? money(r.amount) : undefined}>
            {r.cadence || ''}{r.note ? ` — ${r.note}` : ''}
          </Card>
        ))}
      </div>

      <div className="page-subhead">recent one-off transactions</div>
      <div className="page-list">
        {(f?.one_off_transactions_seen || []).map((t, i) => (
          <Card key={i} title={t.payee} sub={`${t.category || ''} · ${t.method || ''}`} badge={money(t.amount)}>
            {t.date || ''}{t.account ? ` · ${t.account}` : ''}
          </Card>
        ))}
      </div>

      {open && (
        <DetailPanel kind="account" id={open.id} title={open.title} sub={open.sub} note={open.note} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}
