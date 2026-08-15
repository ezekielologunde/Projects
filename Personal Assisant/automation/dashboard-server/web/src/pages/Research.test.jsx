import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Research from './Research'

describe('Research', () => {
  it('renders the degree and the open-items card', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        research: {
          program: { degree: 'Doctor of Engineering', institution: 'GWU', location: 'Washington, DC', expected: '2027', status: 'in progress' },
          research_areas: ['Zero Trust', 'AI/ML threat modeling'],
          publications: null,
          _meta: { open_items: ['Advisor name unconfirmed'] },
        },
      }),
    })
    render(<Research />)
    await waitFor(() => expect(screen.getByText('Doctor of Engineering')).toBeInTheDocument())
    expect(screen.getByText(/Advisor name unconfirmed/)).toBeInTheDocument()
  })

  it('renders ORCID/Scholar links, publication leads, and the yearly publications breakdown', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        research: {
          program: { degree: 'Doctor of Engineering', institution: 'GWU', location: 'Washington, DC', expected: '2027', status: 'in progress' },
          research_areas: ['Zero Trust', 'AI/ML threat modeling'],
          potential_publication_leads: [{ venue: 'IEEE S&P', status: 'drafting abstract' }],
          publications: {
            source: 'Google Scholar',
            note: 'auto-synced',
            2025: ['A Study of Zero Trust Adoption'],
          },
          _meta: {
            orcid_url: 'https://orcid.org/0000-0000-0000-0000',
            scholar_url: 'https://scholar.google.com/citations?user=abc123',
            scholar_metrics: { citations: 12, h_index: 3 },
            open_items: ['Advisor name unconfirmed'],
          },
        },
      }),
    })
    render(<Research />)
    await waitFor(() => expect(screen.getByText('Doctor of Engineering')).toBeInTheDocument())

    const orcidLink = screen.getByRole('link', { name: 'https://orcid.org/0000-0000-0000-0000' })
    expect(orcidLink).toHaveAttribute('href', 'https://orcid.org/0000-0000-0000-0000')
    expect(orcidLink).toHaveAttribute('target', '_blank')
    expect(orcidLink).toHaveAttribute('rel', 'noopener')

    const scholarLink = screen.getByRole('link', { name: 'https://scholar.google.com/citations?user=abc123' })
    expect(scholarLink).toHaveAttribute('href', 'https://scholar.google.com/citations?user=abc123')
    expect(screen.getByText(/12 citations · h-index 3/)).toBeInTheDocument()

    expect(screen.getByText('publication leads')).toBeInTheDocument()
    expect(screen.getByText('IEEE S&P')).toBeInTheDocument()
    expect(screen.getByText(/drafting abstract/)).toBeInTheDocument()

    expect(screen.getByText('2025', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('A Study of Zero Trust Adoption')).toBeInTheDocument()
  })
})
