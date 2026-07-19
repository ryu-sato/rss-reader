import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewFeedPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('NewFeedPage', () => {
  it('renders page title and back link', () => {
    render(<NewFeedPage />)
    expect(screen.getByText('フィードを追加')).toBeDefined()
    expect(screen.getByText(/フィード管理に戻る/)).toBeDefined()
  })

  it('renders feed form', () => {
    render(<NewFeedPage />)
    expect(screen.getByLabelText(/フィードURL/)).toBeDefined()
  })
})
