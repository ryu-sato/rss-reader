import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagInput } from './tag-input'

const allTags = [
  { id: 'tag-1', name: 'tech', createdAt: new Date(), entryCount: 10 },
  { id: 'tag-2', name: 'news', createdAt: new Date(), entryCount: 5 },
  { id: 'tag-3', name: 'sports', createdAt: new Date(), entryCount: 3 },
  { id: 'tag-4', name: 'music', createdAt: new Date(), entryCount: 2 },
  { id: 'tag-5', name: 'art', createdAt: new Date(), entryCount: 1 },
  { id: 'tag-6', name: 'food', createdAt: new Date(), entryCount: 1 },
  { id: 'tag-7', name: 'unused', createdAt: new Date(), entryCount: 0 },
]

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = vi.fn()
})

describe('TagInput frequent tags', () => {
  it('shows the top 5 tags by entryCount when the input is empty', () => {
    render(<TagInput entryId="entry-1" initialTags={[]} allTags={allTags} />)

    expect(screen.getByText('よく使うタグ:')).toBeDefined()
    ;['tech', 'news', 'sports', 'music', 'art'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeDefined()
    })
    expect(screen.queryByRole('button', { name: 'food' })).toBeNull()
  })

  it('excludes tags with zero usage', () => {
    render(<TagInput entryId="entry-1" initialTags={[]} allTags={allTags} />)
    expect(screen.queryByRole('button', { name: 'unused' })).toBeNull()
  })

  it('excludes tags already assigned to the entry', () => {
    render(
      <TagInput
        entryId="entry-1"
        initialTags={[{ id: 'tag-1', name: 'tech', createdAt: new Date() }]}
        allTags={allTags}
      />
    )
    // tag-1 (tech) is already assigned, so the next-highest count (music, 6th place) fills the row
    expect(screen.queryByRole('button', { name: 'tech' })).toBeNull()
    expect(screen.getByText('news')).toBeDefined()
  })

  it('hides the section entirely when no tag has usage', () => {
    const zeroUsageTags = allTags.map((t) => ({ ...t, entryCount: 0 }))
    render(<TagInput entryId="entry-1" initialTags={[]} allTags={zeroUsageTags} />)
    expect(screen.queryByText('よく使うタグ:')).toBeNull()
  })

  it('hides the section while the user is typing', () => {
    render(<TagInput entryId="entry-1" initialTags={[]} allTags={allTags} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Tag input' }), { target: { value: 'te' } })
    expect(screen.queryByText('よく使うタグ:')).toBeNull()
  })

  it('adds the tag when a frequent tag button is clicked', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'tag-1', name: 'tech', createdAt: new Date() } }),
    })

    render(<TagInput entryId="entry-1" initialTags={[]} allTags={allTags} />)
    fireEvent.click(screen.getByRole('button', { name: 'tech' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tags',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'tech', entryId: 'entry-1' }),
        })
      )
    })
  })
})
