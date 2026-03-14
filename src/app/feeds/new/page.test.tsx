import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewFeedPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('NewFeedPage', () => {
  it('renders page title and back link', () => {
    render(<NewFeedPage />)
    expect(screen.getByText('Add New Feed')).toBeDefined()
    expect(screen.getByText(/Back to feeds/i)).toBeDefined()
  })

  it('renders feed form', () => {
    render(<NewFeedPage />)
    expect(screen.getByLabelText(/RSS Feed URL/i)).toBeDefined()
  })
})
