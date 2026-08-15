import { useDashboardData } from '../hooks/useDashboardData'
import Card from '../components/Card'

const PUBLICATION_YEARS = ['2026', '2025', '2024']

export default function Research() {
  const { data, loading } = useDashboardData()
  if (loading || !data) return <div className="loading">loading…</div>
  const r = data.research
  if (!r) return <div className="page"><h2>doctoral research</h2><div className="empty">not set up yet.</div></div>

  return (
    <div className="page">
      <h2>doctoral research</h2>
      <Card title={r.program.degree} sub={`${r.program.institution} · ${r.program.location} · expected ${r.program.expected} · ${r.program.status}`}>
        {r._meta?.orcid_url && (
          <div>
            <a href={r._meta.orcid_url} target="_blank" rel="noopener">{r._meta.orcid_url}</a>
          </div>
        )}
        {r._meta?.scholar_url && (
          <div>
            <a href={r._meta.scholar_url} target="_blank" rel="noopener">{r._meta.scholar_url}</a>
            {r._meta.scholar_metrics ? ` — ${r._meta.scholar_metrics.citations} citations · h-index ${r._meta.scholar_metrics.h_index}` : ''}
          </div>
        )}
      </Card>
      <Card title="research areas">
        {r.research_areas.map((a, i) => <div key={i}>{a}</div>)}
      </Card>
      {r.potential_publication_leads?.length > 0 && (
        <Card title="publication leads">
          {r.potential_publication_leads.map((p, i) => (
            <div key={i}>
              <strong>{p.venue}</strong> — {p.status}
            </div>
          ))}
        </Card>
      )}
      {r.publications?.source && (
        <Card title="publications" sub={r.publications.source}>
          {r.publications.note || ''}
          {PUBLICATION_YEARS.filter((y) => r.publications[y]?.length).map((y) => (
            <div key={y}>
              <strong>{y}</strong> ({r.publications[y].length})
              {r.publications[y].map((entry, i) => <div key={i}>{entry}</div>)}
            </div>
          ))}
        </Card>
      )}
      {r._meta?.open_items?.length > 0 && (
        <Card title="still needs your input">
          {r._meta.open_items.map((item, i) => <div key={i}>{item}</div>)}
        </Card>
      )}
    </div>
  )
}
