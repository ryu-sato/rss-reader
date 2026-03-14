import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DeleteConfirmDialog from './delete-confirm-dialog'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('DeleteConfirmDialog', () => {
  it('shows delete button initially', () => {
    render(<DeleteConfirmDialog feedId="1" feedTitle="Test Feed" />)
    expect(screen.getByRole('button', { name: /Delete/i })).toBeDefined()
  })

  it('shows confirmation dialog when delete button clicked', async () => {
    render(<DeleteConfirmDialog feedId="1" feedTitle="Test Feed" />)
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeDefined()
    })
  })

  it('does not call fetch when cancel is clicked', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    render(<DeleteConfirmDialog feedId="1" feedTitle="Test Feed" />)
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls delete API on confirm', async () => {
    const mockRefresh = vi.fn()
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
    }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    render(<DeleteConfirmDialog feedId="feed-1" feedTitle="Test Feed" />)
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeDefined()
    })

    // Click the confirm Delete button in the dialog
    const allDeleteButtons = screen.getAllByRole('button', { name: /Delete/i })
    fireEvent.click(allDeleteButtons[allDeleteButtons.length - 1])

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/feeds/feed-1', { method: 'DELETE' })
    })
  })
})
