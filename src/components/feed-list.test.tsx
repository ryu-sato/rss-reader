import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeedList from './feed-list'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const sampleFeeds = [
  { id: '1', title: 'Feed 1', url: 'https://a.com', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') },
  { id: '2', title: 'Feed 2', url: 'https://b.com', createdAt: new Date('2026-01-03'), updatedAt: new Date('2026-01-04') },
  { id: '3', title: 'Feed 3', url: 'https://c.com', createdAt: new Date('2026-01-05'), updatedAt: new Date('2026-01-06') },
]

describe('FeedList', () => {
  it('displays all feeds', () => {
    render(<FeedList feeds={sampleFeeds} />)
    expect(screen.getByText('Feed 1')).toBeDefined()
    expect(screen.getByText('Feed 2')).toBeDefined()
    expect(screen.getByText('Feed 3')).toBeDefined()
  })

  it('shows empty message when no feeds', () => {
    render(<FeedList feeds={[]} />)
    expect(screen.getByText(/No feeds registered yet/)).toBeDefined()
  })

  it('has edit links for each feed', () => {
    render(<FeedList feeds={sampleFeeds} />)
    const editLinks = screen.getAllByRole('link', { name: 'Edit' })
    expect(editLinks).toHaveLength(3)
    expect(editLinks[0].getAttribute('href')).toBe('/feeds/1/edit')
  })
})
