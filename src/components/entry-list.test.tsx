import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EntryList } from './entry-list'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

const sampleEntries = [
  {
    id: 'entry-1',
    feedId: 'feed-1',
    title: 'Article 1',
    link: 'https://example.com/1',
    imageUrl: null,
    publishedAt: new Date('2026-03-14'),
    createdAt: new Date('2026-03-14'),
    updatedAt: new Date('2026-03-14'),
    feed: { id: 'feed-1', title: 'Example Blog' },
    meta: null,
    tags: [],
  },
  {
    id: 'entry-2',
    feedId: 'feed-1',
    title: 'Article 2',
    link: 'https://example.com/2',
    imageUrl: null,
    publishedAt: new Date('2026-03-13'),
    createdAt: new Date('2026-03-13'),
    updatedAt: new Date('2026-03-13'),
    feed: { id: 'feed-1', title: 'Example Blog' },
    meta: { id: 'm1', entryId: 'entry-2', isRead: true, isReadLater: false, createdAt: new Date(), updatedAt: new Date() },
    tags: [],
  },
]

const samplePagination = {
  page: 1,
  limit: 20,
  total: 2,
  hasNext: false,
  hasPrev: false,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('EntryList', () => {
  it('renders entry titles', () => {
    render(<EntryList entries={sampleEntries} pagination={samplePagination} />)
    expect(screen.getByText('Article 1')).toBeDefined()
    expect(screen.getByText('Article 2')).toBeDefined()
  })

  it('shows feed title for each entry', () => {
    render(<EntryList entries={sampleEntries} pagination={samplePagination} />)
    const feedTitles = screen.getAllByText('Example Blog')
    expect(feedTitles).toHaveLength(2)
  })

  it('shows empty message when no entries', () => {
    render(<EntryList entries={[]} pagination={{ ...samplePagination, total: 0 }} />)
    expect(screen.getByText('No entries found. Add some feeds to get started.')).toBeDefined()
  })

  it('opens modal on entry click by updating URL', () => {
    render(<EntryList entries={sampleEntries} pagination={samplePagination} />)
    fireEvent.click(screen.getByText('Article 1'))
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('entryId=entry-1'))
  })

  it('shows Previous button disabled on page 1', () => {
    render(<EntryList entries={sampleEntries} pagination={{ ...samplePagination, hasPrev: false }} />)
    const prevBtn = screen.getByRole('button', { name: 'Previous' })
    expect(prevBtn.hasAttribute('disabled')).toBe(true)
  })

  it('shows Next button disabled when no next page', () => {
    render(<EntryList entries={sampleEntries} pagination={{ ...samplePagination, hasNext: false }} />)
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn.hasAttribute('disabled')).toBe(true)
  })

  it('navigates to next page on Next button click', () => {
    render(<EntryList entries={sampleEntries} pagination={{ ...samplePagination, hasNext: true }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('page=2'))
  })

  it('applies opacity to read entries', () => {
    render(<EntryList entries={sampleEntries} pagination={samplePagination} />)
    const items = screen.getAllByRole('button')
    // items[0] is entry-1 (unread), items[1] is entry-2 (read)
    // Check that read entry has opacity class
    const listItems = document.querySelectorAll('li')
    const readEntry = listItems[1]
    expect(readEntry.className).toContain('opacity-60')
  })
})
