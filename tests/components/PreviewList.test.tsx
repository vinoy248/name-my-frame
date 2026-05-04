import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewList } from '../../src/ui/components/PreviewList'

const items = [
  { id: '1', newName: '31.1', originalName: 'Hero Frame' },
  { id: '2', newName: '31.2', originalName: 'Card Frame' },
]

describe('PreviewList', () => {
  it('renders new names for each item', () => {
    render(<PreviewList items={items} />)
    expect(screen.getByText('31.1')).toBeInTheDocument()
    expect(screen.getByText('31.2')).toBeInTheDocument()
  })

  it('renders original names for each item', () => {
    render(<PreviewList items={items} />)
    expect(screen.getByText('Hero Frame')).toBeInTheDocument()
    expect(screen.getByText('Card Frame')).toBeInTheDocument()
  })

  it('shows "No frames selected" when items is empty', () => {
    render(<PreviewList items={[]} />)
    expect(screen.getByText('No frames selected')).toBeInTheDocument()
  })

  it('applies dimmed class when dimmed prop is true', () => {
    render(<PreviewList items={items} dimmed />)
    expect(screen.getByRole('list')).toHaveClass('preview-list--dimmed')
  })

  it('sub-frame item shows → prefix in name', () => {
    const mixedItems = [
      { id: '1', newName: '31.1', originalName: 'Main', isSubFrame: false },
      { id: '2', newName: '31.1 A', originalName: 'Error', isSubFrame: true },
    ]
    render(<PreviewList items={mixedItems} />)
    expect(screen.getByText('→ 31.1 A')).toBeInTheDocument()
  })

  it('sub-frame item has preview-item--sub class', () => {
    const mixedItems = [
      { id: '1', newName: '31.1', originalName: 'Main', isSubFrame: false },
      { id: '2', newName: '31.1 A', originalName: 'Error', isSubFrame: true },
    ]
    const { container } = render(<PreviewList items={mixedItems} />)
    const listItems = container.querySelectorAll('li')
    expect(listItems[0]).not.toHaveClass('preview-item--sub')
    expect(listItems[1]).toHaveClass('preview-item--sub')
  })

  it('non-sub-frame renders name without → prefix', () => {
    render(<PreviewList items={items} />)
    expect(screen.getByText('31.1')).toBeInTheDocument()
    expect(screen.queryByText('→ 31.1')).not.toBeInTheDocument()
  })
})
