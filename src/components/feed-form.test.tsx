import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedForm from './feed-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('FeedForm', () => {
  it('renders URL input and submit button', () => {
    render(<FeedForm />)
    expect(screen.getByLabelText(/RSS Feed URL/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Register Feed/i })).toBeDefined()
  })

  it('shows loading state while submitting', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<FeedForm />)

    const input = screen.getByLabelText(/RSS Feed URL/i)
    const button = screen.getByRole('button', { name: /Register Feed/i })

    await userEvent.type(input, 'https://example.com/feed.xml')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registering/i })).toBeDefined()
    })
  })

  it('shows error when URL does not start with http/https', async () => {
    render(<FeedForm />)

    const input = screen.getByLabelText(/RSS Feed URL/i)
    await userEvent.type(input, 'not-a-url')
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByText(/URL must start with http/)).toBeDefined()
    })
  })

  it('shows error message on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Feed with this URL already exists' } }),
    }))
    render(<FeedForm />)

    const input = screen.getByLabelText(/RSS Feed URL/i)
    await userEvent.type(input, 'https://example.com/feed.xml')
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/Feed with this URL already exists/)).toBeDefined()
    })
  })

  it('resets form on success', async () => {
    const mockRefresh = vi.fn()
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
    }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: '1' } }),
    }))
    render(<FeedForm />)

    const input = screen.getByLabelText(/RSS Feed URL/i) as HTMLInputElement
    await userEvent.type(input, 'https://example.com/feed.xml')
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })
})
