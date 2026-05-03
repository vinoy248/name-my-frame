import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBanner } from '../../src/ui/components/StatusBanner'

describe('StatusBanner', () => {
  it('renders success message with success class', () => {
    render(<StatusBanner type="success" message="Renamed 3 frames" />)
    expect(screen.getByText('Renamed 3 frames')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('status-banner--success')
  })

  it('renders error message with error class', () => {
    render(<StatusBanner type="error" message="Rename failed" />)
    expect(screen.getByText('Rename failed')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('status-banner--error')
  })

  it('renders nothing when type is null', () => {
    const { container } = render(<StatusBanner type={null} message="" />)
    expect(container.firstChild).toBeNull()
  })
})
