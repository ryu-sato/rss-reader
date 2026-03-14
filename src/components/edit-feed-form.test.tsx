import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditFeedForm from './edit-feed-form'
import type { Feed } from '@/types/feed'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}))

const sampleFeed: Feed = {
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  title: 'Example Blog',
  description: 'Blog description',
  faviconUrl: null,
  memo: 'My note',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  lastFetchedAt: new Date('2026-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('EditFeedForm', () => {
  it('shows existing values as initial state', () => {
    render(<EditFeedForm feed={sampleFeed} />)

    const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement
    expect(titleInput.value).toBe('Example Blog')

    const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
    expect(descInput.value).toBe('Blog description')

    const memoInput = screen.getByLabelText(/Memo/i) as HTMLTextAreaElement
    expect(memoInput.value).toBe('My note')
  })

  it('displays URL as read-only', () => {
    render(<EditFeedForm feed={sampleFeed} />)
    expect(screen.getByText('https://example.com/feed.xml')).toBeDefined()
    expect(screen.queryByRole('textbox', { name: /URL/i })).toBeNull()
  })

  it('submits updated data and navigates to home', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: sampleFeed }),
    }))

    render(<EditFeedForm feed={sampleFeed} />)

    const titleInput = screen.getByLabelText(/Title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'New Title')

    fireEvent.submit(titleInput.closest('form')!)

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        '/api/feeds/feed-1',
        expect.objectContaining({ method: 'PUT' })
      )
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error when title is empty', async () => {
    render(<EditFeedForm feed={sampleFeed} />)

    const titleInput = screen.getByLabelText(/Title/i)
    await userEvent.clear(titleInput)
    fireEvent.submit(titleInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByText(/Title cannot be empty/)).toBeDefined()
    })
  })
})
