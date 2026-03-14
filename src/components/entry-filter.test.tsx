import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EntryFilter } from './entry-filter'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === '/api/feeds') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'feed-1', title: 'Example Blog' }] }),
      })
    }
    if (url === '/api/tags') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'tag-1', name: 'tech' }] }),
      })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
})

describe('EntryFilter', () => {
  it('renders feed and tag filter dropdowns', async () => {
    render(<EntryFilter />)
    expect(screen.getByRole('combobox', { name: 'Filter by feed' })).toBeDefined()
    expect(screen.getByRole('combobox', { name: 'Filter by tag' })).toBeDefined()
  })

  it('loads and displays feed options', async () => {
    render(<EntryFilter />)
    await waitFor(() => {
      expect(screen.getByText('Example Blog')).toBeDefined()
    })
  })

  it('loads and displays tag options', async () => {
    render(<EntryFilter />)
    await waitFor(() => {
      expect(screen.getByText('tech')).toBeDefined()
    })
  })

  it('updates URL with feedId on feed selection', async () => {
    render(<EntryFilter />)
    await waitFor(() => screen.getByText('Example Blog'))

    const feedSelect = screen.getByRole('combobox', { name: 'Filter by feed' })
    fireEvent.change(feedSelect, { target: { value: 'feed-1' } })

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('feedId=feed-1'))
  })

  it('resets page to 1 when filter changes', async () => {
    render(<EntryFilter />)
    await waitFor(() => screen.getByText('Example Blog'))

    const feedSelect = screen.getByRole('combobox', { name: 'Filter by feed' })
    fireEvent.change(feedSelect, { target: { value: 'feed-1' } })

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('page=1'))
  })
})
