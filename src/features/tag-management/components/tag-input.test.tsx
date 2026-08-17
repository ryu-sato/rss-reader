import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagInput } from './tag-input'

const allTags = [
  { id: 'tag-1', name: 'tech', createdAt: new Date() },
  { id: 'tag-2', name: 'news', createdAt: new Date() },
]

const initialTags = [{ id: 'tag-1', name: 'tech', createdAt: new Date() }]

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = vi.fn()
})

describe('TagInput', () => {
  it('renders assigned tags with remove button', () => {
    render(<TagInput entryId="entry-1" initialTags={initialTags} allTags={allTags} />)
    expect(screen.getByText('tech')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Remove tag tech' })).toBeDefined()
  })

  it('shows empty tag list when no initial tags', () => {
    render(<TagInput entryId="entry-1" initialTags={[]} allTags={allTags} />)
    expect(screen.queryByText('tech')).toBeNull()
  })

  it('removes tag when remove button is clicked', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    render(<TagInput entryId="entry-1" initialTags={initialTags} allTags={allTags} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag tech' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tags/tag-1/entries/entry-1', { method: 'DELETE' })
    })
  })

  it('adds tag on Enter key press', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'tag-3', name: 'sports', createdAt: new Date() } }),
    })

    render(<TagInput entryId="entry-1" initialTags={[]} allTags={[]} />)
    const input = screen.getByRole('textbox', { name: 'Tag input' })
    fireEvent.change(input, { target: { value: 'sports' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tags', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('shows suggestions from allTags filtered by input', () => {
    render(<TagInput entryId="entry-1" initialTags={[]} allTags={allTags} />)
    const input = screen.getByRole('textbox', { name: 'Tag input' })
    fireEvent.change(input, { target: { value: 'ne' } })
    expect(screen.getByText('news')).toBeDefined()
    expect(screen.queryByText('tech')).toBeNull()
  })
})
