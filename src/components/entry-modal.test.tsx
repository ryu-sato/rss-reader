import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EntryModal } from './entry-modal'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const sampleEntry = {
  id: 'entry-1',
  feedId: 'feed-1',
  guid: 'guid-1',
  title: 'Test Article',
  link: 'https://example.com/1',
  description: 'Summary text',
  content: 'Full content text',
  imageUrl: null,
  publishedAt: new Date('2026-03-14T10:00:00Z'),
  createdAt: new Date('2026-03-14'),
  updatedAt: new Date('2026-03-14'),
  feed: { id: 'feed-1', title: 'Example Blog' },
  meta: null,
  tags: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})

describe('EntryModal', () => {
  it('renders entry title and content', () => {
    render(<EntryModal entry={sampleEntry} allTags={[]} />)
    expect(screen.getByText('Test Article')).toBeDefined()
    expect(screen.getByText('Full content text')).toBeDefined()
  })

  it('renders feed name', () => {
    render(<EntryModal entry={sampleEntry} allTags={[]} />)
    expect(screen.getByText('Example Blog')).toBeDefined()
  })

  it('renders link to original article', () => {
    render(<EntryModal entry={sampleEntry} allTags={[]} />)
    const link = screen.getByRole('link', { name: 'Read original article' })
    expect(link.getAttribute('href')).toBe('https://example.com/1')
  })

  it('auto-marks as read when entry is not read', async () => {
    render(<EntryModal entry={{ ...sampleEntry, meta: null }} allTags={[]} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/entries/entry-1/meta',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ isRead: true }),
        })
      )
    })
  })

  it('does not auto-mark as read when already read', async () => {
    render(
      <EntryModal
        entry={{ ...sampleEntry, meta: { id: 'm1', entryId: 'entry-1', isRead: true, isReadLater: false, createdAt: new Date(), updatedAt: new Date() } }}
        allTags={[]}
      />
    )

    await new Promise((r) => setTimeout(r, 50))
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][]
    const readCalls = calls.filter(
      ([url, opts]) =>
        url === '/api/entries/entry-1/meta' && opts?.method === 'PUT'
    )
    expect(readCalls).toHaveLength(0)
  })

  it('renders close button', () => {
    render(<EntryModal entry={sampleEntry} allTags={[]} />)
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeDefined()
  })

  it('renders navigation buttons', () => {
    render(<EntryModal entry={sampleEntry} allTags={[]} />)
    expect(screen.getByRole('button', { name: 'Previous entry' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Next entry' })).toBeDefined()
  })

  it('shows description when content is null', () => {
    render(<EntryModal entry={{ ...sampleEntry, content: null }} allTags={[]} />)
    expect(screen.getByText('Summary text')).toBeDefined()
  })
})
